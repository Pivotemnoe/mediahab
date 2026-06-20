import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, FileEdit, Mic, Send } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const workflow = [
  ["Диктовка", "Соберите факты голосом или текстом, не теряя структуру обзора.", Mic],
  ["Редактура", "Соберите мастер-текст, варианты для площадок и проверку качества.", Bot],
  ["Публикация", "Планируйте Telegram, MAX, Instagram и ручной экспорт из одного места.", Send],
] as const;

const proof = [
  ["Проекты и рубрики", "Настройки хранятся в базе, версии можно проверять и переносить."],
  ["Медиа и голос", "Фото, видео, аудио и расшифровка работают как часть материала."],
  ["Исходящая очередь", "Публикации идут через надёжную очередь с повторами и состоянием ручного экспорта."],
] as const;

export default function MarketingIndex() {
  return (
    <MarketingShell>
      <section
        className="relative overflow-hidden border-b border-border bg-sidebar text-sidebar-foreground"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(20,18,14,0.92) 0%, rgba(20,18,14,0.78) 48%, rgba(20,18,14,0.46) 100%), url('/assets/donika-telegram.jpeg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto grid min-h-[560px] max-w-7xl content-center gap-8 px-4 py-16">
          <div className="max-w-[320px] sm:max-w-3xl">
            <Badge tone="success">Контент-студия для локального медиа</Badge>
            <h1 className="mt-5 text-[28px] font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              MediaHub для обзоров и публикаций
            </h1>
            <p className="mt-5 max-w-[320px] text-base leading-7 text-sidebar-foreground/85 sm:max-w-2xl">
              Один рабочий кабинет для проекта, рубрик, диктовки, ИИ-редактуры, медиа, расписания и публикаций.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/register">
                  Создать кабинет
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/features">Возможности</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {workflow.map(([title, text, Icon]) => (
            <Card className="grid gap-3" key={title}>
              <Icon size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="text-sm leading-6 text-muted">{text}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileEdit size={18} className="text-primary" />
              Рабочий сценарий
            </div>
            <p className="text-sm leading-6 text-muted">
              Создайте проект, настройте рубрики, запишите впечатления голосом, проверьте факты, соберите мастер-текст и подготовьте версии под каждую площадку.
            </p>
          </Card>
          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarClock size={18} className="text-primary" />
              Расписание и контроль
            </div>
            <p className="text-sm leading-6 text-muted">
              Сервис хранит локальное время рабочего пространства, переводит расписание в UTC и показывает публикации, требующие ручного подтверждения.
            </p>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {proof.map(([title, text]) => (
            <div className="rounded-md border border-border bg-surface p-4" key={title}>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
