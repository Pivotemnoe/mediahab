# UI Phase 10bd — Pilot Deployment Readiness

## Objective

Turn the owner's pilot answers into a concrete deployment-readiness slice for `temichev-posthub.ru`, without modifying the VPS until the jump/SSH path is confirmed.

The first pilot is not the full production SaaS launch. It targets the A -> B scenario:

1. Owner opens `https://temichev-posthub.ru`.
2. Owner creates a content item.
3. Owner records or uploads voice/media.
4. Backend uses Timeweb S3 and OpenAI text/STT/embeddings.
5. Owner reviews the generated draft.
6. Telegram live publication is tested after a dedicated test bot and test channel are created.

## Confirmed Decisions

- Domain: `temichev-posthub.ru`.
- Server: existing VPS behind the owner-provided setup, also used by the "Бери сегодня" project.
- Reverse proxy: Caddy or Nginx may be configured.
- First topology: same-site deployment, API under `/api/v1`.
- Data: PostgreSQL and Redis on the VPS for the pilot; external Timeweb S3 for media.
- Secrets: protected server env only, never source code or committed docs.
- OpenAI: enabled for text generation, transcription, and embeddings; pilot budget about 10 USD / 1000 RUB.
- Billing: mock/manual only, no real payment capture.
- Telegram: first live connector after owner creates a dedicated test bot and channel.
- MAX: after Telegram.
- Instagram: later/manual-required for now.

## Current Evidence

- `http://temichev-posthub.ru/` redirects to HTTPS.
- `https://temichev-posthub.ru/` still fails with TLS internal error.
- Direct `root@89.169.46.92` and `deploy@89.169.46.92` probes with the local `temichevvet_pwa_codex` key fail.
- Local `~/.ssh/config` does not exist, so the jump-host route is not discoverable yet from SSH config.
- Working SSH route found:
  - local key: `~/.ssh/temichevvet_pwa_codex`;
  - first hop: `root@5.129.239.104`;
  - second hop from NL: `ssh -i ~/.ssh/temichevvet_gateway_to_ru -p 22065 root@127.0.0.1`;
  - target hostname: `msk-1-vm-d817`.
- Read-only audit of `msk-1-vm-d817` shows:
  - IPs: `193.188.23.65`, `109.73.205.175`;
  - Ubuntu 24.04;
  - nginx on ports 80/443;
  - Docker containers for `chto-poest-armavir`, `chto-poest-armavir-v2`, and Postgres;
  - project directories under `/opt/chto-poest-armavir*` and `/opt/temichevvet`.
- DNS target mismatch remains: `temichev-posthub.ru` currently points to `89.169.46.92`, not the audited `msk-1-vm-d817` IPs.
- Dedicated access to the DNS target was then created by owner:
  - reverse tunnel on NL port `22089`;
  - local key: `~/.ssh/mediahub_codex_deploy_20260622`;
  - first hop: `root@5.129.239.104`;
  - proxy target: `127.0.0.1:22089`;
  - target hostname: `msk-1-vm-e21q`;
  - target IP: `89.169.46.92`.
- Read-only audit of `msk-1-vm-e21q` shows:
  - Ubuntu 24.04;
  - Caddy on ports 80/443;
  - "Бери сегодня" in `/var/www/beri-segodnya`, Node process on port `3010`;
  - Caddyfile currently contains `berisegodnya.ru`, `www.berisegodnya.ru`, and `http://89.169.46.92`.
- Domain setup completed:
  - Caddyfile backup: `/etc/caddy/Caddyfile.backup-before-mediahub-20260622-100208`;
  - temporary placeholder: `/var/www/media-hub-placeholder`;
  - `temichev-posthub.ru` HTTPS returns `200`;
  - `node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru` returns `ready=true`.
- Pilot runtime deployment completed:
  - repository cloned to `/var/www/media-hub`;
  - protected server env created at `/var/www/media-hub/.env`;
  - server-only compose file created at `/var/www/media-hub/docker-compose.pilot.yml`;
  - separate services started for PostgreSQL, Redis, API, worker, and web;
  - API listens only on `127.0.0.1:8120`;
  - web listens only on `127.0.0.1:3120`;
  - Caddy routes `https://temichev-posthub.ru/api/v1/*` to API and all other paths to web;
  - Caddyfile backup before runtime switch: `/etc/caddy/Caddyfile.backup-before-mediahub-runtime-20260622-101606`;
  - `https://temichev-posthub.ru/` returns the Russian Media Hub app, not the placeholder;
  - `https://temichev-posthub.ru/api/v1/health/live` and `/ready` return `ok`.
- OpenAI key exists in an adjacent local project env.
- Filled Timeweb S3 variables exist in an old local "Что поесть" `.env`.

## Implementation Plan

1. Create/maintain a Media Hub pilot deployment runbook with:
   - same-site Caddy routing;
   - service layout;
   - env variable checklist;
   - smoke tests;
   - rollback rules.
2. Add a non-secret deployment env template for the pilot.
3. Add/read-only SSH probe commands once the jump route is found.
4. Inspect the VPS without changing it:
   - current Caddy/Nginx config;
   - existing project directories;
   - Docker/PM2/systemd processes;
   - free ports;
   - backup state.
5. Only after the audit, prepare a separate app directory and deployment commands for Media Hub.
6. Prepare a separate Media Hub deployment on `msk-1-vm-e21q`:
   - separate directory, for example `/var/www/media-hub`;
   - separate app ports, not `3010`;
   - separate env files;
   - separate Caddy host block for `temichev-posthub.ru`;
   - no changes to the existing `berisegodnya.ru` blocks except Caddy validation/reload.

## Tests

- `node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru --allow-https-failure`
- Read-only SSH probe through the confirmed jump route.
- Existing local gate for code changes if runbook/templates are edited:
  - `make validate-spec`
  - `git diff --check`
- Public deployment smoke after runtime switch:
  - `curl -I https://temichev-posthub.ru/`
  - `curl -sS https://temichev-posthub.ru/api/v1/health/live`
  - `curl -sS https://temichev-posthub.ru/api/v1/health/ready`
  - browser smoke at `390x844` and `1440x1000`.

## Risks

- Wrong SSH route could target the wrong server. Mitigation: read-only hostname/process audit before any write.
- Caddy reload can affect the existing `Бери сегодня` site. Mitigation: backup `/etc/caddy/Caddyfile`, validate config before reload, and add only a separate `temichev-posthub.ru` host block.
- Reusing old secrets incorrectly could leak credentials. Mitigation: never print or commit values; copy only into protected server env.
- Caddy changes can break the existing "Бери сегодня" site. Mitigation: backup Caddyfile and use separate host block for `temichev-posthub.ru`.

## Rollback

For documentation-only changes, revert the commit. For future VPS changes, keep backups of Caddy config, env files, and compose/systemd files before reloads.

## Status

- 2026-06-22: Started after owner confirmed pilot scope and deployment assumptions.
