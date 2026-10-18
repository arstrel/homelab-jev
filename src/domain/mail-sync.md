# Incremental discovery contract

`MailSyncState` records a frozen bootstrap window, history anchor/page continuation, durable token chain/revision and separate discovery/evidence timestamps. `RetrievalWork` is mailbox/thread/generation identity, distinct from a classification job. Only complete normalized evidence can create that job.

`MailSyncReader` adds bounded profile/history reads to the existing reader. `MailSyncSession` owns atomic page enqueue/state updates, exact evidence acknowledgement and retry metadata. A store grants one exclusive mailbox session on a dedicated database connection; losing the connection cancels requests and prevents further session commits. No SDK or storage rows belong to application ports.

The discovery cursor proves IDs were queued, not that evidence is complete. Full evidence freshness is bounded by the last exhausted history observation and advances only with an empty backlog. See the [design](../../openspec/changes/add-incremental-mail-sync/design.md).
