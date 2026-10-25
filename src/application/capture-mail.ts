import {
  type CaptureInventory,
  type CaptureQuestion,
  captureAnswer,
  captureHash,
  captureQuestion,
  inventoryHash,
} from "../domain/automatic-capture.js";
import { briefInputHash, savedBriefSchema } from "../domain/email-brief.js";
import { type TaskCandidate, taskExclusion } from "../domain/email-task.js";
import { fingerprint } from "../domain/mail-evidence.js";
import type { PendingMailSession } from "./classify-pending-mail.js";
import type { BriefRecord } from "./email-brief.js";
import type { EmailTaskWriter } from "./email-tasks.js";
import type { MailBudget } from "./mail-budget.js";

export type CaptureRecord = BriefRecord;
export interface CaptureSession extends EmailTaskWriter {
  select(since: string, until: Date): Promise<CaptureRecord[]>;
  record(
    record: CaptureRecord,
    state: string,
    nextAt: Date | null,
    decision?: ReturnType<typeof captureAnswer>,
  ): Promise<void>;
  link(sourceId: string, taskId: string): Promise<void>;
}
export interface CaptureRemote {
  inventory(now: Date): Promise<CaptureInventory>;
  create(candidate: TaskCandidate, requestId: string): Promise<string>;
}
export async function captureMail(
  since: string,
  deps: {
    session: CaptureSession;
    allowance: Pick<PendingMailSession, "reserveInference" | "settleInference">;
    remote: CaptureRemote;
    judge: (q: CaptureQuestion, s: AbortSignal) => Promise<unknown>;
    budget: MailBudget;
    now: Date;
  },
) {
  const { session, remote, budget, now } = deps;
  const report = {
    selected: 0,
    created: 0,
    matched: 0,
    review: 0,
    skipped: 0,
    failed: 0,
    capped: 0,
    newRequests: 0,
    inputTokens: 0,
    budgetExhausted: false,
    ambiguous: false,
  };
  budget.assertActive();
  const inventory = await remote.inventory(now);
  const records = await session.select(since, now);
  if (records.length > 5) throw new Error("invalid-selection");
  report.selected = records.length;
  for (const record of records) {
    budget.assertActive();
    const conversation = record.conversation;
    const saved = savedBriefSchema.safeParse(record.saved);
    if (
      !conversation ||
      taskExclusion(conversation) ||
      fingerprint(conversation.evidence) !== record.fingerprint ||
      !saved.success ||
      saved.data.inputHash !== briefInputHash(record.fingerprint, conversation.directions) ||
      saved.data.decision.type !== "jev" ||
      saved.data.decision.result.answers.attention.choice !== "action" ||
      saved.data.decision.result.answers.lifecycle.choice !== "request"
    ) {
      report.skipped++;
      await session.record(record, "skipped", null);
      continue;
    }
    if (
      saved.data.decision.result.answers.attention.confidence < 0.95 ||
      saved.data.decision.result.answers.lifecycle.confidence < 0.95
    ) {
      report.review++;
      await session.record(record, "review", null);
      continue;
    }
    const exact = inventory.tasks.filter((t) => t.sourceIds.includes(record.sourceId));
    if (exact.length) {
      if (exact.length === 1 && exact[0]) {
        await session.link(record.sourceId, exact[0].id);
        report.matched++;
        await session.record(record, exact[0].completed ? "matched-completed" : "matched", null);
      } else {
        report.review++;
        await session.record(record, "review", null);
      }
      continue;
    }
    let answer: ReturnType<typeof captureAnswer>;
    try {
      const question = captureQuestion(conversation, inventory);
      budget.assertActive();
      if (!(await deps.allowance.reserveInference())) {
        report.budgetExhausted = true;
        break;
      }
      report.newRequests++;
      const raw = await budget.read(() => deps.judge(question, budget.signal));
      budget.assertActive();
      answer = captureAnswer(raw, question);
    } catch (error) {
      if (budget.signal.aborted) throw error;
      report.failed++;
      await session.record(record, "failed", new Date(now.getTime() + 3_600_000));
      continue;
    }
    await deps.allowance.settleInference(answer.usage.input_tokens);
    report.inputTokens += answer.usage.input_tokens;
    const current = await session.current(record.sourceId);
    if (
      !current ||
      fingerprint(current.evidence) !== record.fingerprint ||
      captureHash(record.fingerprint, current.directions) !==
        captureHash(record.fingerprint, conversation.directions)
    ) {
      report.review++;
      await session.record(record, "review", null, answer);
      continue;
    }
    if (answer.type !== "candidate" && answer.type !== "matched") {
      if (answer.type === "review") report.review++;
      else report.skipped++;
      await session.record(record, answer.type, null, answer);
      continue;
    }
    // Inventory changes invalidate the duplicate/routing decision. Preserve user
    // edits and review the case rather than writing against stale model context.
    const fresh = await remote.inventory(now);
    const latest = await session.current(record.sourceId);
    if (
      inventoryHash(fresh) !== inventoryHash(inventory) ||
      !latest ||
      fingerprint(latest.evidence) !== record.fingerprint ||
      captureHash(record.fingerprint, latest.directions) !==
        captureHash(record.fingerprint, conversation.directions)
    ) {
      report.review++;
      await session.record(record, "review", null, answer);
      continue;
    }
    if (answer.type === "matched") {
      if (!answer.taskId) throw new Error("invalid-match");
      await session.link(record.sourceId, answer.taskId);
      report.matched++;
      await session.record(
        record,
        inventory.tasks.find((t) => t.id === answer.taskId)?.completed
          ? "matched-completed"
          : "matched",
        null,
        answer,
      );
      continue;
    }
    const candidate = {
      ...answer.candidate,
      sourceId: record.sourceId,
      fingerprint: record.fingerprint,
    };
    const reservation = await session.reserve(candidate, 3);
    if (reservation.status === "capped") {
      report.capped++;
      await session.record(record, "capped", new Date(now.getTime() + 86_400_000));
      continue;
    }
    if (reservation.status !== "ready") {
      if (reservation.status === "ambiguous") {
        report.ambiguous = true;
        await session.record(record, "ambiguous", null);
        break;
      }
      report.skipped++;
      await session.record(record, "skipped", null);
      continue;
    }
    try {
      budget.assertActive();
      const taskId = await budget.read(() => remote.create(candidate, reservation.requestId));
      if (!taskId) throw new Error("missing-task-id");
      await session.complete(candidate, reservation.requestId, taskId);
      report.created++;
      // New tasks alter matching context. Stop and refresh on the next cycle.
      await session.record(record, "created", null, answer);
      break;
    } catch {
      report.ambiguous = true;
      await session.record(record, "ambiguous", null);
      break;
    }
  }
  return report;
}
