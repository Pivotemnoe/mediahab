import { BookOpenCheck, Boxes, FileCheck2, ImageUp, Mic, SlidersHorizontal } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const features = [
  ["Проекты", "У каждого блога или канала сохраняются своя тема, аудитория, тон и обычные площадки.", SlidersHorizontal],
  ["Рубрики", "Повторяющимся форматам можно дать отдельные вопросы, примеры и желаемую длину. Это необязательно.", Boxes],
  ["Голосовой мастер", "Диктуйте всё сразу или частями, проверяйте расшифровку и дополняйте готовым текстом.", Mic],
  ["Ваши примеры", "Трёх удачных постов достаточно для быстрого старта, а десять помогают устойчивее передавать стиль. Редактор сам выберет подходящие примеры.", BookOpenCheck],
  ["Фото и видео", "Прикрепляйте материалы к публикации и сразу видите, подходят ли они выбранному формату.", ImageUp],
  ["Отдельные версии", "Telegram, MAX, VK и Instagram получают самостоятельные тексты и отдельную проверку.", FileCheck2],
] as const;

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10">
        <div className="max-w-3xl">
          <Badge tone="success">Возможности</Badge>
          <h1 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-6xl">Всё необходимое — вокруг одной идеи.</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Начните с диктовки или текста. Настройки проекта помогут сохранить ваш стиль, а каждая площадка получит подходящую версию.
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
