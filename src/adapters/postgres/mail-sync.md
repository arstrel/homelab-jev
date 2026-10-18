# Synchronization persistence

Mailbox advisory ownership and every sync query/transaction use one dedicated connection. Error events cancel the session signal; finally destroys the connection rather than returning a lock-owning session to the pool. No provider calls occur inside transactions. The application uses the SDK-free sync session port.

`savePage` atomically enqueues IDs and performs a revision-checked state update. Rediscovery increments generation. `acknowledge` deletes only that generation and invokes shared exact evidence persistence in the same transaction; SQL failure restores the queue row and rolls back evidence/jobs. `retry` saves attempts, fixed failure and next-attempt time. `finish` advances evidence freshness only after history catch-up and an empty backlog, using the history observation time.

The discovery frontier is distinct from evidence completion and legacy checkpoints. See [operations](../../../docs/mail-sync.md), [evidence storage](mail-evidence.md) and [design](../../../openspec/changes/add-incremental-mail-sync/design.md).
