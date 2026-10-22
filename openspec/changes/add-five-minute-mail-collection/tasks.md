# Tasks

## 1. Collector deployment

- [x] 1.1 Implement isolated reviewed-release preparation, private environment/schema preflight, escaped five-minute launchd configuration and install/start/stop/status controls; verify offline tests cover release isolation, rejected dirty/unreviewed/schema-incompatible candidates, stop/start, failed activation restoration and secret-safe diagnostics. Document the commands and login/rollback boundaries in the deployment runbook.

## 2. Delivery evidence

- [ ] 2.1 Update relevant README/OKF delivery claims and record bounded manual collection observations or the exact live blocker; verify document/OKF checks, full offline and disposable PostgreSQL gates. Keep recurring activation/catch-up acceptance explicitly pending until a merged release is observed, and deliver a PR.
