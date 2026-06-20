import {
  BadgeDollarSign,
  BookOpenCheck,
  CalendarDays,
  FileEdit,
  FolderKanban,
  Images,
  LayoutDashboard,
  Plus,
  RadioTower,
  Send,
  Settings,
  UserRound,
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
  { href: "/app/dashboard", icon: LayoutDashboard, label: "Дашборд", mobile: true },
  { href: "/app/content/new", icon: Plus, label: "Создать", mobile: true },
  { href: "/app/projects", icon: FolderKanban, label: "Проекты", mobile: true },
  { href: "/app/content", icon: FileEdit, label: "Контент", mobile: true },
  { href: "/app/calendar", icon: CalendarDays, label: "Календарь" },
  { href: "/app/media", icon: Images, label: "Медиа" },
  { href: "/app/examples", icon: BookOpenCheck, label: "Примеры" },
  { href: "/app/integrations", icon: RadioTower, label: "Интеграции" },
  { href: "/app/publications", icon: Send, label: "Публикации" },
  { href: "/app/billing", icon: BadgeDollarSign, label: "Тариф" },
  { href: "/app/workspace", icon: UsersRound, label: "Команда" },
  { href: "/app/account", icon: UserRound, label: "Аккаунт" },
  { href: "/app/settings", icon: Settings, label: "Настройки" },
];

export const mobileNavItems = cabinetNavItems.filter((item) => item.mobile);

export const marketingNavItems = [
  { href: "/features", label: "Возможности" },
  { href: "/pricing", label: "Тарифы" },
  { href: "/security", label: "Безопасность" },
  { href: "/contacts", label: "Контакты" },
];
