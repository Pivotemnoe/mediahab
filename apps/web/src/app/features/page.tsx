import { Bot, Boxes, FileCheck2, ImageUp, RadioTower, SlidersHorizontal } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const features = [
  ["Конструктор проектов", "Тема, аудитория, тон, юмор, CTA, платформы и правила хранятся как настройки проекта.", SlidersHorizontal],
  ["Рубрики", "Для каждой рубрики можно задать поля, повторяемые блюда, лимиты текста и стратегию площадок.", Boxes],
  ["Контент-студия", "Факты, голос, медиа, зафиксированные факты, мастер-текст и версии живут в одном материале.", FileCheck2],
  ["ИИ-редактура", "Подбор примеров, сборка текста, хуки, рейтинги и проверка качества идут через интерфейс провайдера.", Bot],
  ["Медиа", "Фото, видео и голосовые заметки привязываются к материалу и проходят через S3-хранилище.", ImageUp],
  ["Публикации", "Telegram, MAX, Instagram, вебхук и ручной экспорт имеют отдельные статусы, повторы и доказательства.", RadioTower],
] as const;

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10">
        <div className="max-w-3xl">
          <Badge tone="success">Возможности</Badge>
          <h1 className="mt-4 text-4xl font-semibold text-foreground sm:text-5xl">От черновика до публикации</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            MediaHub строится вокруг одного материала: сначала факты и голос, затем редактура, платформенные версии, расписание и публикация.
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
