import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileEdit,
  Landmark,
  RadioTower,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const pipeline = [
  ["Идентификация", "Cookie-сессии, CSRF и отзыв сессий", "ready"],
  ["Рабочее пространство", "Роли и изоляция данных", "ready"],
  ["Тарифы", "Оплата-заглушка и проверка лимитов", "ready"],
  ["Контент", "Конструктор проектов, рубрик и версионируемые настройки", "ready"],
];

const integrations = [
  ["Авторизация", "Регистрация, вход, выход, сброс пароля и сессии", "success", "готово"],
  ["Рабочее пространство", "Роли владельца, администратора, редактора и наблюдателя", "success", "готово"],
  ["Тарифы", "В режиме заглушки оплата не списывается", "warning", "заглушка"],
];

export default function CabinetShell() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <div className="text-sm font-semibold">Temichev Media Hub</div>
            <div className="text-xs text-muted">Техническая оболочка этапа 03</div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/app/projects">
                <FileEdit size={16} />
                Проекты
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/account">
                <UserRound size={16} />
                Аккаунт
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/billing">
                <Landmark size={16} />
                Тариф
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-line bg-white p-3 shadow-panel">
          {[
            ["Дашборд", "/app"],
            ["Аккаунт", "/app/account"],
            ["Пространство", "/app/workspace"],
            ["Тариф", "/app/billing"],
            ["Проекты", "/app/projects"],
          ].map(([item, href], index) => (
            <Link
              className={`flex h-10 w-full items-center rounded-md px-3 text-left text-sm ${
                index === 0
                  ? "bg-surface font-medium text-ink"
                  : "text-muted hover:bg-surface"
              }`}
              href={href}
              key={item}
            >
              {item}
            </Link>
          ))}
        </aside>

        <section className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Черновики</span>
                <FileEdit size={18} className="text-accent" />
              </div>
              <div className="mt-3 text-3xl font-semibold">0</div>
              <div className="mt-1 text-sm text-muted">Маршруты конструктора проектов подключены</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Запланировано</span>
                <CalendarClock size={18} className="text-accent" />
              </div>
              <div className="mt-3 text-3xl font-semibold">4</div>
              <div className="mt-1 text-sm text-muted">Роли загружены и проверяются сервером</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Интеграции</span>
                <RadioTower size={18} className="text-accent" />
              </div>
              <div className="mt-3 text-3xl font-semibold">4</div>
              <div className="mt-1 text-sm text-muted">Редактируемые тарифы-заглушки</div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Контент-пайплайн</h2>
                  <p className="text-sm text-muted">Предпросмотр границы SaaS</p>
                </div>
                <Badge>Этап 03</Badge>
              </div>
              <div className="grid gap-3">
                {pipeline.map(([title, text, status]) => (
                  <div
                    className="flex items-center gap-3 rounded-md border border-line p-3"
                    key={title}
                  >
                    {status === "blocked" ? (
                      <AlertTriangle size={18} className="text-warning" />
                    ) : (
                      <CheckCircle2 size={18} className="text-success" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{title}</div>
                      <div className="text-sm text-muted">{text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">Состояния</h2>
              <div className="mt-4 grid gap-3">
                {integrations.map(([name, text, tone, label]) => (
                  <div className="rounded-md border border-line p-3" key={name}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{name}</div>
                      <Badge tone={tone as "success" | "warning"}>{label}</Badge>
                    </div>
                    <div className="mt-1 text-sm leading-6 text-muted">{text}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
