import { BookOpenCheck, Boxes, FileCheck2, ImageUp, Mic, SlidersHorizontal } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const features = [
  ["Каналы", "Для каждого блога или канала «Наговори» запомнит тему, стиль и нужные площадки.", SlidersHorizontal],
  ["Повторяющиеся форматы", "Для них можно сохранить свои вопросы, примеры и обычную длину. Но начинать можно и без них.", Boxes],
  ["Наговори как удобно", "Говори всё сразу или частями. Перед подготовкой публикации ты увидишь текст из записи и сможешь его поправить.", Mic],
  ["Твой стиль", "Добавь три удачные публикации для старта или больше, чтобы показать разные оттенки своей подачи.", BookOpenCheck],
  ["Фото и видео", "Добавляй их к публикации и сразу проверяй, подходят ли они выбранному формату.", ImageUp],
  ["Свой текст для каждой площадки", "Для Telegram, MAX, VK и Instagram появятся отдельные тексты. Каждый можно проверить и поправить.", FileCheck2],
] as const;

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10">
        <div className="max-w-3xl">
          <Badge tone="success">Что умеет «Наговори»</Badge>
          <h1 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-6xl">Всё, чтобы превратить мысль в готовые публикации.</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Начни с голоса или готового текста. «Наговори» запомнит твою подачу и подготовит свой вариант для каждой выбранной площадки.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map(([title, text, Icon]) => (
            <Card className="grid content-start gap-3" key={title}>
              <Icon size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="text-sm leading-6 text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
