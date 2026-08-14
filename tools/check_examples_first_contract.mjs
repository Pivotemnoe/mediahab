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

assert.match(styleSource, /Покажи публикации, подача которых тебе нравится/);
assert.match(styleSource, /Помоги «Наговори» услышать твой стиль/);
assert.match(styleSource, /Начни с трёх примеров/);
assert.match(styleSource, /3/);
assert.match(styleSource, /10/);
assert.match(styleSource, /Дополнительные настройки/);
assert.match(styleSource, /не загрузилось/);
assert.match(styleSource, /getStyleOverviewViewModel/);
assert.doesNotMatch(styleSource, /getDashboardViewModel/);

assert.match(projectFormSource, /Сначала назови канал/);
assert.match(projectFormSource, /Создать и наговорить публикацию/);
assert.match(projectFormSource, /Примеры стиля и дополнительные правила можно добавить позже/);

const newProjectShell = builderSource.slice(
  builderSource.indexOf("export function NewProjectShell"),
  builderSource.indexOf("export function ProjectDetailShell"),
);
assert.match(newProjectShell, /ProjectCreateForm/);
assert.doesNotMatch(newProjectShell, /Visual Builder|Мастер проекта|Этап UI 03/);

assert.match(examplesSource, /STEADY_STYLE_EXAMPLES = 10/);
assert.match(examplesSource, /QUICK_START_EXAMPLES = 3/);
assert.match(examplesSource, /Быстрый старт/);
assert.doesNotMatch(examplesSource, /ChatGPT|OpenAI|модель ИИ/);
assert.match(examplesSource, /splitBulkExamples/);
assert.match(examplesSource, /---/);
assert.match(examplesSource, /Ко всему каналу — рекомендуется/);
assert.match(examplesSource, /показать разные оттенки своей подачи/);
assert.match(examplesSource, /Факты для нового текста «Наговори» возьмёт только из новой записи/);
assert.match(examplesSource, /approve_immediately: true/);
assert.match(examplesSource, /router\.refresh\(\)/);
assert.match(examplesSource, /existingApprovedCount/);
assert.match(examplesSource, /<fieldset className="contents" disabled=\{isSubmitting\}>/);
assert.match(examplesShellSource, /Добавь удачные публикации/);
assert.match(examplesShellSource, /key=\{example\.id\}/);
assert.match(examplesShellSource, /<h1 className="mt-3 break-words text-3xl font-semibold text-ink">\{viewModel\.projectLabel\}<\/h1>/);
assert.doesNotMatch(examplesShellSource, /<AiHeader title="Удачные посты"/);
assert.doesNotMatch(examplesShellSource, /Библиотека примеров/);

for (const spec of [englishSpec, russianSpec]) {
  assert.match(spec, /10/);
  assert.match(spec, /3–5/);
}

console.log("examples-first contract checks passed");
