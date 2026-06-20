# Open questions and external dependencies

Codex must not silently choose answers for these items. Resolve or record an explicit default in an ADR.

## Phase 00 blockers and high-priority decisions

1. Provide a Telegram bot token and test channel where the bot is an administrator with post, edit, and delete rights.
2. Approve a live Telegram Rich Message test using `fixtures/telegram-donika.json` and confirm which clients must be evidenced: Android, iOS, Desktop, Web.
3. Verify Telegram `sendRichMessage` edit/delete behavior for the chosen rich layout and record returned external IDs.
4. Provide MAX bot credentials and a safe test channel/chat.
5. Approve a MAX live upload/readiness test for ten mixed media items and record observed attachment behavior separately from documented policy.
6. Confirm MAX edit/delete semantics for channel messages and whether webhook `secret` is mandatory for production.
7. Provide Instagram professional account type, Meta app ownership, OAuth redirect domain, scopes, review status, and test-user availability.
8. Confirm whether Instagram live publication is allowed during Phase 00/09 or should remain `manual_required` until later.
9. Confirm OpenAI text-generation and embedding models, budget, and live-smoke sample for the personal pilot.
10. Confirm whether the Phase 00 ADRs are accepted as written or need changes before Phase 01.

## Infrastructure and launch dependencies

1. Confirm production domain and sender email service for verification and password reset.
2. Confirm initial VPS provider, Timeweb S3 region/bucket policy for production, and backup destination.
3. Confirm whether the first deployment uses one VPS plus external object storage or a managed database/object-storage split.
4. Confirm where encryption keys and connector secrets will be stored for personal pilot and production.
5. Confirm staging channel/account separation so automated tests never target production public channels.
6. Replace Phase 02 local `ADMIN_API_TOKEN` plan-assignment placeholder with a real system-operator identity model before public SaaS.
7. Replace Phase 02 in-process auth rate limiter with Redis/shared rate limiting before multi-instance or public deployment.
8. Choose the real email delivery provider for verification and password reset before production auth.
9. Confirm final Timeweb S3 bucket naming, public delivery base URL, signed upload TTL, CORS policy, and cleanup policy for abandoned media uploads.
10. Confirm OpenAI STT production model, Russian language default, monthly minute budget, and live-smoke audio sample.

## Product-owner decisions that can follow later

1. Final product name and public domain: the Russian UI now uses "Медиа-хаб"; confirm whether this is final or a working label.
2. Final pricing, included quotas, overage policy, and trial behavior.
3. Whether editors may publish or only owners/admins may publish.
4. Exact project-specific forbidden phrases and preferred CTA library.
5. Ranking formula for imported Telegram examples.
6. Whether Instagram Reels are required in the first commercial release.
7. When Threads and YouTube connectors move from prepared to active.
8. Whether website publication uses a generic webhook, WordPress adapter, or project-specific connector.
9. Payment provider and fiscal receipt requirements for the launch jurisdiction.
10. Retention and deletion periods for voice notes, raw media, AI logs, and publication payloads.
11. Final visual/interaction design for the project and rubric builder before replacing the Phase 03 technical screens.
12. When mock rubric suggestions should switch to the live text provider, and what moderation/evidence requirements apply.
13. Confirm whether raw voice notes, uploaded photos/videos, transcription text, and corrected fact blocks use one retention period or separate retention periods.
14. Confirm final example-ranking formula: rubric match, semantic similarity, manual quality, engagement, recency, and rejected-pattern weights.
15. Confirm AI prompt/output retention policy and whether raw prompts may be stored or only hashed/redacted diagnostics.
