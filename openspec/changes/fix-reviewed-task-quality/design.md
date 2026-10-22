# Design

## Context

See proposal.md. Jev choices currently describe opaque IDs rather than their meaning. The provider warns that literal questions and indirection matter ([limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13)). This is a likely contributor, not a proven sole cause of the live false positives.

## Goals / Non-Goals

Improve the existing manual preview without adding a model, dependency, migration or automatic capture. General date extraction, matching and classifier calibration remain separate work.

## Decisions

- One request asks independent eligibility, sentence and project questions. Only an explicit outstanding-action eligibility result can produce a proposal; promotional, FYI, unconfirmed conditional and resolved/waiting results cannot.
- Criteria describe actual quoted source/project data with trusted boundary instructions. Dynamic data is not authority; code still restricts all choices to finite discovered IDs.
- A small deterministic source-title function replaces generic review-link text with `Review: <originating subject>`. Other generic clicks without supported review meaning/subject are omitted. Apply recomputes the same allowed titles against exact current evidence.
- Review policy becomes v2 and rejects v1 review files. The v1 source-scoped creation key remains unchanged so old ambiguous intents cannot be bypassed by a policy upgrade.
- Order stored samples by newest message timestamp, independent of retrieval order. No schema change. Fresh live checking uses a bounded recent Gmail read, stores only complete evidence with the existing ingestion adapter and previews only that selected sample.
- Explicit owner exclusions use sender and subject metadata before Jev and again on apply. A conversation is excluded only when every non-sent message matches the same narrow routine category; mixed direct correspondence remains eligible for judgment. A connected-Gmail one-off read-state cleanup uses the owner's authorization; the read-only worker does not silently acquire a write capability.

## Risks / Trade-offs

Semantic mistakes remain possible → explicit human task approval stays required. Conservative title filtering can miss unusual actions → skip rather than invent. Synthetic tests prove mechanics, not model quality → report the approved fresh preview separately. An old v1 review file fails validation → rerun preview rather than silently accepting its old decisions.
