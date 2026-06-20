# Отчёт Phase 00 — Discovery, ADRs, Platform Spikes

Дата: 2026-06-20
Статус: подтверждено владельцем 2026-06-20
Граница: Phase 01 не начинался.

## Что сделано

1. Изучены обязательные стартовые файлы: `AGENTS.md`, `README.md`, `codex/00_START_HERE_RU.md`, канонические `docs/en/*.md`, `plans/PHASE_00_DISCOVERY_AND_SPIKES.md`, `reference/OFFICIAL_SOURCES.md`.
2. Изучены machine-readable артефакты: `schemas/*.json`, `platform-policies/*.yaml`, preset `presets/chto-poest-armavir/*`, fixture `fixtures/telegram-donika.json`.
3. Прочитаны будущие phase-файлы только как контекст границ. Реализация Phase 01 не начиналась.
4. Создан exec-plan `docs/exec-plans/PHASE_00_DISCOVERY_AND_SPIKES.md`.
5. Созданы ADR:
   - `0001-monorepo-and-tooling.md`
   - `0002-browser-authentication.md`
   - `0003-workspace-isolation-and-future-rls.md`
   - `0004-transactional-outbox.md`
   - `0005-s3-direct-upload-and-delivery-urls.md`
   - `0006-ai-stt-embedding-provider-interfaces.md`
   - `0007-connector-capability-registry.md`
6. Обновлены открытые вопросы в `docs/OPEN_QUESTIONS.md` и `reference/OPEN_QUESTIONS.md`.
7. Добавлен минимальный Phase 00 каркас: `tools/phase00_spikes.py`, `tests/test_phase00_spikes.py`, `Makefile`, `requirements-phase00.txt`.
8. Сгенерированы локальные snapshots:
   - `spikes/snapshots/telegram-donika-rich-message.json`
   - `spikes/snapshots/max-donika-message.json`
   - `spikes/snapshots/instagram-donika-carousel.json`

## Найденные противоречия и открытые вопросы

### Противоречия или напряжение в спецификации

1. Глобальное правило качества требует миграции на каждом этапе, но Phase 00 не создаёт application schema. Решение: для Phase 00 явно зафиксировано `no migrations`.
2. `AGENTS.md` требует установить стандартные `make` команды уже в Phase 00, а реальный monorepo/toolchain относится к Phase 01. Решение: добавлены Phase 00-safe команды, которые выполняют contract checks или явные no-op.
3. Telegram Rich Messages теперь присутствуют в официальной Bot API документации, но production-safe поведение для конкретной раскладки всё равно требует live-проверки на канале и клиентах.
4. MAX policy допускает edit/delete и mixed media как ожидаемую возможность, но фактический лимит 10 mixed media для владельческого кейса не подтверждён live-тестом.
5. Instagram автопубликация зависит от внешних условий Meta: professional account, app ownership, OAuth, scopes, app review, quota. Без этих данных корректное состояние — `manual_required`/pending, а не claimed support.

### Открытые вопросы владельцу

1. Подтвердить или скорректировать 7 ADR перед Phase 01.
2. Предоставить Telegram bot token и тестовый канал с правами администратора.
3. Разрешить live Telegram Rich Message test для fixture `telegram-donika`.
4. Уточнить, какие Telegram клиенты нужны как доказательство: Android, iOS, Desktop, Web.
5. Предоставить MAX bot credentials и безопасный test chat/channel.
6. Разрешить MAX live spike на 10 mixed media.
7. Предоставить данные Instagram professional account и Meta app readiness.
8. Выбрать первый live text generation, STT и embedding provider.
9. Подтвердить домен, email provider, VPS, S3 provider, backup destination.
10. Подтвердить, что Phase 01 можно начинать только после принятия этого отчёта.

## Результаты platform spikes

### Telegram

- Fixture text count: 4 069 Unicode code points.
- Media: 7 image placeholders + 3 video placeholders = 10.
- Built payload mode: `rich_message`.
- Built method: `sendRichMessage`.
- Generated `<tg-collage>` with 10 HTTPS placeholder URLs.
- Rich HTML count: 5 215 code points, below documented 32 768 rich text limit.
- Live API call: not run, no credentials.
- External ID/screenshots: absent, not claimed.

### MAX

- Source fixture is 4 069 chars, above MAX text limit.
- Local contract variant removes cross-channel CTA lines and produces 3 893 chars.
- Built upload plan for 10 attachments: 7 images, 3 videos.
- Auth token is represented only in `Authorization` header and redacted.
- Readiness retry path records `attachment.not.ready`.
- Observed 10 mixed media capability: pending live test.
- Live API call: not run, no credentials.

### Instagram

- Built separate compact carousel caption: 641 chars, below 2 200.
- Built 10 carousel child payloads: 7 image, 3 video.
- Records required readiness fields as missing/not queried.
- Live API call: not run, no credentials and no approved Meta app readiness evidence.

## Проверки

1. `python3 tools/phase00_spikes.py --write-snapshots` — PASS, written 3 snapshots.
2. `python3 -m unittest discover -s tests` — PASS, 5 tests.
3. `make lint` — PASS, `compileall` over `tools tests`.
4. `make typecheck` — PASS, `compileall` over `tools tests`.
5. `make test` — PASS, 5 tests.
6. `make test-e2e` — PASS, 5 tests. In Phase 00 this reuses contract tests; real e2e belongs to later phases.
7. `make migrate` — PASS, explicit Phase 00 no-op.
8. `make seed` — PASS, explicit Phase 00 no-op.
9. `make openapi` — PASS, explicit Phase 00 no-op.
10. `make validate-spec` — PASS, `checks=58 files=89 errors=0`.

Environment note: the system `python3` lacked `PyYAML` and `jsonschema`, so Phase 00 dependencies were installed to `/private/tmp/phase00-python-deps` and documented in `requirements-phase00.txt`.

## Official source re-check

- Telegram Bot API on 2026-06-20 documents Bot API 10.1 Rich Messages, `RichBlockCollage`, and `sendRichMessage`.
- MAX docs on 2026-06-20 document `POST /messages`, 4 000 chars, `Authorization` header, upload tokens, `attachment.not.ready`, webhook HTTPS, and `X-Max-Bot-Api-Secret`.
- Instagram still requires a separate account/app/scopes/app-review readiness check before any live publication claim.

## Решения, требующие подтверждения

1. Принять ADR 0001-0007 как основу для Phase 01.
2. Согласиться, что Phase 00 не создаёт database migrations.
3. Согласиться, что Phase 00 Makefile no-op targets допустимы до реального Phase 01 toolchain.
4. Подтвердить Telegram Rich Message as primary path, но только после live evidence.
5. Подтвердить, что MAX 10 mixed media остаётся pending до live spike.
6. Подтвердить, что Instagram automation не считается готовой без Meta readiness.
7. Подтвердить список внешних доступов и тестовых аккаунтов.
8. Разрешить или отложить Phase 01.

## Рекомендация

Архитектурные предположения Phase 00 можно оставить без изменения, но Phase 01 не стоит начинать без явного подтверждения ADR и без решения, когда будут выданы тестовые доступы для Telegram, MAX и Instagram.
