import { type MeResponse, type RetentionSummaryOut } from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export type RetentionSettingsViewModel = {
  rows: Array<[string, string]>;
};

function bytesLabel(value: number): string {
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} МБ`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} ГБ`;
}

function dateLabel(value: string | null): string {
  if (!value) return "пока нет загруженных фото или видео";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export async function getRetentionSettingsViewModel(): Promise<RetentionSettingsViewModel> {
  if (getDataMode() !== "api") {
    return {
      rows: [
        ["Фото и видео", "Оригиналы доступны 30 дней; перед окончанием хранения будет предупреждение."],
        ["Тексты", "Для активного рабочего пространства — до 180 дней."],
        ["Сырой голос", "Срок пока не утверждён, автоматическое удаление выключено."],
        ["Очистка", "Физическое удаление выключено до отдельного подтверждения владельца."],
      ],
    };
  }
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  if (!workspace) {
    return { rows: [["Хранение", "Сначала завершите настройку рабочего пространства."]] };
  }
  const summary = await safeApiGet<RetentionSummaryOut>(
    `/api/v1/workspaces/${workspace.id}/retention`,
  );
  if (!summary) {
    return { rows: [["Хранение", "Сводка временно недоступна. Данные не удаляются."]] };
  }
  const queue = Object.entries(summary.candidate_counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ") || "очередь пока пуста";
  return {
    rows: [
      [
        "Фото и видео",
        `${summary.media_count} файлов, ${bytesLabel(summary.media_bytes)}. Оригиналы доступны ${summary.policy.original_media_days} дней. Ближайшая дата: ${dateLabel(summary.next_media_expiry_at)}.`,
      ],
      [
        "Тексты",
        `До ${summary.policy.text_days} дней в активном рабочем пространстве. Физическая очистка текста пока заблокирована до экспорта и безопасной проверки ссылок.`,
      ],
      [
        "Сырой голос",
        summary.policy.raw_voice_days
          ? `Установлен срок ${summary.policy.raw_voice_days} дней.`
          : "Срок отдельно не утверждён, поэтому аудио автоматически не удаляется.",
      ],
      ["Очередь хранения", queue],
      [
        "Физическая очистка",
        summary.policy.cleanup_enabled
          ? "Включена владельцем; применяется только после warning и grace."
          : "Выключена до отдельного подтверждения владельца. Сейчас данные автоматически не удаляются.",
      ],
      ...(summary.blockers.length ? [["Ограничения", summary.blockers.join(" ")] as [string, string]] : []),
    ],
  };
}
