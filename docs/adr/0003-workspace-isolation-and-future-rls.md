# ADR 0003 — Workspace Isolation and Future RLS

Date: 2026-06-20
Status: accepted on 2026-06-20

## Context

The product is multi-tenant from the start. Personal deployment may initially have one owner, but the schema and authorization model must support SaaS use.

## Decision

Every tenant-owned row contains non-null `workspace_id`. Application services receive actor and workspace context and scope all reads, writes, background jobs, exports, media, billing actions, and callbacks. Cross-workspace object access returns `404` where existence should not be revealed.

PostgreSQL Row-Level Security is required before public SaaS launch and is planned as defense-in-depth in the hardening phase.

## Consequences

- Phase 02 must add authorization tests for cross-workspace IDs.
- Background workers must re-check ownership and entitlements, not trust queued IDs.
- RLS can be introduced later without changing the tenant boundary.
