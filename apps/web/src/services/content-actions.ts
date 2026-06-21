"use server";

import { revalidatePath } from "next/cache";

import { guidedActionStateFromApiError, guidedActionUnavailableState } from "@/services/guided-action-errors";
import { buildAddRepeatableGroupPayload, buildSaveGuidedFieldPayload } from "@/services/guided-action-payloads";
import { type GuidedActionState } from "@/services/guided-action-state";
import { type BlockOut, type BlocksResponse } from "@/services/openapi-types";
import { ApiRequestError, apiRequest } from "@/services/runtime";

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
