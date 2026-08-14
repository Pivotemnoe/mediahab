import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [styleSource, projectFormSource, builderSource, examplesSource, examplesShellSource, englishSpec, russianSpec] = await Promise.all([
  readFile(new URL("apps/web/src/app/app/style/page.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase12/project-create-form.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase03/project-builder-shell.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase12/examples-import-form.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase05/ai-pipeline-shell.tsx", root), "utf8"),
  readFile(new URL("docs/en/MASTER_SPEC.md", root), "utf8"),
  readFile(new URL("docs/ru/MASTER_SPEC.md", root), "utf8"),
]);

assert.match(styleSource, /Покажите удачные посты/);
assert.match(styleSource, /Стиль настраивается по удачным постам/);
assert.match(styleSource, /Быстрый старт/);
assert.match(styleSource, /3/);
assert.match(styleSource, /10/);
assert.match(styleSource, /Дополнительные настройки/);
assert.match(styleSource, /не загрузилось/);
assert.match(styleSource, /getStyleOverviewViewModel/);
assert.doesNotMatch(styleSource, /getDashboardViewModel/);

assert.match(projectFormSource, /Сначала — название и удачные посты/);
assert.match(projectFormSource, /Создать и добавить примеры/);
assert.match(projectFormSource, /<details/);
assert.match(projectFormSource, /Дополнительные настройки/);

const newProjectShell = builderSource.slice(
  builderSource.indexOf("export function NewProjectShell"),
  builderSource.indexOf("export function ProjectDetailShell"),
);
assert.match(newProjectShell, /ProjectCreateForm/);
assert.doesNotMatch(newProjectShell, /Visual Builder|Мастер проекта|Этап UI 03/);

assert.match(examplesSource, /STEADY_STYLE_EXAMPLES = 10/);
assert.match(examplesSource, /QUICK_START_EXAMPLES = 3/);
assert.match(examplesSource, /Быстрый старт/);
assert.match(examplesSource, /ChatGPT/);
assert.match(examplesSource, /splitBulkExamples/);
assert.match(examplesSource, /---/);
assert.match(examplesSource, /Ко всему каналу — рекомендуется/);
assert.match(examplesSource, /ориентир по ритму, структуре и тону/);
assert.match(examplesSource, /факты нового материала задаёт новая диктовка/);
assert.match(examplesSource, /approve_immediately: true/);
assert.match(examplesSource, /router\.refresh\(\)/);
assert.match(examplesSource, /existingApprovedCount/);
assert.match(examplesSource, /<fieldset className="contents" disabled=\{isSubmitting\}>/);
assert.match(examplesShellSource, /Добавляйте удачные публикации/);
assert.match(examplesShellSource, /key=\{example\.id\}/);
assert.match(examplesShellSource, /<h1 className="mt-3 break-words text-3xl font-semibold text-ink">\{viewModel\.projectLabel\}<\/h1>/);
assert.doesNotMatch(examplesShellSource, /<AiHeader title="Удачные посты"/);
assert.doesNotMatch(examplesShellSource, /Библиотека примеров/);

for (const spec of [englishSpec, russianSpec]) {
  assert.match(spec, /10/);
  assert.match(spec, /3–5/);
}

console.log("examples-first contract checks passed");
