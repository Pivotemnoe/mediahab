import type { MeResponse } from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export interface StandaloneIdeasViewModel {
  notice?: string;
  workspaceId: string | null;
}

export async function getStandaloneIdeasViewModel(): Promise<StandaloneIdeasViewModel> {
  if (getDataMode() !== "api") {
    return {
      notice: "В демонстрации идеи не генерируются. Войдите в рабочий кабинет.",
      workspaceId: null,
    };
  }
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  return {
    notice: workspace ? undefined : "Рабочее пространство не найдено. Обновите страницу или войдите заново.",
    workspaceId: workspace?.id ?? null,
  };
}
