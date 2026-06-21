export const guidedFormQueuePrefix = "tmh:guided-form-queue:v1";
export const guidedFormQueueEvent = "tmh-guided-form-queue-change";

export function isGuidedFormQueueKey(key: string): boolean {
  return key.startsWith(guidedFormQueuePrefix);
}

export function guidedFieldQueueKey(params: {
  blockId: string | null;
  contentId: string;
  fieldKey: string;
}): string {
  return `${guidedFormQueuePrefix}:field:${params.contentId}:${params.fieldKey}:${params.blockId ?? "new"}`;
}
