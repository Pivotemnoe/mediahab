# ADR 0007 — Connector Capability Registry

Date: 2026-06-20
Status: accepted on 2026-06-20

## Context

Platform limits and behavior change over time. Telegram, MAX, Instagram, manual export, and generic webhooks have different auth, media, edit/delete, quota, and retry semantics.

## Decision

Every native connector exposes a capability registry including documented policy, live-tested evidence, account-specific limits, feature flags, edit/delete support, media constraints, and observed errors. Store documented capabilities separately from live-tested snapshots.

User-configured manual and webhook destinations can define formatting and endpoint settings, but they are not equivalent to native social connectors.

## Consequences

- Phase 00 snapshots can prove local payload contracts without claiming live capability.
- Phase 06 introduces registry storage and validation.
- Connector releases must re-check official docs and update capability snapshots before claiming support.
