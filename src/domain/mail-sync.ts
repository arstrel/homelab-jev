import type { MailFailure } from "./mail-evidence.js";

export interface MailSyncState {
  mailbox: string;
  phase: "bootstrap" | "history" | "recovery-required" | "recovery-bootstrap" | "recovery-mapped";
  days: number;
  windowSince: Date;
  windowUntil: Date;
  historyId: string;
  pageToken: string | null;
  seenTokens: string[];
  revision: number;
  discoveryCheckedAt: Date | null;
  evidenceSyncedAt: Date | null;
  recoveryCount: number;
  recoveryStartedAt: Date | null;
  recoveryCompletedAt: Date | null;
  previousHistoryId: string | null;
  historyGap: boolean;
}
export interface RetrievalWork {
  mailbox: string;
  threadId: string;
  generation: number;
  fromHistory: boolean;
  attempts: number;
}
export type RetrievalFailure = MailFailure | "partial-body";
export interface SyncOptions {
  days?: number;
  maxPages: number;
  maxThreads: number;
}
