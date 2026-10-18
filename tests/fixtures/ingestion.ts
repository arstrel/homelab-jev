import type { EvidenceSubmission } from "../../src/domain/stored-mail-evidence.js";
import { mailInstant, threadRead } from "./mail.js";

export function submission(): EvidenceSubmission {
  const read = threadRead();
  return {
    evidence: read.evidence,
    observation: read.observation,
    jobId: "10000000-0000-4000-8000-000000000001",
    policyVersion: "fixture/v1",
    availableAt: new Date(mailInstant),
  };
}
