# Platform connector specification

## Shared rules

A connector is backend code, not a database-only configuration. It owns authentication, media preparation, payload rendering, hard-limit validation, publication, status polling, editing, deletion, error normalization, and capability reporting.

```python
class PlatformConnector(Protocol):
    key: str

    async def capabilities(self, account: PlatformAccount | None) -> CapabilitySet: ...
    async def validate(self, variant: PlatformVariant, destination: Destination) -> ValidationResult: ...
    async def prepare_media(self, publication: Publication) -> PreparedMedia: ...
    async def publish(self, publication: Publication, prepared: PreparedMedia) -> PublishResult: ...
    async def status(self, external_ids: dict) -> ExternalStatus: ...
    async def edit(self, publication: Publication) -> PublishResult: ...
    async def delete(self, publication: Publication) -> None: ...
```

Connector errors normalize to:

- `auth_invalid`
- `permission_missing`
- `rate_limited`
- `quota_exceeded`
- `payload_invalid`
- `media_invalid`
- `media_processing`
- `temporary_unavailable`
- `external_not_found`
- `unsupported_operation`
- `unknown`

Each has `retryable`, `retry_after`, provider code, safe message, and redacted diagnostics.

## Telegram connector

### Primary path

Use Bot API `sendRichMessage` with rich HTML or rich Markdown. Prefer rich HTML for deterministic escaping. Build:

```html
<tg-collage>
  <img src="SIGNED_URL_1"/>
  <video src="SIGNED_URL_2"/>
</tg-collage>
<p>...</p>
```

Media URLs must be HTTPS and remain valid long enough for Telegram to fetch them. Default delivery URL TTL: 24 hours, configurable.

### Limits at baseline

- Rich text: 32,768 UTF-8 characters.
- Media attachments: 50 total.
- Fallback media group: 2–10 items.
- Fallback captions follow legacy caption limits and are not used for long posts.

### Required validation

- Bot is an administrator with post permission.
- Channel ID/username valid.
- All media URLs reachable and MIME-correct.
- Rich markup parses.
- Publication is below connector hard limits.

### Acceptance spike

Publish the `fixtures/telegram-donika.json` payload with 7 photos, 3 videos, and 4,069 characters as one Rich Message. Capture external message ID and screenshots on current Telegram mobile and desktop clients. Verify edit and delete behavior. If live credentials are absent, implement payload/contract tests and mark the live criterion pending.

### Fallback

If Rich Message is unsupported by an account/client condition or rejected by Telegram:

1. Do not silently publish a different layout.
2. Set validation warning and require approval for fallback.
3. Send media group, then text.
4. Store all message IDs as one publication aggregate.

## MAX connector

### Publication flow

1. Validate text <= 4,000 characters.
2. Request an upload URL for each attachment.
3. Upload the object.
4. Store/reuse returned token where allowed.
5. Wait/poll or retry until attachment is ready.
6. Send `POST /messages` with `chat_id`, text, attachments, and selected format.
7. Store message ID and URL if available.

### Formatting

Use one canonical internal rich-text document and render to MAX HTML or Markdown. Prefer HTML unless live tests show rendering problems. Escape all user text.

### Operational requirements

- Authorization token in header only.
- HTTPS webhook with trusted certificate for production.
- Quick webhook acknowledgement and asynchronous processing.
- Respect documented 30 rps guidance.
- Exponential backoff for `attachment.not.ready`.
- Discover channel/chat ID through supported current methods.

### Unknown media count

The official message schema exposes an attachments array but the inspected documentation does not provide a universal item-count limit. Phase 00 must test the owner’s typical 10-item mixed set. Store the result in a capability snapshot; do not hardcode an unverified number as official.

## Instagram connector

### Account prerequisites

- Instagram professional account.
- Correct Meta app, OAuth flow, permissions, and review state.
- Store scopes and token expiry.

### Supported modes

- Feed image.
- Feed video.
- Carousel, 2–10 children.
- Reel when media and permissions satisfy current API requirements.

### Limits and validation

- Caption <= 2,200 characters.
- Hashtags <= 30.
- Mentions <= 20.
- Media aspect ratio, size, codec, duration, and URL accessibility checked against current endpoint rules.
- Query current publishing quota/usage before attempting publication.

### Publication flow

1. Generate provider-accessible signed URL with sufficient TTL.
2. Create media container(s).
3. Poll container status.
4. Create carousel parent when needed.
5. Publish container.
6. Poll/confirm media ID and permalink.
7. Save external IDs.

Never retry a publish call without checking whether the container was already published.

### Manual-required conditions

- Account is not professional.
- Missing permission or app review.
- Quota exhausted.
- Media cannot be transformed or accepted.
- Platform outage after retry budget.

## Threads connector

Prepared interface, disabled feature flag initially. Validate 500-character text limit and current API capabilities at implementation time. Reuse Meta account infrastructure only where official auth flows permit; do not assume Instagram tokens are interchangeable.

## YouTube connector

Prepared modules:

- OAuth and channel selection.
- Metadata package validation: title <= current API limit, description bytes, tags, category, privacy, language, schedule.
- Resumable video upload.
- Caption upload.
- Comment/reply operations.

Community draft remains manual until an official supported endpoint is verified.

## Generic webhook connector

- User configures HTTPS endpoint and shared secret.
- Send signed JSON payload containing project, content, variant, media delivery URLs, and idempotency key.
- Retry only safe requests.
- Record response status/body with redaction and size limits.
- Block private-network targets and protect against SSRF.

## Manual export connector

Generate:

- Plain text.
- Platform-formatted text.
- JSON metadata.
- ZIP manifest of media references when requested.

No external credentials required.
