# Public Domain Readiness Runbook — temichev-posthub.ru

## Цель

Этот runbook описывает минимальные проверки перед первой выкладкой Media Hub на публичный домен `temichev-posthub.ru`.

Это не инструкция “деплоить сейчас”. Публичная выкладка допустима только после прохождения проверок ниже и явного решения по секретам, HTTPS, базе, S3, email, backup и live-интеграциям.

## Текущий статус домена

- Домен: `temichev-posthub.ru`.
- По скриншоту Timeweb DNS: A record указывает на `89.169.46.92`.
- HTTP уже отвечает от Caddy и редиректит на `https://temichev-posthub.ru/`.
- HTTPS на момент проверки 2026-06-22 ещё не готов: `curl` получает TLS internal error.

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

## Launch blockers

Не считать публичную выкладку готовой, если остаётся хотя бы один blocker:

- HTTPS не проходит обычный browser/curl check.
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
