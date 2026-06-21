"use client";

import { type FormEvent, type RefObject, useActionState, useEffect, useRef, useState } from "react";
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
import {
  createGuidedQueueJob,
  guidedFieldQueueKey,
  guidedRepeatableGroupQueueKey,
  type GuidedQueueFieldMetadata,
  type GuidedQueueIntent,
  type GuidedQueueMetadata,
  type GuidedQueueValues,
  type GuidedQueueJob,
} from "@/services/guided-queue-contract";
import {
  clearGuidedQueueJob,
  readGuidedQueueJob,
  writeGuidedQueueJob,
} from "@/services/guided-queue-store";
import { buildGuidedQueueReplayRequestDraft } from "@/services/guided-queue-replay";

type GuidedField = ContentStudioViewModel["guidedForm"]["fields"][number];
type AutosaveStatus = "disabled" | "failed" | "idle" | "pending" | "queued" | "synced";
type DraftStatus = "cleared" | "empty" | "restored" | "saved";
type QueueStatus = "blocked" | "empty" | "queued" | "retrying" | "synced" | "unavailable";
type DraftValues = GuidedQueueValues;

type DraftControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const draftPrefix = "tmh:guided-form-draft:v1";
const autosaveDelayMs = 1200;

function isDraftControl(element: Element): element is DraftControl {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLSelectElement) &&
    !(element instanceof HTMLTextAreaElement)
  ) {
    return false;
  }
  return element.name === "value" || element.name.startsWith("field:");
}

function formDraftValues(form: HTMLFormElement): DraftValues {
  const values: DraftValues = {};
  for (const element of Array.from(form.elements)) {
    if (!isDraftControl(element)) {
      continue;
    }
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      values[element.name] = element.checked ? element.value : "";
      continue;
    }
    if (element instanceof HTMLSelectElement && element.multiple) {
      values[element.name] = Array.from(element.selectedOptions, (option) => option.value);
      continue;
    }
    values[element.name] = element.value;
  }
  return values;
}

function formFieldTypes(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement) || element.type !== "hidden") {
      continue;
    }
    if (element.name === "fieldType") {
      values.value = element.value;
      continue;
    }
    if (element.name.startsWith("fieldType:")) {
      values[`field:${element.name.slice("fieldType:".length)}`] = element.value;
    }
  }
  return values;
}

function formQueueMetadata(form: HTMLFormElement): GuidedQueueFieldMetadata | null {
  const contentId = formTextValue(form, "contentId");
  const fieldKey = formTextValue(form, "fieldKey");
  if (!contentId || !fieldKey) {
    return null;
  }

  return {
    blockId: formTextValue(form, "blockId"),
    contentId,
    fieldKey,
    intent: guidedSubmitIntent(form.dataset.guidedSubmitIntent),
    itemVersion: formNumberValue(form, "itemVersion"),
    kind: "field",
    sourceType: formTextValue(form, "sourceType") ?? "user_text",
  };
}

function repeatableGroupQueueMetadata(form: HTMLFormElement): GuidedQueueMetadata | null {
  const contentId = formTextValue(form, "contentId");
  const groupKey = formTextValue(form, "groupKey");
  if (!contentId || !groupKey) {
    return null;
  }

  return {
    contentId,
    groupKey,
    intent: guidedSubmitIntent(form.dataset.guidedSubmitIntent),
    itemVersion: formNumberValue(form, "itemVersion"),
    kind: "repeatable_group",
    sourceType: formTextValue(form, "sourceType") ?? "user_text",
  };
}

function restoreFormDraft(form: HTMLFormElement, values: DraftValues) {
  for (const element of Array.from(form.elements)) {
    if (!isDraftControl(element) || values[element.name] === undefined) {
      continue;
    }
    const value = values[element.name];
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      element.checked = firstDraftValue(value) === element.value;
      continue;
    }
    if (element instanceof HTMLSelectElement && element.multiple) {
      const selectedValues = new Set(Array.isArray(value) ? value : [value]);
      for (const option of Array.from(element.options)) {
        option.selected = selectedValues.has(option.value);
      }
      continue;
    }
    element.value = firstDraftValue(value);
  }
}

function hasDraftValues(values: DraftValues): boolean {
  return Object.values(values).some(hasDraftValue);
}

function readDraft(storageKey: string): DraftValues | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return sanitizeDraftValues(parsed);
  } catch {
    return null;
  }
}

function writeDraft(storageKey: string, values: DraftValues) {
  try {
    if (!hasDraftValues(values)) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(values));
  } catch {
    // Browser storage can be unavailable or full. The server action remains authoritative.
  }
}

function formTextValue(form: HTMLFormElement, name: string): string | null {
  const value = new FormData(form).get(name);
  return typeof value === "string" && value.trim() ? value : null;
}

function formNumberValue(form: HTMLFormElement, name: string): number | null {
  const value = formTextValue(form, name);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function guidedSubmitIntent(value: string | undefined): GuidedQueueIntent | null {
  return value === "lock" || value === "save" ? value : null;
}

function recordSubmitIntent(event: FormEvent<HTMLFormElement>) {
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  if (!(submitter instanceof HTMLButtonElement) || submitter.name !== "intent") {
    event.currentTarget.dataset.guidedSubmitIntent = "";
    return;
  }
  event.currentTarget.dataset.guidedSubmitIntent = submitter.value;
}

function sanitizeDraftValues(value: unknown): DraftValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const values: DraftValues = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      values[key] = item;
      continue;
    }
    if (Array.isArray(item)) {
      values[key] = item.filter((entry): entry is string => typeof entry === "string");
    }
  }
  return values;
}

function firstDraftValue(value: DraftValues[string]): string {
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

function hasDraftValue(value: DraftValues[string]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => item.trim().length > 0);
  }
  return value.trim().length > 0;
}

function clearDraft(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function useGuidedLocalDraft(params: {
  enabled: boolean;
  state: GuidedActionState;
  storageKey: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("empty");

  useEffect(() => {
    if (!params.enabled || !formRef.current) {
      return;
    }
    const draft = readDraft(params.storageKey);
    if (!draft || !hasDraftValues(draft)) {
      return;
    }
    restoreFormDraft(formRef.current, draft);
    setDraftStatus("restored");
  }, [params.enabled, params.storageKey]);

  useEffect(() => {
    if (!params.enabled || params.state.tone !== "success") {
      return;
    }
    clearDraft(params.storageKey);
    setDraftStatus("cleared");
  }, [params.enabled, params.state.tone, params.storageKey]);

  function handleDraftChange() {
    if (!params.enabled || !formRef.current) {
      return;
    }
    writeDraft(params.storageKey, formDraftValues(formRef.current));
    setDraftStatus("saved");
  }

  function flushDraft() {
    if (!params.enabled || !formRef.current) {
      return;
    }
    writeDraft(params.storageKey, formDraftValues(formRef.current));
    setDraftStatus("saved");
  }

  return { draftStatus, flushDraft, formRef, handleDraftChange };
}

function useGuidedAutosave(params: {
  enabled: boolean;
  isPending: boolean;
  state: GuidedActionState;
}) {
  const autosaveButtonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(params.enabled ? "idle" : "disabled");

  useEffect(() => {
    if (!params.enabled) {
      setAutosaveStatus("disabled");
      return;
    }
    setAutosaveStatus((current) => (current === "disabled" ? "idle" : current));
  }, [params.enabled]);

  useEffect(() => {
    if (!params.enabled) {
      return;
    }
    if (params.isPending) {
      setAutosaveStatus("pending");
      return;
    }
    if (params.state.tone === "success") {
      setAutosaveStatus("synced");
      return;
    }
    if (params.state.tone === "warning" || params.state.tone === "danger") {
      setAutosaveStatus("failed");
    }
  }, [params.enabled, params.isPending, params.state.tone]);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  function scheduleAutosave() {
    if (!params.enabled || !autosaveButtonRef.current) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setAutosaveStatus("queued");
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (!params.enabled || !autosaveButtonRef.current) {
        return;
      }
      autosaveButtonRef.current.click();
    }, autosaveDelayMs);
  }

  function flushAutosaveTimer() {
    if (!timerRef.current) {
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  return { autosaveButtonRef, autosaveStatus, flushAutosaveTimer, scheduleAutosave };
}

function useGuidedQueue(params: {
  enabled: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  isPending: boolean;
  metadata: (form: HTMLFormElement) => GuidedQueueMetadata | null;
  state: GuidedActionState;
  storageKey: string;
}) {
  const [queueJob, setQueueJob] = useState<GuidedQueueJob | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(params.enabled ? "empty" : "unavailable");

  useEffect(() => {
    if (!params.enabled) {
      setQueueStatus("unavailable");
      return;
    }
    const storedJob = readGuidedQueueJob(params.storageKey);
    setQueueJob(storedJob);
    setQueueStatus(storedJob ? "queued" : "empty");
  }, [params.enabled, params.storageKey]);

  useEffect(() => {
    if (!params.enabled) {
      return;
    }
    if (params.isPending && queueJob) {
      setQueueStatus("retrying");
      return;
    }
    if (params.state.tone === "success") {
      clearGuidedQueueJob(params.storageKey);
      setQueueJob(null);
      setQueueStatus("synced");
      return;
    }
    if ((params.state.tone === "warning" || params.state.tone === "danger") && params.formRef.current) {
      if (
        queueJob &&
        queueJob.code === params.state.code &&
        queueJob.requestId === params.state.requestId &&
        queueJob.recoveryAction === params.state.recoveryAction
      ) {
        setQueueStatus(queueJob.recoveryAction === "refresh" ? "blocked" : "queued");
        return;
      }
      const job = createGuidedQueueJob({
        code: params.state.code,
        fieldTypes: formFieldTypes(params.formRef.current),
        metadata: params.metadata(params.formRef.current),
        recoveryAction: params.state.recoveryAction,
        requestId: params.state.requestId,
        values: formDraftValues(params.formRef.current),
      });
      writeGuidedQueueJob(params.storageKey, job);
      setQueueJob(job);
      setQueueStatus(job.recoveryAction === "refresh" ? "blocked" : "queued");
      return;
    }
    if (!params.isPending && queueJob) {
      setQueueStatus(queueJob.recoveryAction === "refresh" ? "blocked" : "queued");
    }
  }, [params.enabled, params.formRef, params.isPending, params.metadata, params.state, params.storageKey, queueJob]);

  function clearQueue() {
    clearGuidedQueueJob(params.storageKey);
    setQueueJob(null);
    setQueueStatus("empty");
  }

  return { clearQueue, queueJob, queueStatus };
}

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

function DraftStatusLine({ status }: { status: DraftStatus }) {
  const labels: Record<DraftStatus, string> = {
    cleared: "Локальный черновик очищен после успешного сохранения.",
    empty: "Локальный черновик появится здесь после ввода.",
    restored: "Восстановлен локальный черновик из этого браузера.",
    saved: "Локальный черновик сохранён в этом браузере.",
  };

  return (
    <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs leading-5 text-muted">
      {labels[status]}
    </div>
  );
}

function AutosaveStatusLine({ status }: { status: AutosaveStatus }) {
  const labels: Record<AutosaveStatus, string> = {
    disabled: "Автосохранение включится в API-режиме для изменяемых полей.",
    failed: "Автосохранение не прошло. Локальный черновик сохранён в браузере.",
    idle: "Автосохранение ждёт ввода.",
    pending: "Автосохраняем через backend...",
    queued: "Автосохранение запланировано.",
    synced: "Автосохранено через backend.",
  };

  const tone: GuidedActionState["tone"] =
    status === "failed" ? "danger" : status === "pending" || status === "queued" ? "warning" : status === "synced" ? "success" : "idle";

  return (
    <div className={`rounded-md border px-3 py-2 text-xs leading-5 ${statusClassName(tone)}`}>
      {labels[status]}
    </div>
  );
}

function QueueStatusLine({
  canRetry,
  job,
  onClear,
  onRetry,
  status,
}: {
  canRetry: boolean;
  job: GuidedQueueJob | null;
  onClear: () => void;
  onRetry: () => void;
  status: QueueStatus;
}) {
  const labels: Record<QueueStatus, string> = {
    blocked: "В очереди есть несинхронизированное поле. Сначала обновите страницу, затем повторите сохранение.",
    empty: "Очередь автосохранения пуста.",
    queued: "Есть несинхронизированное автосохранение в этом браузере.",
    retrying: "Повторяем сохранение из локальной очереди...",
    synced: "Локальная очередь синхронизирована.",
    unavailable: "Очередь автосохранения включится в API-режиме.",
  };
  const tone: GuidedActionState["tone"] =
    status === "blocked" || status === "queued" || status === "retrying"
      ? "warning"
      : status === "synced"
        ? "success"
        : "idle";
  const canRetryJob = canRetry && job?.recoveryAction !== "refresh" && (status === "queued" || status === "blocked");
  const replayReadiness = job ? manualReplayReadinessLabel(job) : null;

  return (
    <div className={`grid gap-2 rounded-md border px-3 py-2 text-xs leading-5 ${statusClassName(tone)}`}>
      <div>
        {labels[status]}
        {job?.code ? <span className="block">Код: {job.code}</span> : null}
        {job?.requestId ? <span className="block">ID запроса: {job.requestId}</span> : null}
        {replayReadiness ? <span className="block">{replayReadiness}</span> : null}
      </div>
      {job ? (
        <div className="flex flex-wrap gap-2">
          {canRetryJob ? (
            <Button onClick={onRetry} size="sm" type="button" variant="secondary">
              <RotateCcw size={14} />
              Повторить из очереди
            </Button>
          ) : null}
          <Button onClick={onClear} size="sm" type="button" variant="ghost">
            Очистить локальную очередь
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function manualReplayReadinessLabel(job: GuidedQueueJob): string {
  const draft = buildGuidedQueueReplayRequestDraft(job);
  if (draft.status === "ready") {
    return "Ручной повтор подготовлен: запрос собран локально, автоматическая отправка выключена.";
  }

  return `Ручной повтор не готов: не хватает ${draft.missing.map(manualReplayMissingLabel).join(", ")}.`;
}

function manualReplayMissingLabel(key: string): string {
  const labels: Record<string, string> = {
    metadata: "данных формы",
    "metadata.intent": "действия сохранения",
    "values.fields": "полей позиции",
    "values.value": "значения поля",
  };
  return labels[key] ?? key;
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
    const isMultiSelect = field.type === "multi_select";
    const defaultValue = isMultiSelect
      ? field.value.split(";").map((value) => value.trim()).filter(Boolean)
      : field.value;

    return (
      <select
        className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
        defaultValue={defaultValue}
        disabled={!canMutate}
        multiple={isMultiSelect}
        name="value"
      >
        <option value={field.value}>{field.value || placeholder}</option>
      </select>
    );
  }

  return (
    <input
      className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
      defaultValue={field.value}
      inputMode={field.inputKind === "number" ? "decimal" : undefined}
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
  const autosave = useGuidedAutosave({ enabled: canSubmit, isPending, state });
  const draft = useGuidedLocalDraft({
    enabled: canSubmit,
    state,
    storageKey: `${draftPrefix}:field:${contentId}:${field.fieldKey}:${field.blockId ?? "new"}`,
  });
  const queue = useGuidedQueue({
    enabled: canSubmit,
    formRef: draft.formRef,
    isPending,
    metadata: formQueueMetadata,
    state,
    storageKey: guidedFieldQueueKey({
      blockId: field.blockId,
      contentId,
      fieldKey: field.fieldKey,
    }),
  });

  function retryQueuedSave() {
    autosave.flushAutosaveTimer();
    draft.flushDraft();
    autosave.autosaveButtonRef.current?.click();
  }

  return (
    <form
      action={formAction}
      className="grid gap-3"
      onChange={() => {
        draft.handleDraftChange();
        autosave.scheduleAutosave();
      }}
      onInput={() => {
        draft.handleDraftChange();
        autosave.scheduleAutosave();
      }}
      onSubmit={(event) => {
        recordSubmitIntent(event);
        autosave.flushAutosaveTimer();
        draft.flushDraft();
      }}
      ref={draft.formRef}
    >
      <input name="contentId" type="hidden" value={contentId} />
      <input name="fieldKey" type="hidden" value={field.fieldKey} />
      <input name="fieldType" type="hidden" value={field.type} />
      <input name="sourceType" type="hidden" value="user_text" />
      {field.blockId ? <input name="blockId" type="hidden" value={field.blockId} /> : null}
      {itemVersion !== null ? <input name="itemVersion" type="hidden" value={itemVersion} /> : null}
      <GuidedFieldControl canMutate={canSubmit} field={field} />
      <AutosaveStatusLine status={autosave.autosaveStatus} />
      <DraftStatusLine status={draft.draftStatus} />
      <QueueStatusLine
        canRetry={canSubmit}
        job={queue.queueJob}
        onClear={queue.clearQueue}
        onRetry={retryQueuedSave}
        status={queue.queueStatus}
      />
      <ActionStatus canRetry={canSubmit} state={state} />
      <div className="flex flex-wrap gap-2">
        <button
          aria-hidden="true"
          className="hidden"
          disabled={!canSubmit}
          name="intent"
          ref={autosave.autosaveButtonRef}
          tabIndex={-1}
          type="submit"
          value="save"
        />
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
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const lockButtonRef = useRef<HTMLButtonElement>(null);
  const draft = useGuidedLocalDraft({
    enabled: canMutate,
    state,
    storageKey: `${draftPrefix}:repeatable:${contentId}:${field.fieldKey}`,
  });
  const queue = useGuidedQueue({
    enabled: canMutate,
    formRef: draft.formRef,
    isPending,
    metadata: repeatableGroupQueueMetadata,
    state,
    storageKey: guidedRepeatableGroupQueueKey({
      contentId,
      groupKey: field.fieldKey,
    }),
  });

  function retryQueuedAdd() {
    draft.flushDraft();
    if (queue.queueJob?.metadata?.kind === "repeatable_group" && queue.queueJob.metadata.intent === "lock") {
      lockButtonRef.current?.click();
      return;
    }
    saveButtonRef.current?.click();
  }

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-md border border-dashed border-border p-3"
      onChange={draft.handleDraftChange}
      onInput={draft.handleDraftChange}
      onSubmit={(event) => {
        recordSubmitIntent(event);
        draft.flushDraft();
      }}
      ref={draft.formRef}
    >
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
            <input name={`fieldType:${item.key}`} type="hidden" value={item.type} />
            <input
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
              disabled={!canMutate}
              inputMode={
                item.type === "money" || item.type === "number" || item.type === "rating"
                  ? "decimal"
                  : undefined
              }
              name={`field:${item.key}`}
              placeholder={item.typeLabel}
            />
          </label>
        ))}
      </div>
      <DraftStatusLine status={draft.draftStatus} />
      <QueueStatusLine
        canRetry={canMutate}
        job={queue.queueJob}
        onClear={queue.clearQueue}
        onRetry={retryQueuedAdd}
        status={queue.queueStatus}
      />
      <ActionStatus canRetry={canMutate} state={state} />
      <div className="flex flex-wrap gap-2">
        <button
          aria-hidden="true"
          className="hidden"
          disabled={!canMutate}
          name="intent"
          ref={saveButtonRef}
          tabIndex={-1}
          type="submit"
          value="save"
        />
        <button
          aria-hidden="true"
          className="hidden"
          disabled={!canMutate}
          name="intent"
          ref={lockButtonRef}
          tabIndex={-1}
          type="submit"
          value="lock"
        />
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
