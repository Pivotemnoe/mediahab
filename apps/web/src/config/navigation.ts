import {
  FileEdit,
  FolderKanban,
  Mic,
  NotebookPen,
  Palette,
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
  { href: "/app/content", icon: FileEdit, label: "Черновики" },
  { href: "/app/notebook", icon: NotebookPen, label: "Блокнот" },
  { href: "/app/style", icon: Palette, label: "Мой стиль" },
];

export const cabinetMoreItems: NavItem[] = [
  { href: "/app/projects", icon: FolderKanban, label: "Проекты" },
];

export const mobileNavItems: NavItem[] = [
  { href: "/app/content/new", icon: Mic, label: "Создать", mobile: true },
  { href: "/app/content", icon: FileEdit, label: "Черновики", mobile: true },
  { href: "/app/notebook", icon: NotebookPen, label: "Блокнот", mobile: true },
  { href: "/app/style", icon: Palette, label: "Мой стиль", mobile: true },
];

export const marketingNavItems = [
  { href: "/#workflow", label: "Как работает" },
  { href: "/#audience", label: "Для кого" },
  { href: "/features", label: "Возможности" },
  { href: "/pricing", label: "Тарифы" },
];
