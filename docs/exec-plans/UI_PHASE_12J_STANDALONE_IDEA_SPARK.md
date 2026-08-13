# UI Phase 12J — Standalone Idea Spark

## Status

Completed and deployed to the production owner allowlist on 2026-08-13.

## Goal

Ship the idea generator the product owner described as a separate, simple application area:

`say or type a topic -> receive exactly five post directions -> choose one -> dictate the author's substance -> AI edits later`.

The generator is not tied to a project or rubric and is not a general chat. It never creates a post, answers the user's question, or writes publishable copy.

## Product decisions

- Add a first-class authenticated route `/app/ideas` named `Идеи` in desktop and mobile navigation.
- Replace the mobile `Мой стиль` tab with `Идеи`; `Мой стиль` remains available from the desktop navigation and dashboard, so the mobile bar stays at five readable actions: `Главная`, `Создать`, `Идеи`, `Черновики`, `Блокнот`.
- Generation requires one non-empty topic. The topic can be typed or transcribed from a short microphone recording.
- The backend returns exactly five compact objects: `id`, `title`, `direction`, and `speaking_prompt`.
- `direction` describes what the author could discuss. `speaking_prompt` is one question that helps the author begin dictating. Neither field is a draft, factual answer, recommendation, or first-person story.
- The endpoint is a one-shot structured generator. There is no conversation history, free-form assistant reply, follow-up chat, model switcher, or arbitrary tool use.
- Generation and selection do not create a `ContentItem`. Choosing `Надиктовать по этой идее` stores a short-lived local planning reference and opens the existing composer with an empty transcript.
- A project/rubric is selected only in the composer. When the user starts real work and the composer creates a content item, it stores the selected direction separately as `ai_suggested`; it never becomes author source or a locked fact.
- The existing project/rubric generator remains disabled and is removed from the primary composer surface. Its route and historical runs remain compatible for rollback and audit.
- The standalone generator uses the configured internal idea model. Provider/model names, prompts, token prices, and technical limits are not shown in the primary UI.

## Backend scope

- Add workspace-scoped capability, generation, and voice-topic transcription endpoints.
- Make `GenerationRun.project_id` nullable and update the API output type so a standalone run has no false project relationship.
- Add a separate task type and feature flag for standalone directions. The old project generator flag remains off.
- Keep subscription entitlement, monthly AI quota, editor-capable role, workspace authorization, daily limit, durable `GenerationRun`, `GenerationStep`, and one idempotent usage event per run.
- Count standalone and legacy idea runs against the same daily idea budget.
- Generate from the user's topic only. Do not retrieve project examples, rubrics, recent project titles, or content items.
- Use a strict five-item schema and deterministic validation for exact count, field lengths, uniqueness, one-line output, no URLs/quotes/instructions, and no unsupported names, numbers, dates, prices, or first-person claims.
- On provider/schema/validation failure, allow one bounded full-batch retry in the same run and quota reservation. A second failure returns a stable error and no directions.
- Transcribe a short uploaded workspace-owned voice asset without creating a notebook note. Record STT usage and apply the existing short raw-audio retention window.
- Treat browser-reported `duration_ms` as an untrusted recording hint. Before provider I/O, reserve the full 120-second topic-recording ceiling; never derive billable seconds from browser metadata. A future server-side media-duration verifier may safely reconcile this conservative reservation.
- Retry a failed standalone run without requiring a project. Legacy project-run retry behavior stays unchanged.

## Frontend scope

- Add a mobile-first page with one primary topic field, a visible microphone state, one `Предложить 5 идей` action, daily-remaining feedback, and five compact result cards.
- Keep the Deep Forest visual system, existing cards/buttons/badges, current radius and typography, and clear recording/upload/transcription progress.
- Disable generation while the topic is empty or a request is active. Abort stale requests on navigation/unmount.
- Preserve a typed topic if voice transcription fails and never replace it until a successful transcript is confirmed.
- `Надиктовать по этой идее` opens `/app/content/new?idea=<handoff-token>`, shows the selected direction as a planning reference, focuses author capture, and leaves author text empty.
- If the workspace has no project yet, the composer keeps the exact handoff, shows the chosen direction, and offers one primary `Create project and continue` action. Project creation returns to `/app/content/new?project=<project-id>&idea=<handoff-token>` without creating a content item or changing the handoff's stable client content id.
- Expire and ignore stale/malformed local idea handoffs. Remove a handoff only after the composer persists the planning reference or the user explicitly dismisses it.
- Add `Идеи` to quick actions and the public feature description without claiming project-style learning for this standalone flow.

## API contract

```text
GET  /workspaces/{workspace_id}/ideas/capability
POST /workspaces/{workspace_id}/ideas/generate
POST /workspaces/{workspace_id}/ideas/transcribe-topic
```

Generation request:

```json
{ "topic": "Как владельцу маленькой кофейни рассказывать о команде" }
```

Generation response remains the existing durable `GenerationRunOut`, with `project_id: null` and:

```json
{
  "ideas": [
    {
      "id": "idea-1",
      "title": "Один незаметный ритуал команды",
      "direction": "Рассказать о небольшом рабочем ритуале и о том, почему он важен лично вам.",
      "speaking_prompt": "Какой реальный момент вы наблюдаете почти каждый день?"
    }
  ]
}
```

## Migration and rollback

- Migration `202606200013` changes only `generation_runs.project_id` to nullable.
- Downgrade refuses while standalone runs with `project_id IS NULL` exist; it never deletes audit history automatically.
- Rollback turns off the standalone feature flag, removes the navigation entry/page, and restores the previous application images. PostgreSQL, Redis, media, publications, author source, and historical idea runs remain intact.

## Acceptance checks

- `/app/ideas` is visible at desktop and 390 px without horizontal overflow and without requiring a project.
- A typed topic produces exactly five distinct directions. No content item, block, note, or publication is created.
- Voice recording shows requesting, recording, uploading, transcribing, success, and error states; a successful transcript fills only the topic field.
- An unrelated question such as `Какая сегодня погода?` produces post directions about discussing weather-related experience and never returns a weather answer.
- Sensitive prompts produce editorial directions/questions, not medical, legal, financial, psychological, veterinary, or fitness advice.
- Output contains no unsupported proper names, dates, prices, quotations, URLs, first-person events, or ready-to-publish paragraphs.
- Choosing one direction opens the composer with the idea visible and the transcript empty. Assembly remains disabled until the author provides source text.
- In a zero-project workspace, the selected idea survives first-project creation and returns to the composer ready for author capture; neither the redirect nor project creation creates a content item.
- Selecting a project alone creates nothing. Starting dictation or saving author text creates exactly one content item and stores the idea as an unlocked `ai_suggested` planning block.
- Refresh/resume never treats the selected direction as author transcript.
- Workspace authorization, role, subscription, monthly quota, daily limit, CSRF, and idempotent billing reservation are enforced before provider invocation.
- Reporting `duration_ms=1` for an unverified or long voice asset never reserves or bills one second; the endpoint reserves its conservative 120-second ceiling.
- Legacy project generator stays disabled in production while the standalone flag is enabled.

## Verification

- Update OpenAPI and regenerate frontend types because `project_id` becomes nullable and new endpoints are added.
- Add targeted backend tests for tenancy, quota, exact schema, no project access, retry, billing, STT, and no content creation.
- Add frontend contract checks for navigation, voice states, request abort, local handoff, empty transcript, and planning-only persistence.
- Add a compact frozen fixture covering ordinary, unrelated-question, prompt-injection, and regulated-domain topics. Automated checks are release blocking; generated directions remain suggestions and are never source content.
- Run `make lint`, `make typecheck`, `make test`, `make test-e2e`, `make openapi`, the targeted idea check, the production Web build, and `git diff --check`.
- Verify locally at 390 px and desktop, then deploy stateless API/worker/Web plus migration with a fresh backup and stateful-container identity checks.

### Production evidence — 2026-08-13

- Release `20260813-151037-phase12j-standalone-ideas` deployed from commit `ce1f35145155a4728052f978b8c6577f097078c8`; the verified source archive SHA-256 is `daca8ebc3833bbe4e5029fdd781bc351b5bb51137afb1ce5261d89f34ba28f44`.
- Protected backup `/var/backups/media-hub/20260813-151037-phase12j-standalone-ideas` contains the PostgreSQL custom dump, validated restore list, previous source, environment, Compose file, release marker, stateful-container inspection, logs, and rollback image tags.
- `make lint`, `make typecheck`, `make test`, `make test-e2e`, OpenAPI regeneration, the standalone contract checks, the 390 px local scenario, and the production Web build passed. The final backend suite passed `157/157` tests.
- The live production model gate passed `8/8` batches and `40/40` directions on ordinary, missing-detail, supplied-specific, unrelated-question, prompt-injection, veterinary, and legal topics. A second independent human review found no release blocker.
- Migration `202606200013` reached Alembic head. Only the stateless API, worker, and Web containers were replaced with `--no-deps`; PostgreSQL ID `89eddc8cf071...`, Redis ID `038bcb78e4d7...`, and Caddy PID `7331` remained unchanged.
- Both local and public `/api/v1/health/ready` returned HTTP 200 after cutover. API, worker, and Web startup logs were clean.
- The old project generator remains disabled. The standalone generator is enabled only for owner workspace `736eee0e-44c7-4500-9d49-1c19c9854333` with the shared daily limit of 20.
- Production acceptance at `390 x 844` generated exactly five directions, moved the daily counter from `20/20` to `19/20`, and opened the composer with the selected idea visible, `transcriptValue == ""`, and assembly disabled. The owner workspace kept exactly three content items across idea selection, proving that generation and selection created no post.
- The production database was actively receiving separate user-authored material and media during the release window. Those concurrent rows were preserved; therefore global content/revision/media counts legitimately advanced after the backup baseline and were not treated as a deployment regression.

## Risks

- Even idea directions can be generic. Keep cards short, invite a concrete author observation, and learn style only later in the editorial path rather than reintroducing project coupling here.
- Browser audio can fail or permission can be denied. Preserve typed input, expose every state, and keep text entry fully usable.
- Making `project_id` nullable widens a mature audit contract. Keep workspace ownership mandatory and branch retry explicitly by task type.
- A standalone prompt can attempt to turn the endpoint into ChatGPT. The fixed response schema, one-shot API, system instruction, validator, and lack of conversation history keep the boundary explicit.
