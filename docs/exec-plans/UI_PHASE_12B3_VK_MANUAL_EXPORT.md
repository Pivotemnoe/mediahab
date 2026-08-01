# Phase 12B.3: VK community-post manual package

Status: implemented and verified locally
Date: 1 August 2026
Scope: the existing composer, platform-variant snapshot, and manual-export connector; no VK automatic connector, new screen, deployment, or production change

## Objective

Present the VK result as `Запись сообщества` and prepare one durable manual package containing the final text and the current ordered image/video attachments.

## Data and API

- Snapshot a `vk_export_package` in `PlatformVariant.payload` with user-facing type, manual mode, attachment count/order/type, and cover id.
- Regenerate the VK variant when the ordered media snapshot changes, even if the master text is unchanged.
- Preserve the package through manual edits and AI refinements.
- Include media metadata in the existing manual-export connector package.
- No migration is required because variant and connector payloads are JSON.

## UI

- Change the user-facing VK note from `ручной экспорт` to `Запись сообщества`.
- On the VK result show `текст + N вложений`, the ordered attachment summary, and that publication remains manual.
- Keep `Копировать`, editing, and refinement controls unchanged.

## Official API boundary

- Record a dated read-only spike against current official VK sources.
- Do not invent a numeric wall-text limit or implement automatic posting in this phase.
- A future connector requires community authorization, media upload handling, idempotency, error mapping, and a separate owner approval.

## Tests and rollback

- Test empty and mixed-media packages, stable order, package preservation on edit, and media-sensitive revision creation.
- Run OpenAPI generation if the contract changes, lint, typecheck, full tests, build, and 390/1440 px smoke.
- Rollback removes the VK snapshot and UI labels; no data migration rollback is required.

## Result

- VK is labelled `Запись сообщества` in the existing composer.
- Every VK variant snapshots `vk_export_package` with final-text intent, ordered image/video attachments, count, and cover id.
- Media-order changes create a new VK revision; manual edits and AI refinements preserve the package.
- The existing manual-export connector returns final text plus the same attachment metadata and remains `manual_required`.
- The dated official API spike is stored next to this plan. Automatic VK publication remains out of scope.

Verified on 1 August 2026: OpenAPI regeneration, lint, 78 API tests plus 5 repository tests, Next.js production build, and responsive smoke at 390/1440 px with no horizontal overflow. No migration was required. Production was not changed.
