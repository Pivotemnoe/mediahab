import { type GuidedQueueSummary } from "@/services/guided-queue-store";

export function formatGuidedQueueDiagnostic(summary: GuidedQueueSummary): string | null {
  if (summary.jobCount === 0) {
    return null;
  }

  const composition = [
    formatPart(summary.fieldJobCount, "поле", "поля", "полей"),
    formatPart(summary.repeatableGroupJobCount, "группа полей", "группы полей", "групп полей"),
    formatPart(
      summary.unknownJobCount,
      "неопознанное изменение",
      "неопознанных изменения",
      "неопознанных изменений",
    ),
  ].filter(Boolean);
  const recovery = [
    formatPart(summary.retryableJobCount, "можно повторить", "можно повторить", "можно повторить"),
    formatPart(summary.blockedJobCount, "требует обновления", "требуют обновления", "требуют обновления"),
  ].filter(Boolean);

  const suffix = recovery.length > 0 ? `; ${recovery.join(", ")}` : "";
  return `Состав очереди: ${composition.join(", ")}${suffix}.`;
}

function formatPart(count: number, one: string, few: string, many: string): string | null {
  if (count <= 0) {
    return null;
  }
  return `${count} ${plural(count, one, few, many)}`;
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}
