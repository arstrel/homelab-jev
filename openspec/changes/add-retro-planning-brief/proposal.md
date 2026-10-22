# Proposal

## Why

The brief combines email and open tasks but misses the user's feedback about what actually happened. Add recent Retro context and narrow, inspectable judgments so planning can recognize progress without treating broad feedback as permission to complete tasks.

## What Changes

- Read recent Retro tasks and comments, including recently completed Retro entries, with source links and explicit bounded coverage.
- Add an explicit review option that uses Jev to distinguish finite actions, reusable activities, broad goals and unknowns, and associate specific feedback with current task candidates.
- Publish possible completion, waiting, progress and uncertain review suggestions alongside source evidence. Reusable options and broad goals remain available.
- Keep normal publication read-only, source-linked and honest about incomplete/disabled judgment. Reuse the existing Drive file and shared inference cap.

## Capabilities

### New Capabilities

- `retro-planning-context`: recent user feedback and bounded typed task-kind/match review in the Drive brief.

### Modified Capabilities

None. Parent Retro requirements and existing brief behavior are unarchived deltas; this adds a cohesive manual slice without claiming full planner integration.

## Impact

Brief domain/application/CLI, small Todoist/Jev adapters, tests, evaluation fixtures and runbooks/OKF. No dependency, database migration, task mutation, automatic completion, scheduler change or new service. Live Jev checks remain within the owner's remaining $2 allowance.
