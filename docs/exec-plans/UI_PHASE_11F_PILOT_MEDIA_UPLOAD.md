# UI Phase 11F — Pilot Media Upload for Telegram

## Goal

Make the pilot Telegram workflow feel like a real posting tool by allowing the user to attach photos and videos before generating and publishing the Telegram post.

## Scope

- Add a `Фото и видео для Telegram` block to the `Голосовой пилот` panel.
- Upload selected image/video files through existing S3 presigned upload flow.
- Mark uploaded media as complete.
- Attach uploaded media to the current content item through existing `media-order`.
- Show a concise Russian status and attached media count.
- Keep publication behind the existing explicit Telegram publish button.

## Existing Backend Support

- Telegram connector already supports rich messages with image/video media.
- Publication service reads ordered `ContentMedia` rows at publish time.
- Telegram validation already includes media count.

## Assumptions

- In this slice, media upload is append-only from the pilot panel.
- Reordering, deletion, captions, crop, and cover metadata remain in the broader Media Library/Content Studio backlog.
- S3 bucket isolation is already handled by `MEDIA_STORAGE_PREFIX`.

## Tests

- `make typecheck`
- `make lint`
- `make test`
- web build
- `make validate-spec`
- `git diff --check`
- Production smoke: verify the media upload block renders on the content page.

## Risks

- Telegram needs HTTPS-readable media URLs at publication time. The pilot destination already uses `https://temichev-posthub.ru/media`.
- If public media serving is incomplete for an uploaded object, publication will surface a Telegram media delivery error.

## Rollback

- Revert this plan and the pilot panel upload UI.
