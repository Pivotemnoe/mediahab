# Official sources checked for this specification

**Checked:** 2026-06-20  
**Rule:** implementation must re-check official documentation during Phase 00 and before each connector release. Platform behavior, approval requirements, and limits can change.

## Codex workflow

- Codex `AGENTS.md` guidance: https://developers.openai.com/codex/guides/agents-md
- Codex best practices and plan-first workflow: https://developers.openai.com/codex/learn/best-practices

The repository uses a concise root `AGENTS.md`, detailed Markdown specifications, machine-readable YAML/JSON, acceptance fixtures, and one phase task at a time.

## Telegram

- Bot API: https://core.telegram.org/bots/api
- `sendRichMessage`: https://core.telegram.org/bots/api#sendrichmessage
- Rich Message object: https://core.telegram.org/bots/api#richmessage
- `sendMediaGroup`: https://core.telegram.org/bots/api#sendmediagroup
- Bot API changelog: https://core.telegram.org/bots/api-changelog

Specification baseline:

- Rich Messages can carry long structured text and media blocks.
- The product uses Rich Message as the primary path for the supplied 4,069-character, ten-media acceptance fixture.
- Standard media-group behavior remains a fallback and must not be confused with Rich Message limits.

## MAX

- Send message: https://dev.max.ru/docs-api/methods/POST/messages
- Upload media: https://dev.max.ru/docs-api/methods/POST/uploads
- Webhook subscription: https://dev.max.ru/docs-api/methods/POST/subscriptions
- General API documentation: https://dev.max.ru/docs-api

Specification baseline:

- Message text: up to 4,000 characters.
- Markdown and HTML formatting are supported by the message endpoint.
- Media upload and readiness must be handled as a connector workflow.
- The exact supported mixed-media composition for the owner's intended layout must be verified with a live Phase 00 spike.

## Instagram

- Content publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Media container reference: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
- Publishing limit endpoint: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit/

Specification baseline:

- Official publishing requires a supported professional-account configuration and permissions.
- Caption maximum: 2,200 characters.
- Carousel: 2–10 items.
- Publishing quota is queried through the API rather than treated as an eternal hardcoded constant.

## Threads

- Publishing posts: https://developers.facebook.com/docs/threads/posts/

Specification baseline:

- Separate micro-post variant, maximum 500 characters.
- Live connector is future scope, but the content model is prepared.

## YouTube

- Upload video and metadata: https://developers.google.com/youtube/v3/docs/videos/insert
- Upload captions: https://developers.google.com/youtube/v3/docs/captions/insert
- Create comments: https://developers.google.com/youtube/v3/docs/comments/insert
- Channel resource list: https://developers.google.com/youtube/v3/docs/channels

Specification baseline:

- Prepare video metadata, chapters, caption files, and comment drafts.
- Community posts remain manual until an official supported write resource is verified.

## OpenAI APIs

- Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Speech-to-text: https://developers.openai.com/api/docs/guides/speech-to-text
- Embeddings: https://developers.openai.com/api/docs/guides/embeddings

The product uses separate interfaces for text generation, speech-to-text, and embeddings. Provider capabilities must be discovered and validated rather than assumed identical.

## Application stack

- Next.js documentation: https://nextjs.org/docs
- Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- React documentation: https://react.dev/
- FastAPI documentation: https://fastapi.tiangolo.com/
- SQLAlchemy 2.0 documentation: https://docs.sqlalchemy.org/en/20/
- Alembic documentation: https://alembic.sqlalchemy.org/
- PostgreSQL Row Security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- pgvector: https://github.com/pgvector/pgvector
- Celery Redis caveats: https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/redis.html
- S3 presigned uploads: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html

## Security and billing references

- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- YooKassa recurring payments: https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/basics

No source list replaces live contract tests. When official documents and observed behavior differ, capture both, stop the affected release, and record an ADR before changing connector policy.
