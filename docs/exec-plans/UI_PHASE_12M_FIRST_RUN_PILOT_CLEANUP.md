# UI Phase 12M — First-run pilot cleanup

## Status

Implementation and local acceptance completed on 2026-08-14. Its release candidate is included in Phase 12N and remains subject to the Phase 12N source and production gates.

## Goal

Make the authenticated product understandable to a first tester without exposing implementation language or duplicate calls to action:

`register -> see a short optional tour -> dictate or save a note -> assemble platform versions -> review the result`

## Audit evidence

- Current production was captured at desktop width and at `390 × 844` under `output/audit-2026-08-14/`.
- The primary voice, notebook, ideas, style, account, and registration surfaces were inspected from fresh screenshots and DOM state.
- The current release branch is synchronized with its remote head, while GitHub `main`, CI, branch protection, and the draft PR are not yet pilot-release ready.

## Confirmed problems

- No first-run walkthrough is shown after authentication.
- The mobile header and bottom navigation both expose `Создать`, but the two controls behave differently.
- Mobile primary navigation omits `Мой стиль` even though style examples are a core product promise.
- The dashboard repeats notebook actions three times and exposes subscription counters before the first useful result.
- The composer exposes disabled recording controls before recording starts, an AI token/cost panel, an implementation-source footer, and several configuration-oriented labels.
- The style page repeats the same dictation and advanced-settings destinations.
- The account page exposes phase names, `api`, `Workspace`, cookie/CSRF/Argon2id wording, and raw browser user-agent strings.
- Several secondary routes expose phase badges and data-mode labels. They should remain reachable for internal verification but must not be promoted to first testers.
- `tmp/` and `output/` are not ignored by Git or Docker build context.

## Product decisions

- Add a three-step, dismissible first-run tour inside the authenticated shell: `Создать`, `Блокнот`, and `Мой стиль`. Ideas stays hidden while its backend capability is disabled.
- Store only the non-sensitive tour completion flag in local browser storage under a versioned key. This is a pilot limitation: completion is per browser, not per account.
- Include `Пропустить`, `Назад`, `Далее`, and a final `Начать` action. The account page provides a plain-language way to show the tour again.
- On mobile, use one primary navigation model: `Создать`, `Черновики`, `Блокнот`, `Мой стиль`. The logo remains the route to the home screen.
- Remove the mobile quick-create palette from the header. Its incomplete secondary actions remain available through direct internal routes, not the first-run shell.
- Keep one notebook call to action on the dashboard and keep plan/usage accounting out of the home creation surface. Existing billing records and endpoints remain unchanged.
- Hide pause/resume/finish controls until they are relevant to the active recording state.
- Remove the per-operation AI token/cost disclosure from the composer. Usage accounting remains stored and can later feed a separate human-readable `Сводка` surface.
- Replace technical copy with observable user outcomes. Do not remove security controls, accounting, provenance, or audit data from backend storage.
- Preserve all content revisions, examples, media, publications, projects, accounts, and stateful services.

## Frontend scope

- Add a reusable client-side first-run tour to `CabinetShell`.
- Align mobile and desktop primary navigation and add stable tour targets.
- Simplify dashboard, style, composer, account, and secondary page headers.
- Convert session user agents into short labels such as `Mac · Chrome` and `iPhone · Safari`.
- Add a focused static contract check for tour controls, removed technical labels, relevant recording controls, and the mobile navigation set.

## Backend and data scope

- No database migration.
- No API DTO or OpenAPI change.
- No change to auth cookies, CSRF enforcement, password hashing, generation providers, usage ledger, publication logic, or immutable revision history.

## Acceptance

- A browser without the versioned completion flag sees the three-step tour on the first authenticated route.
- `Пропустить` and `Начать` dismiss the tour and prevent it from reopening on later navigation in that browser.
- `Показать обучение ещё раз` reopens the tour without deleting content or account data.
- Mobile never shows two different visible `Создать` controls at once.
- Mobile primary navigation includes `Мой стиль`, omits disabled Ideas, and the brand mark returns to the home screen.
- Dashboard contains one notebook action and no plan/usage meter.
- Before recording, no disabled `Пауза`, `Продолжить`, or `Закончить фрагмент` buttons are visible.
- The primary composer and account contain none of: `Этап UI`, `api`, `Workspace`, `CSRF`, `Argon2id`, `Технические сведения об ИИ`, or `Источник: проект`.
- Account sessions use understandable device/browser labels and do not expose raw user-agent strings.
- Existing source rebuild, footer-link, standalone ideas, offline notebook, and platform-limit contracts remain green.
- Mobile and desktop screenshots are captured after the implementation and inspected before handoff.

## Verification

- `node tools/check_phase12m_pilot_ui_contract.mjs`
- Existing Phase 12K/12L and primary visual contract checks.
- Web lint and TypeScript checks.
- Production Next build.
- Relevant backend tests to prove no regression in auth, notebook, ideas, editorial surface, and platform limits.
- Browser acceptance at desktop width and `390 × 844`.

## Verification results — 2026-08-14

- `make lint` — passed.
- `make typecheck` — passed.
- `make test` — passed: five top-level tests, all UI contracts, and 168 API tests.
- `NEXT_PUBLIC_DATA_MODE=fixtures pnpm --filter @temichev/web build` — passed with Next.js 15.5.21; 35 routes built.
- `pnpm audit --prod` — no known vulnerabilities after updating Next.js/PostCSS and pinning patched PostCSS/Sharp resolutions.
- `git diff --check` — passed.
- Browser acceptance — passed for the three tour steps, skip/completion persistence, account replay, single mobile `Создать`, hidden idle recording controls, cleaned account copy, and desktop/mobile layouts.
- Post-change screenshots were captured as `10-local-onboarding-mobile.png`, `11-local-onboarding-replay-desktop.png`, and `12-local-composer-mobile.png` under `output/audit-2026-08-14/`.
- Non-blocking test warnings remain for Starlette `TestClient` deprecation and one Pydantic unsupported-field-attribute warning.

## Pilot-readiness conclusion

The UI cleanup itself is accepted locally, but the application is not ready for unsupervised external testers. The next stabilization slice must close public self-registration or add an allowlist/pre-created accounts, connect verification and password recovery end to end, remove fixture fallback from every API-mode service, keep unfinished publication/integration routes hidden until the durable worker exists, replace legal placeholders, add CI/branch protection/review/tagging, and pass a real iPhone microphone/background/offline check.

## Risks and rollback

- Local-storage completion does not follow a tester to another device. A later account preference can replace it without a migration in this phase.
- Removing unfinished navigation can make internal routes less discoverable. Direct URLs remain available and the change is reversible in `navigation.ts`.
- Simplified labels can hide useful diagnostics. Diagnostics remain in logs and backend records, not in the first-user surface.
- Rollback is a stateless web-code rollback. No schema downgrade, data restore, or stateful-service restart is required.

## Explicitly deferred release gates

- Update and review the draft PR description through Phase 12M.
- Decide whether the public repository is appropriate for a closed pilot.
- Add CI and required branch protection, merge the release line into the default branch, and create an immutable pilot tag.
- Replace placeholder privacy and terms pages with owner-approved pilot documents.
- Run a real iPhone microphone/offline test and a full real-account registration/email-recovery test.
- Approve the exact production target and stateless containers before any deployment.
