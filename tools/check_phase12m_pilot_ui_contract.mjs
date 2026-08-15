import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const tour = read("apps/web/src/components/layout/first-run-tour.tsx");
const replay = read("apps/web/src/components/layout/tour-replay-button.tsx");
const shells = read("apps/web/src/components/layout/shells.tsx");
const topbar = read("apps/web/src/components/layout/topbar.tsx");
const navigation = read("apps/web/src/config/navigation.ts");
const dashboard = read("apps/web/src/app/app/dashboard/dashboard-view.tsx");
const style = read("apps/web/src/app/app/style/page.tsx");
const account = read("apps/web/src/app/app/account/page.tsx");
const accountService = read("apps/web/src/services/workspace-settings.ts");
const composer = read("apps/web/src/components/phase12/simple-voice-composer.tsx");
const contentService = read("apps/web/src/services/content.ts");
const notebook = read("apps/web/src/components/notebook/notebook-view.tsx");
const loading = read("apps/web/src/app/app/loading.tsx");
const publicationService = read("services/api/app/modules/publications/service.py");

assert.match(tour, /nagovori:first-run-tour:v1/);
assert.match(tour, /Наговорить публикацию/);
assert.match(tour, /Не потерять мысль/);
assert.match(tour, /Показать свой стиль/);
assert.doesNotMatch(tour, /Найти тему/);
assert.match(tour, /Пропустить/);
assert.match(tour, /localStorage\.setItem/);
assert.match(replay, /Повторить знакомство/);
assert.match(shells, /<FirstRunTour \/>/);

assert.doesNotMatch(topbar, /QuickCreatePalette/);
for (const label of ["Наговорить", "Идеи", "Тексты", "Блокнот", "Мой стиль"]) {
  assert.match(navigation, new RegExp(`label: "${label}"`));
}
assert.match(navigation, /href: "\/app\/ideas", icon: Lightbulb, label: "Идеи"/);
for (const hiddenRoute of ["publications", "integrations", "calendar", "workspace", "billing"]) {
  assert.doesNotMatch(navigation, new RegExp(`/app/${hiddenRoute}`));
}

assert.doesNotMatch(dashboard, /UsageMeter|Тариф и использование/);
assert.match(dashboard, /Записать мысль/);
assert.equal((dashboard.match(/href="\/app\/projects\/new"/g) ?? []).length, 1);
assert.doesNotMatch(style, /Если примеров недостаточно: дополнительные настройки|Перейти к первой диктовке/);

assert.doesNotMatch(account, /Этап UI|Workspace|CSRF|Argon2|API|Выйти на всех устройствах|Сменить пароль/);
assert.match(account, /Повторить знакомство|TourReplayButton/);
assert.match(accountService, /sessionLabels\(session\.user_agent, session\.current\)/);
assert.doesNotMatch(accountService, /client: session\.user_agent/);
assert.match(accountService, /sessions: \[\]/);

assert.match(composer, /captureState === "recording" \? \(/);
assert.match(composer, /captureState === "paused" \? \(/);
assert.doesNotMatch(composer, /Технические сведения об ИИ|Стоимость текста:|Источник: проект → рубрика → площадка/);
assert.doesNotMatch(composer, /disabled=\{captureState !== "recording"\}|disabled=\{captureState !== "paused"\}/);
assert.match(contentService, /Сейчас не получается начать публикацию/);
assert.match(contentService, /projects: \[\]/);
assert.doesNotMatch(notebook, /offline · черновик|API станет доступен|связь есть/);
assert.match(notebook, /Сохранены на этом устройстве/);
assert.match(notebook, /Сохранить в блокнот/);
assert.match(notebook, /aria-label="Поиск по заметкам"/);
assert.match(notebook, /role="tablist"/);
assert.doesNotMatch(loading, /PWA shell/);

assert.doesNotMatch(publicationService, /Live-проверка|Коннектор поддерживается/);
assert.match(publicationService, /Аккаунт площадки пока не подтверждён/);

console.log("Phase12M first-run and pilot UI cleanup contract passed.");
