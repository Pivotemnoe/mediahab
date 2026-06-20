# План разработки

Не поручать Codex весь продукт одной задачей. Каждый этап — отдельный проверяемый вертикальный срез с миграциями, тестами, документацией и демонстрацией.

## Этап 00 — анализ, ADR и platform spike

Подтвердить toolchain, создать ADR, проверить payload/контракты Telegram Rich Message, MAX и готовность Instagram, отдельно записать документированные и реально проверенные capabilities. Основной продукт пока не строить.

## Этап 01 — монорепозиторий

pnpm, `uv`, Next.js shell, FastAPI, OpenAPI client, PostgreSQL/pgvector, Redis, Celery, локальный MinIO, CI, Makefile, lint, typecheck, тесты, health и логи.

## Этап 02 — авторизация, workspace, entitlements

Регистрация, подтверждение, вход, сессии, reset, workspace owner, secure cookies, CSRF, rate limit, таблицы тарифов и usage, кабинет, лендинг и pricing-заглушка.

## Этап 03 — конструктор проектов и рубрик

CRUD и версии, динамические JSON Schema, мастер проекта, drag/drop рубрики, import/export/clone, импорт пресета «Что поесть? Армавир» без хардкода, mock AI-предложения.

## Этап 04 — студия, медиа, голос

ContentItem, блоки, повторяемые группы, autosave, revisions, пошаговый «Обзор недели», прямые S3 uploads, порядок медиа, диктофон, mock и один live STT, исправление и lock фактов.

## Этап 05 — примеры и AI

Импорт ручной/JSON/Telegram, approval, dedupe, metrics, embeddings, retrieval, адаптеры OpenAI/Yandex/GigaChat, минимум один live, extraction, master, hook, ratings, CTA, validators, история расхода и перегенерация секций.

## Этап 06 — варианты и ядро публикации

PlatformVariant, preview, счётчики, Publication/Attempt/outbox, idempotency, retry, schedule, manual export, generic webhook, частичный успех.

## Этап 07 — Telegram

Bot/channel connection, Rich Message HTML, signed URL, fallback, live fixture «У Доника», edit/delete/status и тесты.

## Этап 08 — MAX

Bot token, канал, uploads, ожидание готовности, publish/edit/delete, webhook inbox, 4000 знаков, тест 10 смешанных медиа.

## Этап 09 — Instagram

Meta OAuth, container flow, quota, image/carousel/Reel, permalink, 2200 знаков, `manual_required`. При отсутствии review — полный подготовленный ручной путь под feature flag.

## Этап 10 — календарь и усиление

Timezone, отмена, перенос, RLS, backup/restore, monitoring, runbooks, PWA offline/update, performance/security tests.

## Этап 11 — биллинг

Pricing, usage, upgrade, mock checkout, ручной тариф, интерфейс платёжного провайдера и webhook. Реальную оплату не включать без коммерческих и юридических решений.

## Этап 12 — расширения

Threads, YouTube, сайт, Telegram intake bot, команды и аналитика.

После каждого этапа Codex сообщает: выполненный scope, файлы и миграции, команды и результаты, live или mock тесты, безопасность, ограничения и следующий шаг.
