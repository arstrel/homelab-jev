import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { connect } from "../../src/adapters/postgres/client.js";
import { emailTaskDatabase } from "../../src/adapters/postgres/email-tasks.js";
import { mailEvidenceStore } from "../../src/adapters/postgres/mail-evidence.js";
import { applyMigrations } from "../../src/adapters/postgres/migrate.js";
import { applyEmailTasks, previewEmailTasks } from "../../src/application/email-tasks.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { emailTaskKey } from "../../src/domain/email-task.js";
import { taskProjects, taskResponse } from "../fixtures/email-task.js";
import { submission } from "../fixtures/ingestion.js";

const client = connect(testDatabaseUrl(process.env));
const db = emailTaskDatabase(client);
const store = mailEvidenceStore(client);
beforeAll(async () => {
  await applyMigrations(client);
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await client.pool.query(
    "truncate jev.mail_recovery_targets, jev.mail_retrievals, jev.mail_sync_state, jev.classifications, jev.task_links, jev.pending_jobs, jev.mail_evidence_versions, jev.sources, jev.checkpoints, jev.suppressions, jev.write_intents",
  );
  const input = submission();
  input.evidence.messages.splice(1);
  input.observation.messages.splice(1);
  await store.persistEvidence([input]);
});
async function preview(budget: MailBudget) {
  return (
    await previewEmailTasks(
      await db.sample(0),
      taskProjects,
      async () => taskResponse(),
      budget,
      new Date(),
    )
  ).review;
}
it("previews without writes, creates once and skips linked conversations even after completion", async () => {
  const budget = new MailBudget();
  try {
    const review = await preview(budget);
    expect(review.candidates).toHaveLength(1);
    expect(
      (await client.pool.query("select count(*)::int as n from jev.write_intents")).rows[0]?.n,
    ).toBe(0);
    const create = vi.fn(async () => "remote-task");
    const remote = { projects: async () => taskProjects, create };
    const apply = () =>
      db.exclusive((writer) => applyEmailTasks(review, [1], taskProjects, writer, remote, budget));
    expect(await apply()).toMatchObject([{ status: "created", taskId: "remote-task" }]);
    await client.pool.query("insert into jev.suppressions values ($1,'completed',now())", [
      emailTaskKey("t-boiler"),
    ]);
    expect(await apply()).toMatchObject([{ status: "linked", taskId: "remote-task" }]);
    expect(create).toHaveBeenCalledOnce();
    expect(await db.sample(0)).toEqual([]);
    expect((await client.pool.query("select state from jev.write_intents")).rows).toEqual([
      { state: "complete" },
    ]);
    expect((await client.pool.query("select state from jev.pending_jobs")).rows).toEqual([
      { state: "pending" },
    ]);
  } finally {
    budget.close();
  }
});
it("keeps uncertain creates durable across sessions and refuses blind replay or overlapping applies", async () => {
  const budget = new MailBudget();
  try {
    const review = await preview(budget);
    const create = vi.fn(async () => {
      throw new Error("response lost after remote accepted");
    });
    const apply = () =>
      db.exclusive((writer) =>
        applyEmailTasks(
          review,
          [1],
          taskProjects,
          writer,
          { projects: async () => taskProjects, create },
          budget,
        ),
      );
    expect(await db.exclusive(async () => apply())).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(await apply()).toEqual([{ candidate: 1, status: "ambiguous" }]);
    expect(await apply()).toEqual([{ candidate: 1, status: "ambiguous" }]);
    expect(create).toHaveBeenCalledOnce();
    expect(
      (await client.pool.query("select state,request_id from jev.write_intents")).rows[0],
    ).toMatchObject({ state: "ambiguous", request_id: expect.stringMatching(/^[a-f0-9-]{36}$/) });
    expect(
      (await client.pool.query("select count(*)::int as n from jev.task_links")).rows[0]?.n,
    ).toBe(0);
  } finally {
    budget.close();
  }
});
it("rejects evidence changed since review and rolls back settlement when the saved intent does not match", async () => {
  const budget = new MailBudget();
  try {
    const review = await preview(budget);
    const candidate = review.candidates[0];
    if (!candidate) throw new Error("fixture");
    await db.exclusive(async (writer) => {
      expect(await writer.reserve(candidate)).toMatchObject({ status: "ready" });
      await expect(writer.complete(candidate, randomUUID(), "unsettled-task")).rejects.toThrow(
        "intent-changed",
      );
    });
    expect(
      (await client.pool.query("select count(*)::int as n from jev.task_links")).rows[0]?.n,
    ).toBe(0);
    const input = submission();
    input.jobId = randomUUID();
    input.observation.observedAt = "2026-10-20T12:00:00.000Z";
    await store.persistEvidence([input]);
    const create = vi.fn();
    expect(
      await db.exclusive((writer) =>
        applyEmailTasks(
          review,
          [1],
          taskProjects,
          writer,
          { projects: async () => taskProjects, create },
          budget,
        ),
      ),
    ).toMatchObject([{ status: "stale-or-invalid-proposal" }]);
    expect(create).not.toHaveBeenCalled();
  } finally {
    budget.close();
  }
});
