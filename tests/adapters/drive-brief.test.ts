import { HttpResponse, http } from "msw";
import { afterEach, expect, it } from "vitest";
import { driveBrief } from "../../src/adapters/drive-brief.js";
import { googleAuth } from "../../src/adapters/google.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { briefFile, briefGeneration, briefTime } from "../fixtures/email-brief.js";
import { server } from "../setup.js";

const root = "https://www.googleapis.com/drive/v3/files";
const upload = "https://www.googleapis.com/upload/drive/v3/files";
const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function setup(existing = false) {
  const budget = new MailBudget();
  budgets.push(budget);
  const auth = googleAuth({
    GOOGLE_CLIENT_ID: "fake",
    GOOGLE_CLIENT_SECRET: "fake",
    GOOGLE_REFRESH_TOKEN: "fake",
  });
  auth.setCredentials({ access_token: "fake", expiry_date: Date.now() + 1_000_000 });
  const state = {
    exists: existing,
    generation: "old",
    content: "old content",
    writes: 0,
    creates: 0,
    owner: "homelab-jev:email-brief:primary:v1",
    lost: false,
  };
  server.use(
    http.get(`${root}/generateIds`, () => HttpResponse.json({ ids: [briefFile] })),
    http.get(`${root}/${briefFile}`, ({ request }) => {
      if (!state.exists) return HttpResponse.json({ error: { code: 404 } }, { status: 404 });
      if (new URL(request.url).searchParams.get("alt") === "media")
        return HttpResponse.text(state.content);
      return HttpResponse.json({
        id: briefFile,
        name: "jev-current.md",
        mimeType: "text/markdown",
        trashed: false,
        appProperties: { jevOwner: state.owner, jevGeneration: state.generation },
      });
    }),
    http.post(upload, async ({ request }) => {
      state.creates++;
      expect(state.exists).toBe(false);
      const body = await request.text();
      expect(body).toContain(`"id":"${briefFile}"`);
      expect(body).not.toContain('"parents"');
      state.exists = true;
      state.generation = briefGeneration;
      state.content = "# new brief";
      if (state.lost) return HttpResponse.error();
      return HttpResponse.json({ id: briefFile });
    }),
    http.patch(`${upload}/${briefFile}`, async ({ request }) => {
      state.writes++;
      expect(await request.text()).toContain("# new brief");
      state.generation = briefGeneration;
      state.content = "# new brief";
      if (state.lost) return HttpResponse.error();
      return HttpResponse.json({ id: briefFile });
    }),
  );
  return { drive: driveBrief(auth, budget), state, budget };
}
it("allocates a stable ID, creates a private Markdown file and verifies exact content and generation", async () => {
  const { drive, state, budget } = setup();
  expect(await drive.allocate()).toBe(briefFile);
  await drive.write({ fileId: briefFile, lastPublished: null }, briefGeneration, "# new brief");
  expect(state.creates).toBe(1);
  expect(state.writes).toBe(0);
  expect(budget.requests).toBe(5);
});
it("recovers a lost create response with the reserved ID and never creates a duplicate", async () => {
  const { drive, state } = setup();
  state.lost = true;
  const destination = { fileId: briefFile, lastPublished: null };
  await expect(drive.write(destination, briefGeneration, "# new brief")).rejects.toThrow();
  expect(state.creates).toBe(1); // retries are disabled, even on transport failure
  state.lost = false;
  await drive.write(destination, briefGeneration, "# new brief");
  expect(state.creates).toBe(1);
  expect(state.writes).toBe(1);
});
it("updates only the verified owned file and refuses missing confirmed or foreign files", async () => {
  const { drive, state } = setup(true);
  const destination = {
    fileId: briefFile,
    lastPublished: { generation: briefGeneration, publishedAt: briefTime },
  };
  await drive.write(destination, briefGeneration, "# new brief");
  expect(state.writes).toBe(1);
  state.owner = "another-app";
  await expect(drive.write(destination, briefGeneration, "# new brief")).rejects.toThrow(
    "ownership",
  );
  state.exists = false;
  await expect(drive.write(destination, briefGeneration, "# new brief")).rejects.toThrow("missing");
  expect(state.creates).toBe(0);
  expect(state.writes).toBe(1);
});
it.each(["generation", "content"])("refuses to confirm mismatching remote %s", async (which) => {
  const { drive } = setup(true);
  server.use(
    http.get(`${root}/${briefFile}`, ({ request }) => {
      if (new URL(request.url).searchParams.get("alt") === "media")
        return HttpResponse.text("wrong content");
      return HttpResponse.json({
        id: briefFile,
        name: "jev-current.md",
        mimeType: "text/markdown",
        trashed: false,
        appProperties: {
          jevOwner: "homelab-jev:email-brief:primary:v1",
          jevGeneration: which === "content" ? briefGeneration : "wrong",
        },
      });
    }),
  );
  await expect(
    drive.write({ fileId: briefFile, lastPublished: null }, briefGeneration, "# new brief"),
  ).rejects.toThrow(`drive-${which}-mismatch`);
});
it("rejects oversized reports before any request", async () => {
  const { drive, budget } = setup();
  await expect(
    drive.write({ fileId: briefFile, lastPublished: null }, briefGeneration, "x".repeat(65537)),
  ).rejects.toThrow("too-large");
  expect(budget.requests).toBe(0);
});
