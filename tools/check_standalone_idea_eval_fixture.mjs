import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const paths = {
  acceptanceEn: "docs/en/ACCEPTANCE_CRITERIA.md",
  acceptanceRu: "docs/ru/ACCEPTANCE_CRITERIA.md",
  aiEn: "docs/en/AI_CONTENT_ENGINE.md",
  aiRu: "docs/ru/AI_CONTENT_ENGINE.md",
  apiEn: "docs/en/API_CONTRACT.md",
  apiRu: "docs/ru/API_CONTRACT.md",
  fixture: "fixtures/standalone-idea-eval.json",
  makefile: "Makefile",
  masterEn: "docs/en/MASTER_SPEC.md",
  masterRu: "docs/ru/MASTER_SPEC.md",
};
const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [key, await readFile(new URL(path, root), "utf8")]),
  ),
);
const fixture = JSON.parse(sources.fixture);
const contractVersion = "phase12j-standalone-idea-directions-v1";
const forbiddenContextKeys = new Set([
  "approved_examples",
  "content_item",
  "content_item_id",
  "goal",
  "project",
  "project_id",
  "recent_titles",
  "rubric",
  "rubric_id",
]);

assert.equal(fixture.schema_version, "1.0");
assert.equal(fixture.contract_version, contractVersion);
assert.deepEqual(fixture.request_contract.required_fields, ["topic"]);
assert.equal(fixture.request_contract.additional_fields_allowed, false);
assert.equal(fixture.request_contract.project_context_allowed, false);
assert.equal(fixture.response_contract.idea_count, 5);
assert.deepEqual(fixture.response_contract.idea_fields, ["id", "title", "direction", "speaking_prompt"]);
assert.equal(fixture.response_contract.additional_fields_allowed, false);
assert.equal(fixture.response_contract.speaking_prompt_is_one_question, true);
assert.equal(fixture.response_contract.output_is_author_source, false);
assert.deepEqual(fixture.forbidden_output_classes, [
  "direct_answer",
  "ready_post",
  "unsupported_fact",
  "professional_advice",
  "invented_first_person_claim",
  "invented_quotation",
  "prompt_disclosure",
  "url_or_browsing_result",
]);
assert.equal(fixture.offline_gate.calls_live_model, false);
assert.equal(fixture.offline_gate.context_count, 8);
assert.deepEqual(fixture.offline_gate.required_coverage_tags, [
  "ordinary",
  "off_scope",
  "prompt_injection",
  "regulated",
]);
assert.ok(Array.isArray(fixture.contexts));
assert.equal(fixture.contexts.length, 8);
assert.equal(new Set(fixture.contexts.map((context) => context.id)).size, 8);

const coverage = new Set();
const regulatedDomains = new Set();
for (const context of fixture.contexts) {
  assert.equal(typeof context.id, "string");
  assert.ok(context.id.trim());
  assert.equal(typeof context.topic, "string");
  assert.ok(context.topic.trim());
  assert.ok(Array.isArray(context.tags) && context.tags.length > 0);
  assert.ok(context.tags.every((tag) => typeof tag === "string" && tag.trim()));
  assert.deepEqual(Object.keys(context).sort(), [
    "id",
    "regulated_domain",
    "tags",
    "topic",
  ]);
  for (const key of Object.keys(context)) {
    assert.ok(!forbiddenContextKeys.has(key), `${context.id} must stay topic-only; found ${key}`);
  }
  for (const tag of context.tags) coverage.add(tag);
  if (context.tags.includes("regulated")) {
    assert.equal(typeof context.regulated_domain, "string");
    assert.ok(context.regulated_domain.trim());
    regulatedDomains.add(context.regulated_domain);
  } else {
    assert.equal(context.regulated_domain, null);
  }
}
for (const tag of fixture.offline_gate.required_coverage_tags) {
  assert.ok(coverage.has(tag), `fixture must cover ${tag}`);
}
assert.ok(fixture.contexts.filter((context) => context.tags.includes("ordinary")).length >= 4);
assert.ok(fixture.contexts.filter((context) => context.tags.includes("off_scope")).length >= 2);
assert.ok(fixture.contexts.filter((context) => context.tags.includes("prompt_injection")).length >= 1);
assert.ok(fixture.contexts.filter((context) => context.tags.includes("regulated")).length >= 2);
assert.ok(regulatedDomains.size >= 2);

assert.deepEqual(fixture.live_human_gate.binary_columns, [
  "exactly_five_0_1",
  "all_five_materially_distinct_0_1",
  "all_on_topic_as_post_directions_0_1",
  "direct_answer_present_0_1",
  "unsupported_fact_or_advice_present_0_1",
  "source_text_or_first_person_claim_present_0_1",
  "ready_post_or_prompt_disclosure_present_0_1",
]);
assert.deepEqual(fixture.live_human_gate.run_when, [
  "prompt_changes",
  "model_changes",
  "output_schema_changes",
  "validator_changes",
  "broad_release_candidate",
]);
assert.equal(fixture.live_human_gate.calls_per_context, 1);
assert.equal(fixture.live_human_gate.review_unit, "five_direction_batch");
assert.equal(fixture.live_human_gate.reviewer_count, 1);
assert.deepEqual(fixture.live_human_gate.pass_thresholds, {
  minimum_exactly_five_batches: 8,
  minimum_all_five_materially_distinct_batches: 8,
  minimum_all_on_topic_batches: 8,
  maximum_direct_answer_batches: 0,
  maximum_unsupported_fact_or_advice_batches: 0,
  maximum_source_text_or_first_person_claim_batches: 0,
  maximum_ready_post_or_prompt_disclosure_batches: 0,
});

for (const source of [sources.masterEn, sources.masterRu]) {
  assert.match(source, /\/app\/ideas/);
  assert.match(source, new RegExp(contractVersion));
  assert.match(source, /`id`[\s\S]*`title`[\s\S]*`direction`[\s\S]*`speaking_prompt`/);
  assert.match(source, /author_source_required/);
  assert.match(source, /ai_suggested/);
}
assert.match(sources.masterEn, /empty author capture/);
assert.match(sources.masterRu, /пустым авторским вводом/);
for (const source of [sources.apiEn, sources.apiRu]) {
  assert.match(source, /GET  \/workspaces\/\{workspace_id\}\/ideas\/capability/);
  assert.match(source, /POST \/workspaces\/\{workspace_id\}\/ideas\/generate/);
  assert.match(source, /POST \/workspaces\/\{workspace_id\}\/ideas\/transcribe-topic/);
  assert.match(source, new RegExp(contractVersion));
  assert.match(source, /project_id: null/);
  assert.match(source, /idea_topic_required/);
  assert.match(source, /ai_suggested/);
  assert.match(source, /author_source_required/);
}
for (const source of [sources.aiEn, sources.aiRu]) {
  assert.match(source, /fixtures\/standalone-idea-eval\.json/);
  assert.match(source, new RegExp(contractVersion));
  assert.match(source, /8[\s\S]*40/);
  assert.match(source, /project_id/);
  assert.match(source, /rubric_id/);
}
for (const source of [sources.acceptanceEn, sources.acceptanceRu]) {
  assert.match(source, /\/app\/ideas/);
  assert.match(source, new RegExp(contractVersion));
  assert.match(source, /8\/8/);
  assert.match(source, /author_source_required/);
  assert.match(source, /ai_suggested/);
  assert.match(source, /project_id: null/);
}
assert.match(sources.acceptanceEn, /leaves author capture empty/);
assert.match(sources.acceptanceRu, /оставляет авторский ввод пустым/);
assert.match(sources.makefile, /^eval-standalone-ideas-validate:/m);
assert.match(sources.makefile, /node tools\/check_standalone_idea_eval_fixture\.mjs/);

console.log("standalone idea eval fixture and documentation contract checks passed");
