import { MailReadError } from "../domain/mail-evidence.js";
import {
  TriageError,
  type TriageModel,
  triageModels,
  triagePolicy,
  triageResult,
  triageState,
} from "../domain/mail-triage.js";
import type { MailBudget } from "./mail-budget.js";
import type { MailTriage, Runtime, TriageEvidenceReader } from "./ports.js";

export interface TriageOptions {
  maxJobs: number;
  model: TriageModel;
}
export function validateTriageOptions(options: TriageOptions) {
  if (
    !Number.isInteger(options.maxJobs) ||
    options.maxJobs < 1 ||
    options.maxJobs > 20 ||
    !triageModels.includes(options.model)
  )
    throw new Error("Invalid triage options");
}
export async function triageMail(
  options: TriageOptions,
  deps: {
    reader: TriageEvidenceReader;
    triage: MailTriage;
    budget: MailBudget;
    clock: Pick<Runtime, "now">;
  },
) {
  validateTriageOptions(options);
  const started = deps.clock.now().getTime();
  type Result =
    | { sample: number; status: "judged"; result: ReturnType<typeof triageResult> }
    | { sample: number; status: "failed"; reason: string };
  const results: Result[] = [];
  const usage = { input_tokens: 0, output_tokens: 0 };
  let selected = 0;
  let selectionFailure = false;
  try {
    deps.budget.assertActive();
    const records = await deps.reader.pending(options.maxJobs);
    selected = records.length;
    if (selected > options.maxJobs) throw new Error("Invalid selection");
    for (const [index, record] of records.entries()) {
      try {
        deps.budget.assertActive();
        if (record.status !== "ready") throw new TriageError(record.status);
        const state = triageState(record.evidence, record.directions);
        const raw = await deps.budget.read(() =>
          deps.triage.judge(state, options.model, deps.budget.signal),
        );
        deps.budget.assertActive();
        const result = triageResult(raw, options.model);
        if (
          !Number.isSafeInteger(usage.input_tokens + result.usage.input_tokens) ||
          !Number.isSafeInteger(usage.output_tokens + result.usage.output_tokens)
        )
          throw new TriageError("invalid-result");
        usage.input_tokens += result.usage.input_tokens;
        usage.output_tokens += result.usage.output_tokens;
        results.push({ sample: index + 1, status: "judged", result });
      } catch (error) {
        const reason = deps.budget.signal.aborted
          ? deps.budget.signal.reason instanceof MailReadError
            ? deps.budget.signal.reason.reason
            : "cancelled"
          : error instanceof TriageError
            ? error.reason
            : "provider-error";
        results.push({ sample: index + 1, status: "failed", reason });
        if (deps.budget.signal.aborted) break;
      }
    }
  } catch {
    selectionFailure = true;
  }
  return {
    schemaVersion: "mail-triage-preview/v1",
    policyVersion: triagePolicy,
    requestedModel: options.model,
    modelIdentity: "pinned-revision",
    calibration: "uncalibrated",
    selectedJobs: selected,
    judgedJobs: results.filter((r) => r.status === "judged").length,
    selectionFailure,
    results,
    usage,
    durationMs: Math.max(0, deps.clock.now().getTime() - started),
    databaseWrites: 0,
    downstreamWrites: 0,
    jobsConsumed: 0,
    exitCode: selectionFailure || results.some((r) => r.status === "failed") ? 1 : 0,
  };
}
