import { google } from "googleapis";
import { z } from "zod";
import type { MailBudget } from "../application/mail-budget.js";
import type { MailSyncReader, Runtime } from "../application/ports.js";
import { MailReadError } from "../domain/mail-evidence.js";
import { normalizeThread } from "./gmail-body.js";
import type { googleAuth } from "./google.js";

export async function checkGmail(auth: ReturnType<typeof googleAuth>) {
  await google
    .gmail({ version: "v1", auth })
    .users.getProfile({ userId: "me" }, { timeout: 5000, retry: false });
}

const pageSchema = z.object({
  threads: z
    .array(z.object({ id: z.string().min(1) }))
    .max(500)
    .optional(),
  nextPageToken: z.string().min(1).optional(),
});
const historyIdSchema = z.string().regex(/^\d{1,40}$/);
const historyMessage = z.object({ id: z.string().min(1), threadId: z.string().min(1) });
const changes = z
  .array(z.object({ message: historyMessage }))
  .max(1_000)
  .optional();
const historySchema = z.object({
  historyId: historyIdSchema,
  nextPageToken: z.string().min(1).optional(),
  history: z
    .array(
      z.object({
        id: historyIdSchema,
        messages: z.array(historyMessage).max(1_000).optional(),
        messagesAdded: changes,
        messagesDeleted: changes,
        labelsAdded: changes,
        labelsRemoved: changes,
      }),
    )
    .max(500)
    .optional(),
});

/** Configure OAuth refresh too: SDK request options alone do not bound authentication. */
export function gmailReader(
  auth: ReturnType<typeof googleAuth>,
  budget: MailBudget,
  clock: Pick<Runtime, "now">,
): MailSyncReader {
  auth.transporter.defaults = { ...auth.transporter.defaults, ...budget.requestOptions() };
  // Refresh helpers explicitly enable retries, overriding Gaxios defaults.
  auth.transporter.interceptors.request.add({
    resolved: async (options) => {
      budget.assertActive();
      options.retry = false;
      options.retryConfig = { ...options.retryConfig, retry: 0, noResponseRetries: 0 };
      return options;
    },
  });
  // Authenticate SDK reads explicitly so OAuth middleware cannot replay a 401/403.
  const gmail = google.gmail({ version: "v1" });
  async function options() {
    const { token } = await auth.getAccessToken();
    if (!token) throw new MailReadError("invalid-data");
    return { ...budget.requestOptions(), headers: { authorization: `Bearer ${token}` } };
  }
  let identity: Promise<string> | undefined;
  async function read<T>(operation: () => Promise<{ data: T }>, history = false): Promise<T> {
    try {
      return (await budget.read(operation)).data;
    } catch (error) {
      budget.assertActive();
      if (error instanceof MailReadError) throw error;
      const status =
        error && typeof error === "object" && "status" in error ? error.status : undefined;
      throw new MailReadError(
        status === 404 ? (history ? "history-expired" : "missing-thread") : "provider-error",
      );
    }
  }
  const mailbox = () =>
    (identity ??= read(async () => gmail.users.getProfile({ userId: "me" }, await options())).then(
      (profile) => {
        if (!profile.emailAddress) throw new MailReadError("invalid-data");
        const at = profile.emailAddress.lastIndexOf("@");
        if (at < 1) throw new MailReadError("invalid-data");
        return (
          profile.emailAddress.slice(0, at + 1) + profile.emailAddress.slice(at + 1).toLowerCase()
        );
      },
    ));
  return {
    async currentHistoryId() {
      const profile = await read(async () =>
        gmail.users.getProfile({ userId: "me" }, await options()),
      );
      const parsed = historyIdSchema.safeParse(profile.historyId);
      if (!parsed.success) throw new MailReadError("invalid-data");
      return parsed.data;
    },
    async listHistory(anchor, pageToken) {
      if (!historyIdSchema.safeParse(anchor).success) throw new MailReadError("invalid-data");
      const raw = await read(
        async () =>
          gmail.users.history.list(
            {
              userId: "me",
              startHistoryId: anchor,
              maxResults: 100,
              ...(pageToken ? { pageToken } : {}),
            },
            await options(),
          ),
        true,
      );
      const parsed = historySchema.safeParse(raw);
      if (!parsed.success || BigInt(parsed.data.historyId) < BigInt(anchor))
        throw new MailReadError("invalid-data");
      const ids = new Set<string>();
      for (const entry of parsed.data.history ?? []) {
        for (const message of entry.messages ?? []) ids.add(message.threadId);
        for (const group of [
          entry.messagesAdded,
          entry.messagesDeleted,
          entry.labelsAdded,
          entry.labelsRemoved,
        ])
          for (const item of group ?? []) ids.add(item.message.threadId);
      }
      if (ids.size > 2_000) throw new MailReadError("too-large");
      return {
        ids: [...ids],
        historyId: parsed.data.historyId,
        ...(parsed.data.nextPageToken ? { nextToken: parsed.data.nextPageToken } : {}),
      };
    },
    async listThreads(query, pageToken) {
      const data = await read(async () =>
        gmail.users.threads.list(
          {
            userId: "me",
            q: query,
            maxResults: 100,
            includeSpamTrash: false,
            ...(pageToken ? { pageToken } : {}),
          },
          await options(),
        ),
      );
      const parsed = pageSchema.safeParse(data);
      if (!parsed.success) throw new MailReadError("invalid-data");
      return {
        ids: (parsed.data.threads ?? []).map((t) => t.id),
        ...(parsed.data.nextPageToken ? { nextToken: parsed.data.nextPageToken } : {}),
      };
    },
    async readThreadEvidence(threadId) {
      const address = await mailbox();
      const raw = await read(async () =>
        gmail.users.threads.get({ userId: "me", id: threadId, format: "full" }, await options()),
      );
      return normalizeThread(raw, threadId, budget, clock.now(), address, (messageId, id) =>
        read(async () =>
          gmail.users.messages.attachments.get({ userId: "me", messageId, id }, await options()),
        ),
      );
    },
  };
}
