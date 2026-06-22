# UI Phase 10ba — public domain readiness

## Objective and non-goals

Objective: turn the owner-provided `temichev-posthub.ru` domain into a repeatable deployment-readiness check and operator runbook, without claiming public launch readiness before TLS, secrets, storage, email, backups, and live connector prerequisites are complete.

Non-goals:

- Do not deploy the application in this slice.
- Do not change production infrastructure remotely.
- Do not store server credentials, tokens, DNS credentials, or screenshots in the repository.
- Do not enable live billing, live social publication, automatic queue replay, or production connector credentials.
- Do not solve split-domain cookies in code before the actual deployment topology is confirmed.

## Current-state findings

- The owner confirmed `temichev-posthub.ru` and shared Timeweb DNS UI evidence.
- The screenshot shows an A record for `temichev-posthub.ru` pointing to `89.169.46.92`.
- Local HTTP check returned `308 Permanent Redirect` from Caddy to `https://temichev-posthub.ru/`.
- Local HTTPS check failed with a TLS internal error, so certificate/virtual-host setup is incomplete.
- Existing runbook index lists deploy/rollback as required before public launch, but there is no domain-specific readiness runbook.

## Assumptions and unresolved questions

- First public pilot can use same-site deployment on `temichev-posthub.ru` to avoid split-domain cookie/CSRF complexity.
- If API and frontend are split later, cookie domain, SameSite, Secure, CSRF forwarding, and CORS must be revalidated separately.
- Server access may exist for the owner’s infrastructure, but this slice must remain useful even if SSH is unavailable from this workstation.

## Files/modules to change

- Add `docs/runbooks/public-domain-readiness-ru.md`.
- Add `tools/check_public_domain_readiness.mjs`.
- Add a Russian owner report after implementation.
- Update `docs/runbooks/README.md` and validation artifacts.

## Database migrations and rollback notes

No migrations. Rollback is docs/tool-only: remove the runbook, diagnostic tool, report, and manifest updates.

## Security and tenancy impact

The diagnostic tool performs read-only HTTP(S) checks and redacts nothing because it does not send credentials. The runbook explicitly keeps secrets out of the repository and requires HTTPS before production cookies or webhooks are considered safe.

## External API/live-test prerequisites

- Public internet access to `temichev-posthub.ru`.
- Optional SSH/server access for operator-side Caddy/certificate verification. The repo tool must not require SSH.

## Step-by-step implementation order

1. Add a domain readiness diagnostic that checks HTTP redirect, HTTPS response, and records current blockers.
2. Add a Russian runbook for first deployment readiness on `temichev-posthub.ru`.
3. Link the runbook from `docs/runbooks/README.md`.
4. Run the diagnostic against the current domain and record results.
5. Run local gates and validation.

## Tests and checks

- `node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru --allow-https-failure`
- `node tools/check_public_domain_readiness.mjs --domain localhost --help`
- `make test-ui-hardening`
- `make test`
- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Fixture visual smoke on `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Demo/acceptance evidence

Acceptance evidence should show:

- The domain readiness tool can report HTTP redirect and HTTPS/TLS status without credentials.
- The runbook lists exact blockers before deployment.
- The runbook includes same-site environment defaults for the first pilot.
- The repository still builds and passes the normal UI hardening gate.

## Risks and recovery strategy

- Risk: public network checks are transient. Mitigation: the tool is diagnostic and supports explicit `--allow-https-failure` for documenting current incomplete infrastructure.
- Risk: a runbook could imply launch readiness. Mitigation: name and copy distinguish readiness checks from deployment completion.

## Status/progress notes

- 2026-06-22: Started after UI Phase 10az and owner confirmation of `temichev-posthub.ru`.
- 2026-06-22: Added public-domain readiness runbook and read-only diagnostic tool.
- 2026-06-22: Diagnostic confirms HTTP redirects to HTTPS, while HTTPS remains blocked by TLS internal error.
- 2026-06-22: Non-interactive SSH probe to `root@89.169.46.92` failed with `Permission denied (publickey,password)`.
