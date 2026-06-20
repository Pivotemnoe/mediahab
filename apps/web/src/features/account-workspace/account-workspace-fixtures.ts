export const accountSettings = [
  ["Email", "pivo.temnoe@gmail.com", "подтверждён"],
  ["Пароль", "Argon2id", "обновлён 12 дней назад"],
  ["Сессии", "3 активные", "можно отозвать"],
  ["CSRF", "cookie + token", "активно"],
] as const;

export const sessionRows = [
  ["MacBook", "Codex desktop", "сейчас", "current"],
  ["iPhone", "Mobile PWA", "2 часа назад", "active"],
  ["Chrome", "Armavir office", "вчера", "active"],
] as const;

export const workspaceRoles = [
  ["Владелец", "konstantin", "billing, deletion, integrations, members, all content"],
  ["Администратор", "manager", "projects, integrations, members except ownership transfer"],
  ["Редактор", "editor", "content, media, examples, preview, export, approval submit"],
  ["Наблюдатель", "viewer", "read-only"],
] as const;

export const permissionNotes = [
  ["content.publish", "не выдан editor по умолчанию"],
  ["workspace isolation", "чужой workspace id возвращает 404"],
  ["team seats", "лимит проверяется перед invite"],
] as const;
