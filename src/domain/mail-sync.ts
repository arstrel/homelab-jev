import type { MailFailure } from "./mail-evidence.js";

export interface MailSyncState {
  mailbox: string;
  phase: "bootstrap" | "history" | "recovery-required";
  days: number;
  windowSince: Date;
  windowUntil: Date;
  historyId: string;
  pageToken: string | null;
  seenTokens: string[];
  revision: number;
  discoveryCheckedAt: Date | null;
  evidenceSyncedAt: Date | null;
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
