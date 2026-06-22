"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AuthField = {
  autoComplete?: string;
  helper?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
};

type AuthPageProps = {
  action?: "login" | "register";
  description: string;
  eyebrow?: string;
  fields: AuthField[];
  secondaryHref: string;
  secondaryLabel: string;
  submitLabel: string;
  title: string;
};

export function AuthPage({
  action,
  description,
  eyebrow = "Безопасный доступ",
  fields,
  secondaryHref,
  secondaryLabel,
  submitLabel,
  title,
}: AuthPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    if (!action) {
      setError("Этот сценарий ещё не подключён к серверу в пилотной версии.");
      setIsSubmitting(false);
      return;
    }
    const path = action === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login";

    try {
      const response = await fetch(path, {
        body: JSON.stringify(payload),
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setError(await authErrorMessage(response));
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="grid gap-5">
        <Badge className="w-fit" tone="success">
          {eyebrow}
        </Badge>
        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <LockKeyhole size={20} className="text-primary" />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        <form className="grid gap-3" onSubmit={onSubmit}>
          {fields.map((field) => (
            <label className="grid gap-1.5 text-sm" key={field.name}>
              <span className="font-medium text-foreground">{field.label}</span>
              <input
                autoComplete={field.autoComplete}
                className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                name={field.name}
                placeholder={field.placeholder}
                type={field.type ?? "text"}
              />
              {field.helper ? <span className="text-xs leading-5 text-muted">{field.helper}</span> : null}
            </label>
          ))}
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
              {error}
            </div>
          ) : null}
          <Button type="submit" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Отправляем..." : submitLabel}
            <ArrowRight size={16} />
          </Button>
        </form>
        <Button asChild variant="ghost">
          <Link href={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      </div>
    </AuthShell>
  );
}

async function authErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as {
      error?: {
        code?: unknown;
        message?: unknown;
      };
    };
    const code = typeof payload.error?.code === "string" ? payload.error.code : "api_error";
    if (code === "invalid_credentials") {
      return "Неверная почта или пароль.";
    }
    if (code === "registration_failed") {
      return "Не удалось создать аккаунт. Возможно, такая почта уже используется.";
    }
    if (code === "rate_limited") {
      return "Слишком много попыток. Подождите немного и попробуйте снова.";
    }
    if (code === "catalog_missing") {
      return "На сервере не загружен каталог тарифов. Нужно проверить seed.";
    }
  } catch {
    // Non-JSON responses fall through to a generic message.
  }

  return `Сервер вернул ошибку ${response.status}. Попробуйте ещё раз.`;
}
