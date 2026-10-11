import {
  completeBodies,
  fingerprint,
  type MailFailure,
  MailReadError,
  mailFailure,
  type ThreadRead,
} from "../domain/mail-evidence.js";
import type { MailBudget } from "./mail-budget.js";
import type { MailReader, Runtime } from "./ports.js";

export interface PreviewOptions {
  days: number;
  maxThreads: number;
}
export interface PreviewReport {
  window: { since: string; until: string };
  discoveryComplete: boolean;
  bodyCoverageComplete: boolean;
  discoveredThreads: number;
  retrievedThreads: number;
  eligibleThreads: number;
  skippedThreads: number;
  messagesNormalized: number;
  draftsExcluded: number;
  partialThreads: number;
  failedThreads: number;
  bodyStatuses: Record<"complete" | "empty" | "unavailable" | "unsupported" | "too-large", number>;
  reasons: Array<MailFailure | "thread-limit" | "partial-body">;
  downstreamWrites: 0;
  exitCode: 0 | 1 | 2;
}
export interface PreviewResult {
  records: Array<ThreadRead & { fingerprint?: string }>;
  report: PreviewReport;
}
export function validatePreviewOptions(value: PreviewOptions): PreviewOptions {
  if (
    !Number.isSafeInteger(value.days) ||
    value.days < 1 ||
    value.days > 365 ||
    !Number.isSafeInteger(value.maxThreads) ||
    value.maxThreads < 1 ||
    value.maxThreads > 500
  )
    throw new MailReadError("invalid-data");
  return value;
}
export async function previewMail(
  options: PreviewOptions,
  deps: {
    mail: MailReader;
    clock: Pick<Runtime, "now">;
    budget: MailBudget;
  },
): Promise<PreviewResult> {
  validatePreviewOptions(options);
  const untilMs = deps.clock.now().getTime();
  if (!Number.isFinite(untilMs)) throw new MailReadError("invalid-data");
  // Align both filtering and provider query to whole seconds.
  const until = Math.floor(untilMs / 1000) * 1000;
  const since = until - options.days * 86_400_000;
  // Gmail after is exclusive: include the first second of our [since, until) window.
  const query = `after:${since / 1000 - 1} before:${until / 1000}`;
  const ids = new Set<string>();
  const tokens = new Set<string>();
  const reasons = new Set<PreviewReport["reasons"][number]>();
  let token: string | undefined;
  let discoveryComplete = false;
  try {
    do {
      deps.budget.assertActive();
      const page = await deps.mail.listThreads(query, token);
      for (const id of page.ids) {
        if (ids.has(id)) continue;
        if (ids.size === options.maxThreads) {
          reasons.add("thread-limit");
          break;
        }
        ids.add(id);
      }
      if (reasons.has("thread-limit")) break;
      token = page.nextToken;
      if (token && tokens.has(token)) {
        reasons.add("pagination-stalled");
        break;
      }
      if (token) tokens.add(token);
      if (token && ids.size === options.maxThreads) {
        reasons.add("thread-limit");
        break;
      }
      discoveryComplete = !token;
    } while (token);
  } catch (error) {
    reasons.add(mailFailure(error));
  }

  type Outcome = { read: ThreadRead; eligible: boolean } | { failure: MailFailure };
  const selected = [...ids];
  const outcomes: Outcome[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(deps.budget.limits.concurrency, selected.length) }, async () => {
      while (next < selected.length) {
        const index = next++;
        const id = selected[index];
        if (!id) continue;
        try {
          deps.budget.assertActive();
          const read = await deps.mail.readThreadEvidence(id);
          const eligible = read.evidence.messages.some((m) => {
            const time = Date.parse(m.receivedAt);
            return time >= since && time < until;
          });
          outcomes[index] = { read, eligible };
        } catch (error) {
          outcomes[index] = { failure: mailFailure(error) };
        }
      }
    }),
  );
  const records: PreviewResult["records"] = [];
  const bodyStatuses: PreviewReport["bodyStatuses"] = {
    complete: 0,
    empty: 0,
    unavailable: 0,
    unsupported: 0,
    "too-large": 0,
  };
  let failed = 0,
    partial = 0,
    skipped = 0,
    retrieved = 0,
    drafts = 0,
    messages = 0;
  for (const outcome of outcomes) {
    if ("failure" in outcome) {
      failed++;
      reasons.add(outcome.failure);
      continue;
    }
    retrieved++;
    drafts += outcome.read.draftsExcluded;
    const evidence = outcome.read.evidence;
    for (const message of evidence.messages) bodyStatuses[message.body.status]++;
    const complete = completeBodies(evidence);
    if (!complete) {
      partial++;
      reasons.add("partial-body");
    }
    if (!outcome.eligible) {
      skipped++;
      continue;
    }
    messages += evidence.messages.length;
    records.push({ ...outcome.read, ...(complete ? { fingerprint: fingerprint(evidence) } : {}) });
  }
  const hasError = [...reasons].some((r) => r !== "thread-limit");
  return {
    records,
    report: {
      window: { since: new Date(since).toISOString(), until: new Date(until).toISOString() },
      discoveryComplete,
      bodyCoverageComplete: failed === 0 && partial === 0,
      discoveredThreads: selected.length,
      retrievedThreads: retrieved,
      eligibleThreads: records.length,
      skippedThreads: skipped,
      messagesNormalized: messages,
      draftsExcluded: drafts,
      partialThreads: partial,
      failedThreads: failed,
      bodyStatuses,
      reasons: [...reasons].sort(),
      downstreamWrites: 0,
      exitCode: hasError ? 1 : discoveryComplete ? 0 : 2,
    },
  };
}

/** Whitelist the public report; never serialize the internal result or provider exception. */
export function previewReportText(result: PreviewResult): string {
  return JSON.stringify(result.report, null, 2);
}
