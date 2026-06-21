export type GuidedActionTone = "idle" | "success" | "warning" | "danger";

export interface GuidedActionState {
  code: string | null;
  message: string;
  requestId: string | null;
  tone: GuidedActionTone;
}

export const initialGuidedActionState: GuidedActionState = {
  code: null,
  message: "Статус действия появится здесь.",
  requestId: null,
  tone: "idle",
};
