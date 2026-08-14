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
  ["1", "Диктуете или вставляете", "Расскажите всё одним сообщением или добавляйте голосовые фрагменты по очереди.", Mic],
  ["2", "Выбираете площадки", "Telegram, MAX, VK и Instagram можно включить вместе или подготовить отдельно.", CheckCircle2],
  ["3", "Проверяете версии", "«Наговори» учитывает правила проекта, рубрику, примеры и длину каждого результата.", BookOpenCheck],
] as const;

const trustPoints = [
  ["Факты остаются вашими", "Редактор улучшает подачу, но не должен придумывать цены, адреса и выводы.", ShieldCheck],
  ["Правила запоминаются", "Общий стиль, рубрики, примеры и ограничения применяются при каждой новой сборке.", FileText],
  ["Каждая версия проверяется", "Никаких публикаций без вашего явного подтверждения.", CheckCircle2],
] as const;

const platformGuide = [
  ["Telegram", "Полный пост", "Удобная длинная версия с сохранённой структурой и ссылками.", Send],
  ["MAX", "До 4 000 знаков", "Самостоятельная компактная версия, а не обрезанный Telegram-текст.", MessageCircle],
  ["VK", "Запись сообщества", "Понятная подача для стены или сообщества с отдельной длиной.", UsersRound],
  ["Instagram", "Пост, карусель или Reel", "Другая композиция, подпись и подсказки по медиа в рамках формата.", Instagram],
] as const;

const audiences = [
  ["Эксперт и личный бренд", "Надиктуйте наблюдение после встречи, консультации или события — и сохраните собственный тон.", UserRound],
  ["Локальный бизнес", "Быстро превращайте новости, предложения и изменения в понятные публикации для нескольких каналов.", Store],
  ["Клиника и специалист", "Объясняйте сложное человеческим языком, не теряя важные факты и предупреждения.", HeartPulse],
  ["Автор и преподаватель", "Собирайте идеи, заметки и фрагменты лекций в регулярный контент без пустого листа.", GraduationCap],
] as const;

const faq = [
  ["Нужно каждый раз заполнять настройки?", "Нет. Стиль, примеры и обычная длина сохраняются в проекте. Для конкретного поста можно изменить только нужное."],
  ["Можно подготовить несколько площадок сразу?", "Да. Вы отмечаете Telegram, MAX, VK и Instagram вместе или выбираете только одну площадку. Каждая версия создаётся отдельно."],
  ["Что делать с идеей, которую ещё рано превращать в пост?", "Сохранить в голосовой блокнот. Позже заметку можно перенести в новый или уже существующий материал."],
  ["Сервис публикует всё автоматически?", "Нет. Сначала вы видите и правите результат. Отправка остаётся отдельным действием с вашим подтверждением."],
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
              Надиктуй или напиши мысль — «Наговори» соберёт цельный текст и подготовит отдельную версию для каждой выбранной площадки. Без потери смысла и без публикации за тебя.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-12 px-5">
                <Link href="/register"><Mic size={18} />Начать с диктовки</Link>
              </Button>
              <Button asChild className="h-12 px-5" variant="secondary">
                <Link href="#example"><Play size={17} />Посмотреть пример</Link>
              </Button>
            </div>
            <div className="mt-7 flex items-center gap-2 text-sm text-muted">
              <CheckCircle2 className="text-success" size={16} />
              Первые версии — обычно за несколько минут
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
              alt="Нейтральный пример проекта для локального бизнеса"
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              src="/assets/editorial-cafe-deep-forest.png"
            />
          </div>
          <div className="flex flex-col justify-center py-2">
            <Badge className="w-fit" tone="success">Пример проекта</Badge>
            <h2 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-5xl">Правила живут в проекте, а не в вашей памяти.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Для проекта задаются голос, ограничения, постоянные блоки и примеры. Рубрика необязательна: её выбирают только там, где нужен особый формат поста.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Metric icon={Mic} title="1 диктовка" text="можно дополнять фрагментами" />
              <Metric icon={Clock3} title="до 10 минут" text="на первые версии" />
              <Metric icon={LockKeyhole} title="100% контроль" text="ручное подтверждение" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-12" id="workflow" data-testid="public-home-workflow">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <Badge tone="success">Как это работает</Badge>
            <h2 className="font-editorial mt-4 max-w-3xl text-4xl leading-tight text-foreground sm:text-5xl">
              Один исходник. Несколько самостоятельных версий.
            </h2>
          </div>
          <Button asChild variant="secondary"><Link href="/features">Все возможности<ArrowRight size={16} /></Link></Button>
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
            <Badge tone="success">Площадки отличаются</Badge>
            <h2 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-5xl">Не один текст, растянутый на четыре окна.</h2>
            <p className="mt-4 text-base leading-7 text-muted">«Наговори» учитывает ограничения и привычный формат каждой площадки. Длину можно оставить по твоим правилам или поменять только для текущего поста.</p>
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
            <Badge tone="success">Для тех, кто говорит по делу</Badge>
            <h2 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-5xl">Подходит не одной теме и не одному блогу.</h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted lg:justify-self-end">Проект хранит ваши правила, примеры и привычную подачу. Рубрики добавляются только для повторяющихся форматов — пользоваться ими необязательно.</p>
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
            <Badge tone="success">Вы управляете результатом</Badge>
            <h2 className="font-editorial mt-4 max-w-4xl text-4xl leading-tight text-foreground sm:text-5xl">Редактор помогает с подачей. Решение остаётся вашим.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Исходник, готовые версии и изменения разделены. Можно поправить одну площадку, не затрагивая остальные, и ничего не отправлять до финальной проверки.</p>
          </div>
          <div className="grid gap-3">
            {["Проверяете каждую версию", "Меняете длину без механической обрезки", "Сохраняете собственную лексику и тон", "Подтверждаете публикацию вручную"].map((item) => (
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
          <Badge tone="success">Готовы попробовать</Badge>
          <h2 className="font-editorial mt-4 max-w-4xl text-4xl leading-tight text-foreground sm:text-5xl">Начните с материала, а настройки докрутите по ходу работы.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Создайте кабинет, назовите свой проект и сразу откройте диктовку. Стиль и дополнительные правила можно добавить постепенно.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button asChild className="h-12 px-5"><Link href="/register">Создать кабинет<ArrowRight size={16} /></Link></Button>
          <Button asChild className="h-12 px-5" variant="secondary"><Link href="/login">Уже есть кабинет</Link></Button>
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
