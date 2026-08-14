import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  HeartPulse,
  FileText,
  Instagram,
  LockKeyhole,
  MessageCircle,
  Mic,
  Play,
  Send,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { VoiceProductDemo } from "@/components/marketing/voice-product-demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const workflow = [
  ["1", "Наговори как есть", "Запиши одну длинную мысль или добавляй короткие части — как тебе удобнее.", Mic],
  ["2", "Выбери площадки", "Отметь одну площадку или сразу несколько: Telegram, MAX, VK и Instagram.", CheckCircle2],
  ["3", "Проверь готовые тексты", "«Наговори» подготовит отдельный текст для каждой площадки. Перед публикацией ты сможешь всё поправить.", BookOpenCheck],
] as const;

const trustPoints = [
  ["Только твои факты", "«Наговори» улучшит подачу, но не станет придумывать цены, адреса или выводы.", ShieldCheck],
  ["Твой стиль запоминается", "Добавь примеры и правила один раз — «Наговори» учтёт их в следующих публикациях.", FileText],
  ["Ничего не уйдёт без тебя", "Сначала ты увидишь каждый текст и сам решишь, что публиковать.", CheckCircle2],
] as const;

const platformGuide = [
  ["Telegram", "Подробный пост", "Развёрнутый текст с понятной структурой и нужными ссылками.", Send],
  ["MAX", "До 4 000 знаков", "Короткий самостоятельный текст, который не выглядит обрезанным.", MessageCircle],
  ["VK", "Пост для сообщества", "Понятный текст для стены или сообщества.", UsersRound],
  ["Instagram", "Пост, карусель или ролик", "Своя подпись и подсказки, какие фото или видео подойдут.", Instagram],
] as const;

const audiences = [
  ["Эксперт или личный бренд", "Наговори наблюдение после встречи, консультации или события — «Наговори» сохранит твой тон.", UserRound],
  ["Местный бизнес", "Расскажи о новости, предложении или изменении — «Наговори» подготовит понятные посты для нужных каналов.", Store],
  ["Клиника или специалист", "Объясняй сложное простыми словами, не теряя факты и важные предупреждения.", HeartPulse],
  ["Автор или преподаватель", "Сохраняй мысли, заметки и фрагменты лекций, а потом собирай из них публикации.", GraduationCap],
] as const;

const faq = [
  ["Нужно каждый раз всё настраивать?", "Нет. «Наговори» запомнит твой стиль, примеры и обычную длину. Для нового поста останется выбрать только то, что нужно сейчас."],
  ["Можно сделать посты сразу для нескольких площадок?", "Да. Выбери одну площадку или сразу Telegram, MAX, VK и Instagram. Для каждой появится свой текст."],
  ["А если мысль пока не для публикации?", "Сохрани её в блокнот. Когда будешь готов, перенеси заметку в новую публикацию."],
  ["«Наговори» сам публикует посты?", "Нет. Сначала ты увидишь и проверишь результат. Ничего не отправится без твоего подтверждения."],
] as const;

export default function MarketingIndex() {
  return (
    <MarketingShell>
      <section className="border-b border-border" data-testid="public-home-hero">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-9 sm:px-6 sm:py-11 lg:grid-cols-[minmax(0,0.9fr)_minmax(620px,1.1fr)] lg:gap-12 lg:px-12 lg:py-10">
          <div className="flex min-w-0 flex-col justify-center">
            <h1 className="font-editorial max-w-3xl text-[52px] leading-[0.96] text-foreground sm:text-7xl lg:text-[82px]">
              Твои мысли.<br />Твой стиль.<br />Твои публикации.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Наговори мысль или напиши её как есть. «Наговори» соберёт из твоих слов цельную публикацию и подготовит отдельный текст для каждой площадки. Перед публикацией всё решаешь ты.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-12 px-5">
                <Link href="/register"><Mic size={18} />Попросить приглашение</Link>
              </Button>
              <Button asChild className="h-12 px-5" variant="secondary">
                <Link href="#example"><Play size={17} />Посмотреть, как это работает</Link>
              </Button>
            </div>
            <div className="mt-7 flex items-center gap-2 text-sm text-muted">
              <CheckCircle2 className="text-success" size={16} />
              Первый черновик — обычно через несколько минут
            </div>

          </div>

          <VoiceProductDemo />

          <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3 lg:col-start-1" id="audience" data-testid="public-home-proof">
            {trustPoints.map(([title, text, Icon]) => (
              <div className="min-w-0" key={title}>
                <Icon className="text-primary" size={20} />
                <div className="mt-3 text-sm font-semibold text-foreground">{title}</div>
                <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-sidebar" id="example" data-testid="public-home-example">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-12 lg:py-14">
          <div className="relative min-h-[300px] overflow-hidden rounded-xl border border-border">
            <Image
              alt="Пример публикации для местного кафе"
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              src="/assets/editorial-cafe-deep-forest.png"
            />
          </div>
          <div className="flex flex-col justify-center py-2">
            <Badge className="w-fit" tone="success">Вот как это выглядит</Badge>
            <h2 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-5xl">«Наговори» запомнит, как тебе нравится писать.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Добавь примеры своих постов и важные правила. Повторяющиеся форматы можно настроить позже — для первой публикации они не нужны.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Metric icon={Mic} title="Одна мысль" text="можно говорить частями" />
              <Metric icon={Clock3} title="Несколько минут" text="до первых текстов" />
              <Metric icon={LockKeyhole} title="Ты решаешь" text="ничего не публикуется само" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-12" id="workflow" data-testid="public-home-workflow">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <Badge tone="success">Как это работает</Badge>
            <h2 className="font-editorial mt-4 max-w-3xl text-4xl leading-tight text-foreground sm:text-5xl">
              Наговори один раз — получи тексты для нужных площадок.
            </h2>
          </div>
          <Button asChild variant="secondary"><Link href="/features">Что ещё умеет «Наговори»<ArrowRight size={16} /></Link></Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map(([number, title, text, Icon]) => (
            <Card className="grid content-start gap-4 p-5" key={number}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Шаг {number}</span>
                <Icon className="text-success" size={20} />
              </div>
              <h3 className="text-xl font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-6 text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-sidebar" data-testid="public-home-platforms">
        <div className="mx-auto grid max-w-[1440px] gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:px-12">
          <div className="max-w-3xl">
            <Badge tone="success">У каждой площадки — своя подача</Badge>
            <h2 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-5xl">Не один и тот же текст во всех соцсетях.</h2>
            <p className="mt-4 text-base leading-7 text-muted">«Наговори» поменяет длину и подачу под каждую площадку. Для конкретной публикации ты всегда сможешь выбрать свой вариант.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {platformGuide.map(([name, format, text, Icon]) => (
              <article className="group rounded-xl border border-border bg-surface p-5 transition duration-200 hover:-translate-y-1 hover:border-success hover:shadow-popover" key={name}>
                <div className="flex items-center justify-between gap-3"><Icon className="text-success" size={22} /><CheckCircle2 className="opacity-0 text-success transition group-hover:opacity-100" size={17} /></div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{name}</h3>
                <div className="mt-1 text-xs font-medium text-primary">{format}</div>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:px-12" id="audience-types" data-testid="public-home-audiences">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
          <div>
            <Badge tone="success">Кому пригодится</Badge>
            <h2 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-5xl">Если тебе есть что сказать — «Наговори» поможет это оформить.</h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted lg:justify-self-end">Неважно, ведёшь ты личный блог, клинику, магазин или учебный канал: «Наговори» запомнит твою подачу.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {audiences.map(([title, text, Icon]) => (
            <Card className="group p-5 transition hover:bg-surface-muted" key={title}>
              <span className="grid size-10 place-items-center rounded-lg bg-surface-muted text-primary transition group-hover:bg-background"><Icon size={20} /></span>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface" data-testid="public-home-safety">
        <div className="mx-auto grid max-w-[1440px] gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:px-12">
          <div>
            <Badge tone="success">Всё под твоим контролем</Badge>
            <h2 className="font-editorial mt-4 max-w-4xl text-4xl leading-tight text-foreground sm:text-5xl">«Наговори» помогает оформить мысль. Решение всегда за тобой.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Ты видишь свою исходную мысль и каждый готовый текст отдельно. Одну площадку можно поправить, не меняя остальные.</p>
          </div>
          <div className="grid gap-3">
            {["Проверь каждый текст", "Меняй длину — «Наговори» подготовит текст заново, а не просто обрежет его", "Сохраняй собственную лексику и тон", "Сам решай, когда публиковать"].map((item) => (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm text-foreground" key={item}><ShieldCheck className="shrink-0 text-success" size={18} />{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-7 px-4 py-10 sm:px-6 sm:py-14" data-testid="public-home-faq">
        <div className="text-center">
          <Badge tone="success">Коротко о главном</Badge>
          <h2 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-5xl">Частые вопросы</h2>
        </div>
        <div className="grid gap-3">
          {faq.map(([question, answer], index) => (
            <details className="group rounded-xl border border-border bg-surface p-4 open:border-success sm:p-5" key={question} open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-foreground">{question}<span className="text-xl font-normal text-primary transition group-open:rotate-45">+</span></summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-12" data-testid="public-home-entry">
        <div>
          <Badge tone="success">Готов попробовать?</Badge>
          <h2 className="font-editorial mt-4 max-w-4xl text-4xl leading-tight text-foreground sm:text-5xl">Наговори первую мысль. Остальное настроишь потом.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Попроси приглашение, назови канал и переходи к первой записи. Примеры стиля добавишь позже.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button asChild className="h-12 px-5"><Link href="/register">Попросить приглашение<ArrowRight size={16} /></Link></Button>
          <Button asChild className="h-12 px-5" variant="secondary"><Link href="/login">Войти</Link></Button>
        </div>
      </section>
    </MarketingShell>
  );
}

function Metric({ icon: Icon, text, title }: { icon: LucideIcon; text: string; title: string }) {
  return (
    <div className="border-l border-border pl-4 first:border-l-0 first:pl-0">
      <Icon className="text-primary" size={20} />
      <div className="mt-3 text-lg font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs leading-5 text-muted">{text}</div>
    </div>
  );
}
