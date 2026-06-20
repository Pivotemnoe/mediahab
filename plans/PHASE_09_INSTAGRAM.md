# Phase 09 — Instagram connector

## Objective

Connect supported professional Instagram accounts, publish compliant media containers, and provide an honest manual fallback when external prerequisites block automation.

## Deliverables

- Meta OAuth, account/page discovery as required by the selected API path, encrypted token lifecycle, readiness diagnostics, and reconnect flow.
- Single image, video, carousel, and Reel capability paths as supported by approved credentials.
- Public/signed media delivery URLs, container creation, status polling, publication, permalink/external ID persistence, and quota query.
- Caption validation to 2,200 characters, carousel validation to 2–10 items, hashtag/mention validation, and separate adapted variants.
- `manual_required` package with copy/download instructions.

## Acceptance

- A 3,500–4,100-character master never passes through as an invalid Instagram caption.
- Permission/account/app-review failures are actionable and do not masquerade as connector bugs.
- Retrying after a successful container publish does not duplicate content.
- Live publication remains feature-flagged until verified credentials and permissions exist.
