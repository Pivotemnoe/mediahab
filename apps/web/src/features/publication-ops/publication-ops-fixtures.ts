export const connectorCards = [
  {
    name: "Telegram",
    state: "подключена",
    account: "@chto_poest_armavir",
    permissions: "publish, media, edit",
    token: "активен",
    capability: "Rich Message + tg-collage",
    tone: "success",
  },
  {
    name: "MAX",
    state: "требует внимания",
    account: "канал выбран вручную",
    permissions: "message, media package",
    token: "нужно проверить",
    capability: "manual/export first",
    tone: "warning",
  },
  {
    name: "Instagram",
    state: "ограничено",
    account: "professional account pending",
    permissions: "manual_required",
    token: "Meta readiness pending",
    capability: "caption + carousel package",
    tone: "warning",
  },
  {
    name: "Generic webhook",
    state: "simulate",
    account: "allowlist disabled",
    permissions: "owner/admin only",
    token: "challenge required",
    capability: "HMAC + HTTPS POST",
    tone: "neutral",
  },
] as const;

export const publicationQueue = [
  ["Telegram", "published", "external id: tg_2049", "success"],
  ["MAX", "failed_retryable", "attachment.not.ready, retry через 30с", "warning"],
  ["Instagram", "manual_required", "пакет готов, live connector disabled", "warning"],
  ["Webhook", "simulated", "ответ 202 сохранён как evidence", "neutral"],
] as const;

export const publicationAttempts = [
  ["#1", "Telegram", "published", "sendRichMessage", "2.1s"],
  ["#1", "MAX", "failed_retryable", "attachment.not.ready", "1.4s"],
  ["#1", "Instagram", "manual_required", "container-plan", "0.8s"],
  ["#1", "Webhook", "simulated", "signed payload", "0.2s"],
] as const;

export const schedulePosture = {
  date: "2026-06-21",
  time: "12:30",
  timezone: "Europe/Moscow",
  retry: "5с, 30с, 2м, 10м, 30м, 2ч, 6ч, 12ч",
} as const;

export const operationStates = [
  ["partial publication success", "Telegram опубликован, MAX ждёт retry, Instagram manual_required."],
  ["integration disconnected", "MAX token/capability нужно проверить перед live."],
  ["permission denied", "Editor не публикует без content.publish."],
  ["offline", "Retry и publish disabled без сети."],
] as const;
