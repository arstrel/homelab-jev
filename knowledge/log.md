# Knowledge change log

## 2026-10-19

Reviewed mail retrieval and ingestion using Ponytail. Repaired shared Spam/Trash eligibility and nested encrypted-body coverage with reproducing synthetic tests, and corrected stale recovery implementation status. Reviewed the affected layering, checkpoint, recovery, sync and private-data claims before updating source snapshots; preserved unchanged generation timestamps, review deadlines and draft/unverified state. No operational mailbox or database writes were performed.

GitHub CI exposed an observation-fixture lock teardown race. Seeded typed state directly so the held-lock/snapshot test no longer races its own setup session closing; production ownership behavior is unchanged. Updated the test-isolation claim and source snapshot while preserving the review deadline and draft state.

Added read-only mail diagnostics and the bounded manual observation procedure. Reviewed the new port/SQL/report boundary, migration-readiness semantics, test isolation and pending live-evidence claims. Source snapshots follow reviewed code/docs; unchanged review deadlines and draft/unverified labels are preserved. Live synchronization acceptance remains an evidence-report result, not an implication of tooling delivery.

Added bounded expired-cursor recovery, durable mapped-target coverage and explicit unreplayed-history reporting. Reviewed changed sync, checkpoint, ledger, migration, test and delivery claims against implementation and synthetic tests. Reviewed unchanged classification, routing, manual-edit, Retro, planner, ownership, layering and release policies against the narrow product/design/schema changes before updating their snapshots. Meaningful-change timestamps advance only for changed claims; existing review deadlines and draft/unverified state remain intact. No operational migration, live recovery, scheduler or classifier quality is claimed.

## 2026-10-18

Added manual incremental sync, separate discovery/evidence freshness and durable retry/acknowledgement ownership. Reviewed checkpoint, ledger, layers, delivery, provider, migration, test and evaluation claims against current code. Updated reviewed snapshots deliberately; unchanged policy claims keep their meaningful-change timestamps, and existing review deadlines/draft status are preserved. Automatic cursor recovery, scheduled deployment and live synchronization are not claimed.

## 2026-10-17

Added durable evidence ingestion and reviewed ledger, layers, checkpoint handoff, delivery boundaries, remote-effect scope, migration compatibility, private database storage, testing and evaluation claims. Updated only reviewed concept snapshots and meaningful-change timestamps; retained existing review deadlines and draft/unverified state. No operational migration, live ingestion or classifier evaluation is claimed.

## 2026-10-11

Added the implemented Gmail evidence contract and revised layers, checkpoint/ledger handoff, delivery state, connection-check scope, development gates, evaluation boundaries, test isolation and privacy claims. Reviewed source snapshots deliberately for those changed concepts. Preserved existing review deadlines and draft/unverified status; no human verification or classifier-quality claim was added. Recorded sanitized live coverage, including unsupported/oversized bodies, rather than claiming complete synchronization.

## 2026-10-10

Initial Jev OKF v0.2 bundle, based on the supplied Drive deck/notes, pinned Google specification and merged Node/Drizzle foundation. Introduced grouped navigation and 25 draft concepts with delivery state, source snapshots and review deadlines. No human verification or production classifier integration is claimed.
