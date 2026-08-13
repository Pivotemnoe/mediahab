import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [fixtureSource, humanReviewSource, runnerSource, makefileSource] = await Promise.all([
  readFile(new URL("fixtures/content-idea-eval.json", root), "utf8"),
  readFile(new URL("fixtures/content-idea-eval-human-review.csv", root), "utf8"),
  readFile(new URL("tools/eval_content_ideas.py", root), "utf8"),
  readFile(new URL("Makefile", root), "utf8"),
]);
const fixture = JSON.parse(fixtureSource);

assert.equal(fixture.schema_version, "1.2");
assert.equal(fixture.prompt_contract, "phase12h-content-ideas-v5");
assert.equal(fixture.contexts.length, 20);
assert.equal(new Set(fixture.contexts.map((context) => context.id)).size, 20);

const exampleCounts = new Set(fixture.contexts.map((context) => context.approved_examples.length));
assert.deepEqual([...exampleCounts].sort((left, right) => left - right), [0, 3, 10]);
assert.ok(fixture.contexts.some((context) => context.recent_titles.length > 0), "fixture must exercise recent-title avoidance");
assert.ok(fixture.contexts.some((context) => context.topic === ""), "fixture must exercise an empty topic");
assert.ok(fixture.contexts.some((context) => context.rubric === null), "fixture must exercise a project without a rubric");

for (const context of fixture.contexts) {
  assert.equal(typeof context.project, "string");
  assert.ok(context.project.trim());
  assert.equal(typeof context.domain, "string");
  assert.ok(context.domain.trim());
  assert.ok(["engage", "explain", "share_experience", "soft_sell", "open"].includes(context.goal));
  assert.equal(typeof context.topic, "string");
  assert.ok(Array.isArray(context.approved_examples));
  assert.ok([0, 3, 10].includes(context.approved_examples.length));
  assert.ok(context.approved_examples.every((example) => typeof example === "string" && example.trim()));
  assert.ok(Array.isArray(context.recent_titles));
  assert.ok(context.recent_titles.every((title) => typeof title === "string" && title.trim()));
  assert.ok(Array.isArray(context.provided_facts));
  assert.ok(context.provided_facts.every((fact) => typeof fact === "string" && fact.trim()));
  assert.ok(Array.isArray(context.forbidden_claim_classes));
  assert.ok(context.forbidden_claim_classes.length >= 3);
  assert.ok(context.forbidden_claim_classes.every((claimClass) => typeof claimClass === "string" && claimClass.trim()));
  assert.ok(Array.isArray(context.test_tags));
}

const injectionContext = fixture.contexts.find((context) => context.test_tags.includes("prompt_injection_in_approved_example"));
assert.ok(injectionContext, "fixture must tag an approved-example prompt-injection case");
assert.ok(
  injectionContext.approved_examples.some((example) => /игнорируй предыдущие инструкции|system prompt|системный промпт/i.test(example)),
  "prompt-injection case must contain an adversarial instruction inside an approved example",
);

const allowedSpecificsContext = fixture.contexts.find((context) => context.test_tags.includes("allowed_name_and_number"));
assert.ok(allowedSpecificsContext, "fixture must tag an allowed name/number case");
const allowedSpecifics = allowedSpecificsContext.provided_facts.join(" ");
assert.match(allowedSpecifics, /\d/);
assert.match(allowedSpecifics, /[А-ЯЁ][а-яё]+/);

const csvLines = humanReviewSource.trimEnd().split(/\r?\n/);
const expectedHeader = [
  "context_id",
  "idea_id",
  "relevance_1_5",
  "novelty_1_5",
  "actionability_1_5",
  "style_match_1_5",
  "fact_safety_1_5",
  "materially_distinct_0_1",
  "unsupported_fact_0_1",
  "recent_semantic_overlap_0_1",
  "example_topic_copy_0_1",
  "reviewer_notes",
];
assert.deepEqual(csvLines[0].split(","), expectedHeader);
const reviewRows = csvLines.slice(1).map((line) => line.split(","));
assert.equal(reviewRows.length, 100, "human review template must contain exactly 100 idea rows");
assert.ok(reviewRows.every((row) => row.length === expectedHeader.length));
assert.equal(new Set(reviewRows.map((row) => `${row[0]}/${row[1]}`)).size, 100);
assert.ok(reviewRows.every((row) => row.slice(2).every((cell) => cell === "")), "human scores must be blank in the template");
const expectedPairs = new Set(
  fixture.contexts.flatMap((context) => Array.from({ length: 5 }, (_, index) => `${context.id}/idea-${index + 1}`)),
);
assert.deepEqual(new Set(reviewRows.map((row) => `${row[0]}/${row[1]}`)), expectedPairs);

assert.match(runnerSource, /from app\.modules\.ai\.providers import[\s\S]*text_provider_for/);
assert.match(runnerSource, /from app\.modules\.ai\.service import[\s\S]*idea_system_prompt/);
assert.match(runnerSource, /from app\.modules\.ai\.service import[\s\S]*idea_user_prompt/);
assert.match(runnerSource, /from app\.modules\.ai\.service import[\s\S]*idea_validation_retry_prompt/);
assert.match(runnerSource, /from app\.modules\.ai\.service import[\s\S]*normalize_and_validate_ideas/);
assert.match(runnerSource, /IDEA_PROMPT_VERSION/);
assert.match(runnerSource, /IDEA_SCHEMA_SHA256/);
assert.match(runnerSource, /IDEA_VALIDATOR_VERSION/);
assert.match(runnerSource, /"git_commit": current_git_commit\(\)/);
assert.match(runnerSource, /"prompt_sha256"/);
assert.match(runnerSource, /"prompt_attempt_evidence_by_context"/);
assert.match(runnerSource, /"exact_same_user_prompt"/);
assert.match(runnerSource, /attempt_user_prompt != user_prompt/);
assert.match(runnerSource, /retry_user_prompt != initial_user_prompt/);
assert.match(runnerSource, /"retrieved_example_ids"/);
assert.match(runnerSource, /"recent_semantic_overlap_rows"/);
assert.match(runnerSource, /"example_topic_copy_rows"/);
assert.match(runnerSource, /"recent_semantic_overlap_indicators"/);
assert.match(runnerSource, /"example_topic_copy_indicators"/);
assert.match(runnerSource, /"maximum_recent_semantic_overlap_rows": 0/);
assert.match(runnerSource, /"maximum_example_topic_copy_rows": 0/);
assert.match(runnerSource, /RAW_FILENAME = "raw-results\.json"/);
assert.match(runnerSource, /SUMMARY_FILENAME = "summary\.json"/);
assert.match(runnerSource, /"human_review_pending"/);
assert.match(runnerSource, /return 3/);
assert.doesNotMatch(runnerSource, /print\([^\n]*(?:openai_api_key|authorization)/i);

assert.match(makefileSource, /^eval-content-ideas:/m);
assert.match(makefileSource, /^eval-content-ideas-validate:/m);
assert.match(makefileSource, /^eval-content-ideas-validate:/m);
assert.match(makefileSource, /^eval-content-ideas-gate:/m);
assert.match(makefileSource, /tools\/eval_content_ideas\.py validate/);
assert.match(makefileSource, /tools\/eval_content_ideas\.py run/);
assert.match(makefileSource, /tools\/eval_content_ideas\.py gate/);

console.log("content idea eval fixture and harness checks passed");
