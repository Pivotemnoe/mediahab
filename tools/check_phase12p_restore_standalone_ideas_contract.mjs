import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const navigation = read("apps/web/src/config/navigation.ts");
const ideasPage = read("apps/web/src/app/app/ideas/page.tsx");
const generator = read("apps/web/src/components/phase12/standalone-idea-generator.tsx");
const aiService = read("services/api/app/modules/ai/service.py");
const apiTests = read("services/api/tests/test_standalone_ideas.py");

const desktopBlock = navigation.match(/export const cabinetNavItems[\s\S]*?\n\];/)?.[0] ?? "";
const mobileBlock = navigation.match(/export const mobileNavItems[\s\S]*?\n\];/)?.[0] ?? "";

assert.match(navigation, /\bLightbulb\b/);
assert.match(desktopBlock, /href: "\/app\/ideas", icon: Lightbulb, label: "Идеи"/);
assert.match(mobileBlock, /href: "\/app\/ideas", icon: Lightbulb, label: "Идеи", mobile: true/);
assert.equal((mobileBlock.match(/mobile: true/g) ?? []).length, 5);
assert.match(
  mobileBlock,
  /"\/app\/content\/new"[\s\S]*"\/app\/ideas"[\s\S]*"\/app\/content"[\s\S]*"\/app\/notebook"[\s\S]*"\/app\/style"/,
);

assert.match(ideasPage, /StandaloneIdeaGenerator/);
assert.match(generator, /data-testid="standalone-ideas-page"/);
assert.match(generator, /ideas\.length === 5/);
assert.doesNotMatch(generator, /projectId|rubricId|Выберите проект|Выберите рубрику/);

assert.match(aiService, /project_id=None,[\s\S]*rubric_id=None,[\s\S]*content_item_id=None/);
assert.match(aiService, /retrieved_example_ids=\[\]/);
assert.match(aiService, /user_prompt = standalone_idea_user_prompt\(topic\)/);
assert.match(aiService, /if title_key in seen_titles or direction_key in seen_directions/);
assert.match(aiService, /SequenceMatcher\([\s\S]*sequence_similarity >= 0\.86/);
assert.match(aiService, /"duplicate_standalone_ideas"/);
assert.match(aiService, /"standalone_ideas_not_distinct"/);

assert.match(apiTests, /self\.assertEqual\(len\(body\["response_json"\]\["ideas"\]\), 5\)/);
assert.match(apiTests, /self\.assertEqual\(run\.retrieved_example_ids, \[\]\)/);
assert.match(apiTests, /test_standalone_validator_requires_materially_distinct_directions/);

console.log("Phase12P standalone Ideas restoration contract passed.");
