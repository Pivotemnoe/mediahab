import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [
  pageSource,
  generatorSource,
  clientSource,
  handoffSource,
  composerSource,
  contentPageSource,
  projectCreatePageSource,
  projectBuilderSource,
  projectCreateFormSource,
  navigationSource,
  mobileNavigationSource,
  quickCreateSource,
  publicFeaturesSource,
] = await Promise.all([
  readFile(new URL("apps/web/src/app/app/ideas/page.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase12/standalone-idea-generator.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/features/standalone-ideas/standalone-ideas-client.ts", root), "utf8"),
  readFile(new URL("apps/web/src/features/standalone-ideas/idea-handoff.ts", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase12/simple-voice-composer.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/app/app/content/new/page.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/app/app/projects/new/page.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase03/project-builder-shell.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/phase12/project-create-form.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/config/navigation.ts", root), "utf8"),
  readFile(new URL("apps/web/src/components/layout/mobile-nav.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/layout/quick-create-palette.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/app/features/page.tsx", root), "utf8"),
]);

assert.match(pageSource, /StandaloneIdeaGenerator/);
assert.match(generatorSource, /data-testid="standalone-ideas-page"/);
assert.match(generatorSource, /О чём рассказать\?/);
assert.match(generatorSource, /Это не чат и не готовый пост/);
assert.doesNotMatch(generatorSource, /projectId|rubricId|Выберите проект|Выберите рубрику/);
assert.match(generatorSource, /ideas\.length === 5/);
assert.match(generatorSource, /Array\.from\(\{ length: 5 \}/);
assert.match(generatorSource, /Предложить 5 идей/);
assert.match(generatorSource, /Наговорить по этой идее/);

assert.match(clientSource, /\/workspaces\/\$\{workspaceId\}\/ideas\/capability/);
assert.match(clientSource, /\/workspaces\/\$\{workspaceId\}\/ideas\/generate/);
assert.match(clientSource, /\/workspaces\/\$\{workspaceId\}\/ideas\/transcribe-topic/);
assert.match(clientSource, /createVoiceRecorder/);
assert.match(clientSource, /MediaRecorder\.isTypeSupported/);
assert.match(clientSource, /content_item_id:\s*null/);
assert.match(clientSource, /duration_ms:\s*durationMs/);
assert.match(clientSource, /ai_transcription_not_included/);
assert.match(clientSource, /errorScope:\s*"voice"/);

assert.match(generatorSource, /microphoneRequestPendingRef/);
assert.match(generatorSource, /microphoneRequestRef/);
assert.match(generatorSource, /microphoneRequestRef\.current \+= 1/);
assert.match(generatorSource, /microphoneRequestRef\.current !== requestId/);
assert.match(generatorSource, /requestedStream\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
assert.match(generatorSource, /generationAbortRef\.current\?\.abort\(\)/);
assert.match(generatorSource, /generationAbortRef\.current[\s\S]*?isGenerating[\s\S]*?voiceState/);
assert.match(generatorSource, /voiceAbortRef\.current\?\.abort\(\)/);
assert.match(generatorSource, /const voiceActive = \["requesting", "recording", "uploading", "transcribing"\]/);
assert.match(generatorSource, /disabled=\{!topic\.trim\(\) \|\| isGenerating \|\| voiceActive/);
assert.match(generatorSource, /aria-hidden=\{voiceState === "recording"/);
assert.match(generatorSource, /new AudioContext\(\)/);
assert.match(generatorSource, /createAnalyser\(\)/);
assert.match(generatorSource, /getByteTimeDomainData/);
assert.match(generatorSource, /<progress aria-hidden="true"/);
assert.match(generatorSource, /voiceSeconds >= 90/);
assert.match(generatorSource, /stopVoiceMeter\(\)/);
assert.match(generatorSource, /type CapabilityState = "error" \| "loading" \| "ready"/);
assert.match(generatorSource, /setCapabilityState\("error"\)/);
assert.match(generatorSource, /setCapabilityRetry\(\(current\) => current \+ 1\)/);
assert.match(generatorSource, /capability\?\.enabled && capability\.used_today >= capability\.daily_limit/);
assert.match(generatorSource, /!capability\.can_generate && !quotaExhausted/);
assert.doesNotMatch(generatorSource, /aria-live="polite" className="min-w-0"/);

assert.match(handoffSource, /HANDOFF_TTL_MS/);
assert.match(handoffSource, /expiresAt <= now/);
assert.match(handoffSource, /STORAGE_KEY_PREFIX/);
assert.match(handoffSource, /handoffToken/);
assert.match(handoffSource, /clientContentId/);
assert.match(handoffSource, /window\.crypto\.randomUUID\(\)/);
assert.match(handoffSource, /storageKey\(handoff\.handoffToken\)/);
assert.match(handoffSource, /readStandaloneIdeaHandoff\(handoffToken: string/);
assert.match(handoffSource, /handoff\.handoffToken !== normalizedToken/);
assert.match(handoffSource, /bindStandaloneIdeaContentCreate/);
assert.match(handoffSource, /window\.sessionStorage\.setItem/);
assert.match(handoffSource, /window\.sessionStorage\.removeItem/);
assert.doesNotMatch(handoffSource, /window\.localStorage/);
assert.match(handoffSource, /source_type|ai_suggested|standalone_idea_generator/);
assert.match(generatorSource, /encodeURIComponent\(handoff\.handoffToken\)/);
assert.match(contentPageSource, /initialStandaloneIdeaToken=\{params\?\.idea\}/);

assert.match(composerSource, /readStandaloneIdeaHandoff/);
assert.match(composerSource, /readStandaloneIdeaHandoff\(initialStandaloneIdeaToken\)/);
assert.match(composerSource, /bindStandaloneIdeaContentCreate/);
assert.match(composerSource, /client_content_id:\s*createHandoff\?\.clientContentId/);
assert.match(composerSource, /titleInternal:\s*createHandoff\.idea\.title/);
assert.match(composerSource, /standaloneIdeaPlanningValue/);
assert.match(composerSource, /blocks\/idea_brief/);
assert.match(composerSource, /source_type:\s*"ai_suggested"/);
assert.match(composerSource, /lock:\s*false/);
assert.match(composerSource, /transcript_text:\s*null/);
assert.match(composerSource, /transcriptRef\.current = ""/);
assert.match(composerSource, /setTranscript\(""\)/);
assert.match(composerSource, /id="voice-record-button"/);
assert.match(composerSource, /await persistStandaloneIdea\(item\.id\)/);
assert.match(composerSource, /ensureContentPromiseRef/);
assert.match(composerSource, /handoff\.expiresAt <= Date\.now\(\)/);
assert.match(composerSource, /clearStandaloneIdeaHandoff\(handoff\.handoffToken\)/);
assert.match(composerSource, /rememberCreatedContentItem\(item\.id\)/);
assert.match(composerSource, /pendingStandaloneIdea\?\.handoffToken \?\? initialStandaloneIdeaToken/);
assert.match(composerSource, /\/app\/projects\/new\?idea=\$\{encodeURIComponent\(continueIdeaToken\)\}/);
assert.match(composerSource, /Идея сохранена/);
assert.ok(
  composerSource.indexOf("rememberCreatedContentItem(item.id)") < composerSource.indexOf("await persistStandaloneIdea(item.id)"),
  "The recoverable edit URL must be stored before idea planning persistence",
);
const updateProjectBlock = composerSource.match(/function updateProject[\s\S]*?\n  }/)?.[0] ?? "";
assert.doesNotMatch(updateProjectBlock, /updateTranscript\(""\)/);
assert.doesNotMatch(composerSource, /<IdeaGeneratorSheet/);

assert.match(projectCreatePageSource, /searchParams\?: Promise<\{ idea\?: string \}>/);
assert.match(projectCreatePageSource, /UUID_PATTERN\.test\(params\.idea\)/);
assert.match(projectCreatePageSource, /initialStandaloneIdeaToken=\{standaloneIdeaToken\}/);
assert.match(projectBuilderSource, /initialStandaloneIdeaToken=\{initialStandaloneIdeaToken\}/);
assert.match(projectCreateFormSource, /dictationParams\.set\("idea", initialStandaloneIdeaToken\)/);
assert.match(projectCreateFormSource, /\/app\/content\/new\?\$\{dictationParams\.toString\(\)\}/);
assert.match(projectCreateFormSource, /Создать и продолжить запись/);
assert.match(projectCreateFormSource, /Публикация появится после первой записи или сохранённого текста/);
assert.doesNotMatch(projectCreateFormSource, /\/content-items/);

const mobileBlock = navigationSource.match(/export const mobileNavItems[\s\S]*?\n\];/)?.[0] ?? "";
assert.match(navigationSource, /href: "\/app\/ideas", icon: Lightbulb, label: "Идеи"/);
assert.match(mobileBlock, /"\/app\/content\/new"[\s\S]*"\/app\/ideas"[\s\S]*"\/app\/content"[\s\S]*"\/app\/notebook"[\s\S]*"\/app\/style"/);
assert.doesNotMatch(mobileBlock, /href: "\/app"/);
assert.equal((mobileBlock.match(/mobile: true/g) ?? []).length, 5);
assert.match(mobileNavigationSource, /aria-label="Главное меню"/);
assert.match(mobileNavigationSource, /aria-current=\{active \? "page"/);
assert.match(mobileNavigationSource, /pathname !== "\/app\/content\/new"/);
assert.doesNotMatch(quickCreateSource, /href: "\/app\/ideas"|Придумать идею/);
assert.doesNotMatch(publicFeaturesSource, /Идеи для постов|пять разных направлений/);

console.log("standalone ideas frontend contract checks passed");
