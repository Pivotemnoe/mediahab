const STORAGE_KEY_PREFIX = "tmh:standalone-idea-handoff:v2:";
const HANDOFF_VERSION = 2;
const HANDOFF_TTL_MS = 30 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

export type StandaloneIdeaDirection = {
  direction: string;
  id: string;
  speakingPrompt: string;
  title: string;
};

export type StandaloneIdeaHandoff = {
  clientContentId: string;
  contentCreate?: StandaloneIdeaContentCreate;
  createdAt: number;
  expiresAt: number;
  handoffToken: string;
  idea: StandaloneIdeaDirection;
  runId: string;
  topic: string;
  version: 2;
  workspaceId: string;
};

export type StandaloneIdeaContentCreate = {
  projectId: string;
  rubricId: string | null;
  titleInternal: string;
};

type StandaloneIdeaApiDirection = {
  direction: string;
  id: string;
  speaking_prompt: string;
  title: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/;

function compactLine(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function storageKey(handoffToken: string): string {
  return `${STORAGE_KEY_PREFIX}${handoffToken}`;
}

export function standaloneIdeaFromApi(value: unknown): StandaloneIdeaDirection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<StandaloneIdeaApiDirection>;
  const id = compactLine(candidate.id, 80);
  const title = compactLine(candidate.title, 160);
  const direction = compactLine(candidate.direction, 600);
  const speakingPrompt = compactLine(candidate.speaking_prompt, 320);
  if (!id || !SAFE_ID_PATTERN.test(id) || !title || !direction || !speakingPrompt) return null;
  return { direction, id, speakingPrompt, title };
}

function parseHandoff(value: unknown, now: number): StandaloneIdeaHandoff | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<StandaloneIdeaHandoff>;
  if (candidate.version !== HANDOFF_VERSION) return null;
  if (typeof candidate.createdAt !== "number" || typeof candidate.expiresAt !== "number") return null;
  if (!Number.isFinite(candidate.createdAt) || !Number.isFinite(candidate.expiresAt)) return null;
  if (candidate.createdAt > now + CLOCK_SKEW_MS || candidate.expiresAt <= now) return null;
  if (candidate.expiresAt <= candidate.createdAt || candidate.expiresAt - candidate.createdAt > HANDOFF_TTL_MS) return null;
  const runId = compactLine(candidate.runId, 64);
  const workspaceId = compactLine(candidate.workspaceId, 64);
  const clientContentId = compactLine(candidate.clientContentId, 64);
  const handoffToken = compactLine(candidate.handoffToken, 64);
  const topic = compactLine(candidate.topic, 1000);
  if (
    !runId
    || !UUID_PATTERN.test(runId)
    || !workspaceId
    || !UUID_PATTERN.test(workspaceId)
    || !clientContentId
    || !UUID_PATTERN.test(clientContentId)
    || !handoffToken
    || !UUID_PATTERN.test(handoffToken)
    || !topic
  ) return null;
  const ideaValue = candidate.idea;
  if (!ideaValue || typeof ideaValue !== "object" || Array.isArray(ideaValue)) return null;
  const idea = standaloneIdeaFromApi({
    direction: ideaValue.direction,
    id: ideaValue.id,
    speaking_prompt: ideaValue.speakingPrompt,
    title: ideaValue.title,
  });
  if (!idea) return null;
  let contentCreate: StandaloneIdeaContentCreate | undefined;
  if (candidate.contentCreate !== undefined) {
    if (!candidate.contentCreate || typeof candidate.contentCreate !== "object" || Array.isArray(candidate.contentCreate)) return null;
    const projectId = compactLine(candidate.contentCreate.projectId, 64);
    const rubricId = candidate.contentCreate.rubricId === null
      ? null
      : compactLine(candidate.contentCreate.rubricId, 64);
    const titleInternal = compactLine(candidate.contentCreate.titleInternal, 200);
    if (
      !projectId
      || !UUID_PATTERN.test(projectId)
      || (rubricId !== null && (!rubricId || !UUID_PATTERN.test(rubricId)))
      || !titleInternal
    ) return null;
    contentCreate = { projectId, rubricId, titleInternal };
  }
  return {
    clientContentId,
    ...(contentCreate ? { contentCreate } : {}),
    createdAt: candidate.createdAt,
    expiresAt: candidate.expiresAt,
    handoffToken,
    idea,
    runId,
    topic,
    version: HANDOFF_VERSION,
    workspaceId,
  };
}

export function writeStandaloneIdeaHandoff({
  idea,
  runId,
  topic,
  workspaceId,
}: {
  idea: StandaloneIdeaDirection;
  runId: string;
  topic: string;
  workspaceId: string;
}): StandaloneIdeaHandoff {
  const now = Date.now();
  const handoff = parseHandoff({
    clientContentId: window.crypto.randomUUID(),
    createdAt: now,
    expiresAt: now + HANDOFF_TTL_MS,
    handoffToken: window.crypto.randomUUID(),
    idea,
    runId,
    topic,
    version: HANDOFF_VERSION,
    workspaceId,
  }, now);
  if (!handoff) throw new Error("Не удалось подготовить идею к диктовке.");
  window.sessionStorage.setItem(storageKey(handoff.handoffToken), JSON.stringify(handoff));
  return handoff;
}

export function readStandaloneIdeaHandoff(handoffToken: string, now = Date.now()): StandaloneIdeaHandoff | null {
  const normalizedToken = compactLine(handoffToken, 64);
  if (!normalizedToken || !UUID_PATTERN.test(normalizedToken)) return null;
  const key = storageKey(normalizedToken);
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const handoff = parseHandoff(JSON.parse(raw) as unknown, now);
    if (!handoff || handoff.handoffToken !== normalizedToken) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return handoff;
  } catch {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Storage can be unavailable in a locked-down browser.
    }
    return null;
  }
}

export function bindStandaloneIdeaContentCreate(
  handoff: StandaloneIdeaHandoff,
  contentCreate: StandaloneIdeaContentCreate,
): StandaloneIdeaHandoff {
  const stored = readStandaloneIdeaHandoff(handoff.handoffToken);
  if (!stored || stored.clientContentId !== handoff.clientContentId) {
    throw new Error("Идея устарела или не прошла проверку. Выберите её заново.");
  }
  if (stored.contentCreate) return stored;
  const bound = parseHandoff({ ...stored, contentCreate }, Date.now());
  if (!bound) throw new Error("Не удалось надёжно начать создание материала.");
  window.sessionStorage.setItem(storageKey(bound.handoffToken), JSON.stringify(bound));
  return bound;
}

export function clearStandaloneIdeaHandoff(handoffToken: string): void {
  const normalizedToken = compactLine(handoffToken, 64);
  if (!normalizedToken || !UUID_PATTERN.test(normalizedToken)) return;
  try {
    window.sessionStorage.removeItem(storageKey(normalizedToken));
  } catch {
    // The server-side planning block is already the durable source of truth.
  }
}

export function standaloneIdeaPlanningValue(handoff: StandaloneIdeaHandoff): Record<string, unknown> {
  const helperQuestions = [
    handoff.idea.speakingPrompt,
    "Какая ваша собственная деталь делает эту тему живой?",
    "Какой вывод вы хотите оставить читателю?",
  ];
  return {
    idea: {
      angle: handoff.idea.direction,
      detail_questions: helperQuestions,
      id: handoff.idea.id,
      idea_brief: handoff.idea.direction,
      starter_outline: handoff.idea.speakingPrompt,
      title: handoff.idea.title,
    },
    provenance: {
      idea_id: handoff.idea.id,
      run_id: handoff.runId,
      selected_at: new Date(handoff.createdAt).toISOString(),
      source: "standalone_idea_generator",
      workspace_id: handoff.workspaceId,
    },
    standalone_idea: {
      direction: handoff.idea.direction,
      speaking_prompt: handoff.idea.speakingPrompt,
      topic: handoff.topic,
    },
    text: handoff.idea.direction,
  };
}
