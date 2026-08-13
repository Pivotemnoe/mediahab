# UI Phase 12K — Recording Trust and Rubric Control

## Status

Implemented, verified, and deployed to production on 2026-08-13 in commit `18b9af3b71b6374147c3bb51a7ee563158dc006c`. No database migration was required.

## Goal

Make voice capture visibly trustworthy, keep rubric choice under the author's control before the first AI assembly, and survive iPhone sleep/background suspension:

`choose project and rubric -> dictate with a real sound-level indicator -> finish a non-empty fragment -> transcribe or receive a clear recoverable message`.

## Evidence and diagnosis

- On the production iPhone flow, recording showed a static stop square although the microphone was active. The interface did not prove that sound was actually reaching the recorder.
- One production fragment reached OpenAI STT as a zero-byte `audio/webm;codecs=opus` asset and returned HTTP 400. The raw provider message was exposed to the user even though later non-empty recordings succeeded.
- Project and rubric controls were placed after voice/media on mobile. Starting voice or uploading media creates the draft, and both selects were then disabled by `Boolean(contentId)`, so the author could no longer choose a rubric.

## Product decisions

- Put project and rubric before author capture on mobile. The author should choose the editorial context before recording, not discover it after media has already created a draft.
- During recording, replace the static stop-square artwork with animated level bars driven by the real microphone analyser. Show elapsed time visually, while assistive technology announces only state transitions.
- Keep the entire recording surface as the stop action. Animation is feedback, not a second control.
- Record `MediaRecorder` chunks on a short timeslice and request pending data before pause/finish where supported.
- Never upload or transcribe an empty audio blob. Return one clear Russian recovery message and let the author immediately record the fragment again.
- Never expose OpenAI/provider status text in the product UI. A provider failure is described as a temporary transcription problem, while the saved fragment remains available for a retry where possible.
- Paragraph density is not a release-blocking hygiene rule. Consecutive short model paragraphs may be compacted by changing boundaries only; the result is still saved if compaction cannot improve it.
- Allow rubric changes after automatic draft creation while no master text exists and no master assembly is actively running. A failed assembly without a master does not lock the rubric. Project remains fixed after content creation.
- An explicit `Без рубрики` selection resolves to the project's current default rubric internally but remains displayed as project-wide rules in the composer.
- Rubric changes preserve author blocks, media, the selected idea reference, and content identity. They update only the resolved project/rubric version context.
- Assembly progress is recoverable application state, not an in-memory spinner. Persist a short-lived, non-secret operation receipt tied to the content item and selected platforms.
- Request a screen wake lock while recording or assembling where the browser supports it, release it immediately afterward, and reacquire it after returning to the foreground.
- On `visibilitychange`, `pageshow`, or reconnect, inspect the server's current master revision and variants. Hydrate completed work, create only missing variants when a master already exists, or resume the editorial pipeline when it does not.

## Backend scope

- Reject empty or zero-byte audio before provider I/O with a stable safe API error.
- Replace raw OpenAI STT transport/status/response messages with stable codes and safe Russian client copy.
- Extend `ContentPatchRequest` with an optional rubric mutation. Distinguish an omitted field from explicit `null`.
- Expose the current master revision id in the authorized content-item response so recovery can distinguish a completed current master from stale platform variants.
- Resolve the rubric through existing workspace/project authorization and versioning rules.
- Refuse rubric mutation once a master revision exists or a queued/running/completed `assemble_master` run exists for the content item; failed runs without a master remain changeable.
- Preserve source blocks, media, revision history, and content item identity; write an audit revision/event for the rubric change.
- No database migration is required.

## Frontend scope

- Add an analyser-backed microphone level and elapsed recording time to `SimpleVoiceComposer` with complete AudioContext, animation-frame, stream, and MediaRecorder cleanup.
- Start the recorder with periodic data delivery, handle recorder errors, and block zero-byte uploads locally.
- Show Russian recording/upload/transcription/recovery states without raw provider names or HTTP codes.
- Move the project/rubric card before voice capture on mobile while preserving the desktop composition.
- Keep rubric selection enabled after content creation until the backend reports that editorial context is locked. Save the selection immediately and roll it back on failure.
- Explain the boundary in plain copy: `Рубрику можно менять, пока пост ещё не собран.`
- Persist a 30-minute assembly receipt in local application storage without auth credentials, author text, or media. Clear it only after every requested platform is hydrated or after an explicit terminal error.
- Never leave the button spinning forever after iOS suspends JavaScript/network activity. Foreground recovery shows `Восстанавливаю сборку…` and continues automatically from server state.

## API contract

`PATCH /content-items/{content_id}` gains an optional field:

```json
{ "rubric_id": "uuid-or-null", "version": 3 }
```

Stable conflict/error codes:

- `content_rubric_locked` — AI assembly has already started or a master exists;
- `rubric_not_found` — the rubric is unavailable in the selected project;
- `empty_audio` — the browser produced no usable audio bytes;
- `transcription_temporarily_unavailable` — the saved non-empty fragment could not be transcribed now.

## Acceptance checks

- At 390 px, project and rubric appear before the microphone and media controls.
- Recording shows moving bars based on actual input level plus elapsed time; pause freezes the recording state and resume restores it.
- A zero-byte recorder result does not create an upload, media row, usage event, or OpenAI request and shows a Russian retry message.
- Provider failures never display `OpenAI`, `STT`, `HTTP`, JSON, or internal exception text to the user.
- Locking the phone or switching apps during assembly does not lose transcript, media, selected rubric, or completed AI work. Returning to the app automatically restores or resumes the same content item.
- A completed master is not regenerated merely because the page was suspended; only missing platform variants are produced.
- Starting voice/media may create a draft, but the author can still select any active rubric before first assembly.
- Changing rubric preserves transcript blocks, media, content id, and idea planning reference.
- `Без рубрики` applies the project-wide/default context and remains represented as `Без рубрики` on resume.
- Cross-project rubrics, stale versions, and changes during/since a successful master assembly fail closed; a failed master attempt without a revision does not trap the author.
- Project remains immutable after draft creation.

## Verification

- Add backend regression tests for empty audio/provider-call prevention and safe STT errors.
- Add backend tests for rubric mutation, explicit default, cross-project rejection, preserved blocks/media, version conflict, post-master lock, and failed-master recovery.
- Add/update a frontend contract check for real analyser state, timesliced recording, zero-byte guard, mobile order, and rubric mutation.
- Add lifecycle recovery checks for the durable operation receipt, wake-lock lifecycle, foreground events, current-master inspection, and missing-variant recovery.
- Regenerate OpenAPI and frontend types.
- Run focused backend tests, full backend suite, lint, typecheck, UI hardening checks, production Web build, and `git diff --check`.
- Reproduce the corrected flow at 390 x 844 and compare it with the three production screenshots.
- Deploy only stateless API, worker, and Web after a fresh PostgreSQL backup. Do not restart/recreate PostgreSQL, Redis, or Caddy; verify their identities after cutover.

## Production acceptance

- Release `20260813-162307-phase12k-mobile-assembly` was installed from the SHA-verified archive `d87b0ab1b71fb391bb4685ca376ce5fca832f77bfc5cb48bea8090c5c42446e7` after validating the protected PostgreSQL backup in `/var/backups/media-hub/20260813-162307-phase12k-mobile-assembly`.
- Only API, worker, and Web were rebuilt and replaced with `--no-deps --no-build`. PostgreSQL container `89eddc8cf071...`, Redis container `038bcb78e4d7...`, their volumes, and Caddy PID `7331` remained unchanged.
- Local and public live/ready checks returned HTTP 200; Alembic current and heads both remained `202606200013 (head)`. Pre-cutover control counts were preserved as `13|13|11|19|68|37|5|7`.
- At 390 x 844 the production UI showed project and the active rubric selector before voice capture. The saved material `2fadd036-d83f-42f1-99ed-6b4e891b857f` accepted `Фаст-обзор` without losing its transcript or three media assets.
- A real production assembly completed after removal of the paragraph-density blocker: master revision `796ed3e2-7212-47d2-a373-69746fa2abfb` persisted with 2,165 characters; Telegram and MAX variants both persisted as `valid` with 2,233 rendered characters. Reloading the mobile page restored both variants with no assembly spinner.
- The acceptance itself added the expected rubric-audit and master revisions, moving final control counts to `13|13|11|19|70|37|5|7`; no user, workspace, project, content item, media, notebook, or publication row disappeared.
- Full backend suite passed `164/164`; UI hardening contracts, TypeScript checks, lint, production Web build, OpenAPI parity, and `git diff --check` passed before deployment.
- Browser acceptance intentionally did not request access to the operator's microphone. Real analyser movement remains a final device-side iPhone check; code and contract tests confirm that the meter uses Web Audio input and never draws a fake level.

## Risks and rollback

- Real Web Audio metering may be unavailable in a browser even when MediaRecorder works. In that case retain the explicit recording timer/state and never draw a fake sound level.
- Rubric changes alter prompt context. Lock them while master assembly is active and after a master exists so a completed editorial result cannot silently change provenance; failed runs without a master remain recoverable.
- Browser codecs can still produce invalid non-empty audio. Keep safe provider errors and allow the author to record again without losing existing transcript fragments.
- iOS can suspend every web process and cannot guarantee background JavaScript. Server-persisted stages plus foreground recovery are the source of truth; the wake lock reduces interruptions but is never treated as durability.
- Rollback restores the previous stateless images. There is no schema downgrade; existing content, media, author text, publication state, PostgreSQL, and Redis remain untouched.
