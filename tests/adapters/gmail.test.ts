import { delay, HttpResponse, http } from "msw";
import { afterEach, expect, it, vi } from "vitest";
import { gmailReader } from "../../src/adapters/gmail.js";
import { googleAuth } from "../../src/adapters/google.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { previewMail } from "../../src/application/preview-mail.js";
import { fingerprint } from "../../src/domain/mail-evidence.js";
import { gmailMessage, gmailThread, mailInstant, threadRead } from "../fixtures/mail.js";
import { server } from "../setup.js";

const root = "https://gmail.googleapis.com/gmail/v1/users/me";
const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function setup(raw: Record<string, unknown> = gmailThread(), limits = {}) {
  const budget = new MailBudget(limits);
  budgets.push(budget);
  const auth = googleAuth({
    GOOGLE_CLIENT_ID: "fake",
    GOOGLE_CLIENT_SECRET: "fake",
    GOOGLE_REFRESH_TOKEN: "fake",
  });
  auth.setCredentials({ access_token: "fake-token", expiry_date: Date.now() + 10_000_000 });
  server.use(
    http.get(`${root}/profile`, () => HttpResponse.json({ emailAddress: "me@example.com" })),
    http.get(`${root}/threads`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      expect(query.get("q")).not.toMatch(/unread|in:inbox|from:/);
      expect(query.get("q")).toBe("after:1789127999 before:1791720000");
      expect(query.get("includeSpamTrash")).toBe("false");
      return HttpResponse.json({ threads: [{ id: "t-boiler" }], resultSizeEstimate: 999_999 });
    }),
    http.get(`${root}/threads/t-boiler`, ({ request }) => {
      expect(new URL(request.url).searchParams.get("format")).toBe("full");
      return HttpResponse.json(raw);
    }),
  );
  return { mail: gmailReader(auth, budget, { now: () => mailInstant }), budget };
}
function textPart(text: string, mimeType = "text/plain", extra = {}) {
  return {
    partId: "0",
    mimeType,
    filename: "",
    headers: [],
    body: { size: Buffer.byteLength(text), data: Buffer.from(text).toString("base64url") },
    ...extra,
  };
}
function single(payload: object, extra = {}) {
  return { id: "t-boiler", messages: [{ ...gmailMessage(), payload, ...extra }] };
}
it("retrieves read archived context, sent replies, and excludes drafts with source provenance", async () => {
  const { mail, budget } = setup();
  const result = await previewMail(
    { days: 30, maxThreads: 20 },
    { mail, budget, clock: { now: () => mailInstant } },
  );
  expect(result.report).toMatchObject({
    discoveryComplete: true,
    messagesNormalized: 2,
    draftsExcluded: 1,
    exitCode: 0,
  });
  expect(result.records[0]?.evidence).toEqual(threadRead().evidence);
  expect(result.records[0]?.observation.messages.map((m) => m.direction)).toEqual([
    "incoming",
    "sent",
  ]);
});
it("read-state/label/history changes do not change content fingerprints", async () => {
  const first = setup();
  const before = await first.mail.readThreadEvidence("t-boiler");
  const raw = gmailThread();
  raw.historyId = "999";
  raw.messages.reverse();
  for (const m of raw.messages)
    if (!m.labelIds.includes("DRAFT")) m.labelIds.push("UNREAD", "STARRED");
  const second = setup(raw);
  const after = await second.mail.readThreadEvidence("t-boiler");
  expect(fingerprint(before.evidence)).toBe(fingerprint(after.evidence));
  expect(after.observation.providerHistoryId).toBe("999");
});
it("prefers plain text within alternatives and preserves primary mixed sections", async () => {
  const { mail } = setup(
    single({
      partId: "",
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [textPart("<p>duplicate</p>", "text/html"), textPart("Primary\r\nQuote: keep me")],
        },
        textPart("Second section"),
      ],
    }),
  );
  const read = await mail.readThreadEvidence("t-boiler");
  expect(read.evidence.messages[0]?.body).toEqual({
    status: "complete",
    text: "Primary\nQuote: keep me\n\nSecond section",
  });
});
it("converts HTML-only text, entities, links and paragraphs without loading unsafe content", async () => {
  const { mail } = setup(
    single(
      textPart(
        '<p>Hello &amp; welcome</p><p><a href="https://example.invalid/action">Confirm</a></p><img src="https://example.invalid/tracker"><script>private-script</script><style>private-style</style>',
        "text/html",
      ),
    ),
  );
  const body = (await mail.readThreadEvidence("t-boiler")).evidence.messages[0]?.body;
  expect(body).toMatchObject({ status: "complete" });
  if (body && "text" in body) {
    expect(body.text).toContain("Hello & welcome\n\nConfirm");
    expect(body.text).toContain("https://example.invalid/action");
    expect(body.text).not.toMatch(/tracker|private-script|private-style/);
  }
});
it("reads separately stored text bodies and leaves PDF contents unread", async () => {
  const calls = vi.fn();
  server.use(
    http.get(`${root}/messages/m2/attachments/text-body`, () => {
      calls();
      return HttpResponse.json({ size: 6, data: Buffer.from("Stored").toString("base64url") });
    }),
  );
  const { mail } = setup(
    single({
      mimeType: "multipart/mixed",
      parts: [
        { partId: "0", mimeType: "text/plain", body: { size: 6, attachmentId: "text-body" } },
        {
          partId: "1",
          mimeType: "application/pdf",
          filename: "invoice.pdf",
          body: { size: 99, attachmentId: "must-not-read" },
        },
      ],
    }),
  );
  const read = await mail.readThreadEvidence("t-boiler");
  expect(calls).toHaveBeenCalledTimes(1);
  expect(read.evidence.messages[0]?.body).toEqual({ status: "complete", text: "Stored" });
  expect(read.evidence.messages[0]?.attachments).toEqual([
    { partId: "1", filename: "invoice.pdf", mimeType: "application/pdf", size: 99 },
  ]);
  expect(read.evidence.coverage).toEqual({
    messageBodies: "complete",
    attachmentContents: "not-read",
  });
});
it("represents attachment-only mail as empty text with unread attachment coverage", async () => {
  const { mail } = setup(
    single({
      partId: "0",
      mimeType: "application/pdf",
      filename: "only.pdf",
      body: { size: 20, attachmentId: "no-download" },
    }),
  );
  const read = await mail.readThreadEvidence("t-boiler");
  expect(read.evidence.messages[0]?.body).toEqual({ status: "empty", text: "" });
  expect(read.evidence.messages[0]?.attachments).toHaveLength(1);
});
it.each([
  { payload: { mimeType: "text/plain", body: { size: 0 } }, status: "empty" },
  { payload: { mimeType: "text/plain", body: { size: 1 } }, status: "unavailable" },
  {
    payload: textPart("xxx", "text/plain", { body: { size: 1, data: "%%%" } }),
    status: "unsupported",
  },
  {
    payload: textPart("bytes", "text/plain", {
      headers: [{ name: "Content-Type", value: "text/plain; charset=not-a-charset" }],
    }),
    status: "unsupported",
  },
  {
    payload: textPart("x", "text/plain", { body: { size: 2_000_000, data: "eA" } }),
    status: "too-large",
  },
  { payload: { mimeType: "multipart/encrypted", parts: [] }, status: "unsupported" },
])("distinguishes body coverage $status", async ({ payload, status }) => {
  const { mail } = setup(single(payload));
  const read = await mail.readThreadEvidence("t-boiler");
  expect(read.evidence.messages[0]?.body.status).toBe(status);
  expect(read.evidence.coverage.messageBodies).toBe(status === "empty" ? "complete" : "partial");
  if (status !== "empty") expect(() => fingerprint(read.evidence)).toThrow();
});
it("failed body-part reads remain unavailable rather than empty", async () => {
  server.use(
    http.get(
      `${root}/messages/m2/attachments/missing`,
      () => new HttpResponse(null, { status: 404 }),
    ),
  );
  const { mail } = setup(
    single({ mimeType: "text/plain", body: { size: 20, attachmentId: "missing" } }),
  );
  expect((await mail.readThreadEvidence("t-boiler")).evidence.messages[0]?.body).toEqual({
    status: "unavailable",
  });
});
it("decodes quoted/group addresses, reference headers and supported legacy charsets", async () => {
  const payload = textPart("", "text/plain", {
    headers: [
      { name: "From", value: '"Doe, Jane" <User@EXAMPLE.COM>' },
      { name: "To", value: "Team: me@example.com, other@example.com;" },
      { name: "Subject", value: "=?UTF-8?B?Q2Fmw6k=?=" },
      { name: "Message-ID", value: "<m2@example.com>" },
      { name: "In-Reply-To", value: "<m1@example.com>" },
      { name: "References", value: "<m0@example.com> <m1@example.com>" },
      { name: "Content-Type", value: 'text/plain; charset="windows-1252"' },
    ],
    body: { size: 4, data: Buffer.from([99, 97, 102, 233]).toString("base64url") },
  });
  const { mail } = setup(single(payload, { labelIds: [] }));
  const read = await mail.readThreadEvidence("t-boiler");
  expect(read.evidence.messages[0]).toMatchObject({
    from: [{ address: "User@example.com", name: "Doe, Jane" }],
    to: [{ address: "me@example.com" }, { address: "other@example.com" }],
    subject: "Café",
    messageIdHeader: "<m2@example.com>",
    inReplyTo: "<m1@example.com>",
    references: ["<m0@example.com>", "<m1@example.com>"],
    body: { status: "complete", text: "café" },
  });
  expect(read.observation.messages[0]?.direction).toBe("incoming");
});
it("does not invent direction for uncertain alias relationships", async () => {
  const { mail } = setup(single(textPart("Hello"), { labelIds: [] }));
  expect((await mail.readThreadEvidence("t-boiler")).observation.messages[0]?.direction).toBe(
    "unknown",
  );
});
it.each([
  { id: "" },
  { internalDate: "not-a-date" },
  { internalDate: "99999999999999999999999" },
  { threadId: "wrong" },
])("rejects malformed required message metadata", async (extra) => {
  const { mail } = setup(single(textPart("Keep me"), extra));
  await expect(mail.readThreadEvidence("t-boiler")).rejects.toThrow("invalid-data");
});
it("rejects excessive nesting, message counts and attachment metadata", async () => {
  let payload: object = textPart("Deep");
  for (let i = 0; i < 25; i++) payload = { mimeType: "multipart/mixed", parts: [payload] };
  const deep = setup(single(payload));
  await expect(deep.mail.readThreadEvidence("t-boiler")).rejects.toThrow("invalid-data");
  const many = setup(gmailThread(), { maxMessages: 2 });
  await expect(many.mail.readThreadEvidence("t-boiler")).rejects.toThrow("too-large");
  const missing = setup(
    single({ mimeType: "application/pdf", filename: "bad.pdf", body: { size: 1 } }),
  );
  await expect(missing.mail.readThreadEvidence("t-boiler")).rejects.toThrow("invalid-data");
});
it("detects HTML depth truncation and aggregate byte limits", async () => {
  const html = `${"<div>".repeat(25)}keep${"</div>".repeat(25)}`;
  const deep = setup(single(textPart(html, "text/html")));
  expect((await deep.mail.readThreadEvidence("t-boiler")).evidence.messages[0]?.body.status).toBe(
    "too-large",
  );
  const small = setup(single(textPart("Five!")), { maxEvidenceBytes: 4 });
  expect((await small.mail.readThreadEvidence("t-boiler")).evidence.messages[0]?.body.status).toBe(
    "too-large",
  );
});
it("provider errors do not retry and disappearing threads do not become empty", async () => {
  const { mail } = setup();
  const calls = vi.fn();
  server.use(
    http.get(`${root}/threads/t-boiler`, () => {
      calls();
      return new HttpResponse("secret", { status: 404 });
    }),
  );
  await expect(mail.readThreadEvidence("t-boiler")).rejects.toThrow("missing-thread");
  expect(calls).toHaveBeenCalledTimes(1);
});
it("bounds transport response bytes before parsing a large body", async () => {
  const { mail } = setup(gmailThread(), { maxResponseBytes: 100 });
  await expect(mail.readThreadEvidence("t-boiler")).rejects.toThrow("provider-error");
});
it("times out OAuth refresh as part of the same overall budget", async () => {
  const budget = new MailBudget({ deadlineMs: 20, requestTimeoutMs: 20 });
  budgets.push(budget);
  const auth = googleAuth({
    GOOGLE_CLIENT_ID: "fake",
    GOOGLE_CLIENT_SECRET: "fake",
    GOOGLE_REFRESH_TOKEN: "fake",
  });
  server.use(
    http.post("https://oauth2.googleapis.com/token", async () => {
      await delay(100);
      return HttpResponse.json({ access_token: "fake", expires_in: 3600 });
    }),
  );
  const mail = gmailReader(auth, budget, { now: () => mailInstant });
  await expect(mail.listThreads("after:1", undefined)).rejects.toThrow("deadline");
  expect(budget.requests).toBe(1);
});
it("skips recent draft-only activity without pulling old mail into eligibility", async () => {
  const raw = gmailThread();
  raw.messages.splice(1, 1);
  const { mail, budget } = setup(raw);
  const result = await previewMail(
    { days: 30, maxThreads: 20 },
    { mail, budget, clock: { now: () => mailInstant } },
  );
  expect(result.report).toMatchObject({ eligibleThreads: 0, skippedThreads: 1, draftsExcluded: 1 });
});
it("uses fixed queries across SDK pages and ignores misleading result estimates", async () => {
  const { mail, budget } = setup();
  const pages = vi.fn();
  server.use(
    http.get(`${root}/threads`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      expect(query.get("q")).toBe("after:1789127999 before:1791720000");
      pages();
      return HttpResponse.json(
        query.get("pageToken")
          ? { threads: [{ id: "t-boiler" }], resultSizeEstimate: 999 }
          : { threads: [{ id: "t-boiler" }], nextPageToken: "more", resultSizeEstimate: 1 },
      );
    }),
  );
  const result = await previewMail(
    { days: 30, maxThreads: 20 },
    { mail, budget, clock: { now: () => mailInstant } },
  );
  expect(pages).toHaveBeenCalledTimes(2);
  expect(result.report).toMatchObject({
    discoveryComplete: true,
    discoveredThreads: 1,
    exitCode: 0,
  });
});
it("disables OAuth helper retries and does not replay unauthorized SDK reads", async () => {
  const budget = new MailBudget();
  budgets.push(budget);
  const auth = googleAuth({
    GOOGLE_CLIENT_ID: "fake",
    GOOGLE_CLIENT_SECRET: "fake",
    GOOGLE_REFRESH_TOKEN: "fake",
  });
  const refresh = vi.fn();
  server.use(
    http.post("https://oauth2.googleapis.com/token", () => {
      refresh();
      return new HttpResponse(null, { status: 500 });
    }),
  );
  const mail = gmailReader(auth, budget, { now: () => mailInstant });
  await expect(mail.listThreads("after:1", undefined)).rejects.toThrow("provider-error");
  expect(refresh).toHaveBeenCalledTimes(1);
  const reads = vi.fn();
  const valid = setup();
  server.use(
    http.get(`${root}/threads`, () => {
      reads();
      return new HttpResponse(null, { status: 401 });
    }),
  );
  await expect(valid.mail.listThreads("after:1", undefined)).rejects.toThrow("provider-error");
  expect(reads).toHaveBeenCalledTimes(1);
});
it("rejects decoded size mismatch, invalid UTF-8 and excessive MIME part counts", async () => {
  const mismatch = setup(
    single(textPart("short", "text/plain", { body: { size: 100, data: "eA" } })),
  );
  expect(
    (await mismatch.mail.readThreadEvidence("t-boiler")).evidence.messages[0]?.body.status,
  ).toBe("unsupported");
  const invalidUtf8 = setup(single(textPart("", "text/plain", { body: { size: 1, data: "_w" } })));
  expect(
    (await invalidUtf8.mail.readThreadEvidence("t-boiler")).evidence.messages[0]?.body.status,
  ).toBe("unsupported");
  const many = setup(
    single({ mimeType: "multipart/mixed", parts: [textPart("One"), textPart("Two")] }),
    { maxParts: 2 },
  );
  await expect(many.mail.readThreadEvidence("t-boiler")).rejects.toThrow("invalid-data");
});
it("detects HTML child limits without silently accepting a prefix", async () => {
  const { mail } = setup(
    single(textPart(`<div>${"<span>item</span>".repeat(10_001)}</div>`, "text/html")),
  );
  expect((await mail.readThreadEvidence("t-boiler")).evidence.messages[0]?.body.status).toBe(
    "too-large",
  );
});
it("a timed-out SDK request is reported once and a malformed list is incomplete", async () => {
  const { mail, budget } = setup(gmailThread(), { requestTimeoutMs: 100 });
  // Prime mailbox identity before timing out the thread read.
  await mail.readThreadEvidence("t-boiler");
  const reads = vi.fn();
  server.use(
    http.get(`${root}/threads/t-boiler`, async () => {
      reads();
      await delay(300);
      return HttpResponse.json(gmailThread());
    }),
  );
  await expect(mail.readThreadEvidence("t-boiler")).rejects.toThrow("provider-error");
  expect(reads).toHaveBeenCalledTimes(1);
  expect(budget.signal.aborted).toBe(false);
  const malformed = setup();
  server.use(http.get(`${root}/threads`, () => HttpResponse.json({ threads: [{ id: "" }] })));
  const result = await previewMail(
    { days: 30, maxThreads: 20 },
    { ...malformed, clock: { now: () => mailInstant } },
  );
  expect(result.report).toMatchObject({
    discoveryComplete: false,
    reasons: ["invalid-data"],
    exitCode: 1,
  });
});
it("includes a recent already-read archived incoming message", async () => {
  const message = gmailMessage("read-incoming", "Please review the attached dates.");
  message.labelIds = [];
  message.payload.headers = [
    { name: "From", value: "service@example.com" },
    { name: "To", value: "me@example.com" },
  ];
  const { mail, budget } = setup({ id: "t-boiler", messages: [message] });
  const result = await previewMail(
    { days: 30, maxThreads: 20 },
    { mail, budget, clock: { now: () => mailInstant } },
  );
  expect(result.report).toMatchObject({
    eligibleThreads: 1,
    bodyStatuses: { complete: 1 },
    exitCode: 0,
  });
  expect(result.records[0]?.observation.messages[0]?.direction).toBe("incoming");
});
it("retains valid pre-epoch context rather than inventing timestamps", async () => {
  const raw = gmailThread();
  const older = raw.messages[0];
  if (older) older.internalDate = String(Date.parse("1969-12-31T12:00:00Z"));
  const { mail } = setup(raw);
  const read = await mail.readThreadEvidence("t-boiler");
  expect(read.evidence.messages[0]?.receivedAt).toBe("1969-12-31T12:00:00.000Z");
});
it("preserves unread inline calendar metadata without interpreting or fetching it", async () => {
  const { mail } = setup(
    single({
      mimeType: "multipart/mixed",
      parts: [
        textPart("Please confirm this invitation."),
        {
          partId: "1",
          mimeType: "text/calendar",
          body: { size: 20, attachmentId: "no-calendar-read" },
        },
      ],
    }),
  );
  const read = await mail.readThreadEvidence("t-boiler");
  expect(read.evidence.messages[0]?.attachments).toEqual([
    { partId: "1", filename: "", mimeType: "text/calendar", size: 20 },
  ]);
  expect(read.evidence.coverage.attachmentContents).toBe("not-read");
});
