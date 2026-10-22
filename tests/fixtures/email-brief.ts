import type { BriefRecord } from "../../src/application/email-brief.js";
import { fingerprint } from "../../src/domain/mail-evidence.js";
import type { MailStatusSnapshot } from "../../src/domain/mail-status.js";
import type { TodoistBriefInventory } from "../../src/domain/todoist-brief.js";
import { threadRead } from "./mail.js";

export const briefTime = "2026-10-11T12:00:00.000Z";
export const briefGeneration = "00000000-0000-4000-8000-000000000001";
export const briefFile = "fake_drive_file_123";
export function todoistInventory(): TodoistBriefInventory {
  return {
    projects: [{ id: "home", name: "Home & Admin" }],
    tasks: [
      {
        id: "task-1",
        projectId: "home",
        content: "Arrange boiler inspection",
        due: { date: "2026-10-16" },
        sourceIds: ["t-boiler"],
      },
    ],
    projectsComplete: true,
    tasksComplete: true,
    unknownProjects: 0,
    retroExcluded: 1,
    retroProjectIds: ["retro"],
  };
}
export function briefRecord(): BriefRecord {
  const read = threadRead();
  return {
    sourceId: read.evidence.source.threadId,
    jobId: briefGeneration,
    fingerprint: fingerprint(read.evidence),
    conversation: { evidence: read.evidence, directions: ["incoming", "sent"] },
  };
}
export function briefStatus(): MailStatusSnapshot {
  return {
    schemaState: "ready",
    phase: "uninitialized",
    window: null,
    discoveryCheckedAt: null,
    evidenceSyncedAt: null,
    recovery: null,
    retrievals: {
      pending: 10,
      due: 8,
      retrying: 2,
      nextRetryAt: null,
      failures: { "partial-body": 2 },
    },
    classification: { pendingJobs: 50, unboundPendingJobs: 1 },
  };
}
