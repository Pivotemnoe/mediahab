import {
  guidedFormQueueEvent,
  hasGuidedQueueValues,
  isGuidedFormQueueKey,
  parseGuidedQueueJob,
  serializeGuidedQueueJob,
  type GuidedQueueJob,
} from "@/services/guided-queue-contract";

export interface GuidedQueueEntry {
  job: GuidedQueueJob;
  storageKey: string;
}

export function readGuidedQueueJob(storageKey: string): GuidedQueueJob | null {
  const storage = browserLocalStorage();
  if (!storage) {
    return null;
  }
  try {
    return parseGuidedQueueJob(storage.getItem(storageKey));
  } catch {
    return null;
  }
}

export function writeGuidedQueueJob(storageKey: string, job: GuidedQueueJob): boolean {
  const storage = browserLocalStorage();
  if (!storage) {
    return false;
  }
  try {
    if (!hasGuidedQueueValues(job.values)) {
      storage.removeItem(storageKey);
      emitGuidedQueueChange();
      return true;
    }
    storage.setItem(storageKey, serializeGuidedQueueJob(job));
    emitGuidedQueueChange();
    return true;
  } catch {
    return false;
  }
}

export function clearGuidedQueueJob(storageKey: string): boolean {
  const storage = browserLocalStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.removeItem(storageKey);
    emitGuidedQueueChange();
    return true;
  } catch {
    return false;
  }
}

export function listGuidedQueueEntries(): GuidedQueueEntry[] {
  const storage = browserLocalStorage();
  if (!storage) {
    return [];
  }
  const entries: GuidedQueueEntry[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const storageKey = storage.key(index);
      if (!storageKey || !isGuidedFormQueueKey(storageKey)) {
        continue;
      }
      const job = parseGuidedQueueJob(storage.getItem(storageKey));
      if (!job || !hasGuidedQueueValues(job.values)) {
        continue;
      }
      entries.push({ job, storageKey });
    }
  } catch {
    return [];
  }
  return entries;
}

export function countGuidedQueueEntries(): number {
  return listGuidedQueueEntries().length;
}

function browserLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emitGuidedQueueChange() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(guidedFormQueueEvent));
}
