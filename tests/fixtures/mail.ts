import type { ThreadRead } from "../../src/domain/mail-evidence.js";

export const mailInstant = new Date("2026-10-11T12:00:00.000Z");
export function threadRead(id = "t-boiler"): ThreadRead {
  return {
    draftsExcluded: 1,
    observation: {
      observedAt: mailInstant.toISOString(),
      providerHistoryId: "100",
      messages: [
        { id: "m1", labels: [], direction: "incoming" },
        { id: "m2", labels: ["SENT"], direction: "sent" },
      ],
    },
    evidence: {
      schemaVersion: "mail-evidence/v1",
      source: { provider: "gmail", mailbox: "primary", threadId: id },
      coverage: { messageBodies: "complete", attachmentContents: "not-read" },
      messages: [
        {
          id: "m1",
          receivedAt: "2026-08-20T16:00:00.000Z",
          from: [{ address: "service@example.com" }],
          to: [{ address: "me@example.com" }],
          cc: [],
          subject: "Boiler inspection",
          references: [],
          attachments: [],
          body: { status: "complete", text: "Please send two dates for the boiler inspection." },
        },
        {
          id: "m2",
          receivedAt: "2026-10-10T18:00:00.000Z",
          from: [{ address: "me@example.com" }],
          to: [{ address: "service@example.com" }],
          cc: [],
          subject: "Re: Boiler inspection",
          references: [],
          attachments: [],
          body: { status: "complete", text: "October 16 or 19 would work. Please confirm." },
        },
      ],
    },
  };
}
export function gmailMessage(id = "m2", text = "October 16 or 19 would work. Please confirm.") {
  return {
    id,
    threadId: "t-boiler",
    internalDate: String(Date.parse("2026-10-10T18:00:00Z")),
    labelIds: ["SENT"],
    payload: {
      partId: "",
      mimeType: "text/plain",
      filename: "",
      headers: [
        { name: "From", value: "me@example.com" },
        { name: "To", value: "service@example.com" },
        { name: "Subject", value: "Re: Boiler inspection" },
      ],
      body: { size: Buffer.byteLength(text), data: Buffer.from(text).toString("base64url") },
    },
  };
}
export function gmailThread() {
  const older = gmailMessage("m1", "Please send two dates for the boiler inspection.");
  older.internalDate = String(Date.parse("2026-08-20T16:00:00Z"));
  older.labelIds = [];
  older.payload.headers = [
    { name: "From", value: "service@example.com" },
    { name: "To", value: "me@example.com" },
    { name: "Subject", value: "Boiler inspection" },
  ];
  const draft = gmailMessage("m3", "Unsent follow-up.");
  draft.labelIds = ["DRAFT"];
  return { id: "t-boiler", historyId: "100", messages: [older, gmailMessage(), draft] };
}
