# Отчёт Phase 04 — контент, медиа и голос

## Что сделано

Phase 04 добавляет технический вертикальный срез контент-студии: материалы, блоки фактов, повторяемые группы, фиксацию фактов, версии, прямую загрузку медиа по подписанной ссылке, порядок медиа, голосовые ассеты и mock-расшифровку с принятием исправленного текста.

Фронтенд переведён в русскую видимую оболочку: продуктовая подпись — «Медиа-хаб», навигация кабинета — «Дашборд», «Создать», «Проекты», «Контент», «Публикации», «Медиа», «Настройки». Экран Phase 04 остаётся спокойным техническим прототипом, не финальным дизайном.

Phase 05 не начиналась: AI-сборка мастер-поста, крючки, оценки, платформенные варианты и публикации не реализованы.

## Найденные противоречия и открытые вопросы

1. В плане Phase 04 указаны mock и один live STT-провайдер, но ключи и выбранный live-провайдер не подтверждены. Реализован честный mock; запросы к live provider возвращают `503 stt_provider_unavailable`.
2. ТЗ требует S3-compatible direct upload, но production-провайдер, bucket naming, TTL подписанных ссылок и cleanup policy ещё не подтверждены. Сейчас API выдаёт mock-presigned URL и не принимает байты файлов через FastAPI.
3. Offline/reload в ТЗ шире текущей реализации. На сервере есть версии и optimistic conflict handling; полноценная локальная очередь браузера остаётся на будущую фазу.
4. `content_items.max` пока не заведён в тарифных сидовых данных, поэтому Phase 04 не добавляет новый entitlement-лимит на количество материалов.
5. Сроки хранения сырых голосовых заметок, фото/видео, расшифровок и исправленных фактов требуют отдельного подтверждения.
6. Финальный визуальный дизайн не выбран. Сейчас сделан русский технический дизайн для проверки сценария и API.

## Созданные файлы

- `apps/web/src/app/app/content/page.tsx`
- `apps/web/src/app/app/content/new/page.tsx`
- `apps/web/src/app/app/content/[contentId]/page.tsx`
- `apps/web/src/app/app/media/page.tsx`
- `apps/web/src/app/app/publications/page.tsx`
- `apps/web/src/app/app/settings/page.tsx`
- `apps/web/src/components/phase04/content-studio-shell.tsx`
- `database/migrations/versions/202606200004_phase04_content_media_voice.py`
- `docs/adr/0010-content-source-facts-media-and-transcription.md`
- `docs/exec-plans/PHASE_04_CONTENT_MEDIA_VOICE.md`
- `docs/exec-plans/PHASE_04_REPORT_RU.md`
- `services/api/app/api/v1/routes/content.py`
- `services/api/app/modules/content/__init__.py`
- `services/api/app/modules/content/service.py`
- `services/api/tests/test_content_media_voice.py`

## Изменённые файлы

- `apps/web/public/manifest.webmanifest`
- `apps/web/src/app/app/page.tsx`
- `apps/web/src/app/contacts/page.tsx`
- `apps/web/src/app/features/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/phase02/public-page.tsx`
- `apps/web/src/components/phase03/project-builder-shell.tsx`
- `SPEC_MANIFEST.json`
- `apps/web/src/generated-api/openapi.json`
- `docs/OPEN_QUESTIONS.md`
- `docs/adr/README.md`
- `packages/contracts/openapi/openapi.json`
- `reference/OPEN_QUESTIONS.md`
- `reference/VALIDATION_REPORT.md`
- `services/api/app/api/v1/router.py`
- `services/api/app/api/v1/routes/health.py`
- `services/api/app/core/config.py`
- `services/api/app/db/base.py`
- `services/api/app/main.py`
- `tools/e2e_smoke.py`

## Результаты тестов и проверок

- `.venv/bin/python -m compileall -q services/api/app services/api/tests database/migrations` — успешно.
- `.venv/bin/python -m unittest services/api/tests/test_content_media_voice.py` — 3 теста, успешно.
- `make openapi` — успешно, OpenAPI обновлён в `packages/contracts` и `apps/web`.
- `make test-e2e` — успешно, Phase 04 OpenAPI paths найдены.
- `make migrate` — успешно, локальная Postgres мигрирована `202606200003 -> 202606200004`.
- `make seed` — успешно, сиды применены.
- `make lint` — успешно.
- `make typecheck` — успешно.
- `make test` — 5 общих тестов и 17 API-тестов, успешно.
- `make validate-spec` — успешно, `checks=67 files=230 errors=0`.
- Docker rebuild из `/private/tmp/media-hub-docker-build` — успешно, контейнеры `media-hub-api-1`, `media-hub-web-1`, `media-hub-worker-1` пересозданы.
- Runtime smoke: `http://localhost:8100/api/v1/health/ready` вернул `phase04_content_media_voice`.
- Runtime smoke: `http://localhost:3100/app/content`, `/app/content/new`, `/app/media` вернули `200 OK`.
- Runtime OpenAPI с `http://127.0.0.1:8100/api/v1/openapi.json` содержит Phase 04 paths, missing list пустой, всего 68 paths.

## Решения, которые требуют подтверждения

1. Подтвердить live STT-провайдера и выдать тестовые credentials либо оставить только mock до Phase 05.
2. Подтвердить production object storage: провайдер, bucket, public base URL, TTL подписанных ссылок и cleanup policy.
3. Подтвердить финальное публичное имя: сейчас интерфейс использует «Медиа-хаб».
4. Подтвердить сроки хранения сырых медиа, голосовых файлов, расшифровок и исправленных фактов.
5. Подтвердить, достаточно ли текущего спокойного технического дизайна для дальнейшей разработки или нужен отдельный макет перед доводкой фронтенда.
