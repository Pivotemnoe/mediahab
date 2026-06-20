# ADR 0002 — Browser Authentication

Date: 2026-06-20
Status: accepted on 2026-06-20

## Context

The product will handle tenant content, media, connector tokens, billing state, and publication actions. Browser-stored bearer tokens would increase the impact of XSS.

## Decision

Use email/password authentication with verified email, Argon2id password hashes, revocable server-side sessions, and Secure HttpOnly SameSite cookies. Store only hashed session/refresh material server-side. Add CSRF protection for cookie-authenticated state changes and rate limits for auth endpoints.

Do not store long-lived bearer tokens in `localStorage` or expose integration credentials to browser bundles.

## Consequences

- Phase 02 must include cookie flag tests, CSRF tests, session revocation tests, and auth abuse throttling.
- Frontend code treats the API as a same-site authenticated backend rather than a token manager.
- Cross-origin deployment choices must preserve secure cookie behavior.
