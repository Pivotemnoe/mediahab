import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BrainCircuit,
  FileJson,
  ListChecks,
  Radar,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const pipelineSteps = [
  ["Факты", "Извлечение структуры из блоков и расшифровок", "готово"],
  ["Примеры", "Выбор 3–8 одобренных примеров, а не всей библиотеки", "готово"],
  ["Мастер-текст", "Сборка черновика с крючками, оценками и призывом к действию", "готово"],
  ["Проверка", "Заблокированные факты, длина, рискованные неподтверждённые утверждения", "готово"],
];

const examples = [
  ["Обзор недели", "ПуриПури: интерьер спорит с кухней", "одобрено", "8/9"],
  ["Поесть до 500 рублей", "Старый город: бизнес-ланч без режима выживания", "одобрено", "9/9"],
  ["Фаст-обзор", "440 грамм за 250 ₽: вес есть, радости мало", "проверка", "6/9"],
];

const runRows = [
  ["Извлечение фактов", "OpenAI", "ждёт ключ"],
  ["Сборка мастер-текста", "OpenAI", "ждёт ключ"],
  ["Крючки", "OpenAI", "ждёт ключ"],
  ["Оценки", "OpenAI", "ждёт ключ"],
  ["Проверка качества", "OpenAI", "ждёт ключ"],
];

function AiHeader({ title, label = "Этап 05" }: { title: string; label?: string }) {
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
      description="Примеры, подбор, мастер-текст, проверка качества и журнал запусков ИИ."
      eyebrow={label}
      title={title}
    />
  );
}

export function AiPipelineShell() {
  return (
    <div className="grid gap-4">
      <AiHeader title="ИИ-пайплайн" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>Техническая сборка</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">
              Контролируемый редактор, а не свободный чат
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Сборка использует версию проекта, рубрику, зафиксированные факты и малый набор
              одобренных примеров. Результат сохраняется как версия мастер-текста и журнал запуска ИИ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <Sparkles size={16} />
              Собрать мастер-текст
            </Button>
            <Button type="button" variant="secondary">
              <RotateCcw size={16} />
              Повторить этап
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Этапы генерации</h2>
              <p className="mt-1 text-sm text-muted">Каждый запуск пишет провайдера, модель, расход и результат.</p>
              </div>
              <BrainCircuit size={20} className="text-accent" />
            </div>
            {pipelineSteps.map(([title, text, status]) => (
              <div className="grid gap-1 rounded-md border border-line p-3" key={title}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-ink">{title}</div>
                  <Badge tone="success">{status}</Badge>
                </div>
                <div className="text-sm leading-6 text-muted">{text}</div>
              </div>
            ))}
          </Card>

          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-success" />
              <h2 className="text-lg font-semibold">Защита фактов</h2>
            </div>
            <div className="grid gap-2 text-sm text-muted">
              <div className="rounded-md border border-line p-3">Заведение, адрес, чек, блюдо и цена не меняются без блокирующей ошибки.</div>
              <div className="rounded-md border border-line p-3">Недостаток фактов даёт пустое значение или предупреждение, а не выдумку.</div>
              <div className="rounded-md border border-line p-3">Оценки пользователя имеют приоритет над предложениями ИИ.</div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid content-start gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge>Последние запуски ИИ</Badge>
                <h2 className="mt-3 text-lg font-semibold">Журнал выполнения</h2>
              </div>
              <ListChecks size={18} className="text-accent" />
            </div>
            {runRows.map(([task, provider, status]) => (
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-line p-3 text-sm" key={task}>
                <span className="font-medium text-ink">{task}</span>
                <Badge>{provider}</Badge>
                <Badge tone={status === "готово" ? "success" : "warning"}>{status}</Badge>
              </div>
            ))}
          </Card>

          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <Radar size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Подбор примеров</h2>
            </div>
            <div className="grid gap-2">
              {examples.map(([rubric, title, status, score]) => (
                <div className="rounded-md border border-line p-3" key={title}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-ink">{title}</div>
                    <Badge tone={status === "одобрено" ? "success" : "warning"}>{status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted">{rubric} · качество {score}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export function ExamplesLibraryShell({ projectId }: { projectId: string }) {
  return (
    <div className="grid gap-4">
      <AiHeader title="Библиотека примеров" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>ID проекта</Badge>
            <h1 className="mt-3 break-all text-3xl font-semibold text-ink">{projectId}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Примеры проходят импорт, дедупликацию, проверку, одобрение и векторизацию перед попаданием в подбор.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <FileJson size={16} />
              Импорт JSON
            </Button>
            <Button type="button" variant="secondary">
              <WandSparkles size={16} />
              Разметить
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {["Одобрено: 2", "На проверке: 1", "Дубликаты: 0"].map((metric) => (
            <Card key={metric}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <BadgeCheck size={16} className="text-success" />
                {metric}
              </div>
              <div className="mt-2 text-sm leading-6 text-muted">
                Метрика будет считаться сервером после реального импорта примеров.
              </div>
            </Card>
          ))}
        </div>

        <Card className="grid gap-3">
          {examples.map(([rubric, title, status, score]) => (
            <div className="grid gap-2 rounded-md border border-line p-3" key={title}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-ink">{title}</div>
                  <div className="mt-1 text-xs text-muted">{rubric} · ручная оценка {score}</div>
                </div>
                <Badge tone={status === "одобрено" ? "success" : "warning"}>{status}</Badge>
              </div>
              <div className="text-sm leading-6 text-muted">
                Используется как стиль, а не как источник фактов для нового материала.
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
