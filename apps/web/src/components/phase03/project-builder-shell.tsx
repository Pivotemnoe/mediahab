import Link from "next/link";
import {
  ArrowLeft,
  Blocks,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  CopyPlus,
  FileJson,
  FolderPlus,
  MessageSquare,
  Pencil,
  RadioTower,
  Sparkles,
  Trash2,
  Upload,
  Users,
  type LucideIcon,
  WandSparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  exampleImports,
  platformOptions,
  projectWizardSteps,
  rubricSuggestions,
} from "@/features/project-wizard/project-wizard-fixtures";

const projectSteps = [
  "Идентичность",
  "Аудитория",
  "Голос",
  "Площадки",
  "Примеры",
  "Рубрики",
];

const projectEntryPoints: Array<[string, string, LucideIcon]> = [
  ["С нуля", "Создать переиспользуемый проект без данных пресета.", FolderPlus],
  ["Из пресета", "Идемпотентно импортировать поддерживаемый пресет.", CopyPlus],
  ["Импорт пакета", "Проверить JSON проекта и рубрик перед активацией.", FileJson],
];

export function ProjectIndexShell() {
  return (
    <div className="grid gap-4">
      <BuilderHeader title="Проекты" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="success">Этап 03</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">
              Конструктор проектов
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Проекты хранят стабильную идентичность и неизменяемые версии
              настроек. Пресеты импортируются как данные, без ветвлений в коде.
            </p>
          </div>
          <Button asChild>
            <Link href="/app/projects/new">
              <FolderPlus size={16} />
              Новый проект
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {projectEntryPoints.map(([title, text, Icon]) => (
            <Card className="grid gap-3" key={title}>
              <Icon className="text-accent" size={20} />
              <div>
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-1 text-sm leading-6 text-muted">{text}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export function NewProjectShell() {
  return (
    <div className="grid gap-5">
      <BuilderHeader title="Новый проект" />
      <PageHeader
        actions={
          <>
            <Button type="button" variant="secondary">
              <CopyPlus size={16} />
              Импорт пресета
            </Button>
            <Button type="button">
              <FolderPlus size={16} />
              Сохранить черновик
            </Button>
          </>
        }
        description="Visual Builder для проекта: идентичность, аудитория, тон, площадки, примеры и AI-предложения рубрик."
        eyebrow="UI Phase 03"
        title="Мастер проекта"
      />

      <section className="grid gap-4 xl:grid-cols-[300px_1fr_340px]">
        <Card className="grid content-start gap-2">
          {projectWizardSteps.map(([step, text, status], index) => (
            <div
              className="grid grid-cols-[24px_1fr] gap-3 rounded-md border border-border p-3"
              key={step}
            >
              <CheckCircle2 size={16} className={status === "current" ? "mt-0.5 text-success" : "mt-0.5 text-muted"} />
              <div>
                <div className={status === "current" ? "text-sm font-medium text-foreground" : "text-sm font-medium text-muted"}>
                  {index + 1}. {step}
                </div>
                <div className="mt-1 text-xs leading-5 text-muted">{text}</div>
              </div>
            </div>
          ))}
        </Card>

        <div className="grid gap-4">
          <Card className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ClipboardCheck size={18} className="text-primary" />
              Основа проекта
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Название проекта", "Что поесть? Армавир"],
                ["URL-slug", "chto-poest-armavir"],
                ["Тематика", "Еда, обзоры, кафе и доставка"],
                ["Основной язык", "Русский"],
              ].map(([label, placeholder]) => (
                <label className="grid gap-1.5 text-sm" key={label}>
                  <span className="font-medium text-foreground">{label}</span>
                  <input
                    className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">Аудитория и тон</span>
              <textarea
                className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder="Локальная аудитория Армавира, живой разговорный тон, честные оценки без рекламной подачи."
              />
            </label>
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <RadioTower size={18} className="text-primary" />
              Площадки
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {platformOptions.map(([name, note, enabled]) => (
                <label className="grid gap-2 rounded-md border border-border p-3 text-sm" key={name}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">{name}</span>
                    <input defaultChecked={enabled} type="checkbox" />
                  </span>
                  <span className="text-xs leading-5 text-muted">{note}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Upload size={18} className="text-primary" />
              Примеры
            </div>
            <div className="rounded-md border border-dashed border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
              Загрузите тексты, фото или голосовые заметки. В UI Phase 03 это fixture-блок; API-импорт подключается позже.
            </div>
            <div className="flex flex-wrap gap-2">
              {exampleImports.map((item) => (
                <Badge key={item} tone="info">
                  {item}
                </Badge>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles size={18} className="text-primary" />
              AI-предложения рубрик
            </div>
            {rubricSuggestions.map(([name, text, mode]) => (
              <div className="grid gap-3 rounded-md border border-border p-3" key={name}>
                <div>
                  <div className="text-sm font-medium text-foreground">{name}</div>
                  <div className="mt-1 text-xs leading-5 text-muted">{text}</div>
                </div>
                <Badge tone="neutral" className="w-fit">
                  {mode}
                </Badge>
                <div className="flex gap-2">
                  <Button size="sm" type="button">
                    <CheckCircle2 size={14} />
                    Принять
                  </Button>
                  <Button size="sm" type="button" variant="secondary">
                    <Pencil size={14} />
                    Изменить
                  </Button>
                  <Button size="icon" type="button" variant="ghost">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users size={18} className="text-primary" />
              Подтверждение
            </div>
            <p className="text-sm leading-6 text-muted">
              Перед созданием проекта пользователь видит итог: название, площадки, тон, импорт примеров и выбранные рубрики.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted">
              <MessageSquare size={16} />
              Черновик можно сохранить без публикаций и без автоматического создания постов.
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export function ProjectDetailShell({ projectId }: { projectId: string }) {
  return (
    <div className="grid gap-4">
      <BuilderHeader title="Проект" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>ID проекта</Badge>
            <h1 className="mt-3 break-all text-3xl font-semibold text-ink">
              {projectId}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Стабильная идентичность с активной версией настроек.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/examples`}>
                <BookOpenCheck size={16} />
                Примеры
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/builder`}>
                <WandSparkles size={16} />
                Конструктор
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/app/projects/${projectId}/rubrics`}>
                <Blocks size={16} />
                Рубрики
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {["Версии", "Рубрики", "Импорт пресета"].map((title) => (
            <Card key={title}>
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-2 text-sm leading-6 text-muted">
                Управляется через API этапа 03 и неизменяемые записи версий.
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProjectBuilderShell({ projectId }: { projectId: string }) {
  return (
    <div className="grid gap-4">
      <BuilderHeader title="Конструктор проекта" />
      <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="grid content-start gap-2">
          {projectSteps.map((step) => (
            <button
              className="h-10 rounded-md px-3 text-left text-sm text-muted hover:bg-surface hover:text-ink"
              key={step}
            >
              {step}
            </button>
          ))}
        </Card>
        <Card className="grid gap-4">
          <Badge>Версионируемые настройки</Badge>
          <h1 className="text-2xl font-semibold text-ink">
            Конструктор проекта {projectId}
          </h1>
          <div className="grid gap-3 md:grid-cols-2">
            {["Название", "Описание", "ИИ-режим", "Политика знаков"].map((label) => (
              <div className="rounded-md border border-line p-3" key={label}>
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-1 text-sm text-muted">
                  Сохранённые изменения создают новую версию проекта.
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

export function RubricBuilderShell({ projectId }: { projectId: string }) {
  const palette = [
    "Короткий текст",
    "Длинный текст",
    "Цена",
    "Оценка",
    "Медиа",
    "Повторяемый блок",
    "Произвольный блок",
  ];
  const fields = ["название_места", "атмосфера", "блюда[]", "вывод", "медиа[]"];
  return (
    <div className="grid gap-4">
      <BuilderHeader title="Конструктор рубрик" />
      <section className="grid gap-4">
        <div>
          <Badge>Проект {projectId}</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-ink">
            Палитра полей, canvas формы и инспектор настроек
          </h1>
        </div>
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
          <Card className="grid content-start gap-2">
            <div className="text-sm font-semibold">Палитра полей</div>
            {palette.map((item) => (
              <button
                className="h-9 rounded-md border border-line px-3 text-left text-sm hover:bg-surface"
                key={item}
              >
                {item}
              </button>
            ))}
          </Card>
          <Card className="grid content-start gap-3">
            <div className="text-sm font-semibold">Полотно формы</div>
            {fields.map((field) => (
              <div className="rounded-md border border-line p-3" key={field}>
                <div className="text-sm font-medium">{field}</div>
                <div className="mt-1 text-sm text-muted">
                  Порядок, обязательность, источник и блокировка сохраняются в JSON Schema.
                </div>
              </div>
            ))}
          </Card>
          <Card className="grid content-start gap-3">
            <div className="text-sm font-semibold">Инспектор настроек</div>
            {["Обязательное поле", "Факт заблокирован", "Генерируется ИИ", "Мин/макс элементов", "Редакционные лимиты"].map((item) => (
              <label className="flex items-center gap-2 text-sm" key={item}>
                <input type="checkbox" />
                {item}
              </label>
            ))}
            <Button type="button">
              <WandSparkles size={16} />
              Сохранить новую версию
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}

function BuilderHeader({ title }: { title: string }) {
  return (
    <PageHeader
      actions={
        <Button asChild variant="secondary">
          <Link href="/app">
            <ArrowLeft size={16} />
            Кабинет
          </Link>
        </Button>
      }
      description="Visual Builder для проектов, рубрик, пресетов и версионируемых настроек."
      eyebrow="Этап 03"
      title={title}
    />
  );
}
