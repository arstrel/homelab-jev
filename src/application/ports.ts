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
