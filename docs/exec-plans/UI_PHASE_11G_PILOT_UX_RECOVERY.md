# UI Phase 11G — Pilot UX Recovery After Mobile Test

## Goal

Make the live pilot understandable enough for owner testing on phone and desktop:
create a real draft, add voice/text/media, prepare Telegram, publish. Remove demo states that look like broken live recording.

## Trigger

The owner tested `temichev-posthub.ru` from iPhone and desktop and reported:

- the mobile recording screen looked stuck in an active recording state;
- creating a new material failed with a raw `Authentication required` Next.js overlay;
- fallback demo projects and rubrics looked like real data;
- the desktop content studio is overloaded and does not explain the next action.

## Scope

- Turn the `/app/content/new` screen into a narrow pilot start screen.
- Do not show demo capture controls as if recording is live.
- Handle authentication failures in the new-draft server action without raw exceptions.
- Add Russian, owner-facing copy for the pilot flow and next step.
- Make the content studio first screen emphasize the Telegram pilot path.
- Add a reusable first-pass learning hints toggle for pilot screens.

## Out of Scope

- Full navigation redesign.
- MAX and Instagram production publishing.
- Final visual design.
- Full guided tour engine with element anchoring across the whole product.

## Assumptions

- The pilot project/rubric can still use the currently available first project and rubric on the workspace.
- A missing/expired mobile session should send the user to login instead of throwing a dev overlay.
- Demo/fallback content must be explicitly marked as demo and not presented as a working recording.

## Tests

- `make typecheck`
- `make lint`
- web build
- `make validate-spec`
- `git diff --check`
- Production smoke on `https://temichev-posthub.ru/app/content/new` and a real content page.

## Risks

- The app is still running with a Next dev overlay in pilot deployment; this slice reduces user-facing throws but does not replace the deployment mode.
- Existing cabinet navigation remains available, but pilot copy should reduce the main confusion.

## Rollback

- Revert this plan and the corresponding frontend/server-action changes.
