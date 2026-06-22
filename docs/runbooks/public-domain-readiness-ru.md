# Public Domain Readiness Runbook — temichev-posthub.ru

## Цель

Этот runbook описывает минимальные проверки перед первой выкладкой Media Hub на публичный домен `temichev-posthub.ru`.

Это не инструкция “деплоить сейчас”. Публичная выкладка допустима только после прохождения проверок ниже и явного решения по секретам, HTTPS, базе, S3, email, backup и live-интеграциям.

## Текущий статус домена

- Домен: `temichev-posthub.ru`.
- По скриншоту Timeweb DNS: A record указывает на `89.169.46.92`.
- HTTP отвечает от Caddy и редиректит на `https://temichev-posthub.ru/`.
- HTTPS настроен 2026-06-22: `https://temichev-posthub.ru/` отвечает `200` с временным noindex placeholder.
- Это ещё не deploy Media Hub приложения. Следующий шаг — отдельный runtime layout и reverse proxy на web/API.
- Рабочий доступ к VPS `89.169.46.92` найден через reverse tunnel:
  - local key: `~/.ssh/mediahub_codex_deploy_20260622`;
  - jump host: `root@5.129.239.104`;
  - tunnel endpoint на NL: `127.0.0.1:22089`;
  - target hostname: `msk-1-vm-e21q`.
- На VPS уже работает `Бери сегодня`: `/var/www/beri-segodnya`, порт `3010`, Caddy host blocks `berisegodnya.ru` и `www.berisegodnya.ru`.
- Backup Caddyfile перед добавлением домена: `/etc/caddy/Caddyfile.backup-before-mediahub-20260622-100208`.
- Добавлены отдельные Caddy blocks:
  - `temichev-posthub.ru` -> static placeholder `/var/www/media-hub-placeholder`;
  - `www.temichev-posthub.ru` -> redirect на apex domain.

## Быстрая диагностика

Из корня репозитория:

```bash
node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru --allow-https-failure
```

Флаг `--allow-https-failure` допустим только для фиксации текущего неполного состояния. Перед выкладкой команда должна проходить без этого флага:

```bash
node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru
```

Если локальный DNS временно нестабилен, можно явно указать IP из DNS-панели:

```bash
node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru --resolve-ip 89.169.46.92 --allow-https-failure
```

Read-only SSH через tunnel:

```bash
ssh -i ~/.ssh/mediahub_codex_deploy_20260622 \
  -o HostKeyAlias=mediahub-89-via-nl-22089 \
  -o ProxyCommand='ssh -i ~/.ssh/temichevvet_pwa_codex -W 127.0.0.1:22089 root@5.129.239.104' \
  root@127.0.0.1 'hostname; whoami; pwd'
```

Минимально успешное состояние перед выкладкой:

- `http://temichev-posthub.ru` отвечает 301/302/307/308 и ведёт на HTTPS.
- `https://temichev-posthub.ru` отвечает без TLS ошибки.
- Сертификат доверенный для обычного браузера.
- Caddy/Nginx проксирует web и API в согласованной same-site схеме.
- Operator имеет SSH/панельный доступ к серверу, чтобы проверить Caddyfile, ACME/certificate logs и target upstreams.

## Предпочтительная первая topology

Для первого личного pilot предпочтителен same-site deployment:

- Web: `https://temichev-posthub.ru`
- API: `https://temichev-posthub.ru/api/v1`
- Cookie domain: host-only, без отдельного wildcard domain.
- `SESSION_COOKIE_SECURE=true`.
- `CORS_ORIGINS=https://temichev-posthub.ru`.
- `NEXT_PUBLIC_DATA_MODE=api`.
- `NEXT_PUBLIC_API_BASE_URL=https://temichev-posthub.ru/api/v1`.

Такой вариант проще для HttpOnly cookies, SameSite и CSRF forwarding. Если позже API переедет на отдельный поддомен, нужно заново подтвердить cookie domain, SameSite, Secure, CSRF header forwarding и CORS.

## Production env checklist

Перед запуском приложения на домене:

- `APP_ENV=production`.
- `SESSION_COOKIE_SECURE=true`.
- `DATABASE_URL` указывает на production PostgreSQL, не SQLite и не local dev DB.
- Alembic migrations применяются явно; startup `create_all` не используется как production-механизм.
- `REDIS_URL` указывает на production Redis.
- `ADMIN_API_TOKEN` заменён на сильный временный секрет или отключён после появления real operator identity.
- `S3_BUCKET`, `S3_ENDPOINT_URL`, `S3_PUBLIC_BASE_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` настроены для production object storage.
- `OPENAI_API_KEY` и provider budgets подтверждены, если включаются live AI/STT.
- Email provider выбран до включения real verification/reset email.
- Payment provider остаётся `mock` или `manual` до юридического решения; real capture нельзя включать без fiscal/refund/legal approval.

## Pilot scope 2026-06-22

Первый публичный тест — не полный SaaS launch. Успешный pilot считается так:

1. Владелец открывает `https://temichev-posthub.ru`.
2. Регистрируется/входит в кабинет.
3. Создаёт материал по пресету `Что поесть? Армавир`.
4. Проверяет голосовой ввод, медиа и сохранение фактов.
5. Проверяет OpenAI text/STT/embeddings на ограниченном бюджете до примерно 10 USD / 1000 RUB.
6. Получает master draft и Telegram variant.
7. После создания отдельного Telegram test bot/test channel выполняется Telegram live smoke.

Для pilot допускается:

- same-site topology: web на `/`, API под `/api/v1`;
- PostgreSQL/Redis на том же VPS;
- Timeweb S3 из существующего проекта;
- mock/manual billing без реальных списаний;
- Instagram как `manual_required`;
- MAX после Telegram.

Для pilot не допускается:

- коммитить или печатать секреты;
- использовать боевой Telegram-канал до отдельного подтверждения;
- ломать существующий `Бери сегодня` host block/process на VPS;
- включать automatic social publication без human approval.

## Launch blockers

Не считать публичную выкладку готовой, если остаётся хотя бы один blocker:

- Media Hub приложение ещё не развернуто за доменом.
- Нет production backup destination и restore drill.
- Нет решения по секретам и encryption keys.
- Нет staging separation для live connector tests.
- Нет подтверждённых Telegram/MAX/Instagram credentials и safe test channels для live publication paths.
- Нет production PostgreSQL RLS acceptance evidence.
- Нет email provider для verification/reset.
- Нет решения по public offer/privacy/fiscal receipts при включении real billing.

## После выкладки

Первые проверки после deploy:

```bash
curl -I https://temichev-posthub.ru
curl -I https://temichev-posthub.ru/api/v1/health/live
curl -I https://temichev-posthub.ru/api/v1/health/ready
node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru
```

Затем вручную проверить в браузере:

- registration/login/logout;
- protected cabinet shell;
- API-mode Content Studio;
- guided form save/conflict status;
- fixture-independent pages do not show mock payment as real capture;
- service worker does not claim mutation replay/background sync unless explicitly enabled and tested.
