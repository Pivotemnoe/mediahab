# Initial Codex task

Read, in this order:

1. `AGENTS.md`
2. `README.md`
3. `docs/en/MASTER_SPEC.md`
4. `docs/en/IMPLEMENTATION_PLAN.md`
5. `docs/en/ACCEPTANCE_CRITERIA.md`
6. `plans/PHASE_00_DISCOVERY_AND_SPIKES.md`
7. `reference/OFFICIAL_SOURCES.md`

Then do **Phase 00 only**.

Required output before writing production code:

- Restate the product boundaries in no more than 20 bullets.
- List contradictions, missing credentials, and technical assumptions.
- Create ADRs for monorepo layout, authentication, multitenancy, job durability, media delivery, and provider adapters.
- Produce an executable Phase 00 plan.
- Scaffold only what Phase 00 requires.
- Implement contract tests or spike scripts for Telegram Rich Messages, MAX publication, and Instagram publishing readiness.
- Use mocks when credentials are unavailable; do not pretend a live test succeeded.
- Run all established checks and report exact results.

Do not implement later phases until Phase 00 acceptance criteria pass and the product owner approves the findings.
