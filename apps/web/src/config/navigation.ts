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
  { href: "/app/content/new", icon: Mic, label: "Наговорить" },
  { href: "/app/content", icon: FileEdit, label: "Тексты" },
  { href: "/app/notebook", icon: NotebookPen, label: "Блокнот" },
  { href: "/app/style", icon: Palette, label: "Мой стиль" },
];

export const cabinetMoreItems: NavItem[] = [
  { href: "/app/projects", icon: FolderKanban, label: "Каналы" },
];

export const mobileNavItems: NavItem[] = [
  { href: "/app/content/new", icon: Mic, label: "Наговорить", mobile: true },
  { href: "/app/content", icon: FileEdit, label: "Тексты", mobile: true },
  { href: "/app/notebook", icon: NotebookPen, label: "Блокнот", mobile: true },
  { href: "/app/style", icon: Palette, label: "Мой стиль", mobile: true },
];

export const marketingNavItems = [
  { href: "/#workflow", label: "Как это работает" },
  { href: "/#audience", label: "Для кого" },
  { href: "/features", label: "Что умеет «Наговори»" },
];
