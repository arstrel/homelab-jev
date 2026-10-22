# Tasks

## 1. Read-only context and rendering

- [x] 1.1 Implement the bounded Todoist reader, project/Retro filtering, exact Gmail-link associations and escaped size-bounded task rendering. Verify paginated HTTP and domain tests for current task state, due values, exclusions, exact matches, incomplete/failing reads and hostile text; document the context and privacy limits.

## 2. Publication integration

- [x] 2.1 Wire fresh Todoist reads into the existing command and file with sanitized coverage and degraded publication behavior. Verify application/CLI tests for cached-only refresh, task change/removal between reads, failure visibility, cancellation and no extra inference or task writes; update the runbook and relevant OKF claims.

## 3. Integration evidence

- [ ] 3.1 Pass offline and disposable PostgreSQL gates, publish/read back the same private Drive file with cached-only inference and record sanitized Todoist coverage evidence. Verify exact-link/change behavior with controlled provider reads without mutating live tasks, and deliver a PR while leaving the collector and scheduled prompts intact.
