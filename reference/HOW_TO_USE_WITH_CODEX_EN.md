# How to use this package with Codex

1. Unpack the archive into an empty working directory.
2. Initialize a Git repository before implementation so every Codex change can be reviewed and reverted.
3. Open the repository root in Codex. The root `AGENTS.md` is designed to load automatically.
4. Paste the contents of `codex/00_START_HERE_EN.md` as the first task.
5. Ask Codex to execute **Phase 00 only**. Do not ask it to build the full product in one run.
6. Review the Phase 00 ADRs, open questions, platform spike evidence, and any proposed changes to the specification.
7. Approve one phase at a time. For each phase, require migrations, tests, exact commands/results, documentation, and a clean diff review.
8. Provide real credentials only through environment variables or a secret manager. Never paste production secrets into Markdown or source files.
9. Keep the English documents canonical. Update the Russian translation when product behavior changes.
10. Re-run package or repository validation after changing YAML/JSON schemas or presets.

Recommended first user instruction after Phase 00 approval:

> Implement Phase 01 only. First write an execution plan under `docs/exec-plans/`, list assumptions and risks, then implement the smallest runnable vertical foundation. Run every required check from `AGENTS.md`, review the diff, and report exact results. Do not begin Phase 02.
