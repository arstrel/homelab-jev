import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { ThreadEvidence, ThreadObservation } from "../../domain/mail-evidence.js";

export const jev = pgSchema("jev");
const time = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
export const checkpoints = jev.table("checkpoints", {
  mailbox: text("mailbox").primaryKey(),
  historyId: text("history_id").notNull(),
  syncedAt: time("synced_at").notNull(),
});
export const mailSyncState = jev.table(
  "mail_sync_state",
  {
    mailbox: text("mailbox").primaryKey(),
    phase: text("phase", {
      enum: ["bootstrap", "history", "recovery-required", "recovery-bootstrap", "recovery-mapped"],
    }).notNull(),
    days: integer("days").notNull(),
    windowSince: time("window_since").notNull(),
    windowUntil: time("window_until").notNull(),
    historyId: text("history_id").notNull(),
    pageToken: text("page_token"),
    seenTokens: jsonb("seen_tokens").$type<string[]>().notNull().default([]),
    revision: integer("revision").notNull().default(0),
    discoveryCheckedAt: time("discovery_checked_at"),
    evidenceSyncedAt: time("evidence_synced_at"),
    recoveryCount: integer("recovery_count").notNull().default(0),
    recoveryStartedAt: time("recovery_started_at"),
    recoveryCompletedAt: time("recovery_completed_at"),
    previousHistoryId: text("previous_history_id"),
    historyGap: boolean("history_gap").notNull().default(false),
  },
  (t) => [
    check(
      "sync_phase",
      sql`${t.phase} in ('bootstrap','history','recovery-required','recovery-bootstrap','recovery-mapped')`,
    ),
    check("sync_recovery_count", sql`${t.recoveryCount} >= 0`),
    check(
      "sync_bounds",
      sql`${t.days} between 1 and 365 and ${t.windowSince} < ${t.windowUntil} and ${t.revision} >= 0`,
    ),
    check("sync_history_id", sql`${t.historyId} ~ '^[0-9]{1,40}$'`),
    check(
      "sync_tokens",
      sql`jsonb_typeof(${t.seenTokens}) = 'array' and jsonb_array_length(${t.seenTokens}) <= 2000`,
    ),
  ],
);
export const mailRecoveryTargets = jev.table(
  "mail_recovery_targets",
  {
    mailbox: text("mailbox")
      .notNull()
      .references(() => mailSyncState.mailbox),
    threadId: text("thread_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.mailbox, t.threadId] })],
);
export const mailRetrievals = jev.table(
  "mail_retrievals",
  {
    mailbox: text("mailbox")
      .notNull()
      .references(() => mailSyncState.mailbox),
    threadId: text("thread_id").notNull(),
    generation: integer("generation").notNull().default(1),
    fromHistory: integer("from_history").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    availableAt: time("available_at").notNull(),
    failure: text("failure").$type<import("../../domain/mail-sync.js").RetrievalFailure>(),
  },
  (t) => [
    primaryKey({ columns: [t.mailbox, t.threadId] }),
    check(
      "retrieval_counters",
      sql`${t.generation} > 0 and ${t.attempts} >= 0 and ${t.fromHistory} in (0,1)`,
    ),
    index("retrieval_due").on(t.mailbox, t.availableAt),
  ],
);
export const sources = jev.table(
  "sources",
  {
    mailbox: text("mailbox").notNull(),
    sourceId: text("source_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    observedAt: time("observed_at").notNull(),
    observation: jsonb("observation").$type<ThreadObservation>(),
  },
  (t) => [primaryKey({ columns: [t.mailbox, t.sourceId] })],
);
export const mailEvidenceVersions = jev.table(
  "mail_evidence_versions",
  {
    mailbox: text("mailbox").notNull(),
    sourceId: text("source_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    schemaVersion: text("schema_version").notNull(),
    evidence: jsonb("evidence").$type<ThreadEvidence>().notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.mailbox, t.sourceId, t.fingerprint] }),
    foreignKey({
      columns: [t.mailbox, t.sourceId],
      foreignColumns: [sources.mailbox, sources.sourceId],
    }),
    check(
      "evidence_identity",
      sql`coalesce(${t.evidence}->'source'->>'mailbox' = ${t.mailbox} and ${t.evidence}->'source'->>'threadId' = ${t.sourceId} and ${t.evidence}->>'schemaVersion' = ${t.schemaVersion}, false)`,
    ),
    check(
      "evidence_complete",
      sql`coalesce(${t.schemaVersion} = 'mail-evidence/v1' and ${t.evidence}->'coverage'->>'messageBodies' = 'complete', false)`,
    ),
  ],
);
export const pendingJobs = jev.table(
  "pending_jobs",
  {
    id: uuid("id").primaryKey(),
    mailbox: text("mailbox").notNull(),
    sourceId: text("source_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    evidenceFingerprint: text("evidence_fingerprint"),
    policyVersion: text("policy_version").notNull(),
    attempts: integer("attempts").notNull().default(0),
    availableAt: time("available_at").notNull(),
    state: text("state", { enum: ["pending", "complete"] })
      .notNull()
      .default("pending"),
  },
  (t) => [
    uniqueIndex("job_source_policy").on(t.mailbox, t.sourceId, t.fingerprint, t.policyVersion),
    foreignKey({
      columns: [t.mailbox, t.sourceId],
      foreignColumns: [sources.mailbox, sources.sourceId],
    }),
    check("job_attempts_nonnegative", sql`${t.attempts} >= 0`),
    foreignKey({
      columns: [t.mailbox, t.sourceId, t.evidenceFingerprint],
      foreignColumns: [
        mailEvidenceVersions.mailbox,
        mailEvidenceVersions.sourceId,
        mailEvidenceVersions.fingerprint,
      ],
    }),
    check(
      "job_evidence_identity",
      sql`${t.evidenceFingerprint} is null or ${t.evidenceFingerprint} = ${t.fingerprint}`,
    ),
    check("job_state", sql`${t.state} in ('pending','complete')`),
    index("pending_ready").on(t.state, t.availableAt),
  ],
);
export const classifications = jev.table("classifications", {
  id: uuid("id").primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => pendingJobs.id),
  modelVersion: text("model_version").notNull(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  correction: jsonb("correction").$type<Record<string, unknown>>(),
  createdAt: time("created_at").notNull(),
});
export const taskLinks = jev.table(
  "task_links",
  {
    mailbox: text("mailbox").notNull(),
    sourceId: text("source_id").notNull(),
    obligationKey: text("obligation_key").notNull(),
    taskId: text("task_id").notNull(),
    overrides: jsonb("overrides").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    primaryKey({ columns: [t.mailbox, t.sourceId, t.obligationKey] }),
    foreignKey({
      columns: [t.mailbox, t.sourceId],
      foreignColumns: [sources.mailbox, sources.sourceId],
    }),
    index("links_task").on(t.taskId),
  ],
);
export const suppressions = jev.table(
  "suppressions",
  {
    obligationKey: text("obligation_key").primaryKey(),
    reason: text("reason", { enum: ["completed", "deleted"] }).notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [check("suppression_reason", sql`${t.reason} in ('completed','deleted')`)],
);
export const writeIntents = jev.table(
  "write_intents",
  {
    id: uuid("id").primaryKey(),
    destination: text("destination", { enum: ["todoist", "drive"] }).notNull(),
    obligationKey: text("obligation_key").notNull(),
    requestId: uuid("request_id").notNull(),
    state: text("state", { enum: ["pending", "ambiguous", "complete"] })
      .notNull()
      .default("pending"),
    outcome: jsonb("outcome").$type<Record<string, unknown>>(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("intent_request").on(t.requestId),
    uniqueIndex("intent_obligation_destination").on(t.obligationKey, t.destination),
    check("intent_state", sql`${t.state} in ('pending','ambiguous','complete')`),
    check("intent_destination", sql`${t.destination} in ('todoist','drive')`),
  ],
);

export const inferenceBudgets = jev.table(
  "inference_budgets",
  {
    id: text("id").primaryKey(),
    limitNano: integer("limit_nano").notNull(),
    usedNano: integer("used_nano").notNull(),
  },
  (t) => [
    check(
      "inference_allowance",
      sql`${t.usedNano} >= 0 and ${t.usedNano} <= ${t.limitNano} and ${t.limitNano} <= 2000000000`,
    ),
  ],
);
