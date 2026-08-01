import { type ReactNode } from "react";
import { redirect } from "next/navigation";

import { CabinetShell } from "@/components/layout/shells";
import { ApiRequestError, apiGet, getDataMode } from "@/services/runtime";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (getDataMode() === "api") {
    try {
      await apiGet("/api/v1/me");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        redirect("/login?next=/app");
      }
      throw error;
    }
  }

  return <CabinetShell>{children}</CabinetShell>;
}
