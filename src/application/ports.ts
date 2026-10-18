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

export interface MailSyncReader extends MailReader {
  currentHistoryId(): Promise<string>;
  listHistory(
    anchor: string,
    pageToken: string | undefined,
  ): Promise<{
    ids: string[];
    historyId: string;
    nextToken?: string;
  }>;
}
export interface MailSyncSession {
  readonly signal: AbortSignal;
  state(): Promise<import("../domain/mail-sync.js").MailSyncState | undefined>;
  initialize(state: import("../domain/mail-sync.js").MailSyncState): Promise<void>;
  savePage(
    previous: import("../domain/mail-sync.js").MailSyncState,
    next: import("../domain/mail-sync.js").MailSyncState,
    ids: readonly string[],
    fromHistory: boolean,
    now: Date,
  ): Promise<void>;
  due(now: Date, limit: number): Promise<import("../domain/mail-sync.js").RetrievalWork[]>;
  acknowledge(
    work: import("../domain/mail-sync.js").RetrievalWork,
    evidence?: import("../domain/stored-mail-evidence.js").EvidenceSubmission,
  ): Promise<PersistenceCounts>;
  retry(
    work: import("../domain/mail-sync.js").RetrievalWork,
    failure: import("../domain/mail-sync.js").RetrievalFailure,
    availableAt: Date,
  ): Promise<void>;
  finish(caughtUp: boolean): Promise<{
    pending: number;
    retrying: number;
    state: import("../domain/mail-sync.js").MailSyncState;
  }>;
}
export interface MailSyncStore {
  exclusive<T>(
    mailbox: string,
    operation: (session: MailSyncSession) => Promise<T>,
  ): Promise<T | undefined>;
}
