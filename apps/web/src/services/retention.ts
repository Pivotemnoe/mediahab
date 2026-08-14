import { type MeResponse, type RetentionSummaryOut } from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export type RetentionSettingsViewModel = {
  rows: Array<[string, string]>;
};

function dateLabel(value: string | null): string {
  if (!value) return "дата пока не появилась";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function countLabel(value: number, one: string, few: string, many: string): string {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export async function getRetentionSettingsViewModel(): Promise<RetentionSettingsViewModel> {
  if (getDataMode() !== "api") {
    return {
      rows: [
        ["Фото и видео", "Оригиналы доступны 30 дней; перед окончанием хранения будет предупреждение."],
        ["Тексты", "В активном кабинете они хранятся до 180 дней."],
        ["Исходные аудиозаписи", "Аудиозаписи пока не удаляются сами."],
        ["Автоматическое удаление", "Пока ничего не удаляется автоматически."],
      ],
    };
  }
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  if (!workspace) {
    return { rows: [["Хранение", "Сначала закончи настройку кабинета."]] };
  }
  const summary = await safeApiGet<RetentionSummaryOut>(
    `/api/v1/workspaces/${workspace.id}/retention`,
  );
  if (!summary) {
    return { rows: [["Хранение", "Не получилось показать сроки хранения. Обнови страницу и попробуй ещё раз."]] };
  }
  return {
    rows: [
      [
        "Фото и видео",
        summary.media_count === 0
          ? `Пока ничего не загружено. Фото и видео хранятся ${summary.policy.original_media_days} ${countLabel(summary.policy.original_media_days, "день", "дня", "дней")} после загрузки.`
          : `Сейчас хранится ${summary.media_count} ${countLabel(summary.media_count, "файл", "файла", "файлов")}. Фото и видео доступны ${summary.policy.original_media_days} ${countLabel(summary.policy.original_media_days, "день", "дня", "дней")}; ближайшая дата удаления — ${dateLabel(summary.next_media_expiry_at)}.`,
      ],
      [
        "Тексты",
        `Готовые тексты хранятся до ${summary.policy.text_days} ${countLabel(summary.policy.text_days, "день", "дня", "дней")}.`,
      ],
      [
        "Исходные аудиозаписи",
        summary.policy.raw_voice_days
          ? `Аудиозаписи хранятся ${summary.policy.raw_voice_days} ${countLabel(summary.policy.raw_voice_days, "день", "дня", "дней")}.`
          : "Аудиозаписи пока не удаляются сами.",
      ],
      [
        "Автоматическое удаление",
        summary.policy.cleanup_enabled
          ? "Перед автоматическим удалением «Наговори» предупредит тебя."
          : "Пока ничего не удаляется автоматически.",
      ],
    ],
  };
}
