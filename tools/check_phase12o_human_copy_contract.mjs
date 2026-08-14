import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const homepage = read("apps/web/src/app/page.tsx");
const features = read("apps/web/src/app/features/page.tsx");
const navigation = read("apps/web/src/config/navigation.ts");
const tour = read("apps/web/src/components/layout/first-run-tour.tsx");
const replay = read("apps/web/src/components/layout/tour-replay-button.tsx");
const dashboard = read("apps/web/src/app/app/dashboard/dashboard-view.tsx");
const notebook = read("apps/web/src/components/notebook/notebook-view.tsx");
const style = read("apps/web/src/app/app/style/page.tsx");
const account = read("apps/web/src/app/app/account/page.tsx");
const composer = read("apps/web/src/components/phase12/simple-voice-composer.tsx");
const contentStudio = read("apps/web/src/components/phase04/content-studio-shell.tsx");
const clientApi = read("apps/web/src/services/client-api.ts");
const userFacingErrors = read("apps/web/src/lib/user-facing-api-error.ts");
const standaloneIdeasClient = read("apps/web/src/features/standalone-ideas/standalone-ideas-client.ts");
const publicationService = read("services/api/app/modules/publications/service.py");
const aiService = read("services/api/app/modules/ai/service.py");

assert.match(homepage, /Твои мысли/);
assert.match(homepage, /«Наговори» соберёт из твоих слов цельную публикацию/);
assert.match(features, /Всё, чтобы превратить мысль в готовые публикации/);

for (const label of ["Наговорить", "Тексты", "Блокнот", "Мой стиль", "Каналы"]) {
  assert.match(navigation, new RegExp(`label: "${label}"`), label);
}
assert.doesNotMatch(navigation, /Публикации|Интеграции|Биллинг|Workspace|Идеи/);

for (const phrase of [
  "Наговорить публикацию",
  "Не потерять мысль",
  "Показать свой стиль",
  "Пропустить",
]) {
  assert.match(tour, new RegExp(phrase), phrase);
}
assert.match(replay, /Повторить знакомство/);
assert.match(dashboard, /О чём хочешь рассказать сегодня/);
assert.match(dashboard, /Записать мысль/);
assert.match(notebook, /Мысль не должна потеряться/);
assert.match(style, /Помоги «Наговори» услышать твой стиль/);
assert.match(account, /TourReplayButton/);

assert.match(composer, /Расскажи свою мысль/);
assert.match(composer, /Тексты для площадок/);
assert.match(composer, /Проверка перед копированием/);
assert.match(composer, /function preflightCopy/);
assert.match(composer, /Этот текст сохранён раньше\. Подготовь его заново/);
assert.doesNotMatch(contentStudio, /PilotVoiceTelegramPanel/);

assert.doesNotMatch(clientApi, /payload\.error\?\.message|Сервер вернул ошибку|Сессия страницы устарела/);
assert.doesNotMatch(userFacingErrors, /error\?\.message|error\.message|Сервер вернул ошибку/);
assert.doesNotMatch(standaloneIdeasClient, /run\.error_message|Сервер вернул ошибку|Сессия устарела/);

for (const phrase of [
  '"label": "Длина"',
  '"label": "Фото и видео"',
  '"label": "Вид публикации"',
  '"label": "Отправка"',
]) {
  assert.match(publicationService, new RegExp(phrase), phrase);
}
assert.doesNotMatch(publicationService, /технический предел|постоянный подвал|старый клиент|ручной экспорт/i);
assert.match(aiService, /А ты как думаешь\? Напиши в комментариях\./);
assert.doesNotMatch(aiService, /А вы как считаете|Напишите в комментариях/);
for (const phrase of [
  "Какой личный опыт или наблюдение вы можете подтвердить",
  "К какому честному выводу вы пришли сами",
  "Какой конкретный момент вы наблюдали сами",
  "Какой реальный выбор заставил вас задуматься",
  "Какой этап процесса вы можете описать",
  "Что именно изменило ваше отношение",
  "Какой вопрос вы хотели бы обсудить",
  "Сначала продиктуйте или напишите",
]) {
  assert.doesNotMatch(aiService, new RegExp(phrase), phrase);
}

const voicePaths = [
  "apps/web/src/app/page.tsx",
  "apps/web/src/app/features/page.tsx",
  "apps/web/src/app/contacts/page.tsx",
  "apps/web/src/app/pricing/page.tsx",
  "apps/web/src/app/privacy/page.tsx",
  "apps/web/src/app/terms/page.tsx",
  "apps/web/src/app/security/page.tsx",
  "apps/web/src/app/login/page.tsx",
  "apps/web/src/app/register/page.tsx",
  "apps/web/src/app/forgot-password/page.tsx",
  "apps/web/src/app/reset-password/page.tsx",
  "apps/web/src/app/verify-email/page.tsx",
  "apps/web/src/app/app/account/page.tsx",
  "apps/web/src/app/app/dashboard/dashboard-view.tsx",
  "apps/web/src/app/app/settings/page.tsx",
  "apps/web/src/app/app/style/page.tsx",
  "apps/web/src/components/layout/shells.tsx",
  "apps/web/src/components/marketing/voice-product-demo.tsx",
  "apps/web/src/components/phase02/auth-page.tsx",
  "apps/web/src/components/layout/first-run-tour.tsx",
  "apps/web/src/components/layout/logout-button.tsx",
  "apps/web/src/components/notebook/notebook-view.tsx",
  "apps/web/src/components/phase12/examples-import-form.tsx",
  "apps/web/src/components/phase12/idea-generator-sheet.tsx",
  "apps/web/src/components/phase12/platform-feedback-controls.tsx",
  "apps/web/src/components/phase12/project-create-form.tsx",
  "apps/web/src/components/phase12/project-rules-form.tsx",
  "apps/web/src/components/phase12/rubric-create-form.tsx",
  "apps/web/src/components/phase12/rubric-rules-form.tsx",
  "apps/web/src/components/phase12/standalone-idea-generator.tsx",
  "apps/web/src/components/phase12/simple-voice-composer.tsx",
  "apps/web/src/components/phase04/guided-form-actions.tsx",
  "apps/web/src/features/standalone-ideas/idea-handoff.ts",
  "apps/web/src/features/standalone-ideas/standalone-ideas-client.ts",
  "apps/web/src/services/guided-action-errors.ts",
  "apps/web/src/services/content.ts",
  "apps/web/src/services/retention.ts",
  "apps/web/src/services/client-api.ts",
  "apps/web/src/lib/user-facing-api-error.ts",
];
const voiceCorpus = voicePaths.map((path) => read(path)).join("\n");

assert.doesNotMatch(
  voiceCorpus,
  /(?:Обновите|Попробуйте|Выберите|Проверьте|Укажите|Опишите|Расскажите|Создайте|Сохраните|Исправьте|Подождите|Вернитесь|Войдите|Нажмите|Загрузите|Разрешите|Повторите|Используйте|Подключите|Настройте|Отправьте|Удалите|Напишите)/,
);
assert.doesNotMatch(voiceCorpus, /(?<![\p{L}\p{N}_])(?:вы|ваш|ваша|ваше|ваши|вам|вас|вами)(?![\p{L}\p{N}_])/iu);
assert.doesNotMatch(
  voiceCorpus,
  /(?<![\p{L}\p{N}_])(?:Сохраняем|Загружаем|Подключаем|Проверяем|Отправляем|Открываем|Готовим|Создаём|Входим|Продолжаем|Сохраняю|Загружаю|Подключаю|Проверяю|Отправляю|Открываю|Готовлю|Продолжаю|Останавливаю|Записываю)(?![\p{L}\p{N}_])/u,
);
assert.doesNotMatch(voiceCorpus, /Надиктовать|Reels|ИИ-дей|вариант\(а\)|Сервер вернул ошибку|Сессия страницы/);

const routePaths = [
  "apps/web/src/app/app/ai/page.tsx",
  "apps/web/src/app/app/billing/page.tsx",
  "apps/web/src/app/app/calendar/page.tsx",
  "apps/web/src/app/app/examples/page.tsx",
  "apps/web/src/app/app/integrations/page.tsx",
  "apps/web/src/app/app/media/page.tsx",
  "apps/web/src/app/app/publications/page.tsx",
  "apps/web/src/app/app/showcase/page.tsx",
  "apps/web/src/app/app/workspace/page.tsx",
];
const routeCorpus = routePaths.map((path) => read(path)).join("\n");
assert.doesNotMatch(routeCorpus, /Этап UI|API|backend|fixture|mock|токен|провайдер|модель|служебн|техническ/i);

console.log("Phase12O human-copy and orthography contract passed.");
