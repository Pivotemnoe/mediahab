import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileEdit,
  ImageUp,
  Layers3,
  Mic,
  PlayCircle,
  RadioTower,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const workflow = [
  {
    title: "Мастер материала",
    text: "Выберите проект, при необходимости рубрику и понятные блоки: факты, голос, медиа, итог.",
    icon: FileEdit,
  },
  {
    title: "Сбор без хаоса",
    text: "Надиктуйте заметки, добавьте текст и медиа, а важные факты оставьте зафиксированными.",
    icon: Mic,
  },
  {
    title: "ИИ-сборка и версии",
    text: "Получите мастер-текст и отдельные варианты для Telegram, MAX и Instagram.",
    icon: Bot,
  },
  {
    title: "Проверка и публикация",
    text: "Сравните превью площадок и отправляйте только после ручного подтверждения.",
    icon: Send,
  },
] as const;

const productSignals = [
  ["Не Telegram-only", "Один материал готовит несколько платформенных версий."],
  ["Настройки в проекте", "Рубрики, правила, примеры и лимиты живут в конфигурации, а не в коде."],
  ["Человек решает", "ИИ помогает собрать текст, но публикация не уходит без подтверждения."],
] as const;

const entryActions = [
  {
    title: "Зарегистрироваться и начать",
    text: "Создайте личный кабинет, войдите и откройте голосовой сценарий без отдельной настройки устройства.",
    href: "/register",
    label: "Создать аккаунт",
    icon: Sparkles,
  },
  {
    title: "Вернуться в свой кабинет",
    text: "Если аккаунт уже есть, войдите и продолжите работу с сохранёнными материалами.",
    href: "/login",
    label: "Войти",
    icon: Layers3,
  },
  {
    title: "Понять возможности",
    text: "Посмотрите, как устроены проекты, рубрики, ИИ-редактура, медиа и публикации.",
    href: "/features",
    label: "Смотреть возможности",
    icon: PlayCircle,
  },
] as const;

const platformPreview = [
  ["Telegram", "готов к длинному посту", "success"],
  ["MAX", "лимит проверен", "info"],
  ["Instagram", "нужна короткая версия", "warning"],
] as const;

export default function MarketingIndex() {
  return (
    <MarketingShell>
      <section
        className="relative isolate overflow-hidden border-b border-border bg-sidebar text-sidebar-foreground"
        data-testid="public-home-hero"
      >
        <HeroComposerScene />

        <div className="relative mx-auto grid min-h-[620px] max-w-7xl content-center px-4 py-14 sm:min-h-[660px] lg:min-h-[680px]">
          <div className="max-w-[760px]">
            <Badge tone="success" className="border-sidebar-foreground/20 bg-sidebar-foreground/10 text-sidebar-foreground">
              Медиа-хаб для материала, голоса, ИИ и публикаций
            </Badge>
            <h1 className="mt-5 max-w-4xl text-[38px] font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Temichev Media Hub
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-sidebar-foreground/80 sm:text-lg sm:leading-8">
              Рабочий кабинет, где редактор собирает факты, диктует заметки, прикрепляет медиа, получает ИИ-редактуру и выпускает отдельные версии для Telegram, MAX и Instagram.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/register">
                  Зарегистрироваться
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild className="w-full border-sidebar-foreground/20 bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/20 sm:w-auto" variant="secondary">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild className="w-full text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 hover:text-white sm:w-auto" variant="ghost">
                <Link href="/features">Как это работает</Link>
              </Button>
            </div>

            <MobileComposerPreview />

            <div className="mt-8 hidden max-w-2xl gap-3 sm:grid sm:grid-cols-3" data-testid="public-home-proof">
              {productSignals.map(([title, text]) => (
                <div className="rounded-md border border-sidebar-foreground/20 bg-sidebar-foreground/10 p-3" key={title}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <CheckCircle2 size={15} className="text-[color-mix(in_srgb,var(--success),white_18%)]" />
                    {title}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-sidebar-foreground/70">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:py-10" data-testid="public-home-workflow">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Badge tone="info">Основной путь</Badge>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              От сырого материала до публикации без ручной пересборки под каждую площадку
            </h2>
          </div>
          <Button asChild variant="secondary">
            <Link href="/register">
              Создать аккаунт
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflow.map(({ icon: Icon, text, title }, index) => (
            <Card className="grid content-start gap-3" key={title}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary),transparent_88%)] text-primary">
                  <Icon size={19} />
                </span>
                <span className="text-xs font-semibold uppercase text-muted">0{index + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-6 text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 lg:grid-cols-[1fr_420px] lg:py-10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck size={18} className="text-success" />
                Контроль фактов
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                Сервис отделяет исходные наблюдения от редакторской сборки, чтобы ИИ не превращал догадки в факты.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <RadioTower size={18} className="text-primary" />
                Площадки отдельно
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                У Telegram, MAX и Instagram разные редакторские цели и технические лимиты. Media Hub показывает это до отправки.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-5 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ImageUp size={18} className="text-[color-mix(in_srgb,var(--builder-accent),black_8%)]" />
                Медиа, голос и текст в одном материале
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Фотографии, видео, аудиозаметки, расшифровка, мастер-текст и платформенные версии не расползаются по чатам, файлам и заметкам.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-sidebar p-5 text-sidebar-foreground shadow-popover">
            <Badge tone="success" className="border-sidebar-foreground/20 bg-sidebar-foreground/10 text-sidebar-foreground">
              Ручное подтверждение
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-white">
              Публикация остаётся решением человека
            </h2>
            <p className="mt-3 text-sm leading-6 text-sidebar-foreground/75">
              ИИ может предложить структуру, крючок, CTA и версии площадок, но финальная отправка проходит через явную проверку редактора.
            </p>
            <div className="mt-5 grid gap-2">
              {platformPreview.map(([name, note, tone]) => (
                <div className="flex items-center justify-between gap-3 rounded-md border border-sidebar-foreground/20 bg-sidebar-foreground/10 p-3" key={name}>
                  <div>
                    <div className="text-sm font-semibold text-white">{name}</div>
                    <div className="mt-1 text-xs text-sidebar-foreground/60">{note}</div>
                  </div>
                  <span
                    className={
                      tone === "success"
                        ? "h-2.5 w-2.5 rounded-full bg-success"
                        : tone === "warning"
                          ? "h-2.5 w-2.5 rounded-full bg-warning"
                          : "h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--builder-accent),white_18%)]"
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:py-10" data-testid="public-home-entry">
        <div className="max-w-3xl">
          <Badge tone="success">Вход в работу</Badge>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            Начинайте с материала, а не с настройки сложной системы
          </h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Основной сценарий ведёт пользователя по делу: что собрать, что проверить, какие версии подготовить и где подтвердить публикацию.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {entryActions.map(({ href, icon: Icon, label, text, title }) => (
            <Card className="grid content-start gap-4" key={title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-muted text-primary">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </div>
              <Button asChild className="mt-auto w-full" variant={href === "/register" ? "primary" : "secondary"}>
                <Link href={href}>
                  {label}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

function HeroComposerScene() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-sidebar" />
      <div className="absolute right-[-180px] top-6 hidden h-[640px] w-[760px] rotate-1 rounded-lg border border-sidebar-foreground/20 bg-surface p-4 text-foreground shadow-popover lg:block">
        <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-3">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Материал</div>
            <div className="mt-1 text-lg font-semibold">Новый выпуск</div>
          </div>
          <div className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            Собрать
          </div>
        </div>

        <div className="mt-4 grid h-[520px] gap-4 lg:grid-cols-[220px_1fr]">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-sm font-semibold">Шаги</div>
            <div className="mt-4 grid gap-3">
              {["Факты", "Голос", "Медиа", "ИИ-сборка", "Площадки"].map((item, index) => (
                <div className="flex items-center gap-3" key={item}>
                  <span className={index === 1 ? "flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-white" : "flex h-7 w-7 items-center justify-center rounded-md bg-surface-muted text-xs font-semibold text-muted"}>
                    {index + 1}
                  </span>
                  <span className={index === 1 ? "text-sm font-semibold text-foreground" : "text-sm text-muted"}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-border bg-[color-mix(in_srgb,var(--primary),transparent_93%)] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Mic size={18} />
                Диктовка блока
              </div>
              <div className="mt-5 flex h-24 items-center justify-center rounded-md bg-surface">
                <div className="flex items-end gap-1">
                  {[18, 30, 46, 34, 58, 40, 24, 44, 28, 52, 32, 20].map((height, index) => (
                    <span
                      className="w-2 rounded-full bg-primary"
                      key={`${height}-${index}`}
                      style={{ height }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {platformPreview.map(([name, note]) => (
                <div className="rounded-lg border border-border bg-surface p-4" key={name}>
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="mt-2 text-xs leading-5 text-muted">{note}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-sidebar p-4 text-sidebar-foreground">
              <div className="text-sm font-semibold text-white">Проверка перед отправкой</div>
              <div className="mt-2 text-xs leading-5 text-sidebar-foreground/70">
                Превью, лимиты и кнопка ручного подтверждения видны до публикации.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function MobileComposerPreview() {
  return (
    <div className="mt-7 rounded-lg border border-sidebar-foreground/20 bg-sidebar-foreground/10 p-3 shadow-popover sm:max-w-[430px] lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-sidebar-foreground/60">Сегодня</div>
          <div className="mt-1 text-lg font-semibold text-white">Материал в сборке</div>
        </div>
        <div className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">ИИ-сборка</div>
      </div>
      <div className="mt-3 grid gap-2">
        {["Факты собраны", "Голос принят", "Превью площадок"].map((item) => (
          <div className="flex items-center justify-between gap-3 rounded-md bg-sidebar-foreground/10 px-3 py-2 text-xs text-sidebar-foreground/75" key={item}>
            <span>{item}</span>
            <CheckCircle2 size={14} className="text-[color-mix(in_srgb,var(--success),white_22%)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
