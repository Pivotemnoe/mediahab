import Link from "next/link";
import {
  ArrowLeft,
  Blocks,
  BookOpenCheck,
  CheckCircle2,
  CopyPlus,
  FileJson,
  FolderPlus,
  type LucideIcon,
  WandSparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <div className="grid gap-4">
      <BuilderHeader title="Новый проект" />
      <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="grid content-start gap-2">
          {projectSteps.map((step, index) => (
            <div
              className="flex items-center gap-2 rounded-md border border-line p-3 text-sm"
              key={step}
            >
              <CheckCircle2 size={16} className={index === 0 ? "text-success" : "text-muted"} />
              <span className={index === 0 ? "font-medium text-ink" : "text-muted"}>
                {step}
              </span>
            </div>
          ))}
        </Card>
        <Card className="grid gap-4">
          <div>
            <Badge>Мастер</Badge>
            <h1 className="mt-3 text-2xl font-semibold text-ink">
              Создание с нуля, из пресета, клона или пакета
            </h1>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {["Название проекта", "URL-slug", "Тематика", "Основной язык"].map((label) => (
              <label className="grid gap-1 text-sm" key={label}>
                <span className="font-medium text-ink">{label}</span>
                <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-accent" />
              </label>
            ))}
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Голос и тон</span>
            <textarea className="min-h-28 rounded-md border border-line px-3 py-2 outline-none focus:border-accent" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <FolderPlus size={16} />
              Сохранить черновик проекта
            </Button>
            <Button type="button" variant="secondary">
              <CopyPlus size={16} />
              Импортировать пресет
            </Button>
            <Button type="button" variant="secondary">
              <FileJson size={16} />
              Проверить пакет
            </Button>
          </div>
        </Card>
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
