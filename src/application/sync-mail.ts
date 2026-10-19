import {
  completeBodies,
  eligibleThread,
  type MailFailure,
  MailReadError,
  mailFailure,
  type ThreadRead,
} from "../domain/mail-evidence.js";
import type { MailSyncState, RetrievalFailure, SyncOptions } from "../domain/mail-sync.js";
import { ingestionPolicyVersion } from "./ingest-mail.js";
import type { MailBudget } from "./mail-budget.js";
import type { MailSyncReader, MailSyncSession, Runtime } from "./ports.js";

type SyncReason =
  | MailFailure
  | "partial-body"
  | "persistence-error"
  | "recovery-required"
  | "page-limit"
  | "retrieval-limit"
  | "retry-pending";
export interface SyncReport {
  phase: MailSyncState["phase"] | "uninitialized" | "skipped";
  discoveryCaughtUp: boolean;
  evidenceComplete: boolean;
  pagesCommitted: number;
  discoverySteps: number;
  recoveryCount: number;
  recoveryStartedAt: string | null;
  recoveryCompletedAt: string | null;
  historyGap: boolean;
  recoveryScope: "recent-window-and-all-mapped-threads" | null;
  queuedReferences: number;
  retrievalsAttempted: number;
  acknowledgedThreads: number;
  partialThreads: number;
  missingThreads: number;
  excludedThreads: number;
  newVersions: number;
  newJobs: number;
  pendingRetrievals: number | null;
  retryingRetrievals: number | null;
  discoveryCheckedAt: string | null;
  evidenceSyncedAt: string | null;
  reasons: Array<SyncReason | "overlapping-run">;
  downstreamWrites: 0;
  exitCode: 0 | 1 | 2;
}
export function emptySyncReport(): SyncReport {
  return {
    phase: "uninitialized",
    discoveryCaughtUp: false,
    evidenceComplete: false,
    pagesCommitted: 0,
    discoverySteps: 0,
    recoveryCount: 0,
    recoveryStartedAt: null,
    recoveryCompletedAt: null,
    historyGap: false,
    recoveryScope: null,
    queuedReferences: 0,
    retrievalsAttempted: 0,
    acknowledgedThreads: 0,
    partialThreads: 0,
    missingThreads: 0,
    excludedThreads: 0,
    newVersions: 0,
    newJobs: 0,
    pendingRetrievals: null,
    retryingRetrievals: null,
    discoveryCheckedAt: null,
    evidenceSyncedAt: null,
    reasons: [],
    downstreamWrites: 0,
    exitCode: 0,
  };
}
export function validateSyncOptions(options: SyncOptions) {
  if (
    (options.days !== undefined &&
      (!Number.isInteger(options.days) || options.days < 1 || options.days > 365)) ||
    !Number.isInteger(options.maxPages) ||
    options.maxPages < 1 ||
    options.maxPages > 20 ||
    !Number.isInteger(options.maxThreads) ||
    options.maxThreads < 1 ||
    options.maxThreads > 500
  )
    throw new MailReadError("invalid-data");
}
export async function syncMail(
  options: SyncOptions,
  deps: {
    mail: MailSyncReader;
    session: MailSyncSession;
    budget: MailBudget;
    clock: Runtime;
  },
): Promise<SyncReport> {
  validateSyncOptions(options);
  const report = emptySyncReport();
  const reasons = new Set<SyncReason>();
  const { mail, session, budget, clock } = deps;
  let state: MailSyncState | undefined;
  let caughtUp = false;
  const save = async (next: MailSyncState, ids: string[], fromHistory: boolean) => {
    budget.assertActive();
    if (!state) throw new MailReadError("invalid-data");
    try {
      await session.savePage(state, next, ids, fromHistory, clock.now());
    } catch {
      reasons.add("persistence-error");
      throw new MailReadError("provider-error");
    }
    state = next;
  };
  try {
    budget.assertActive();
    state = await session.state();
    if (state && options.days !== undefined && options.days !== state.days)
      throw new MailReadError("invalid-data");
    if (!state) {
      const historyId = await mail.currentHistoryId();
      budget.assertActive();
      // Include the anchor's current second; rounding down could omit mail already in the anchor.
      const untilMs = (Math.floor(clock.now().getTime() / 1000) + 1) * 1000;
      if (!Number.isFinite(untilMs)) throw new MailReadError("invalid-data");
      const days = options.days ?? 30;
      const initial: MailSyncState = {
        mailbox: "primary",
        phase: "bootstrap",
        days,
        windowSince: new Date(untilMs - days * 86_400_000),
        windowUntil: new Date(untilMs),
        historyId,
        pageToken: null,
        seenTokens: [],
        revision: 0,
        discoveryCheckedAt: null,
        evidenceSyncedAt: null,
        recoveryCount: 0,
        recoveryStartedAt: null,
        recoveryCompletedAt: null,
        previousHistoryId: null,
        historyGap: false,
      };
      try {
        await session.initialize(initial);
      } catch {
        reasons.add("persistence-error");
        throw new MailReadError("provider-error");
      }
      state = initial;
    }
    while (report.discoverySteps < options.maxPages) {
      budget.assertActive();
      report.discoverySteps++;
      if (state.phase === "recovery-required") {
        const historyId = await mail.currentHistoryId();
        budget.assertActive();
        const untilMs = (Math.floor(clock.now().getTime() / 1000) + 1) * 1000;
        if (!Number.isFinite(untilMs)) throw new MailReadError("invalid-data");
        const next: MailSyncState = {
          ...state,
          phase: "recovery-bootstrap",
          historyId,
          previousHistoryId: state.historyId,
          windowSince: new Date(untilMs - state.days * 86_400_000),
          windowUntil: new Date(untilMs),
          pageToken: null,
          seenTokens: [],
          revision: state.revision + 1,
          recoveryCount: state.recoveryCount + 1,
          recoveryStartedAt: clock.now(),
          recoveryCompletedAt: null,
          historyGap: true,
        };
        try {
          await session.beginRecovery(state, next);
        } catch {
          reasons.add("persistence-error");
          throw new MailReadError("provider-error");
        }
        state = next;
        continue;
      }
      const bootstrap = state.phase === "bootstrap" || state.phase === "recovery-bootstrap";
      const mapped = state.phase === "recovery-mapped";
      const query = `after:${state.windowSince.getTime() / 1000 - 1} before:${state.windowUntil.getTime() / 1000}`;
      let page: { ids: string[]; nextToken?: string; historyId?: string };
      try {
        page = bootstrap
          ? await mail.listThreads(query, state.pageToken ?? undefined)
          : mapped
            ? await session.mappedPage(state.pageToken)
            : await mail.listHistory(state.historyId, state.pageToken ?? undefined);
      } catch (error) {
        if (!bootstrap && !mapped && mailFailure(error) === "history-expired") {
          await save(
            {
              ...state,
              phase: "recovery-required",
              historyGap: true,
              revision: state.revision + 1,
            },
            [],
            true,
          );
          continue;
        }
        if (mapped) reasons.add("persistence-error");
        throw error;
      }
      budget.assertActive();
      const token = page.nextToken ?? null;
      if (token && (state.seenTokens.includes(token) || state.seenTokens.length >= 2_000))
        throw new MailReadError("pagination-stalled");
      const next: MailSyncState = {
        ...state,
        pageToken: token,
        revision: state.revision + 1,
        seenTokens: token ? [...state.seenTokens, token] : [],
      };
      if (!token && bootstrap)
        next.phase = state.phase === "recovery-bootstrap" ? "recovery-mapped" : "history";
      if (!token && mapped) next.phase = "history";
      if (!bootstrap && !mapped && !token) {
        if (
          !("historyId" in page) ||
          typeof page.historyId !== "string" ||
          !/^\d{1,40}$/.test(page.historyId) ||
          BigInt(page.historyId) < BigInt(state.historyId)
        )
          throw new MailReadError("invalid-data");
        next.historyId = page.historyId;
        next.discoveryCheckedAt = clock.now();
      }
      await save(next, page.ids, !bootstrap);
      report.pagesCommitted++;
      report.queuedReferences += new Set(page.ids).size;
      if (!bootstrap && !mapped && !token) {
        caughtUp = true;
        break;
      }
    }
    if (!caughtUp) reasons.add("page-limit");
  } catch (error) {
    if (!reasons.has("persistence-error")) reasons.add(mailFailure(error));
  }

  if (
    state &&
    !budget.signal.aborted &&
    !reasons.has("persistence-error") &&
    !reasons.has("invalid-data")
  ) {
    try {
      const items = await session.due(clock.now(), options.maxThreads);
      for (const item of items) {
        budget.assertActive();
        report.retrievalsAttempted++;
        let read: ThreadRead | undefined;
        let failure: RetrievalFailure | undefined;
        let missing = false;
        try {
          read = await mail.readThreadEvidence(item.threadId);
        } catch (error) {
          const reason = mailFailure(error);
          if (reason === "deadline" || reason === "cancelled") throw error;
          if (reason === "missing-thread") missing = true;
          else failure = reason;
        }
        budget.assertActive();
        let excluded = false;
        if (read) {
          excluded = !eligibleThread(
            read,
            !item.fromHistory && state.phase !== "recovery-required"
              ? { since: state.windowSince.getTime(), until: state.windowUntil.getTime() }
              : undefined,
          );
          if (!excluded && !completeBodies(read.evidence)) {
            failure = "partial-body";
            report.partialThreads++;
          }
        }
        try {
          if (failure) {
            const minutes = Math.min(60, 5 * 2 ** Math.min(item.attempts, 4));
            await session.retry(item, failure, new Date(clock.now().getTime() + minutes * 60_000));
            reasons.add(failure);
          } else {
            const submission =
              read && !excluded
                ? {
                    evidence: read.evidence,
                    observation: read.observation,
                    jobId: clock.id(),
                    policyVersion: ingestionPolicyVersion,
                    availableAt: clock.now(),
                  }
                : undefined;
            const counts = await session.acknowledge(item, submission);
            report.newVersions += counts.newVersions;
            report.newJobs += counts.newJobs;
            report.acknowledgedThreads++;
            if (missing) report.missingThreads++;
            if (excluded) report.excludedThreads++;
          }
        } catch {
          reasons.add("persistence-error");
          break;
        }
      }
    } catch (error) {
      if (!reasons.has("persistence-error")) reasons.add(mailFailure(error));
    }
  }
  if (state) {
    try {
      const result = await session.finish(caughtUp && reasons.size === 0);
      state = result.state;
      report.pendingRetrievals = result.pending;
      report.retryingRetrievals = result.retrying;
      if (result.retrying > 0) reasons.add("retry-pending");
      else if (result.pending > 0) reasons.add("retrieval-limit");
    } catch {
      reasons.add("persistence-error");
    }
    report.phase = state.phase;
    report.discoveryCheckedAt = state.discoveryCheckedAt?.toISOString() ?? null;
    report.evidenceSyncedAt = state.evidenceSyncedAt?.toISOString() ?? null;
    report.recoveryCount = state.recoveryCount;
    report.recoveryStartedAt = state.recoveryStartedAt?.toISOString() ?? null;
    report.recoveryCompletedAt = state.recoveryCompletedAt?.toISOString() ?? null;
    report.historyGap = state.historyGap;
    report.recoveryScope = state.historyGap ? "recent-window-and-all-mapped-threads" : null;
  }
  report.discoveryCaughtUp = caughtUp;
  report.evidenceComplete = caughtUp && report.pendingRetrievals === 0 && reasons.size === 0;
  report.reasons = [...reasons].sort();
  report.exitCode = report.reasons.some((r) => r !== "page-limit" && r !== "retrieval-limit")
    ? 1
    : report.evidenceComplete
      ? 0
      : 2;
  return report;
}
