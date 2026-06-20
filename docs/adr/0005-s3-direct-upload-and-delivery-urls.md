# ADR 0005 — S3 Direct Upload and Delivery URLs

Date: 2026-06-20
Status: accepted on 2026-06-20

## Context

Users will upload photos, video, voice notes, and future documents. Proxying large media through FastAPI would raise memory, timeout, and bandwidth risk on a modest VPS.

## Decision

FastAPI authorizes uploads and creates short-lived presigned upload URLs for S3-compatible storage. The browser uploads bytes directly. The backend records metadata, validates completed uploads, and later generates connector-specific public or signed delivery URLs for the required publication window.

Delivery URL TTL defaults to a connector policy value and must be long enough for platform fetch/processing.

## Consequences

- API service avoids handling large media bytes.
- Phase 04 must validate MIME, size, checksum, dimensions, duration, and abandoned-upload cleanup.
- Phase 07-09 connector spikes must verify platform fetch behavior with real signed URLs before production use.
