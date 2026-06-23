# UI Phase 11I — Universal Template Capture Flow

## Goal

Move the primary Content Studio UX from a Telegram-first pilot to a universal material wizard:
the user creates a material from a template, captures source blocks, lets AI assemble the master material,
then reviews platform versions and publishes selected outputs.

## Trigger

The owner clarified that the product object is a template-based material, not a Telegram post.
Telegram remains the first verified publication output, but it should no longer dominate the first screen.

## Scope

- Add a primary `Мастер материала` block to Content Studio.
- Show `Шаблон: Обзор места` with the expected user steps:
  1. Место и адрес
  2. Медиа
  3. Атмосфера
  4. Блюда
  5. Итог
  6. AI-блоки
  7. Версии платформ
  8. Публикация
- Rename visible pilot copy:
  - `Голосовой пилот` becomes `Сбор материала`.
  - `Мастер и Telegram` becomes `AI-сборка и версии`.
  - `Опубликовать в тестовый Telegram` is visible only inside the platform output block.
- Keep the existing technical studio, guided form, fact locks, previews, checks, and publication actions.
- On mobile, show one primary material path first and keep detailed panels collapsed.
- On desktop, keep the technical studio available and add the simple master block at the top/left.
- Extend the fixture visual smoke to assert the new mobile and desktop structure.

## Out of Scope

- Backend schema changes.
- Renaming existing preset rubrics in PostgreSQL or YAML.
- New MAX/Instagram publication actions.
- Full template-builder UI.
- Replacing the current Telegram connector or idempotency behavior.

## Assumptions

- The current backend already supports the needed content item, blocks, media, AI runs, variants, and Telegram publication contracts.
- `Обзор места` is a UX-level name for the first place-review capture template in this slice.
- Existing preset/database rubric names such as `Обзор недели` stay unchanged until the owner approves a data/config migration.
- The existing Telegram server actions are reused so live Telegram delivery is not reworked in this slice.

## Migrations

No database migration is planned.

## Tests

- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- `make test`
- `make validate-spec`
- `git diff --check`
- Visual smoke through `tools/check_content_fixture_visual_smoke.mjs`:
  - mobile 390px starts the primary path with `Мастер материала`;
  - mobile shows `Шаблон: Обзор места` and all eight steps;
  - mobile keeps facts/previews/checks in collapsed detail sections;
  - desktop 1440px keeps the technical studio with guided form, previews, fact locks, and checks.

## Risks

- Until backend exposes first-class template display names, the `Обзор места` label is a frontend UX label for the current place-review flow.
- Hidden mobile/desktop duplicate panels still add page weight; a later layout consolidation can remove this.
- The action names and backend messages still mention Telegram where the actual first connector is used.

## Rollback

- Revert this plan, the Content Studio copy/layout changes, the visual smoke assertions, and the Russian report.
- No data rollback is needed because this slice changes no schema and no persisted product configuration.
