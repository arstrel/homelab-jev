import { z } from "zod";

export const retrievalFailureNames = [
  "provider-error",
  "rate-limited",
  "history-expired",
  "missing-thread",
  "invalid-data",
  "deadline",
  "cancelled",
  "request-limit",
  "too-large",
  "pagination-stalled",
  "partial-body",
  "unknown-failure",
] as const;
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const instant = z.iso.datetime();
export const mailStatusSnapshotSchema = z
  .object({
    schemaState: z.enum(["ready", "migration-required", "incompatible", "unavailable"]),
    phase: z
      .enum([
        "uninitialized",
        "bootstrap",
        "history",
        "recovery-required",
        "recovery-bootstrap",
        "recovery-mapped",
      ])
      .nullable(),
    window: z
      .object({ days: z.number().int().min(1).max(365), since: instant, until: instant })
      .nullable(),
    discoveryCheckedAt: instant.nullable(),
    evidenceSyncedAt: instant.nullable(),
    recovery: z
      .object({
        count,
        startedAt: instant.nullable(),
        completedAt: instant.nullable(),
        historyGap: z.boolean(),
        scope: z.literal("recent-window-and-all-mapped-threads").nullable(),
      })
      .nullable(),
    retrievals: z
      .object({
        pending: count,
        due: count,
        retrying: count,
        nextRetryAt: instant.nullable(),
        failures: z.partialRecord(z.enum(retrievalFailureNames), count),
      })
      .nullable(),
    classification: z.object({ pendingJobs: count, unboundPendingJobs: count }).nullable(),
  })
  .refine((value) => {
    if (value.schemaState !== "ready")
      return Object.entries(value).every(([key, field]) => key === "schemaState" || field === null);
    if (value.phase === null || value.retrievals === null || value.classification === null)
      return false;
    if (value.phase === "uninitialized")
      return (
        value.window === null &&
        value.recovery === null &&
        value.discoveryCheckedAt === null &&
        value.evidenceSyncedAt === null
      );
    return value.window !== null && value.recovery !== null;
  });
export type MailStatusSnapshot = z.infer<typeof mailStatusSnapshotSchema>;
export function unavailableMeasurements(
  schemaState: Exclude<MailStatusSnapshot["schemaState"], "ready">,
): MailStatusSnapshot {
  return {
    schemaState,
    phase: null,
    window: null,
    discoveryCheckedAt: null,
    evidenceSyncedAt: null,
    recovery: null,
    retrievals: null,
    classification: null,
  };
}
