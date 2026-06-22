# Open questions and external dependencies

Codex must not silently choose answers for these items. Resolve or record an explicit default in an ADR.

## Phase 00 blockers and high-priority decisions

1. Provide a Telegram bot token and test channel where the bot is an administrator with post, edit, and delete rights.
2. Approve a live Telegram Rich Message test using `fixtures/telegram-donika.json` and confirm which clients must be evidenced: Android, iOS, Desktop, Web.
3. Verify Telegram `sendRichMessage` edit/delete behavior for the chosen rich layout and record returned external IDs; Phase 07 has contract coverage only, live evidence is still pending.
4. Provide MAX bot credentials and a safe test channel/chat.
5. Provide the MAX `chat_id` for the safe test channel/chat; current MAX docs no longer support `GET /chats`, so IDs must come from webhook events or manual configuration.
6. Approve a MAX live upload/readiness test for ten mixed media items and record observed attachment behavior separately from documented policy.
7. Confirm MAX edit/delete semantics for channel messages and whether webhook `secret` is mandatory for production.
8. Provide Instagram professional account type, Meta app ownership, OAuth redirect domain, scopes, review status, and test-user availability.
9. Re-check official Meta Instagram publishing docs/API version before live enablement; docs browsing returned 429 during Phase 09 implementation.
10. Confirm whether Instagram live publication is allowed during Phase 00/09 or should remain `manual_required` until later.
11. Provide monthly budget and live-smoke sample for OpenAI `gpt-4.1-mini` text generation and `text-embedding-3-small` embeddings.
12. Confirm whether the Phase 00 ADRs are accepted as written or need changes before Phase 01.

## Infrastructure and launch dependencies

1. Production/pilot domain is confirmed as `temichev-posthub.ru` and now serves the pilot runtime; still confirm sender email service for verification and password reset.
2. Confirm initial VPS provider, Timeweb S3 region/bucket policy for production, and backup destination.
3. Confirm whether the first deployment uses one VPS plus external object storage or a managed database/object-storage split.
4. Confirm where encryption keys and connector secrets will be stored for personal pilot and production.
5. Confirm staging channel/account separation so automated tests never target production public channels.
6. Replace Phase 02 local `ADMIN_API_TOKEN` plan-assignment placeholder with a real system-operator identity model before public SaaS.
7. Replace Phase 02 in-process auth rate limiter with Redis/shared rate limiting before multi-instance or public deployment.
8. Choose the real email delivery provider for verification and password reset before production auth.
9. Confirm final Timeweb S3 bucket naming, public delivery base URL, signed upload TTL, CORS policy, and cleanup policy for abandoned media uploads.
10. Confirm OpenAI STT production model, Russian language default, monthly minute budget, and live-smoke audio sample.
11. Approve the production PostgreSQL RLS policy set and choose where to run the RLS acceptance tests.
12. Approve backup encryption destination, restore-drill environment, RPO/RTO targets, and restore evidence format.
13. Confirm whether PWA offline draft queue stores only text drafts first or includes audio/media metadata in the first pilot.
14. Choose the real payment provider for launch: YooKassa, CloudPayments, another Russian provider, international provider, or manual invoicing first.
15. Confirm fiscal receipt, refund, cancellation, tax/legal entity, public offer, and privacy requirements before enabling live recurring payments.

## Product-owner decisions that can follow later

1. Final product name and public domain: the Russian UI now uses "Медиа-хаб"; confirm whether this is final or a working label.
2. Final pricing, included quotas, overage policy, and trial behavior.
3. Define the UI/admin flow for granting future project-level `content.publish` permission to selected editors.
4. Exact project-specific forbidden phrases and preferred CTA library.
5. First live-smoke sample content item and approved examples for OpenAI text/embedding verification.
6. Whether Instagram Reels are required in the first commercial release.
7. When Threads and YouTube connectors move from prepared to active.
8. Whether website publication uses a generic webhook, WordPress adapter, or project-specific connector.
9. Payment provider and fiscal receipt requirements for the launch jurisdiction.
10. Retention and deletion periods for voice notes, raw media, and AI logs.
11. Final visual/interaction design for the project and rubric builder before replacing the Phase 03 technical screens.
12. When mock rubric suggestions should switch to the live text provider, and what moderation/evidence requirements apply.
13. Confirm whether raw voice notes, uploaded photos/videos, transcription text, and corrected fact blocks use one retention period or separate retention periods.
14. Confirm recommended AI retention defaults from ADR 0012 or replace them before production cleanup jobs are implemented.
15. Confirm the working UI brand label: keep visible "Медиа-хаб" for now or switch to configurable "Temichev PostHub" / "PostHub".
16. Approve or reject adding UI Phase 01 frontend dependencies: React Hook Form, Zod, TanStack Query, dnd-kit, Playwright, and optional component-showcase tooling.
17. Confirm whether Command Center dark mode waits until operations hardening or starts earlier with publication operations.
18. Confirm whether visual-regression screenshots should be stored as repo baselines or kept as local/CI artifacts only.
19. Confirm whether mock payment webhook simulation may remain available in staging after a real provider is added, and who can trigger it.

## Deployment notes from owner-provided infrastructure

- 2026-06-22: Owner reported the purchased domain `temichev-posthub.ru` and shared Timeweb DNS UI evidence. The screenshot shows an A record for `temichev-posthub.ru` pointing to `89.169.46.92`.
- 2026-06-22: Local HTTP check returned `308 Permanent Redirect` from Caddy to `https://temichev-posthub.ru/`.
- 2026-06-22: HTTPS was configured for `temichev-posthub.ru`; the domain now returns the Media Hub pilot runtime with `X-Robots-Tag: noindex, nofollow`.
- 2026-06-22: Direct non-interactive SSH probe to `root@89.169.46.92` failed with `Permission denied (publickey,password)`, but owner created a working reverse tunnel through NL for the DNS target VPS.
- 2026-06-22: Owner confirmed `temichev-posthub.ru` should use the existing VPS that also hosts the "Бери сегодня" project. Caddy/Nginx, Docker, env files, and HTTPS may be configured on that server.
- 2026-06-22: Preferred pilot topology is same-site: `https://temichev-posthub.ru` with API under `/api/v1`, host-only secure cookies, and no split-domain CSRF complexity.
- 2026-06-22: Pilot success path is A -> B: owner opens the site, creates content, records/loads voice and media, OpenAI generates the draft, then Telegram publication is tested after a separate test bot and test channel are created.
- 2026-06-22: Owner approved OpenAI usage for text generation, transcription, and embeddings with an approximate pilot budget of up to 10 USD / about 1000 RUB. Existing OpenAI key is available in local adjacent project env, but must only be moved into server env, never committed.
- 2026-06-22: Timeweb S3 should be used for the pilot. Existing filled S3 env variables were found in the old "Что поесть" local `.env`; copy values only into protected server env, never into Git or chat.
- 2026-06-22: Payment capture remains disabled for the pilot; use mock/manual billing only.
- 2026-06-22: Instagram is not part of the first pilot and can remain `manual_required`/later setup. MAX follows after Telegram.
- 2026-06-22: Working SSH route found for the old RU application server: local key `temichevvet_pwa_codex` -> `root@5.129.239.104` -> remote key `temichevvet_gateway_to_ru` -> `root@127.0.0.1:22065`, landing on `msk-1-vm-d817`.
- 2026-06-22: Read-only audit of `msk-1-vm-d817` shows IPs `193.188.23.65` and `109.73.205.175`, nginx on 80/443, Docker containers for `chto-poest-armavir` and `chto-poest-armavir-v2`, and `/opt/temichevvet`.
- 2026-06-22: Deployment decision resolved: deploy on the DNS target `89.169.46.92` / `msk-1-vm-e21q` through the dedicated reverse tunnel.
- 2026-06-22: Owner created a dedicated reverse tunnel for the DNS target VPS. Working route: local key `mediahub_codex_deploy_20260622` with `ProxyCommand` through `root@5.129.239.104` to `127.0.0.1:22089`, landing on `msk-1-vm-e21q`.
- 2026-06-22: Read-only audit of `msk-1-vm-e21q` confirms IP `89.169.46.92`, Ubuntu 24.04, Caddy on 80/443, `Бери сегодня` on `/var/www/beri-segodnya` and port `3010`, and Caddyfile host blocks for `berisegodnya.ru`, `www.berisegodnya.ru`, and `http://89.169.46.92`.
- 2026-06-22: DNS/server mismatch resolved for the pilot: `temichev-posthub.ru` should be deployed on `msk-1-vm-e21q` / `89.169.46.92` via the new reverse tunnel.
- 2026-06-22: Pilot runtime deployed on `msk-1-vm-e21q` under `/var/www/media-hub` using server-only Docker Compose. Public web is `https://temichev-posthub.ru/`; public API is `https://temichev-posthub.ru/api/v1`; Caddy routes API to `127.0.0.1:8120` and web to `127.0.0.1:3120`.
- 2026-06-22: Applied Alembic migrations and baseline seed on the pilot PostgreSQL. Public health checks return `ok`.
- 2026-06-22: Current pilot web container uses `next dev`; replace with production build/start before commercial production launch.
