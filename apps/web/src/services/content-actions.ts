"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { guidedActionStateFromApiError, guidedActionUnavailableState } from "@/services/guided-action-errors";
import { buildAddRepeatableGroupPayload, buildSaveGuidedFieldPayload } from "@/services/guided-action-payloads";
import { type GuidedActionState } from "@/services/guided-action-state";
import {
  type BlockOut,
  type BlocksResponse,
  type ContentItemOut,
  type DestinationOut,
  type DestinationsResponse,
  type GenerationRunOut,
  type MeResponse,
  type PlatformVariantOut,
  type PlatformVariantsResponse,
  type PublicationOut,
  type ProjectListResponse,
  type ProjectOut,
  type RubricListResponse,
} from "@/services/openapi-types";
import { ApiRequestError, apiGet, apiRequest } from "@/services/runtime";

function successState(message: string): GuidedActionState {
  return {
    code: "ok",
    message,
    recoveryAction: "none",
    requestId: null,
    tone: "success",
  };
}

function actionErrorState(error: unknown): GuidedActionState {
  if (error instanceof ApiRequestError) {
    return guidedActionStateFromApiError(error);
  }

  return guidedActionUnavailableState();
}

export async function saveGuidedFieldAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  try {
    const payload = buildSaveGuidedFieldPayload(formData);

    await apiRequest<BlockOut>(payload.request.path, {
      body: payload.request.body,
      method: payload.request.method,
    });

    revalidatePath(`/app/content/${payload.contentId}`);
    return successState(payload.successMessage);
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function addRepeatableGroupAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  try {
    const payload = buildAddRepeatableGroupPayload(formData);

    await apiRequest<BlocksResponse>(payload.request.path, {
      body: payload.request.body,
      method: payload.request.method,
    });

    revalidatePath(`/app/content/${payload.contentId}`);
    return successState(payload.successMessage);
  } catch (error) {
    return actionErrorState(error);
  }
}

function formDataString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function messageState(
  message: string,
  options: {
    code?: string;
    tone?: GuidedActionState["tone"];
  } = {},
): GuidedActionState {
  return {
    code: options.code ?? "ok",
    message,
    recoveryAction: "none",
    requestId: null,
    tone: options.tone ?? "success",
  };
}

function generationMessage(run: GenerationRunOut): GuidedActionState {
  if (run.status !== "completed") {
    return messageState(
      run.error_message || "ИИ не смог собрать мастер-текст. Проверьте заполненные факты и повторите.",
      {
        code: run.error_code ?? "generation_failed",
        tone: "danger",
      },
    );
  }

  const response = run.response_json ?? {};
  const masterText = typeof response.master_text === "string" ? response.master_text : "";
  return messageState(
    masterText
      ? `Мастер-текст собран: ${masterText.length} знаков. Проверьте превью и затем публикуйте в тестовый Telegram.`
      : "Мастер-текст собран, но backend не вернул текст в ответе. Обновите страницу перед публикацией.",
  );
}

export async function assemblePilotMasterAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  const contentId = formDataString(formData, "contentId");
  try {
    const run = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${contentId}/assemble-master`, {
      method: "POST",
    });
    revalidatePath(`/app/content/${contentId}`);
    return generationMessage(run);
  } catch (error) {
    return actionErrorState(error);
  }
}

async function ensurePilotTelegramDestination(projectId: string): Promise<DestinationOut> {
  const name = "Temichev PostHub Test Telegram";
  const destinations = await apiGet<DestinationsResponse>(`/api/v1/projects/${projectId}/destinations`);
  const existing = destinations.destinations.find(
    (destination) =>
      destination.name === name &&
      destination.platform_key === "telegram" &&
      destination.connector_key === "telegram_rich_message" &&
      destination.status === "active",
  );
  if (existing) {
    return existing;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    throw new ApiRequestError(
      "TELEGRAM_BOT_TOKEN is not configured",
      503,
      "/api/v1/projects/:projectId/destinations",
      "telegram_token_missing",
    );
  }

  return apiRequest<DestinationOut>(`/api/v1/projects/${projectId}/destinations`, {
    body: {
      connector_key: "telegram_rich_message",
      configuration: {
        bot_token: botToken,
        channel_username: "@temichev_posthub_test",
        delivery_mode: "live",
        media_delivery_base_url: "https://temichev-posthub.ru/media",
        telegram_mode: "rich_message",
      },
      name,
      platform_key: "telegram",
    },
    method: "POST",
  });
}

function publicationMessage(publication: PublicationOut): GuidedActionState {
  if (publication.status === "published") {
    const external = publication.external_posts[0];
    const externalId = typeof external?.provider_external_id === "string"
      ? external.provider_external_id
      : "Telegram принял публикацию";
    return messageState(`Опубликовано в @temichev_posthub_test. ${externalId}`);
  }

  return messageState(
    publication.last_error_message ||
      `Публикация не завершилась. Статус: ${publication.status}. Проверьте права бота и повторите.`,
    {
      code: publication.last_error_code ?? "publication_failed",
      tone: "danger",
    },
  );
}

function pilotPublicationAlreadySentMessage(publication: PublicationOut): GuidedActionState {
  const external = publication.external_posts[0];
  const externalId = typeof external?.provider_external_id === "string"
    ? external.provider_external_id
    : "Telegram уже принял эту публикацию";
  return messageState(`Эта версия уже опубликована в @temichev_posthub_test. ${externalId}`);
}

export async function publishPilotTelegramAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  const contentId = formDataString(formData, "contentId");
  try {
    const item = await apiGet<ContentItemOut>(`/api/v1/content-items/${contentId}`);
    const generated = await apiRequest<PlatformVariantsResponse>(
      `/api/v1/content-items/${contentId}/generate-variants`,
      {
        body: { platform_keys: ["telegram"] },
        method: "POST",
      },
    );
    const variant = generated.variants.find((item) => item.platform_key === "telegram");
    if (!variant) {
      return messageState("Backend не вернул Telegram-вариант. Повторите после обновления страницы.", {
        code: "telegram_variant_missing",
        tone: "danger",
      });
    }

    await apiRequest<PlatformVariantOut>(`/api/v1/platform-variants/${variant.id}/validate`, {
      method: "POST",
    });
    const approved = await apiRequest<PlatformVariantOut>(`/api/v1/platform-variants/${variant.id}/approve`, {
      method: "POST",
    });
    const destination = await ensurePilotTelegramDestination(item.project_id);
    const publication = await apiRequest<PublicationOut>(
      `/api/v1/platform-variants/${approved.id}/publications`,
      {
        body: {
          destination_id: destination.id,
          idempotency_key: `ui-telegram-pilot-${contentId}-${approved.id}`,
        },
        method: "POST",
      },
    );
    if (publication.status === "published") {
      revalidatePath(`/app/content/${contentId}`);
      revalidatePath("/app");
      return pilotPublicationAlreadySentMessage(publication);
    }
    const published = await apiRequest<PublicationOut>(`/api/v1/publications/${publication.id}/publish-now`, {
      method: "POST",
    });

    revalidatePath(`/app/content/${contentId}`);
    revalidatePath("/app");
    return publicationMessage(published);
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function startPilotContentAction(): Promise<void> {
  const me = await apiGet<MeResponse>("/api/v1/me");
  const workspace = me.workspaces[0];
  if (!workspace) {
    throw new Error("Workspace is not available.");
  }

  const projectsResponse = await apiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`);
  let project = projectsResponse.projects[0];

  if (!project) {
    const imported = await apiRequest<{ project: ProjectOut }>(
      `/api/v1/workspaces/${workspace.id}/projects/from-preset`,
      {
        body: { preset_key: "chto-poest-armavir" },
        method: "POST",
      },
    );
    project = imported.project;
  }

  const rubricsResponse = await apiGet<RubricListResponse>(`/api/v1/projects/${project.id}/rubrics`);
  const rubric = rubricsResponse.rubrics[0];
  if (!rubric) {
    throw new Error("Rubric is not available.");
  }

  const item = await apiRequest<ContentItemOut>(`/api/v1/projects/${project.id}/content-items`, {
    body: {
      rubric_id: rubric.id,
      title_internal: `Пилотный черновик: ${rubric.name}`,
    },
    method: "POST",
  });

  revalidatePath("/app");
  revalidatePath("/app/content");
  redirect(`/app/content/${item.id}`);
}
