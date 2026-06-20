import {
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  FileEdit,
  FolderKanban,
  Images,
  RadioTower,
  Send,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { UsageMeter } from "@/components/ui/usage-meter";

const pipeline = [
  ["Проекты", "Конструктор проектов, рубрик и версионируемых настроек", "готово"],
  ["Контент", "Сбор фактов, блоки источника, медиа и диктовка", "готово"],
  ["ИИ", "Примеры, подбор, мастер-текст и проверка качества", "ожидает ключ"],
  ["Публикации", "Варианты, approval, ручной экспорт и outbox", "технически готово"],
] as const;

const stats = [
  ["Материалы", "2", "Черновики и тестовые обзоры", FileEdit],
  ["Проекты", "1", "Пресет импортируется как данные", FolderKanban],
  ["Публикации", "4", "Варианты под площадки", Send],
] as const;

const integrations = [
  ["OpenAI STT", "первый провайдер", "success"],
  ["TimeWeb S3", "хранилище медиа", "success"],
  ["Generic webhook", "simulate по умолчанию", "warning"],
  ["Manual export", "нужно подтверждение", "warning"],
] as const;

export default function DashboardPage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/app/showcase">Витрина UI</Link>
            </Button>
            <Button asChild>
              <Link href="/app/content/new">Создать материал</Link>
            </Button>
          </>
        }
        description="Технический кабинет для проверки дизайн-системы, навигации и уже собранных фаз."
        eyebrow="UI Phase 01"
        title="Дашборд"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(([label, value, note, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{label}</span>
              <Icon size={18} className="text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{value}</div>
            <div className="mt-1 text-sm leading-6 text-muted">{note}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Контент-пайплайн</h2>
              <p className="mt-1 text-sm text-muted">Сводка готовности технических модулей.</p>
            </div>
            <CalendarClock size={20} className="text-primary" />
          </div>
          {pipeline.map(([title, text, status]) => (
            <div className="grid gap-2 rounded-md border border-border p-3" key={title}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 size={16} className="text-success" />
                  {title}
                </div>
                <StatusBadge status={status === "ожидает ключ" ? "warning" : "success"}>
                  {status}
                </StatusBadge>
              </div>
              <div className="text-sm leading-6 text-muted">{text}</div>
            </div>
          ))}
        </Card>

        <Card className="grid content-start gap-4">
          <div>
            <Badge tone="info">Провайдеры</Badge>
            <h2 className="mt-3 text-lg font-semibold text-foreground">Интеграции MVP</h2>
          </div>
          <div className="grid gap-3">
            {integrations.map(([name, note, tone]) => (
              <div className="rounded-md border border-border p-3" key={name}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  <StatusBadge status={tone}>{note}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
          <UsageMeter label="Тестовый лимит генераций" max={100} tone="warning" value={62} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="grid gap-3">
          <BrainCircuit size={20} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">ИИ-сборка</h2>
          <p className="text-sm leading-6 text-muted">
            OpenAI выбран первым провайдером, mock остаётся для локальных проверок.
          </p>
        </Card>
        <Card className="grid gap-3">
          <Images size={20} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Медиа</h2>
          <p className="text-sm leading-6 text-muted">
            Файлы уходят в S3-совместимое хранилище через подписанные URL.
          </p>
        </Card>
        <Card className="grid gap-3">
          <RadioTower size={20} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Публикации</h2>
          <p className="text-sm leading-6 text-muted">
            До нативных коннекторов используются manual export и безопасный webhook.
          </p>
        </Card>
      </div>
    </div>
  );
}
