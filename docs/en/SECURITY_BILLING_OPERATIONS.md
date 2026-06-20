# Security, billing, and operations

## Security baseline

- Threat-model authentication, multitenancy, connector tokens, webhooks, media URLs, generic webhooks, and billing before public launch.
- Use HTTPS everywhere.
- Use Argon2id and secure cookie sessions.
- Apply CSRF protection, rate limiting, input size limits, and request IDs.
- Validate uploads by declared MIME, detected MIME, file signature, size, checksum, and allowed extension.
- Scan documents if document upload is enabled for public customers.
- Generate platform delivery URLs with scoped, expiring access.
- Never expose object-storage administrative credentials to the browser.
- Encrypt social/payment/AI provider credentials using envelope encryption or a well-defined application key rotation scheme.
- Add Content Security Policy and security headers on the frontend.
- Prevent SSRF in media fetch and generic-webhook features.
- Redact secrets and raw tokens in logs, traces, and error monitoring.

## Authorization

All service methods receive an actor and workspace context. Route checks alone are insufficient. Authorization tests must include cross-workspace object IDs, background jobs, exports, media, billing, and platform callbacks.

## Billing architecture

Entitlements are backend policies, for example:

```text
projects.max
rubrics.active.max
platform_connections.auto.max
ai.text_generations.monthly
ai.transcription_seconds.monthly
storage.bytes.max
publications.scheduled.max
team.seats.max
feature.instagram_publish
```

Use an entitlement resolver that combines plan, promotional overrides, admin grants, and current usage. Return structured limit errors with upgrade information.

## Mock billing MVP

- Seed Free, Start, Pro, and Business as editable records.
- Do not treat sample limits as final pricing.
- `MockPaymentProvider` can create a pending checkout and let an admin simulate success in non-production.
- Production UI must clearly label payment unavailable until a real provider is active.

## Observability

- Structured JSON logs with request/job/publication IDs.
- Metrics: API latency, job queue lag, AI latency/errors, provider fallback, publication success, retry count, webhook failures, storage use.
- Health endpoints distinguish liveness and readiness.
- Error tracking with PII/secrets scrubbed.
- Audit trail visible to workspace owners for important actions.

## Backups

- Automated PostgreSQL backups.
- Backup encryption and off-host storage.
- Documented retention.
- Quarterly restore drill for SaaS; at least one restore test before personal production launch.
- S3 lifecycle and versioning policy based on cost and deletion requirements.

## Deployment environments

- `local`: Docker Compose, local MinIO or test bucket, mock providers.
- `staging`: separate database, real connector test accounts, no production channels.
- `production`: locked secrets, backups, monitoring, trusted TLS, controlled migrations.

Never use a real public channel in automated CI.

## Migration policy

- Alembic only; no startup `create_all` in production.
- Backward-compatible expand/migrate/contract for risky changes.
- Every phase includes migration and rollback notes.
- Preset imports are versioned and idempotent.

## Resource strategy

Do not host local language models or heavy video transcoding on the first VPS. External AI APIs and object storage keep API/worker resource use predictable. Separate worker queues by workload:

- `default`
- `ai`
- `media`
- `publication`
- `webhook`

Apply concurrency limits per provider and platform.
