import {
  FileEdit,
  NotebookPen,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  mobile?: boolean;
};

export const cabinetNavItems: NavItem[] = [
  { href: "/app", icon: Plus, label: "Кабинет", mobile: true },
  { href: "/app/content/new", icon: Plus, label: "Создать", mobile: true },
  { href: "/app/content", icon: FileEdit, label: "История", mobile: true },
  { href: "/app/notebook", icon: NotebookPen, label: "Блокнот", mobile: true },
  { href: "/app/settings", icon: Settings, label: "Настройки", mobile: true },
];

export const mobileNavItems = cabinetNavItems.filter((item) => item.mobile);

export const marketingNavItems = [
  { href: "/features", label: "Возможности" },
  { href: "/pricing", label: "Тарифы" },
  { href: "/security", label: "Безопасность" },
  { href: "/contacts", label: "Контакты" },
];
