export type GuidedActionTone = "idle" | "success" | "warning" | "danger";
export type GuidedRecoveryAction = "none" | "refresh" | "retry";

export interface GuidedActionState {
  code: string | null;
  message: string;
  recoveryAction: GuidedRecoveryAction;
  requestId: string | null;
  tone: GuidedActionTone;
}

export const initialGuidedActionState: GuidedActionState = {
  code: null,
  message: "Статус действия появится здесь.",
  recoveryAction: "none",
  requestId: null,
  tone: "idle",
};
