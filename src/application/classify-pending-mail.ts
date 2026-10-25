import {
  briefInputHash,
  briefModel,
  briefPolicy,
  type SavedBriefDecision,
  savedBriefSchema,
} from "../domain/email-brief.js";
import { taskExclusion } from "../domain/email-task.js";
import { triageResult, triageState } from "../domain/mail-triage.js";
import type { BriefRecord, BriefSession } from "./email-brief.js";
import { MailBudget } from "./mail-budget.js";
import type { MailTriage } from "./ports.js";

// Default context, no long-context header. $0.042/M input, output free.
// https://docs.typesafe.ai/models checked 2026-10-25. Use integer nanodollars.
export const inferenceAllowance = {
  id: "owner-approved-two-dollars/v1",
  limit: 2_000_000_000,
  previous: 10_000_000,
  request: 64_000 * 42,
  perToken: 42,
} as const;
export interface PendingMailSession extends Pick<BriefSession, "save"> {
  pending(now: Date, limit: number): Promise<BriefRecord[]>;
  defer(record: BriefRecord, until: Date): Promise<void>;
  reserveInference(): Promise<boolean>;
  settleInference(inputTokens: number): Promise<void>;
}
export async function classifyPendingMail(
  session: PendingMailSession,
  triage: MailTriage,
  now: Date,
  signal: AbortSignal,
) {
  const report = {
    selected: 0,
    classified: 0,
    cached: 0,
    excluded: 0,
    failed: 0,
    newRequests: 0,
    inputTokens: 0,
    budgetExhausted: false,
  };
  const budget = new MailBudget({ maxRequests: 10, deadlineMs: 70_000 }, signal);
  try {
    const records = await session.pending(now, 10);
    if (records.length > 10) throw new Error("invalid-selection");
    report.selected = records.length;
    for (const record of records) {
      budget.assertActive();
      const conversation = record.conversation;
      if (!conversation) {
        report.failed++;
        await session.defer(record, new Date(now.getTime() + 3_600_000));
        continue;
      }
      const inputHash = briefInputHash(record.fingerprint, conversation.directions);
      const rule = taskExclusion(conversation);
      const cached = savedBriefSchema.safeParse(record.saved);
      let decision: SavedBriefDecision["decision"];
      if (
        cached.success &&
        cached.data.inputHash === inputHash &&
        (rule
          ? cached.data.decision.type === "owner-rule" && cached.data.decision.reason === rule
          : cached.data.decision.type === "jev")
      ) {
        decision = cached.data.decision;
        report.cached++;
      } else if (rule) {
        decision = { type: "owner-rule", reason: rule };
        report.excluded++;
      } else {
        // Validate before reserving money; invalid evidence costs nothing.
        let state: ReturnType<typeof triageState>;
        try {
          state = triageState(conversation.evidence, conversation.directions);
        } catch {
          report.failed++;
          await session.defer(record, new Date(now.getTime() + 3_600_000));
          continue;
        }
        budget.assertActive();
        if (!(await session.reserveInference())) {
          report.budgetExhausted = true;
          break;
        }
        let result: ReturnType<typeof triageResult>;
        try {
          budget.assertActive();
          report.newRequests++;
          const raw = await budget.read(() => triage.judge(state, briefModel, budget.signal));
          budget.assertActive();
          result = triageResult(raw, briefModel);
          if (result.usage.input_tokens > 64_000) throw new Error("unexpected-usage");
        } catch (error) {
          if (budget.signal.aborted) throw error;
          // Ambiguous calls keep the maximum charge, including across restarts.
          report.failed++;
          await session.defer(record, new Date(now.getTime() + 3_600_000));
          continue;
        }
        // Database failures stop the run; never repeat a settlement after ambiguity.
        await session.settleInference(result.usage.input_tokens);
        report.inputTokens += result.usage.input_tokens;
        decision = { type: "jev", result };
        report.classified++;
      }
      await session.save(record, { policy: briefPolicy, inputHash, decision });
    }
    return report;
  } finally {
    budget.close();
  }
}
