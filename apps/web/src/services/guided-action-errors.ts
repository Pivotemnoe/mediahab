import { type GuidedActionState, type GuidedRecoveryAction } from "@/services/guided-action-state";

interface GuidedActionApiError {
  code: string;
  requestId: string | null;
  status: number;
}

const refreshRequiredCodes = new Set(["csrf_invalid", "csrf_required", "version_conflict"]);

const guidedActionErrorMessages: Record<string, string> = {
  csrf_invalid: "Сессия страницы устарела. Обновите страницу и повторите сохранение.",
  csrf_required: "Сессия страницы устарела. Обновите страницу и повторите сохранение.",
  version_conflict: "Материал изменился в другой вкладке или сессии. Обновите страницу перед повторным сохранением.",
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
    ? "Сервер сейчас недоступен для сохранения. Повторите позже."
    : "Сервер отклонил сохранение. Проверьте поле и повторите действие.";
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
    message: "Соединение прервано. Изменение не сохранено.",
    recoveryAction: "retry",
    requestId: null,
    tone: "danger",
  };
}
