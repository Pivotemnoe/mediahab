import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [
  composerSource,
  sheetSource,
  contentServiceSource,
  aiRoutesSource,
  aiServiceSource,
  providerSource,
  configSource,
  englishPlan,
  russianPlan,
] = await Promise.all([
  readFile(new URL("apps/web/src/components/phase12/simple-voice-composer.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase12/idea-generator-sheet.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/services/content.ts", root), "utf8"),
  readFile(new URL("services/api/app/api/v1/routes/ai.py", root), "utf8"),
  readFile(new URL("services/api/app/modules/ai/service.py", root), "utf8"),
  readFile(new URL("services/api/app/modules/ai/providers.py", root), "utf8"),
  readFile(new URL("services/api/app/core/config.py", root), "utf8"),
  readFile(new URL("docs/exec-plans/UI_PHASE_12H_IDEA_TO_POST_ACTIVATION.md", root), "utf8"),
  readFile(new URL("docs/exec-plans/UI_PHASE_12H_IDEA_TO_POST_ACTIVATION_RU.md", root), "utf8"),
]);

assert.match(`${composerSource}\n${sheetSource}`, /Помоги придумать|Подобрать идеи/);
assert.doesNotMatch(composerSource, /<IdeaGeneratorSheet/);
assert.doesNotMatch(composerSource, /href="\/app\/ideas"/);
assert.match(composerSource, /ideaBrief/);
assert.match(composerSource, /replaceState/);
assert.match(sheetSource, /client_content_id/);
assert.match(sheetSource, /AbortController/);
assert.match(sheetSource, /requestEpochRef/);
assert.match(sheetSource, /requestIsCurrent/);
assert.match(sheetSource, /signal:\s*controller\.signal/);
assert.match(sheetSource, /can_generate/);
assert.match(sheetSource, /role_denied/);
assert.match(sheetSource, /function closeSheet\(\)[\s\S]*?invalidatePendingRequests\(\)/);
assert.match(sheetSource, /if \(!requestIsCurrent\(epoch, expected\)[\s\S]*?await onAccepted/);
assert.match(sheetSource, /if \(!capability\?\.enabled \|\| !capability\.can_generate\) return null/);
assert.doesNotMatch(composerSource, /Не знаю, о чём рассказать/);
assert.match(composerSource, /captureRequestRef/);
assert.match(composerSource, /pendingStreamRef/);
assert.match(composerSource, /Остановить и сохранить фрагмент/);
assert.match(contentServiceSource, /ideaBrief/);
assert.match(contentServiceSource, /idea_brief/);
assert.match(contentServiceSource, /AUTHOR_SOURCE_TYPES\.has\(block\.source_type\)/);
assert.match(contentServiceSource, /const authorBlocks = blocks\.filter/);

assert.match(sheetSource, /aria-modal/);
assert.match(sheetSource, /role="dialog"/);
assert.match(sheetSource, /Escape/);
assert.match(sheetSource, /Предложить 5 идей/);
assert.match(sheetSource, /Взять идею/);
assert.match(sheetSource, /detail_questions/);
assert.match(sheetSource, /starter_outline/);
assert.match(sheetSource, /idea_brief/);
assert.doesNotMatch(sheetSource, /gpt-|OpenAI|токен/i);

assert.match(aiRoutesSource, /ideas\/capability/);
assert.match(aiRoutesSource, /can_generate/);
assert.match(aiRoutesSource, /ideas\/generate/);
assert.match(aiRoutesSource, /ideas.*accept|accept.*idea/s);
assert.match(aiRoutesSource, /client_content_id/);
assert.match(aiServiceSource, /IDEAS_OUTPUT_SCHEMA/);
assert.match(aiServiceSource, /suggest_content_ideas/);
assert.match(aiServiceSource, /starter_outline/);
assert.match(aiServiceSource, /detail_questions/);
assert.match(providerSource, /suggest_content_ideas/);
assert.match(configSource, /IDEA_GENERATOR_ENABLED/);
assert.match(configSource, /IDEA_GENERATOR_WORKSPACE_ALLOWLIST/);
assert.match(configSource, /IDEA_GENERATOR_DAILY_LIMIT/);
assert.match(configSource, /OPENAI_IDEA_MODEL/);

for (const plan of [englishPlan, russianPlan]) {
  assert.match(plan, /starter_outline|основа/i);
  assert.match(plan, /allowlist|список разрешённых|рабоч.*пространств/i);
  assert.match(plan, /daily|дневн/i);
  assert.match(plan, /20/);
  assert.match(plan, /idea.*content|иде.*материал/is);
  assert.match(plan, /eval|оцен/i);
}

console.log("idea generator contract checks passed");
