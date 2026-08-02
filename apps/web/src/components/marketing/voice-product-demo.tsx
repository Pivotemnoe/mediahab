"use client";

import {
  AudioLines,
  Check,
  Instagram,
  MessageCircle,
  Mic,
  Pause,
  Play,
  Send,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";

type PlatformKey = "telegram" | "max" | "vk" | "instagram";
type LengthKey = "short" | "normal" | "detailed";

const platforms: Array<{
  key: PlatformKey;
  icon: LucideIcon;
  name: string;
  limit: string;
  previews: Record<LengthKey, string>;
}> = [
  {
    key: "telegram",
    icon: Send,
    name: "Telegram",
    limit: "длинный пост",
    previews: {
      short: "Новая идея не обязана быть идеальной. Начните с первого шага — детали можно добавить позже.",
      normal: "Мы часто откладываем хорошую идею, пока пытаемся довести её до идеала. Но движение важнее идеальности: начните с простого шага и расскажите, что уже знаете.",
      detailed: "Мы часто откладываем хорошую идею, пока пытаемся довести её до идеала. Но движение важнее идеальности. Начните с простого шага, покажите личный опыт и честно расскажите аудитории, что уже получилось, а что ещё предстоит проверить.",
    },
  },
  {
    key: "max",
    icon: MessageCircle,
    name: "MAX",
    limit: "до 4 000 знаков",
    previews: {
      short: "Не ждите идеального момента. Один небольшой шаг сегодня полезнее большого плана на потом.",
      normal: "Идея становится живой, когда вы делаете первый шаг. Не ждите идеального момента: поделитесь опытом и добавляйте детали по ходу.",
      detailed: "Необязательно знать весь путь заранее. Расскажите аудитории, с чего вы начали, что уже поняли и почему эта идея важна. Остальные детали можно добавить после обратной связи.",
    },
  },
  {
    key: "vk",
    icon: UsersRound,
    name: "VK",
    limit: "запись сообщества",
    previews: {
      short: "Движение важнее идеальности. Начните с одной мысли — дальше станет понятнее.",
      normal: "Как перестать откладывать идею? Сформулируйте один понятный шаг, расскажите о личном опыте и не пытайтесь сразу написать идеальный текст.",
      detailed: "Как перестать откладывать идею и начать говорить с аудиторией по-настоящему? Зафиксируйте главную мысль, добавьте личный опыт и несколько практических шагов. Читателю важнее ясность и честность, чем идеальная формулировка.",
    },
  },
  {
    key: "instagram",
    icon: Instagram,
    name: "Instagram",
    limit: "подпись или Reel",
    previews: {
      short: "Начните до того, как почувствуете себя готовыми. Сохраните, чтобы не потерять эту мысль.",
      normal: "Иногда первый шаг — просто сказать идею вслух. Без идеальной формулировки и долгой подготовки. А дальше уже появится структура.",
      detailed: "Начните до того, как почувствуете себя полностью готовыми. Сначала скажите идею вслух, потом соберите из неё понятную историю: личный опыт, один вывод и простой шаг для читателя.",
    },
  },
];

export function VoiceProductDemo() {
  const [active, setActive] = useState<PlatformKey>("telegram");
  const [length, setLength] = useState<LengthKey>("normal");
  const [listening, setListening] = useState(false);
  const current = useMemo(() => platforms.find((item) => item.key === active) ?? platforms[0], [active]);
  const CurrentIcon = current.icon;

  return (
    <section className="min-w-0 self-start rounded-xl border border-border bg-sidebar p-3 shadow-popover sm:p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1" data-testid="landing-product-demo">
      <div className="grid gap-3 xl:grid-cols-[minmax(270px,0.9fr)_minmax(330px,1.1fr)]">
        <div className="grid content-between gap-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Ваш голосовой черновик</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <span className={cn("size-2 rounded-full", listening ? "animate-pulse bg-success" : "bg-border")} />
                  {listening ? "Идёт запись · 00:24" : "Можно начать в любой момент"}
                </div>
              </div>
              <span className="text-xs text-muted">86 слов</span>
            </div>
            <p className="mt-5 text-sm leading-6 text-foreground">
              Хочу рассказать, почему мы часто откладываем хорошие идеи. Кажется, что сначала нужно всё продумать, но движение важнее идеальности.
            </p>
            <p className="mt-3 border-l-2 border-success bg-[color-mix(in_srgb,var(--success),transparent_91%)] px-3 py-2 text-sm leading-6 text-foreground">
              Даже небольшой шаг сегодня может привести к большим изменениям завтра.
            </p>
          </div>

          <div className="grid justify-items-center gap-3 border-t border-border pt-4">
            <div className="flex w-full items-center justify-center gap-3 text-success">
              <AudioLines className={cn("transition", listening && "scale-110")} size={88} strokeWidth={1.35} />
              <button
                aria-label={listening ? "Остановить запись" : "Начать запись"}
                className="grid size-16 place-items-center rounded-full border border-primary bg-primary text-primary-foreground shadow-popover transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setListening((value) => !value)}
                type="button"
              >
                {listening ? <Pause size={24} /> : <Mic size={26} />}
              </button>
              <AudioLines className={cn("transition", listening && "scale-110")} size={88} strokeWidth={1.35} />
            </div>
            <div className="text-center text-xs leading-5 text-muted">Можно говорить частями — мы всё объединим.</div>
          </div>
        </div>

        <aside className="grid content-start gap-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Куда подготовить?</h2>
            <p className="mt-1 text-xs text-muted">Правила площадок уже учтены</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const selected = active === platform.key;
              return (
                <button
                  aria-pressed={selected}
                  className={cn(
                    "grid min-w-0 gap-1 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                    selected ? "border-success bg-[color-mix(in_srgb,var(--success),transparent_90%)]" : "border-border bg-background",
                  )}
                  key={platform.key}
                  onClick={() => setActive(platform.key)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2"><Icon className={selected ? "text-success" : "text-muted"} size={17} />{selected ? <Check className="text-success" size={15} /> : null}</span>
                  <span className="truncate text-sm font-semibold text-foreground">{platform.name}</span>
                  <span className="truncate text-[10px] text-muted">{platform.limit}</span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold text-foreground">Длина поста</div>
            <div className="grid grid-cols-3 gap-2">
              {([[
                "short", "Коротко",
              ], ["normal", "Обычно"], ["detailed", "Подробно"]] as Array<[LengthKey, string]>).map(([key, label]) => (
                <button
                  aria-pressed={length === key}
                  className={cn(
                    "min-h-9 rounded-md border px-2 text-xs transition",
                    length === key ? "border-success bg-success text-background" : "border-border bg-background text-muted hover:text-foreground",
                  )}
                  key={key}
                  onClick={() => setLength(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-3" aria-live="polite">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CurrentIcon className="text-success" size={16} />{current.name}</div>
              <span className="text-[11px] text-muted">{current.previews[length].length} знаков</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">{current.previews[length]}</p>
          </div>

          <button className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-105" type="button">
            <Play size={16} /> Подготовить 4 версии
          </button>
        </aside>
      </div>
    </section>
  );
}
