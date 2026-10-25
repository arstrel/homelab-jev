## Purpose

Automatically preprocess newly collected complete Gmail evidence for scheduled briefs within the owner's approved lifetime inference allowance.

## ADDED Requirements

### Requirement: Bounded automatic preprocessing

The scheduled refresh SHALL process at most ten due current evidence jobs, reuse exact cached results and deterministic exclusions, and persist decisions before cached-only publication. It SHALL defer failed jobs and exclude superseded evidence. It SHALL NOT create tasks or mutate Gmail.

#### Scenario: More jobs than display slots
- **WHEN** pending jobs exceed the brief display sample
- **THEN** successive cycles process additional due jobs independently of display membership

#### Scenario: Failed or superseded job
- **WHEN** a job cannot be classified or a newer evidence version exists
- **THEN** failure is deferred visibly and superseded evidence is not submitted

### Requirement: Durable lifetime allowance

The worker SHALL reserve conservative request cost durably before hosted inference, settle only validated usage, retain ambiguous charges across restarts, and stop new requests before exceeding the $2 total allowance including previous-usage provision. Budget exhaustion SHALL leave cached publication available.

#### Scenario: Crash or overlapping invocation
- **WHEN** a request fails, ownership is lost, or an invocation overlaps
- **THEN** reserved allowance is retained and overlapping work cannot duplicate hosted requests

#### Scenario: Insufficient allowance
- **WHEN** remaining allowance cannot cover a maximum request
- **THEN** no new request starts and cached publication continues with an explicit classification gap

### Requirement: Storage readiness before preprocessing effects

The worker SHALL verify managed schema readiness while holding publisher ownership before selecting preprocessing work, reserving inference cost or completing jobs. Missing, conflicting, newer or unavailable storage SHALL prevent preprocessing effects.

#### Scenario: Storage is incompatible or unavailable
- **WHEN** storage readiness is not confirmed ready while publisher ownership is held
- **THEN** no preprocessing request or write starts, and the existing publication path retains its own readiness checks
