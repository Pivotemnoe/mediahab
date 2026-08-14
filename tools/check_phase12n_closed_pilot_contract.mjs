import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const config = read("services/api/app/core/config.py");
const auth = read("services/api/app/api/v1/routes/auth.py");
const migration = read("database/migrations/versions/202606200014_closed_pilot_access.py");
const accessTool = read("tools/pilot_access.py");
const register = read("apps/web/src/app/register/page.tsx");
const forgot = read("apps/web/src/app/forgot-password/page.tsx");
const authPage = read("apps/web/src/components/phase02/auth-page.tsx");
const privacy = read("apps/web/src/app/privacy/page.tsx");
const terms = read("apps/web/src/app/terms/page.tsx");
const publicationsRoute = read("services/api/app/api/v1/routes/publications.py");
const publicationService = read("services/api/app/modules/publications/service.py");
const worker = read("services/worker/worker_app/tasks/publications.py");
const celery = read("services/worker/worker_app/celery_app.py");
const compose = read("docker-compose.yml");
const workflow = read(".github/workflows/ci.yml");
const userFacingErrors = read("apps/web/src/lib/user-facing-api-error.ts");
const clientApi = read("apps/web/src/services/client-api.ts");
const navigation = read("apps/web/src/config/navigation.ts");
const tour = read("apps/web/src/components/layout/first-run-tour.tsx");
const notebook = read("apps/web/src/components/notebook/notebook-view.tsx");
const securityPage = read("apps/web/src/app/security/page.tsx");
const apiDockerfile = read("infra/docker/api.Dockerfile");
const webDockerfile = read("infra/docker/web.Dockerfile");
const health = read("services/api/app/api/v1/routes/health.py");
const logoutButton = read("apps/web/src/components/layout/logout-button.tsx");
const sidebar = read("apps/web/src/components/layout/app-sidebar.tsx");
const composer = read("apps/web/src/components/phase12/simple-voice-composer.tsx");
const contentStudio = read("apps/web/src/components/phase04/content-studio-shell.tsx");
const projectBuilder = read("apps/web/src/components/phase03/project-builder-shell.tsx");
const projectRules = read("apps/web/src/components/phase12/project-rules-form.tsx");
const pricing = read("apps/web/src/app/pricing/page.tsx");

assert.match(config, /return "closed" if self\.app_env\.strip\(\)\.lower\(\) == "production" else "open"/);
assert.match(config, /return "worker" if self\.app_env\.strip\(\)\.lower\(\) == "production" else "inline"/);
assert.match(auth, /pilot_invite_required/);
assert.match(auth, /PilotAccessInvite\.token_hash == hash_secret\(raw_token\)/);
assert.match(auth, /invite\.email != email/);
assert.match(auth, /pilot_consent_required/);
assert.match(auth, /pilot_invite\.consumed_at = utc_now\(\)/);
assert.match(auth, /email_verified_at=utc_now\(\) if pilot_invite is not None else None/);
assert.match(migration, /pilot_access_invites/);
assert.doesNotMatch(migration, /sa\.Column\("token"/);
assert.match(accessTool, /hash_secret\(token\)/);
assert.match(accessTool, /reset-password/);
assert.doesNotMatch(accessTool, /session\.add\([\s\S]{0,120}token=/);

assert.match(register, /searchParams/);
assert.match(register, /inviteToken/);
assert.match(register, /consentRequired/);
assert.match(authPage, /accept_pilot_terms/);
assert.match(authPage, /accept_data_notice/);
assert.match(forgot, /Написать владельцу пилота/);
assert.doesNotMatch(forgot, /action="forgot-password"/);
assert.match(authPage, /type AuthAction = "forgot-password" \| "login" \| "register" \| "reset-password" \| "verify-email"/);
assert.match(privacy, /закрыт(?:ое|ому) тест/iu);
assert.match(terms, /ручн/iu);

for (const servicePath of [
  "apps/web/src/services/ai.ts",
  "apps/web/src/services/content.ts",
  "apps/web/src/services/library-planning.ts",
  "apps/web/src/services/projects.ts",
  "apps/web/src/services/publications.ts",
  "apps/web/src/services/workspace-settings.ts",
]) {
  const service = read(servicePath);
  assert.doesNotMatch(service, /fixtures после ошибки|Показаны демо|демо-данн|безопасный пример/i, servicePath);
}

for (const route of [
  "ai",
  "billing",
  "calendar",
  "examples",
  "integrations",
  "media",
  "publications",
  "showcase",
  "workspace",
]) {
  const page = read(`apps/web/src/app/app/${route}/page.tsx`);
  assert.match(page, /PilotUnavailable/, route);
  assert.doesNotMatch(page, /Этап UI|API-режим|backend|token|mock|fixture|воркер|outbox/i, route);
}

assert.match(publicationsRoute, /settings\.publication_execution_mode == "inline"/);
assert.match(publicationService, /with_for_update\(skip_locked=True\)/);
assert.match(worker, /requeue_stale_publication_events/);
assert.match(worker, /process_publication_outbox/);
assert.match(celery, /publication-outbox-drain/);
assert.match(compose, /worker_app\.celery_app\.celery_app worker --beat/);
assert.match(workflow, /pnpm --filter @temichev\/web build/);
assert.match(workflow, /alembic -c alembic\.ini upgrade head/);
assert.doesNotMatch(userFacingErrors, /error\?\.message|error\.message/);
assert.doesNotMatch(clientApi, /payload\.error\?\.message|Сервер вернул ошибку/);
assert.doesNotMatch(navigation, /href: "\/app\/ideas"|label: "Идеи"/);
assert.doesNotMatch(tour, /Найти тему|откройте «Идеи»/);
assert.doesNotMatch(notebook, /связь есть|на этом устройстве|Локальная копия/);
assert.doesNotMatch(securityPage, /Argon2|HttpOnly|CSRF|RLS|404|403/);
assert.match(apiDockerfile, /USER app/);
assert.match(webDockerfile, /USER node/);
assert.match(health, /EXPECTED_ALEMBIC_HEAD = "202606200014"/);
assert.match(health, /status_code=503/);
assert.match(logoutButton, /clientApiRequest<[^>]+>\("\/api\/v1\/auth\/logout", \{ method: "POST" \}\)/);
assert.match(logoutButton, /router\.replace\("\/login"\)/);
assert.doesNotMatch(sidebar, /href="\/login"[^>]*><LogOut/);
assert.doesNotMatch(contentStudio, /<StudioHeader title="История"|Демо-публикации/);
assert.match(projectBuilder, /if \(viewModel\.modeLabel === "api" && viewModel\.project\) \{\s+return <ProjectRulesForm/);
assert.match(projectBuilder, /if \(viewModel\.modeLabel === "api"\) \{\s+return <RubricCreateForm/);
assert.doesNotMatch(projectRules, /Завершение и CTA|Сохранить новую версию|Ссылок: \{richTextLinkCount/);
assert.doesNotMatch(pricing, /фиктивную покупку|Мой текущий тариф/);
assert.doesNotMatch(composer, /первые 3 помогают ИИ|Фото JPEG|Публикация не запускается автоматически/);

console.log("Phase12N closed-pilot hardening contract passed.");
