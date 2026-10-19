import {
  type MailStatusSnapshot,
  mailStatusSnapshotSchema,
  unavailableMeasurements,
} from "../domain/mail-status.js";
import type { MailStatusReader, Runtime } from "./ports.js";

export async function mailStatus(reader: MailStatusReader, clock: Pick<Runtime, "now">) {
  const now = clock.now();
  let snapshot: MailStatusSnapshot;
  try {
    // Parsing strips extra properties and rejects unexpected phase/failure values.
    snapshot = mailStatusSnapshotSchema.parse(await reader.read(now));
  } catch {
    snapshot = unavailableMeasurements("unavailable");
  }
  return {
    schemaVersion: "mail-status/v1" as const,
    checkedAt: now.toISOString(),
    ...snapshot,
    readOnly: true as const,
    providerCalls: 0 as const,
    reason: snapshot.schemaState === "unavailable" ? ("database-unavailable" as const) : null,
    exitCode:
      snapshot.schemaState === "ready" ? 0 : snapshot.schemaState === "migration-required" ? 2 : 1,
  };
}
