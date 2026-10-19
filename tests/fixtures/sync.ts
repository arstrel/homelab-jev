import type { MailSyncState } from "../../src/domain/mail-sync.js";
import { mailInstant } from "./mail.js";

export function syncState(phase: MailSyncState["phase"] = "history"): MailSyncState {
  return {
    mailbox: "primary",
    phase,
    days: 30,
    windowSince: new Date("2026-09-11T12:00:00Z"),
    windowUntil: new Date(mailInstant),
    historyId: "10",
    pageToken: null,
    seenTokens: [],
    revision: 0,
    discoveryCheckedAt: null,
    evidenceSyncedAt: null,
    recoveryCount: 0,
    recoveryStartedAt: null,
    recoveryCompletedAt: null,
    previousHistoryId: null,
    historyGap: phase.startsWith("recovery-"),
  };
}
