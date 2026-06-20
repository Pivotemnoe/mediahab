import {
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  FileEdit,
  FolderKanban,
  Images,
  Landmark,
  LayoutDashboard,
  Plus,
  RadioTower,
  Send,
  Settings,
  type LucideIcon,
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
  ["Проекты", "Конструктор проектов, рубрик и версионируемые настройки", "ready"],
  ["Контент", "Черновики, блоки, медиа и голосовая расшифровка", "ready"],
  ["ИИ", "Примеры, подбор, мастер-текст, крючки, оценки и проверка качества", "ready"],
];

const integrations = [
  ["Авторизация", "Регистрация, вход, выход, сброс пароля и сессии", "success", "готово"],
  ["Рабочее пространство", "Роли владельца, администратора, редактора и наблюдателя", "success", "готово"],
  ["Тарифы", "В режиме заглушки оплата не списывается", "warning", "заглушка"],
  ["Голос", "OpenAI STT подключается через API, локально доступен mock", "success", "готово"],
  ["ИИ", "OpenAI выбран по умолчанию, mock остаётся для автотестов", "warning", "настройка"],
];

const navItems: Array<[string, string, LucideIcon]> = [
  ["Дашборд", "/app", LayoutDashboard],
  ["Создать", "/app/content/new", Plus],
  ["Проекты", "/app/projects", FolderKanban],
  ["Контент", "/app/content", FileEdit],
  ["ИИ", "/app/ai", BrainCircuit],
  ["Публикации", "/app/publications", Send],
  ["Медиа", "/app/media", Images],
  ["Настройки", "/app/settings", Settings],
];

export default function CabinetShell() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <div className="text-sm font-semibold">Медиа-хаб</div>
            <div className="text-xs text-muted">Техническая оболочка этапа 04</div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/app/content/new">
                <Plus size={16} />
                Создать
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/content">
                <FileEdit size={16} />
                Контент
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
          {navItems.map(([item, href, Icon], index) => (
            <Link
              className={`flex h-10 w-full items-center rounded-md px-3 text-left text-sm ${
                index === 0
                  ? "bg-surface font-medium text-ink"
                  : "text-muted hover:bg-surface"
              }`}
              href={href}
              key={item}
            >
              <Icon size={16} className="mr-2" />
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
              <div className="mt-1 text-sm text-muted">Контент-студия подключена технически</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Запланировано</span>
                <CalendarClock size={18} className="text-accent" />
              </div>
              <div className="mt-3 text-3xl font-semibold">4</div>
              <div className="mt-1 text-sm text-muted">Маршруты контента, блоков, медиа и голоса</div>
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
                  <p className="text-sm text-muted">Предпросмотр границы кабинета</p>
                </div>
            <Badge>Этап 05</Badge>
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
