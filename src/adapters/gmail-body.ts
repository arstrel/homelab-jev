import emailAddresses from "email-addresses";
import { convert } from "html-to-text";
import { z } from "zod";
import type { MailBudget } from "../application/mail-budget.js";
import {
  type Address,
  type AttachmentMetadata,
  type MailBody,
  type MailMessage,
  MailReadError,
  type ThreadRead,
} from "../domain/mail-evidence.js";

const header = z.object({ name: z.string(), value: z.string().max(16_384) });
const bodySchema = z.object({
  size: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  data: z.string().optional(),
  attachmentId: z.string().min(1).optional(),
});
const partSchema = z.object({
  partId: z.string().optional(),
  mimeType: z.string().min(1),
  filename: z.string().optional(),
  headers: z.array(header).max(1_000).optional(),
  body: bodySchema.optional(),
  parts: z.array(z.unknown()).optional(),
});
type Part = Omit<z.infer<typeof partSchema>, "parts"> & { parts: Part[] };
const messageSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  internalDate: z.string().regex(/^-?\d+$/),
  labelIds: z.array(z.string()).optional(),
  payload: z.unknown(),
});
const threadSchema = z.object({
  id: z.string().min(1),
  historyId: z.string().optional(),
  messages: z.array(z.unknown()),
});
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new MailReadError("invalid-data");
  return result.data;
}
function parts(raw: unknown, budget: MailBudget, count: { value: number }, depth = 0): Part {
  budget.assertActive();
  if (depth > budget.limits.maxDepth || ++count.value > budget.limits.maxParts)
    throw new MailReadError("invalid-data");
  const p = parse(partSchema, raw);
  return { ...p, parts: (p.parts ?? []).map((child) => parts(child, budget, count, depth + 1)) };
}
function value(part: Part, name: string): string {
  return (part.headers ?? [])
    .filter((h) => h.name.toLowerCase() === name)
    .map((h) => h.value)
    .join(", ");
}
function decodeBytes(bytes: Uint8Array, charset = "utf-8"): string {
  return new TextDecoder(charset, { fatal: true }).decode(bytes);
}
function base64(data: string, maxBytes: number): Buffer {
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(data) || data.replace(/=+$/, "").length % 4 === 1)
    throw new MailReadError("invalid-data");
  if (Math.floor((data.replace(/=+$/, "").length * 3) / 4) > maxBytes)
    throw new MailReadError("too-large");
  return Buffer.from(data, "base64url");
}
function encodedWords(input: string): string {
  return input
    .replace(/(\?=)\s+(=\?)/g, "$1$2")
    .replace(
      /=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,
      (_all, charset: string, encoding: string, text: string) => {
        const bytes =
          encoding.toLowerCase() === "b"
            ? Buffer.from(text, "base64")
            : Buffer.from(
                text
                  .replace(/_/g, " ")
                  .replace(/=([0-9a-f]{2})/gi, (_hex, hex: string) =>
                    String.fromCharCode(Number.parseInt(hex, 16)),
                  ),
                "latin1",
              );
        return decodeBytes(bytes, charset);
      },
    );
}
function addresses(input: string): Address[] {
  if (!input.trim()) return [];
  const parsed = emailAddresses.parseAddressList({ input, partial: false, rfc6532: true });
  if (!parsed) throw new MailReadError("invalid-data");
  return parsed
    .flatMap((item) => (item.type === "group" ? item.addresses : [item]))
    .map((item) => ({
      address: `${item.local}@${item.domain.toLowerCase()}`,
      ...(item.name ? { name: encodedWords(item.name) } : {}),
    }));
}
function attachment(part: Part): boolean {
  return !!part.filename || /^attachment(?:\s*;|$)/i.test(value(part, "content-disposition"));
}
function select(part: Part, preferHtml = false): Part[] | null {
  if (attachment(part)) return [];
  const mime = part.mimeType.toLowerCase();
  if (mime === "text/plain" || mime === "text/html") return [part];
  if (mime === "multipart/alternative") {
    const choices = part.parts.map((child) => select(child, preferHtml));
    return (
      choices.find((choice) =>
        choice?.some((p) => p.mimeType.toLowerCase() === (preferHtml ? "text/html" : "text/plain")),
      ) ??
      choices.find((choice) => choice && choice.length > 0) ??
      (choices.includes(null) ? null : [])
    );
  }
  if (mime === "multipart/encrypted") return null;
  if (mime.startsWith("multipart/")) {
    const selected: Part[] = [];
    for (const child of part.parts) {
      const choice = select(child, preferHtml);
      if (choice === null) return null;
      selected.push(...choice);
    }
    return selected;
  }
  return [];
}
function attachments(part: Part): AttachmentMetadata[] {
  if (
    attachment(part) ||
    (!part.parts.length &&
      !["text/plain", "text/html"].includes(part.mimeType.toLowerCase()) &&
      !part.mimeType.toLowerCase().startsWith("multipart/"))
  ) {
    if (part.partId === undefined || part.body?.size === undefined)
      throw new MailReadError("invalid-data");
    return [
      {
        partId: part.partId,
        filename: part.filename ?? "",
        mimeType: part.mimeType.toLowerCase(),
        size: part.body.size,
      },
    ];
  }
  return part.parts.flatMap(attachments);
}
const truncated = "JEV_HTML_COVERAGE_LIMIT";
async function normalizeRepresentation(
  messageId: string,
  payload: Part,
  budget: MailBudget,
  getTextPart: (messageId: string, attachmentId: string) => Promise<unknown>,
  metadata: AttachmentMetadata[],
  preferHtml = false,
): Promise<MailBody> {
  try {
    const selected = select(payload, preferHtml);
    if (selected === null) return { status: "unsupported" };
    if (!selected.length) {
      return metadata.length &&
        (attachment(payload) || payload.mimeType.toLowerCase() === "multipart/mixed")
        ? { status: "empty", text: "" }
        : { status: "unsupported" };
    }
    const texts: string[] = [];
    let decodedSize = 0;
    for (const part of selected) {
      budget.assertActive();
      if ((part.body?.size ?? 0) > budget.limits.maxBodyBytes - decodedSize)
        throw new MailReadError("too-large");
      const body = part.body?.attachmentId
        ? parse(bodySchema, await getTextPart(messageId, part.body.attachmentId))
        : part.body;
      if (!body || (body.data === undefined && body.size !== 0)) return { status: "unavailable" };
      const bytes = base64(body.data ?? "", budget.limits.maxBodyBytes - decodedSize);
      // Gmail can understate size; retain the check for a possible short read.
      if (body.size !== undefined && body.size > bytes.length)
        throw new MailReadError("invalid-data");
      decodedSize += bytes.length;
      const charset = /charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i.exec(value(part, "content-type"));
      const decoded = decodeBytes(bytes, charset?.[1] ?? charset?.[2] ?? "utf-8");
      const text =
        part.mimeType.toLowerCase() === "text/html"
          ? convert(decoded, {
              wordwrap: false,
              baseElements: { selectors: [], returnDomByDefault: true },
              limits: {
                maxInputLength: budget.limits.maxBodyBytes,
                // HTML table layouts are much deeper than MIME envelopes.
                maxDepth: 200,
                maxChildNodes: 10_000,
                ellipsis: truncated,
              },
              selectors: [
                { selector: "img", format: "skip" },
                { selector: "script", format: "skip" },
                { selector: "style", format: "skip" },
                { selector: "h1", options: { uppercase: false } },
                { selector: "h2", options: { uppercase: false } },
              ],
            })
          : decoded;
      if (text.includes(truncated)) return { status: "too-large" };
      texts.push(text);
    }
    const text = texts.join("\n\n").replace(/\r\n?/g, "\n");
    budget.reserveBody(Math.max(decodedSize, Buffer.byteLength(text)));
    return { status: text.length ? "complete" : "empty", text };
  } catch (error) {
    if (
      error instanceof MailReadError &&
      (error.reason === "deadline" ||
        error.reason === "cancelled" ||
        error.reason === "rate-limited")
    )
      throw error;
    if (error instanceof MailReadError && error.reason === "too-large")
      return { status: "too-large" };
    if (
      error instanceof MailReadError &&
      (error.reason === "provider-error" ||
        error.reason === "missing-thread" ||
        error.reason === "request-limit")
    )
      return { status: "unavailable" };
    return { status: "unsupported" };
  }
}

export async function normalizeBody(
  messageId: string,
  payload: Part,
  budget: MailBudget,
  getTextPart: (messageId: string, attachmentId: string) => Promise<unknown>,
  metadata: AttachmentMetadata[],
): Promise<MailBody> {
  const preferred = await normalizeRepresentation(
    messageId,
    payload,
    budget,
    getTextPart,
    metadata,
  );
  if (preferred.status === "complete" || preferred.status === "empty") return preferred;
  // MIME alternatives are different representations of the same body. A broken
  // plain representation must not hide a complete HTML alternative. Mixed
  // sections and encrypted siblings remain mandatory in both selections.
  const plain = select(payload);
  const html = select(payload, true);
  if (
    !plain ||
    !html ||
    (plain.length === html.length && plain.every((part, i) => part === html[i]))
  )
    return preferred;
  const alternate = await normalizeRepresentation(
    messageId,
    payload,
    budget,
    getTextPart,
    metadata,
    true,
  );
  return alternate.status === "complete" || alternate.status === "empty" ? alternate : preferred;
}

export async function normalizeThread(
  raw: unknown,
  expectedId: string,
  budget: MailBudget,
  observedAt: Date,
  mailboxAddress: string,
  getTextPart: (messageId: string, attachmentId: string) => Promise<unknown>,
): Promise<ThreadRead> {
  const thread = parse(threadSchema, raw);
  if (thread.id !== expectedId || !thread.messages.length) throw new MailReadError("invalid-data");
  if (thread.messages.length > budget.limits.maxMessages) throw new MailReadError("too-large");
  const messages: MailMessage[] = [];
  const observations: ThreadRead["observation"]["messages"] = [];
  const ids = new Set<string>();
  const count = { value: 0 };
  let draftsExcluded = 0;
  for (const rawMessage of thread.messages) {
    budget.assertActive();
    const m = parse(messageSchema, rawMessage);
    if (m.threadId !== expectedId || ids.has(m.id)) throw new MailReadError("invalid-data");
    ids.add(m.id);
    if (m.labelIds?.includes("DRAFT")) {
      draftsExcluded++;
      continue;
    }
    const timestamp = Number(m.internalDate);
    if (!Number.isSafeInteger(timestamp) || !Number.isFinite(new Date(timestamp).getTime()))
      throw new MailReadError("invalid-data");
    const payload = parts(m.payload, budget, count);
    const metadata = attachments(payload);
    let from: Address[], to: Address[], cc: Address[], subject: string;
    try {
      from = addresses(value(payload, "from"));
      to = addresses(value(payload, "to"));
      cc = addresses(value(payload, "cc"));
      subject = encodedWords(value(payload, "subject"));
    } catch {
      throw new MailReadError("invalid-data");
    }
    const body = await normalizeBody(m.id, payload, budget, getTextPart, metadata);
    const messageIdHeader = value(payload, "message-id");
    const inReplyTo = value(payload, "in-reply-to");
    messages.push({
      id: m.id,
      receivedAt: new Date(timestamp).toISOString(),
      from,
      to,
      cc,
      subject,
      ...(messageIdHeader ? { messageIdHeader } : {}),
      ...(inReplyTo ? { inReplyTo } : {}),
      references: value(payload, "references").match(/<[^<>]+>/g) ?? [],
      body,
      attachments: metadata,
    });
    const authored = from.some((a) => a.address === mailboxAddress);
    const received = [...to, ...cc].some((a) => a.address === mailboxAddress);
    observations.push({
      id: m.id,
      labels: m.labelIds ?? [],
      direction:
        m.labelIds?.includes("SENT") || authored ? "sent" : received ? "incoming" : "unknown",
    });
  }
  messages.sort(
    (a, b) =>
      Date.parse(a.receivedAt) - Date.parse(b.receivedAt) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return {
    draftsExcluded,
    evidence: {
      schemaVersion: "mail-evidence/v1",
      source: { provider: "gmail", mailbox: "primary", threadId: thread.id },
      messages,
      coverage: {
        messageBodies: messages.every(
          (m) => m.body.status === "complete" || m.body.status === "empty",
        )
          ? "complete"
          : "partial",
        attachmentContents: "not-read",
      },
    },
    observation: {
      observedAt: observedAt.toISOString(),
      ...(thread.historyId ? { providerHistoryId: thread.historyId } : {}),
      messages: observations,
    },
  };
}
