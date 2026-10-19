import { vi } from "vitest";
import type { MailSyncReader, MailSyncSession } from "../../src/application/ports.js";
import type { MailSyncState, RetrievalWork } from "../../src/domain/mail-sync.js";
import { threadRead } from "./mail.js";

export function syncHarness(initial?: MailSyncState) {
  let state = initial;
  const queue = new Map<string, RetrievalWork & { availableAt: Date }>();
  const signal = new AbortController().signal;
  const session: MailSyncSession = {
    signal,
    state: vi.fn(async () => state),
    initialize: vi.fn(async (value) => {
      state = value;
    }),
    beginRecovery: vi.fn(async (_previous, next) => {
      for (const [id, work] of queue)
        queue.set(id, { ...work, fromHistory: true, generation: work.generation + 1 });
      state = next;
    }),
    mappedPage: vi.fn(async () => ({ ids: [] })),
    savePage: vi.fn(async (_previous, next, ids, fromHistory, now) => {
      for (const id of ids)
        queue.set(id, {
          mailbox: "primary",
          threadId: id,
          generation: 1,
          fromHistory,
          attempts: 0,
          availableAt: now,
        });
      state = next;
    }),
    due: vi.fn(async (now, limit) =>
      [...queue.values()].filter((w) => w.availableAt <= now).slice(0, limit),
    ),
    acknowledge: vi.fn(async (work, evidence) => {
      queue.delete(work.threadId);
      return { newVersions: evidence ? 1 : 0, newJobs: evidence ? 1 : 0, boundLegacyJobs: 0 };
    }),
    retry: vi.fn(async (work, _failure, availableAt) => {
      queue.set(work.threadId, { ...work, attempts: work.attempts + 1, availableAt });
    }),
    finish: vi.fn(async (caughtUp) => {
      if (!state) throw new Error("Missing fake state");
      if (caughtUp && queue.size === 0)
        state = {
          ...state,
          evidenceSyncedAt: state.discoveryCheckedAt,
          recoveryCompletedAt:
            state.recoveryCount > 0
              ? (state.recoveryCompletedAt ?? state.discoveryCheckedAt)
              : null,
        };
      return {
        state,
        pending: queue.size,
        retrying: [...queue.values()].filter((w) => w.attempts > 0).length,
      };
    }),
  };
  const mail: MailSyncReader = {
    currentHistoryId: vi.fn(async () => "10"),
    listThreads: vi.fn(async () => ({ ids: [] })),
    listHistory: vi.fn(async () => ({ ids: [], historyId: "20" })),
    readThreadEvidence: vi.fn(async (id) => threadRead(id)),
  };
  return { session, mail, queue };
}
