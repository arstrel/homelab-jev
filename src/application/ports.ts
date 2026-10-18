export interface Runtime {
  now(): Date;
  id(): string;
}
export interface LedgerStatus {
  checkpoints: number;
  pendingJobs: number;
  writeIntents: number;
}
export interface Ledger {
  status(): Promise<LedgerStatus>;
}

export interface PersistenceCounts {
  newVersions: number;
  newJobs: number;
  boundLegacyJobs: number;
}
export interface EvidenceStore {
  persistEvidence(
    records: readonly import("../domain/stored-mail-evidence.js").EvidenceSubmission[],
  ): Promise<PersistenceCounts>;
  evidenceForJob(
    jobId: string,
  ): Promise<
    | { status: "missing-job" | "missing-evidence" }
    | { status: "ready"; evidence: import("../domain/mail-evidence.js").ThreadEvidence }
  >;
}

/** SDK-free Gmail boundary; observations never imply durable synchronization. */
export interface MailReader {
  listThreads(
    query: string,
    pageToken: string | undefined,
  ): Promise<{
    ids: string[];
    nextToken?: string;
  }>;
  readThreadEvidence(threadId: string): Promise<import("../domain/mail-evidence.js").ThreadRead>;
}
