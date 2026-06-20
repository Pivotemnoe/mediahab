# Phase 08 — MAX connector

## Objective

Publish validated content and media to a MAX channel with observable upload/readiness behavior and secure webhooks.

## Deliverables

- Secure token storage and channel discovery/selection.
- Markdown/HTML formatter and hard 4,000-character validation.
- Media upload, token/readiness polling or retry, attachment construction, message publish/edit/delete, and external ID persistence.
- HTTPS webhook subscription, secret verification, deduplication, and event inbox.
- Connector rate control and actionable error mapping.
- Live mixed-media capability spike using ten items when credentials exist; observed limit stored separately from documented policy.

## Acceptance

- No payload over 4,000 characters reaches the MAX API.
- Token is sent through the supported Authorization header and never logged.
- Transient attachment-not-ready errors retry safely.
- Duplicate webhook deliveries are processed once.
- The product does not claim a universal attachment count until the live test records evidence.
