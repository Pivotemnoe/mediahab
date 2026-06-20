import { type ReactNode } from "react";

import { CabinetShell } from "@/components/layout/shells";

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <CabinetShell>{children}</CabinetShell>;
}
