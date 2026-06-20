import Link from "next/link";
import {
  ArrowLeft,
  AudioLines,
  CheckCircle2,
  FileText,
  GripVertical,
  ImagePlus,
  LockKeyhole,
  Mic,
  Plus,
  RotateCcw,
  Save,
  Upload,
  WandSparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const contentItems = [
  {
    title: "Старый город, бизнес-ланч",
    project: "Что поесть? Армавир",
    rubric: "Поесть до 500 рублей",
    status: "сбор фактов",
    version: "v4",
  },
  {
    title: "ПуриПури, сет за 590 ₽",
    project: "Что поесть? Армавир",
    rubric: "Обзор недели",
    status: "готово к сборке",
    version: "v7",
  },
];

const sourceBlocks = [
  ["Основные сведения", "Заведение, адрес, чек и контекст посещения.", "текст", true],
  ["Атмосфера", "Летняя площадка, музыка, сервис и ожидание подачи.", "голос", true],
  ["Блюда", "Повторяемые блоки с названием, ценой и наблюдениями.", "смешанный", false],
  ["Итог", "Вывод автора, рекомендация и вопрос аудитории.", "текст", false],
];

const mediaItems = [
  ["01", "Фото фасада", "готово", "обложка"],
  ["02", "Блюдо крупным планом", "готово", "карусель"],
  ["03", "Видео подачи", "проверка", "карусель"],
];

function StudioHeader({ title, label = "Этап 04" }: { title: string; label?: string }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <div className="text-sm font-semibold text-ink">{title}</div>
          <div className="text-xs text-muted">Техническая контент-студия на русском языке</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{label}</Badge>
          <Button asChild variant="ghost">
            <Link href="/app">
              <ArrowLeft size={16} />
              Кабинет
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function ContentIndexShell() {
  return (
    <main className="min-h-screen bg-surface">
      <StudioHeader title="Контент" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-ink">Черновики и материалы</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Единица работы здесь — материал, а не пост под одну площадку.
              Факты собираются отдельно от будущей сборки AI.
            </p>
          </div>
          <Button asChild>
            <Link href="/app/content/new">
              <Plus size={16} />
              Создать материал
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {contentItems.map((item) => (
            <Card className="grid gap-4" key={item.title}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge>{item.status}</Badge>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {item.project} · {item.rubric}
                  </p>
                </div>
                <Badge tone="success">{item.version}</Badge>
              </div>
              <div className="grid gap-2 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  Автосохранение и конфликт версий проверяются сервером
                </div>
                <div className="flex items-center gap-2">
                  <LockKeyhole size={16} className="text-accent" />
                  Зафиксированные факты будут защищать сборку от подмен
                </div>
              </div>
              <Button asChild variant="secondary">
                <Link href="/app/content/demo-review">Открыть студию</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

export function NewContentShell() {
  return (
    <main className="min-h-screen bg-surface">
      <StudioHeader title="Создать материал" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <Card className="grid content-start gap-3">
          {["Проект", "Рубрика", "Факты", "Медиа", "Сборка"].map((step, index) => (
            <div
              className="flex items-center gap-2 rounded-md border border-line p-3 text-sm"
              key={step}
            >
              <CheckCircle2 size={16} className={index < 2 ? "text-success" : "text-muted"} />
              <span className={index < 2 ? "font-medium text-ink" : "text-muted"}>{step}</span>
            </div>
          ))}
        </Card>

        <Card className="grid gap-4">
          <div>
            <Badge>Новый черновик</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink">
              Выбор проекта и рубрики
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              После создания откроется пошаговый сбор фактов: основные сведения,
              атмосфера, повторяемые блюда, итог и порядок медиа.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {["Проект", "Рубрика", "Внутреннее название", "Ответственный"].map((label) => (
              <label className="grid gap-1 text-sm" key={label}>
                <span className="font-medium text-ink">{label}</span>
                <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-accent" />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <FileText size={16} />
              Создать черновик
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/projects">
                <WandSparkles size={16} />
                Настроить рубрики
              </Link>
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}

export function ContentStudioShell({ contentId }: { contentId: string }) {
  return (
    <main className="min-h-screen bg-surface">
      <StudioHeader title="Контент-студия" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge>Материал {contentId}</Badge>
                <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink">
                  Обзор недели · Что поесть? Армавир
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Статус: сбор фактов · автосохранение: только что · диапазон: 4 500–8 000 знаков
                </p>
              </div>
              <Button type="button">
                <WandSparkles size={16} />
                Собрать
              </Button>
            </div>
          </Card>

          <Card className="grid content-start gap-3">
            <div className="text-sm font-semibold">Версия и фиксация</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border border-line p-3">
                <div className="text-muted">Версия</div>
                <div className="mt-1 font-semibold text-ink">12</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="text-muted">Факты</div>
                <div className="mt-1 font-semibold text-ink">8</div>
              </div>
            </div>
            <Button type="button" variant="secondary">
              <Save size={16} />
              Сохранить сейчас
            </Button>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <Card className="grid content-start gap-4">
            <div>
              <Badge>Пошаговый режим</Badge>
              <h2 className="mt-3 text-lg font-semibold text-ink">Атмосфера и сервис</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Подсказка: опишите посадку, музыку, запахи, скорость подачи,
                работу официанта и ощущение от места.
              </p>
            </div>
            <div className="grid gap-2">
              <Button type="button">
                <Mic size={16} />
                Записать голос
              </Button>
              <Button type="button" variant="secondary">
                <RotateCcw size={16} />
                Перезаписать блок
              </Button>
            </div>
            <textarea
              className="min-h-40 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              defaultValue="Летняя площадка, удобные столики, музыка, подача без суеты."
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary">Назад</Button>
              <Button type="button">Далее</Button>
              <Button type="button" variant="secondary">
                <Plus size={16} />
                Добавить блюдо
              </Button>
            </div>
          </Card>

          <Card className="grid content-start gap-3">
            <div>
              <Badge>Полный режим</Badge>
              <h2 className="mt-3 text-lg font-semibold text-ink">Блоки источника</h2>
            </div>
            {sourceBlocks.map(([name, text, source, locked]) => (
              <div className="rounded-md border border-line p-3" key={String(name)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-ink">{name}</div>
                  <div className="flex gap-2">
                    <Badge>{source}</Badge>
                    <Badge tone={locked ? "success" : "warning"}>
                      {locked ? "зафиксировано" : "черновик"}
                    </Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                  <span>Происхождение: пользователь</span>
                  <span>Расшифровка: доступна</span>
                  <span>Медиа: 2 файла</span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid content-start gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge>Медиа</Badge>
                <h2 className="mt-3 text-lg font-semibold text-ink">Порядок вложений</h2>
              </div>
              <Button asChild variant="secondary">
                <Link href="/app/media">
                  <Upload size={16} />
                  Загрузить
                </Link>
              </Button>
            </div>
            {mediaItems.map(([index, title, status, role]) => (
              <div className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-md border border-line p-3" key={index}>
                <GripVertical size={18} className="text-muted" />
                <div>
                  <div className="text-sm font-medium text-ink">{index}. {title}</div>
                  <div className="text-xs text-muted">Роль: {role}</div>
                </div>
                <Badge tone={status === "готово" ? "success" : "warning"}>{status}</Badge>
              </div>
            ))}
          </Card>

          <Card className="grid content-start gap-3">
            <div>
              <Badge>Голос</Badge>
              <h2 className="mt-3 text-lg font-semibold text-ink">Расшифровка и исправление</h2>
            </div>
            <div className="rounded-md border border-line p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <AudioLines size={16} className="text-accent" />
                provider: mock · статус: готово
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Текст расшифровки показывается рядом с аудио, затем исправленный
                вариант можно зафиксировать как факт.
              </p>
            </div>
            <textarea
              className="min-h-28 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              defaultValue="Уху принесли без пяти двенадцать, остальные блюда примерно в 12:03."
            />
            <Button type="button">
              <LockKeyhole size={16} />
              Принять и зафиксировать
            </Button>
          </Card>
        </div>
      </section>
    </main>
  );
}

export function MediaLibraryShell() {
  return (
    <main className="min-h-screen bg-surface">
      <StudioHeader title="Медиа" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <Card className="grid content-start gap-4">
          <div>
            <Badge>Загрузка</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink">
              Прямая загрузка в хранилище
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              API выдаёт подписанную ссылку, браузер отправляет файл напрямую,
              затем подтверждает размер, длительность и метаданные.
            </p>
          </div>
          <Button type="button">
            <ImagePlus size={16} />
            Выбрать файлы
          </Button>
          <div className="grid gap-2 text-sm text-muted">
            <div>Фото и видео: проверка типа, размера и готовности.</div>
            <div>Голос: отдельный путь для расшифровки блока.</div>
          </div>
        </Card>

        <Card className="grid content-start gap-3">
          <div>
            <Badge>Библиотека</Badge>
            <h2 className="mt-3 text-lg font-semibold text-ink">Файлы материала</h2>
          </div>
          {mediaItems.map(([index, title, status, role]) => (
            <div className="grid gap-3 rounded-md border border-line p-3 md:grid-cols-[40px_1fr_140px_120px]" key={index}>
              <div className="text-sm font-semibold text-muted">{index}</div>
              <div>
                <div className="text-sm font-medium text-ink">{title}</div>
                <div className="mt-1 text-xs text-muted">Порядок можно менять перед сборкой публикаций.</div>
              </div>
              <Badge tone={status === "готово" ? "success" : "warning"}>{status}</Badge>
              <Badge>{role}</Badge>
            </div>
          ))}
        </Card>
      </section>
    </main>
  );
}
