import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [composerSource, contentRouteSource, contentServiceSource, surfaceSource, voiceClientSource] = await Promise.all([
  readFile(new URL("apps/web/src/components/phase12/simple-voice-composer.tsx", root), "utf8"),
  readFile(new URL("services/api/app/api/v1/routes/content.py", root), "utf8"),
  readFile(new URL("services/api/app/modules/content/service.py", root), "utf8"),
  readFile(new URL("services/api/app/modules/ai/editorial_surface.py", root), "utf8"),
  readFile(new URL("apps/web/src/features/standalone-ideas/standalone-ideas-client.ts", root), "utf8"),
]);

assert.match(composerSource, /new AudioContext\(\)/);
assert.match(composerSource, /createAnalyser\(\)/);
assert.match(composerSource, /getByteTimeDomainData/);
assert.match(composerSource, /data-testid="voice-level-bars"/);
assert.match(composerSource, /formatRecordingSeconds\(recordingSeconds\)/);
assert.match(composerSource, /recorder\.start\(250\)/);
assert.match(composerSource, /recorderRef\.current\.requestData\(\)/);
assert.match(composerSource, /blob\.size <= 0/);
assert.match(composerSource, /requestedMimeType[\s\S]*new MediaRecorder\(activeStream\)/);
assert.doesNotMatch(composerSource, /<Square|OpenAI STT returned HTTP/);

const settingsCard = composerSource.indexOf('<Card className="order-1');
const voiceCard = composerSource.indexOf('<Card className="order-2');
assert.ok(settingsCard >= 0 && voiceCard > settingsCard, "Project/rubric settings must precede voice capture on mobile");
assert.match(composerSource, /disabled=\{isRubricUpdating \|\| rubricLocked \|\| isAssembling\}/);
assert.match(composerSource, /onChange=\{\(event\) => void updateRubric\(event\.currentTarget\.value\)\}/);
assert.match(composerSource, /body: \{ rubric_id: rubricId \|\| null, version: currentItem\.version \}/);
assert.match(composerSource, /Рубрику можно менять, пока пост ещё не собран/);

assert.match(composerSource, /ASSEMBLY_RECEIPT_TTL_MS = 30 \* 60 \* 1000/);
assert.match(composerSource, /window\.localStorage\.setItem/);
assert.match(composerSource, /current_master_revision_id/);
assert.match(composerSource, /master_revision_id === item\.current_master_revision_id/);
assert.match(composerSource, /visibilitychange/);
assert.match(composerSource, /pageshow/);
assert.match(composerSource, /window\.addEventListener\("online"/);
assert.match(composerSource, /navigator as Navigator[\s\S]*wakeLock/);
assert.match(composerSource, /Восстанавливаю сборку после возвращения в приложение/);
assert.match(composerSource, /propagateError: true/);
assert.doesNotMatch(composerSource.match(/type AssemblyReceipt[\s\S]*?};/)?.[0] ?? "", /transcript|media|token|auth/i);

assert.match(contentRouteSource, /rubric_id: UUID \| None = None/);
assert.match(contentRouteSource, /"rubric_id" in payload\.model_fields_set/);
assert.match(contentRouteSource, /GenerationRun\.task_type == "assemble_master"/);
assert.match(contentRouteSource, /"content_rubric_locked"/);
assert.match(contentRouteSource, /"rubric_not_found"/);
assert.match(contentRouteSource, /current_master_revision_id=item\.current_master_revision_id/);
assert.match(contentRouteSource, /payload\.kind in \{"audio", "voice"\} and payload\.size_bytes <= 0/);
assert.match(contentRouteSource, /"empty_audio"/);
assert.match(contentServiceSource, /if not audio_bytes:/);
assert.match(contentServiceSource, /"transcription_temporarily_unavailable"/);
assert.doesNotMatch(contentServiceSource, /OpenAI STT returned HTTP/);
assert.match(voiceClientSource, /empty_audio:/);
assert.match(voiceClientSource, /transcription_temporarily_unavailable:/);

const findingsBody = surfaceSource.match(/def generated_editorial_findings[\s\S]*?return findings/)?.[0] ?? "";
assert.doesNotMatch(findingsBody, /excessive_paragraph_fragmentation/);
assert.doesNotMatch(surfaceSource, /compact_generated_editorial_paragraphs/);

console.log("phase12k recording, rubric, recovery, and non-blocking paragraph contract checks passed");
