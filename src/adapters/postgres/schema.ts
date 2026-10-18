import { sql } from "drizzle-orm";
import {
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
