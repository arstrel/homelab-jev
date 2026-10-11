import { expect, it } from "vitest";
import { fingerprint } from "../../src/domain/mail-evidence.js";
import { threadRead } from "../fixtures/mail.js";

it("fingerprints complete evidence deterministically while preserving provenance", () => {
  const read = threadRead();
  expect(read.evidence.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  expect(fingerprint(read.evidence)).toMatch(/^mail-evidence\/v1:sha256:[a-f0-9]{64}$/);
  expect(fingerprint(read.evidence)).toBe(fingerprint(structuredClone(read.evidence)));
});
it("ignores observations, provider ordering and downstream policy version", () => {
  const first = threadRead();
  const second = threadRead();
  second.observation.observedAt = "2030-01-01T00:00:00.000Z";
  second.observation.providerHistoryId = "999";
  second.observation.messages[0]?.labels.push("UNREAD", "STARRED");
  second.evidence.messages.reverse();
  const withPolicy = { ...second.evidence, policyVersion: "next" };
  expect(fingerprint(withPolicy)).toBe(fingerprint(first.evidence));
});
it.each(["incoming", "sent"])("changes identity for a new %s reply", (direction) => {
  const original = threadRead().evidence;
  const changed = structuredClone(original);
  const message = changed.messages[1];
  if (!message) throw new Error("Missing fixture message");
  changed.messages.push({
    ...message,
    id: direction,
    body: { status: "complete", text: "Confirmed." },
  });
  expect(fingerprint(changed)).not.toBe(fingerprint(original));
});
it.each(["unavailable", "unsupported", "too-large"] as const)(
  "rejects %s evidence fingerprints",
  (status) => {
    const evidence = threadRead().evidence;
    const message = evidence.messages[0];
    if (!message) throw new Error("Missing fixture message");
    message.body = { status };
    expect(() => fingerprint(evidence)).toThrow("invalid-data");
  },
);
it("canonicalizes recipient/attachment object order and preserves meaningful changes", () => {
  const original = threadRead().evidence;
  const message = original.messages[0];
  if (!message) throw new Error("Missing fixture message");
  message.to.push({ address: "other@example.com", name: "Other" });
  message.attachments.push({
    partId: "2",
    filename: "a.pdf",
    mimeType: "application/pdf",
    size: 123,
  });
  const equivalent = structuredClone(original);
  equivalent.messages[0]?.to.reverse();
  expect(fingerprint(equivalent)).toBe(fingerprint(original));
  const attachment = equivalent.messages[0]?.attachments[0];
  if (attachment) attachment.size++;
  expect(fingerprint(equivalent)).not.toBe(fingerprint(original));
});
