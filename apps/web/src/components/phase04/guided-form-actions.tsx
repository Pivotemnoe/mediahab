"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, LockKeyhole, Plus, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  addRepeatableGroupAction,
  saveGuidedFieldAction,
} from "@/services/content-actions";
import { type ContentStudioViewModel } from "@/services/content";
import {
  initialGuidedActionState,
  type GuidedActionState,
} from "@/services/guided-action-state";

type GuidedField = ContentStudioViewModel["guidedForm"]["fields"][number];

function statusClassName(tone: GuidedActionState["tone"]): string {
  if (tone === "success") {
    return "border-success bg-[color-mix(in_srgb,var(--success),transparent_92%)] text-success";
  }
  if (tone === "warning") {
    return "border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-warning";
  }
  if (tone === "danger") {
    return "border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] text-danger";
  }
  return "border-border bg-surface-muted text-muted";
}

function refreshPage() {
  window.location.reload();
}

function ActionStatus({ canRetry, state }: { canRetry: boolean; state: GuidedActionState }) {
  const Icon = state.tone === "success" ? CheckCircle2 : AlertTriangle;
  const showRefresh = state.recoveryAction === "refresh";
  const showRetry = state.recoveryAction === "retry" && canRetry;

  return (
    <div className={`grid gap-2 rounded-md border px-3 py-2 text-xs leading-5 ${statusClassName(state.tone)}`}>
      <div aria-live="polite" className="flex min-w-0 items-start gap-2">
        <Icon className="mt-0.5 shrink-0" size={14} />
        <span className="min-w-0 break-words">
          {state.message}
          {state.requestId ? <span className="block">ID запроса: {state.requestId}</span> : null}
        </span>
      </div>
      {showRefresh ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={refreshPage} size="sm" type="button" variant="secondary">
            <RotateCcw size={14} />
            Обновить страницу
          </Button>
          <span className="text-muted">После обновления форма получит актуальную версию материала.</span>
        </div>
      ) : null}
      {showRetry ? (
        <div className="flex min-w-0 items-center gap-2 text-muted">
          <RotateCcw className="shrink-0" size={14} />
          <span className="min-w-0 break-words">Исправьте поле при необходимости и нажмите кнопку сохранения ещё раз.</span>
        </div>
      ) : null}
    </div>
  );
}

function GuidedFieldControl({
  canMutate,
  field,
}: {
  canMutate: boolean;
  field: GuidedField;
}) {
  const placeholder = field.required ? "Нужно заполнить перед сборкой" : "Можно заполнить позже";

  if (field.inputKind === "textarea") {
    return (
      <textarea
        className="min-h-28 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 outline-none"
        defaultValue={field.value}
        name="value"
        placeholder={placeholder}
        readOnly={!canMutate}
      />
    );
  }

  if (field.inputKind === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-md border border-border bg-background p-3 text-sm text-muted">
        <input defaultChecked={field.value === "true"} disabled={!canMutate} name="value" type="checkbox" value="true" />
        <span>{field.value || placeholder}</span>
      </label>
    );
  }

  if (field.inputKind === "select") {
    return (
      <select
        className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
        defaultValue={field.value}
        disabled={!canMutate}
        name="value"
      >
        <option>{field.value || placeholder}</option>
      </select>
    );
  }

  return (
    <input
      className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
      defaultValue={field.value}
      name="value"
      placeholder={placeholder}
      readOnly={!canMutate}
      type="text"
    />
  );
}

export function GuidedFieldActionForm({
  canSubmit,
  contentId,
  field,
  itemVersion,
}: {
  canSubmit: boolean;
  contentId: string;
  field: GuidedField;
  itemVersion: number | null;
}) {
  const [state, formAction, isPending] = useActionState(saveGuidedFieldAction, initialGuidedActionState);
  const disabled = !canSubmit || isPending;

  return (
    <form action={formAction} className="grid gap-3">
      <input name="contentId" type="hidden" value={contentId} />
      <input name="fieldKey" type="hidden" value={field.fieldKey} />
      <input name="sourceType" type="hidden" value="user_text" />
      {field.blockId ? <input name="blockId" type="hidden" value={field.blockId} /> : null}
      {itemVersion !== null ? <input name="itemVersion" type="hidden" value={itemVersion} /> : null}
      <GuidedFieldControl canMutate={canSubmit} field={field} />
      <ActionStatus canRetry={canSubmit} state={state} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} name="intent" size="sm" type="submit" value="save" variant="secondary">
          <Save size={14} />
          {isPending ? "Сохраняем" : "Сохранить"}
        </Button>
        <Button disabled={disabled} name="intent" size="sm" type="submit" value="lock">
          <LockKeyhole size={14} />
          Сохранить и зафиксировать
        </Button>
      </div>
    </form>
  );
}

export function AddRepeatableGroupActionForm({
  canMutate,
  contentId,
  field,
  itemVersion,
}: {
  canMutate: boolean;
  contentId: string;
  field: GuidedField;
  itemVersion: number | null;
}) {
  const [state, formAction, isPending] = useActionState(addRepeatableGroupAction, initialGuidedActionState);
  const disabled = !canMutate || isPending;

  return (
    <form action={formAction} className="grid gap-3 rounded-md border border-dashed border-border p-3">
      <input name="contentId" type="hidden" value={contentId} />
      <input name="groupKey" type="hidden" value={field.fieldKey} />
      <input name="sourceType" type="hidden" value="user_text" />
      {itemVersion !== null ? <input name="itemVersion" type="hidden" value={itemVersion} /> : null}
      <div className="text-sm font-medium text-foreground">Добавить позицию</div>
      <div className="grid gap-3 md:grid-cols-2">
        {field.newItemFields.map((item) => (
          <label className="grid gap-1.5 text-sm" key={item.key}>
            <span className="font-medium text-foreground">
              {item.label}
              {item.required ? <span className="text-warning"> *</span> : null}
            </span>
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
              disabled={!canMutate}
              name={`field:${item.key}`}
              placeholder={item.typeLabel}
            />
          </label>
        ))}
      </div>
      <ActionStatus canRetry={canMutate} state={state} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} name="intent" size="sm" type="submit" value="save" variant="secondary">
          <Plus size={14} />
          {isPending ? "Добавляем" : "Добавить"}
        </Button>
        <Button disabled={disabled} name="intent" size="sm" type="submit" value="lock">
          <LockKeyhole size={14} />
          Добавить и зафиксировать
        </Button>
      </div>
    </form>
  );
}
