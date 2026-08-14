import type { MeResponse } from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export interface StandaloneIdeasViewModel {
  notice?: string;
  workspaceId: string | null;
}

export async function getStandaloneIdeasViewModel(): Promise<StandaloneIdeasViewModel> {
  if (getDataMode() !== "api") {
    return {
      notice: "После входа «Наговори» сможет предложить идеи по твоей теме.",
      workspaceId: null,
    };
  }
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  return {
    notice: workspace ? undefined : "Не удалось открыть кабинет. Обнови страницу или войди заново.",
    workspaceId: workspace?.id ?? null,
  };
}
