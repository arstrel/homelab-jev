import { completeBodies, mailFailure } from "../domain/mail-evidence.js";
import type { MailBudget } from "./mail-budget.js";
import type { EvidenceStore, MailReader, PersistenceCounts, Runtime } from "./ports.js";
import { type PreviewOptions, type PreviewReport, previewMail } from "./preview-mail.js";

export const ingestionPolicyVersion = "obligation-triage/v1";
export interface IngestionReport extends Omit<PreviewReport, "reasons"> {
  reasons: Array<PreviewReport["reasons"][number] | "persistence-error">;
  persistence: PersistenceCounts & {
    status: "committed" | "not-needed" | "failed" | "cancelled";
    completeEligibleThreads: number;
    reusedVersions: number;
  };
  checkpointAdvanced: false;
}
export async function ingestMail(
  options: PreviewOptions,
  deps: {
    mail: MailReader;
    store: EvidenceStore;
    clock: Runtime;
    budget: MailBudget;
  },
): Promise<IngestionReport> {
  const preview = await previewMail(options, deps);
  const complete = preview.records.filter((record) => completeBodies(record.evidence));
  const report: IngestionReport = {
    ...preview.report,
    reasons: [...preview.report.reasons],
    checkpointAdvanced: false,
    persistence: {
      status: "not-needed",
      completeEligibleThreads: complete.length,
      newVersions: 0,
      newJobs: 0,
      boundLegacyJobs: 0,
      reusedVersions: 0,
    },
  };
  try {
    deps.budget.assertActive();
  } catch (error) {
    const reason = mailFailure(error);
    if (!report.reasons.includes(reason)) report.reasons.push(reason);
    report.persistence.status = "cancelled";
    report.exitCode = 1;
    return report;
  }
  if (!complete.length) return report;
  try {
    const values = complete.map((read) => ({
      evidence: read.evidence,
      observation: read.observation,
      jobId: deps.clock.id(),
      policyVersion: ingestionPolicyVersion,
      availableAt: deps.clock.now(),
    }));
    const counts = await deps.store.persistEvidence(values);
    report.persistence = {
      ...counts,
      status: "committed",
      completeEligibleThreads: complete.length,
      reusedVersions: complete.length - counts.newVersions,
    };
  } catch {
    report.persistence.status = "failed";
    report.reasons.push("persistence-error");
    report.exitCode = 1;
  }
  report.reasons.sort();
  return report;
}
