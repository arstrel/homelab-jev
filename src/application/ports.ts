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
