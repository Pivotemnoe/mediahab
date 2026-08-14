import { type GuidedActionState, type GuidedRecoveryAction } from "@/services/guided-action-state";

interface GuidedActionApiError {
  code: string;
  requestId: string | null;
  status: number;
}

const refreshRequiredCodes = new Set(["csrf_invalid", "csrf_required", "version_conflict"]);

const guidedActionErrorMessages: Record<string, string> = {
  csrf_invalid: "Страница давно открыта. Обнови её и повтори сохранение.",
  csrf_required: "Страница давно открыта. Обнови её и повтори сохранение.",
  version_conflict: "Публикация изменилась в другой вкладке. Обнови страницу перед повторным сохранением.",
};

export function guidedActionRecoveryAction(code: string): GuidedRecoveryAction {
  return refreshRequiredCodes.has(code) ? "refresh" : "retry";
}

export function guidedActionMessageForCode(code: string, status: number): string {
  const explicitMessage = guidedActionErrorMessages[code];
  if (explicitMessage) {
    return explicitMessage;
  }
  return status >= 500
    ? "Сейчас не удаётся сохранить изменение. Повтори позже."
    : "Изменение не сохранено. Проверь поле и повтори действие.";
}

export function guidedActionStateFromApiError(error: GuidedActionApiError): GuidedActionState {
  return {
    code: error.code,
    message: guidedActionMessageForCode(error.code, error.status),
    recoveryAction: guidedActionRecoveryAction(error.code),
    requestId: error.requestId,
    tone: error.code === "version_conflict" ? "warning" : "danger",
  };
}

export function guidedActionUnavailableState(): GuidedActionState {
  return {
    code: "api_unavailable",
    message: "Изменение не сохранилось. Проверь интернет и попробуй ещё раз.",
    recoveryAction: "retry",
    requestId: null,
    tone: "danger",
  };
}
