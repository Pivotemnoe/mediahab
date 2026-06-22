# UI Phase 10bd — отчёт

## Статус

Выполнен runtime-deploy для первого pilot smoke. Фаза остаётся открытой, потому что Telegram bot/channel, email и полный голосовой A -> B путь ещё не завершены.

## Что сделано

- Зафиксированы ответы владельца по pilot scope:
  - первый публичный тест: A -> B;
  - сайт на `temichev-posthub.ru`;
  - голос, медиа, OpenAI text/STT/embeddings и Timeweb S3 включаем в pilot path;
  - Telegram live подключается первым после создания отдельного тестового бота и канала;
  - MAX после Telegram;
  - Instagram позже / `manual_required`;
  - платежи остаются mock/manual.
- Найдены локальные источники:
  - `beri-segodnya` deployment docs для Caddy/PM2/VPS подхода;
  - OpenAI key в adjacent вет-бот `.env`;
  - заполненные Timeweb S3 переменные в старом локальном "Что поесть" `.env`.
- Проверено, что прямой SSH с локальным ключом `temichevvet_pwa_codex` к `root@89.169.46.92` и `deploy@89.169.46.92` не проходит.
- Найден рабочий jump-route:
  - локально ключ `~/.ssh/temichevvet_pwa_codex`;
  - первый hop: `root@5.129.239.104`;
  - второй hop с NL: `ssh -i ~/.ssh/temichevvet_gateway_to_ru -p 22065 root@127.0.0.1`;
  - целевой hostname: `msk-1-vm-d817`.
- Выполнен read-only аудит `msk-1-vm-d817`:
  - IP: `193.188.23.65`, `109.73.205.175`;
  - Ubuntu 24.04;
  - nginx слушает 80/443;
  - Docker запустил `chto-poest-armavir`, `chto-poest-armavir-v2` и Postgres;
  - проекты лежат в `/opt/chto-poest-armavir*` и `/opt/temichevvet`.
- Найдено критичное расхождение: `temichev-posthub.ru` сейчас DNS A -> `89.169.46.92`, а рабочий jump-route ведёт на другой RU host.
- Владелец создал отдельный reverse tunnel для `89.169.46.92` через NL host.
- Проверен новый доступ:
  - local key: `~/.ssh/mediahub_codex_deploy_20260622`;
  - proxy через `root@5.129.239.104`;
  - NL local port: `127.0.0.1:22089`;
  - target: `msk-1-vm-e21q`, `root`, `/root`.
- Выполнен read-only аудит `msk-1-vm-e21q`:
  - IP: `89.169.46.92`;
  - Ubuntu 24.04;
  - Caddy слушает 80/443;
  - `Бери сегодня` лежит в `/var/www/beri-segodnya` и запущен Node-процессом на `*:3010`;
  - Caddyfile содержит только `berisegodnya.ru`, `www.berisegodnya.ru` и fallback `http://89.169.46.92`.
- Настроен домен `temichev-posthub.ru` в Caddy без деплоя приложения:
  - создан backup `/etc/caddy/Caddyfile.backup-before-mediahub-20260622-100208`;
  - создан static placeholder `/var/www/media-hub-placeholder`;
  - добавлен host block `temichev-posthub.ru`;
  - добавлен redirect `www.temichev-posthub.ru -> https://temichev-posthub.ru{uri}`;
  - `caddy validate` и `systemctl reload caddy` прошли успешно.
- Подготовлен pilot runtime на `msk-1-vm-e21q`:
  - репозиторий: `/var/www/media-hub`;
  - commit: `92bc698`;
  - серверный `.env`: `/var/www/media-hub/.env`, права `600`;
  - серверный compose: `/var/www/media-hub/docker-compose.pilot.yml`;
  - Docker services: PostgreSQL, Redis, API, worker, web;
  - API порт только локально: `127.0.0.1:8120`;
  - web порт только локально: `127.0.0.1:3120`.
- В серверный `.env` перенесены значения OpenAI и Timeweb S3 только как protected env values. Секреты не печатались и не коммитились.
- Применены Alembic migrations до `phase11 billing launch`.
- Применён baseline seed из `database/seeds`.
- Caddy переключен с placeholder на приложение:
  - backup: `/etc/caddy/Caddyfile.backup-before-mediahub-runtime-20260622-101606`;
  - `https://temichev-posthub.ru/api/v1/*` -> `127.0.0.1:8120`;
  - остальные пути `https://temichev-posthub.ru/*` -> `127.0.0.1:3120`;
  - сохранён `X-Robots-Tag: noindex, nofollow`.

## Проверки

- `ls -la /Users/konstantin/Documents` — найден `New project`, `beri-segodnya`, `темичев вет бот`.
- `find ...` по соседним проектам — найдены deployment/access/env docs.
- SSH probe:
  - `root@89.169.46.92` — `Permission denied`;
  - `deploy@89.169.46.92` — `Permission denied`.
- SSH probe через NL:
  - `root@5.129.239.104` — успешно;
  - `root@127.0.0.1:22065` с NL host — успешно, target `msk-1-vm-d817`.
- SSH probe нового tunnel:
  - `root@127.0.0.1` через NL `127.0.0.1:22089` — успешно, target `msk-1-vm-e21q`.
- Read-only server audit — успешно, без изменений на сервере.
- `curl -sSI --max-time 20 http://temichev-posthub.ru/` — `308 Permanent Redirect` на HTTPS.
- `curl -sSI --max-time 30 https://temichev-posthub.ru/` — `200`, Caddy, `X-Robots-Tag: noindex, nofollow`.
- `node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru` — `ready=true`, blockers пустые.
- `docker compose -f docker-compose.pilot.yml ps` на VPS — `postgres`, `redis`, `api`, `worker`, `web` запущены; Postgres/Redis healthy.
- `docker compose -f docker-compose.pilot.yml run --rm api python -m alembic -c alembic.ini upgrade head` — успешно.
- `docker compose -f docker-compose.pilot.yml run --rm api python /app/tools/seed_baseline.py` — `Seeds applied from database/seeds`.
- `curl -fsS http://127.0.0.1:8120/api/v1/health/live` на VPS — `{"status":"ok","service":"api"}`.
- `curl -fsS http://127.0.0.1:8120/api/v1/health/ready` на VPS — `status=ok`, `environment=production`.
- `curl -I https://temichev-posthub.ru/` — `200`, Next app, `X-Robots-Tag: noindex, nofollow`.
- `curl -sS https://temichev-posthub.ru/api/v1/health/live` — `{"status":"ok","service":"api"}`.
- `curl -sS https://temichev-posthub.ru/api/v1/health/ready` — `status=ok`, `environment=production`.
- `curl -I https://berisegodnya.ru/` — `401` preview auth как до переключения; соседний сайт не сломан.
- Browser smoke:
  - `390x844` — виден русский Media Hub, CTA `Начать`, console errors `0`;
  - `1440x1000` — виден `MediaHub для обзоров и публикаций`, nav `Возможности`, `Тарифы`, `Безопасность`, `Контакты`, console errors `0`.
- Секреты не выводились и не коммитились.

## Миграции и API

- Миграции не требуются.
- Product API не менялся.

## Открытые ограничения

1. Web контейнер в pilot runtime использует `next dev`, а не production `next build/start`; это допустимо для технического smoke, но не для финального production.
2. Telegram test bot/channel ещё не созданы владельцем.
3. Email на домене Timeweb ещё не создан.
4. Backup/restore drill для production PostgreSQL ещё не выполнен.
5. Live голосовой A -> B путь через UI, OpenAI STT и Telegram ещё не проверен end-to-end.
6. Billing остаётся mock/manual, без настоящих списаний.

## Следующий рекомендуемый slice

Проверить первый пользовательский A -> B путь на публичном домене: регистрация/вход, создание материала, API-mode Content Studio, загрузка/голосовая запись, OpenAI STT/text smoke без Telegram live. После этого подключать отдельный Telegram test bot/channel.
