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
  type MeResponse,
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
