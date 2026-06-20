# Temichev Media Hub — Codex-ready specification package

This package is the implementation handoff for a multi-tenant SaaS content studio that turns structured text or voice notes into reviewed, platform-specific publications for Telegram, MAX, Instagram, and future channels.

## Start here

1. Read `AGENTS.md`.
2. Read `docs/en/MASTER_SPEC.md`.
3. Read `docs/en/IMPLEMENTATION_PLAN.md`.
4. Run the prompt in `codex/00_START_HERE_EN.md`.
5. Execute only `plans/PHASE_00_DISCOVERY_AND_SPIKES.md` first.

The English specification is canonical because it is optimized for Codex. The Russian specification in `docs/ru/` is complete and is intended for product-owner review.

## Product position

The first configured project is **“Что поесть? Армавир”**, but the product itself is not a hardcoded food-channel tool. It is a project, rubric, prompt, example, platform, and publication constructor that users operate from the frontend.

## Important scope boundary

Users can create projects, rubrics, dynamic input forms, rules, prompts, examples, editorial limits, and manual/webhook destinations without a programmer. A new automatic social-network integration still requires a coded backend connector because every network has its own authentication, media upload, quota, error, editing, and deletion behavior.

## Included artifacts

- Root `AGENTS.md` for Codex.
- Full English and Russian technical specifications.
- Target repository tree, data model, API contract, AI pipeline, frontend UX, platform connector rules, security, billing, infrastructure, testing, and phased implementation plan.
- Machine-readable platform policies and the “Что поесть? Армавир” preset.
- JSON schemas for core configuration objects.
- Codex task prompts and phase-by-phase acceptance criteria.
- A real Telegram regression fixture: 4,069 text characters plus 10 mixed media items.
- Official documentation reference list, checked on 2026-06-20.
