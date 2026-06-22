# UI Phase 11B — Telegram Pilot Hardening

## Goal

Harden the verified voice-to-Telegram pilot without expanding the full product scope yet.

## Scope

- Prevent accidental duplicate Telegram publication from the pilot button.
- Remove background `422` noise from publication list API calls by passing the active workspace id.
- Keep the current pilot focused on technical verification: transcript, source-based draft, Telegram publish.

## Assumptions

- The public pilot runs at `https://temichev-posthub.ru`.
- Telegram live delivery has already been verified in `@temichev_posthub_test`.
- The next full-content workflow will be a separate slice after this hardening pass.

## Implementation

- Use a stable pilot idempotency key based on content id and approved Telegram variant id.
- If an existing pilot publication is already published, return a Russian success/idempotency message instead
  of sending the same variant again.
- Add a small frontend service helper for `/api/v1/publications?workspace_id=...`.
- Update dashboard, publication operations, and calendar planning services to use the active workspace id.

## Tests

- `make typecheck`
- `make lint`
- `make test`
- `pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`
- Production smoke: open the content page and verify it no longer logs `GET /api/v1/publications` as 422.

## Risks

- Stable idempotency prevents republishing the exact same approved variant from the pilot button. That is
  intentional for the pilot; a future explicit "republish" command can use a separate confirmation flow.
- Background pages must keep fallback fixture behavior if workspace lookup fails.

## Rollback

- Revert this plan and the small frontend/server-action changes.
- Existing successful Telegram publications stay in the database and channel; rollback does not delete them.
