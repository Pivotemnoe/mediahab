import assert from "node:assert/strict";
import fs from "node:fs";

const composer = fs.readFileSync("apps/web/src/components/phase12/simple-voice-composer.tsx", "utf8");
const contentService = fs.readFileSync("apps/web/src/services/content.ts", "utf8");
const richText = fs.readFileSync("apps/web/src/lib/rich-text.ts", "utf8");
const projectRules = fs.readFileSync("apps/web/src/components/phase12/project-rules-form.tsx", "utf8");
const aiService = fs.readFileSync("services/api/app/modules/ai/service.py", "utf8");
const editorialSurface = fs.readFileSync("services/api/app/modules/ai/editorial_surface.py", "utf8");

assert.match(composer, /Пересобрать из диктовки/);
assert.match(composer, /assembleVersions\(\{ rebuildFromSource: true \}\)/);
assert.doesNotMatch(
  composer,
  /refineVariants\([\s\S]{0,400}Пересобрать из диктовки/,
  "source rebuild must not call platform refinement",
);
assert.match(composer, /Подвал добавлен, но ссылки не настроены/);
assert.match(composer, /\/app\/projects\/\$\{project\.id\}\/settings/);
assert.doesNotMatch(composer, /\/app\/projects\/\$\{project\.id\}\/rules/);
assert.match(composer, /richTextLinkCount\(richText\)/);
assert.match(composer, /В постоянном подвале ссылки пока не настроены/);

assert.match(contentService, /footerLinkCount: number/);
assert.match(contentService, /projectFooterLinkCount/);
assert.match(richText, /export function richTextLinkCount/);
assert.match(projectRules, /Ссылок: \{richTextLinkCount\(footerRichText\)\}/);
assert.match(projectRules, /humor_config: \{ \.\.\.project\.humor_config, guidance:/);
assert.match(projectRules, /\{ \.\.\.project\.tone_config, voice: toneRules \}/);

assert.match(aiService, /"assemble_master": 6/);
assert.match(aiService, /max_examples=5/);
assert.match(aiService, /Отдельные правила юмора проекта/);
assert.match(aiService, /обязательной редакционной целью/);
assert.doesNotMatch(aiService, /однофразных абзац|дробления связной мысли/);
assert.doesNotMatch(editorialSurface, /paragraph_fragmentation|compact_generated_editorial_paragraphs/);

console.log("Phase12L source rebuild and footer link contract passed.");
