# Proposal

## Why

The collector now runs, but Jev judgments are still ephemeral console previews. Publish a readable, source-linked email brief to the user's existing Drive so the first downstream artifact can be evaluated for usefulness.

## What Changes

- Add an explicit bounded `brief:publish` command over recent complete stored conversations, reusing validated Jev triage and honoring owner exclusions.
- Save judgments by exact evidence/model/policy identity and reuse them on repeat publication; retain failures for retry.
- Render templated Markdown sections for action, FYI, noise, waiting and uncertain cases with Gmail links, sample coverage, source timestamps and collection gaps.
- Create and update only one app-owned private `jev-current.md` using a durably reserved Drive ID; verify uploaded content before recording success.
- Keep this command manual. The installed collector, Todoist tasks and scheduled-task prompts remain unchanged. Use the user's remaining $2 live Jev allowance for verification.

## Capabilities

### New Capabilities

- `email-brief-publication`: bounded cached email triage and a truthful, private Drive Markdown artifact.

### Modified Capabilities

None. This delivers an email-only subset of the parent classification and handoff plan, not the full obligation/planner integration.

## Impact

CLI/domain/application code, PostgreSQL and Google Drive adapters, offline/database tests and documentation. Reuse existing classifications and write intents; avoid a new queue or service. No automatic task creation, Gmail mutation, prompt update, generated prose, or unattended model spending.
