"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { clientApiRequest } from "@/services/client-api";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function logout() {
    setError(null);
    setPending(true);
    try {
      await clientApiRequest<{ status: string }>("/api/v1/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Не удалось выйти. Проверь интернет и попробуй ещё раз.");
      setPending(false);
    }
  }

  return (
    <div className="grid justify-items-end gap-1">
      <Button disabled={pending} onClick={logout} type="button" variant="secondary">
        <LogOut size={16} />
        {pending ? "Выходим…" : "Выйти"}
      </Button>
      {error ? <span className="max-w-64 text-right text-xs leading-5 text-danger" role="alert">{error}</span> : null}
    </div>
  );
}
