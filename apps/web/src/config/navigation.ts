import {
  CalendarDays,
  CircleUserRound,
  CreditCard,
  FileEdit,
  FolderKanban,
  Home,
  Image,
  Link2,
  Lightbulb,
  Mic,
  NotebookPen,
  Palette,
  RadioTower,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  mobile?: boolean;
};

export const cabinetNavItems: NavItem[] = [
  { href: "/app/content/new", icon: Mic, label: "Создать" },
  { href: "/app/ideas", icon: Lightbulb, label: "Идеи" },
  { href: "/app/content", icon: FileEdit, label: "Черновики" },
  { href: "/app/notebook", icon: NotebookPen, label: "Блокнот" },
  { href: "/app/style", icon: Palette, label: "Мой стиль" },
];

export const cabinetMoreItems: NavItem[] = [
  { href: "/app", icon: Home, label: "Главная" },
  { href: "/app/projects", icon: FolderKanban, label: "Проекты" },
  { href: "/app/publications", icon: RadioTower, label: "Публикации" },
  { href: "/app/calendar", icon: CalendarDays, label: "Календарь" },
  { href: "/app/media", icon: Image, label: "Медиа" },
  { href: "/app/integrations", icon: Link2, label: "Подключения" },
  { href: "/app/workspace", icon: UsersRound, label: "Команда" },
  { href: "/app/billing", icon: CreditCard, label: "Тариф" },
  { href: "/app/account", icon: CircleUserRound, label: "Аккаунт" },
  { href: "/app/settings", icon: Settings, label: "Настройки" },
];

export const mobileNavItems: NavItem[] = [
  { href: "/app", icon: Home, label: "Главная", mobile: true },
  { href: "/app/content/new", icon: Mic, label: "Создать", mobile: true },
  { href: "/app/ideas", icon: Lightbulb, label: "Идеи", mobile: true },
  { href: "/app/content", icon: FileEdit, label: "Черновики", mobile: true },
  { href: "/app/notebook", icon: NotebookPen, label: "Блокнот", mobile: true },
];

export const marketingNavItems = [
  { href: "/#workflow", label: "Как работает" },
  { href: "/#audience", label: "Для кого" },
  { href: "/features", label: "Возможности" },
  { href: "/pricing", label: "Тарифы" },
];
