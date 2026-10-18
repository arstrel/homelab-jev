import { expect, it } from "vitest";
import { snapshotSubmission, storedEvidence } from "../../src/domain/stored-mail-evidence.js";
import { submission } from "../fixtures/ingestion.js";
import { mailInstant } from "../fixtures/mail.js";

it("validates, fingerprints and snapshots complete input without retaining mutable references", () => {
  const input = submission();
  const value = snapshotSubmission(input);
  const message = input.evidence.messages[0];
  if (!message) throw new Error("Missing fixture message");
  message.subject = "changed";
  input.availableAt.setFullYear(2000);
  expect(value.evidence.messages[0]?.subject).not.toBe("changed");
  expect(value.availableAt).toEqual(mailInstant);
  expect(
    storedEvidence(value.evidence, {
      mailbox: "primary",
      sourceId: "t-boiler",
      fingerprint: value.fingerprint,
    }),
  ).toEqual(value.evidence);
});
it.each(["partial", "date", "identity", "duplicate", "observation", "extra", "job"])(
  "rejects %s without leaking input",
  (kind) => {
    const input = submission();
    const message = input.evidence.messages[0];
    const observation = input.observation.messages[0];
    if (!message || !observation) throw new Error("Missing fixture message");
    if (kind === "partial") message.body = { status: "unavailable" };
    if (kind === "date") message.receivedAt = "secret-invalid-date";
    if (kind === "identity") message.id = "";
    if (kind === "duplicate") input.evidence.messages.push(message);
    if (kind === "observation") observation.id = "secret-wrong-id";
    if (kind === "extra") Object.assign(input.evidence, { raw: "secret-raw-provider" });
    if (kind === "job") input.jobId = "secret-invalid-id";
    expect(() => snapshotSubmission(input)).toThrow(/^invalid-data$/);
  },
);
it("rejects stored payload identity, fingerprint and coverage mismatches", () => {
  const value = snapshotSubmission(submission());
  for (const expected of [
    { mailbox: "other", sourceId: "t-boiler", fingerprint: value.fingerprint },
    { mailbox: "primary", sourceId: "wrong", fingerprint: value.fingerprint },
    { mailbox: "primary", sourceId: "t-boiler", fingerprint: "wrong" },
  ])
    expect(() => storedEvidence(value.evidence, expected)).toThrow("invalid-data");
});
