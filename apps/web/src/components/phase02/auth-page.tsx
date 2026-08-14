"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
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
  value?: string;
};

type AuthAction = "forgot-password" | "login" | "register" | "reset-password" | "verify-email";

type AuthPageProps = {
  action: AuthAction;
  consentRequired?: boolean;
  description: string;
  eyebrow?: string;
  fields: AuthField[];
  hiddenFields?: Record<string, string>;
  redirectTo?: string;
  secondaryHref: string;
  secondaryLabel: string;
  submitLabel: string;
  tertiaryHref?: string;
  tertiaryLabel?: string;
  title: string;
};

export function AuthPage({
  action,
  consentRequired = false,
  description,
  eyebrow = "Безопасный доступ",
  fields,
  hiddenFields,
  redirectTo,
  secondaryHref,
  secondaryLabel,
  submitLabel,
  tertiaryHref,
  tertiaryLabel,
  title,
}: AuthPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(formData.entries());
    if (action === "register") {
      payload.accept_pilot_terms = formData.get("accept_pilot_terms") === "yes";
      payload.accept_data_notice = formData.get("accept_data_notice") === "yes";
    }
    if (action === "reset-password") {
      payload.new_password = payload.password;
      delete payload.password;
    }
    const path = `/api/v1/auth/${action}`;

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

      if (action === "login" || action === "register") {
        router.push(redirectTo ?? "/app");
        router.refresh();
        return;
      }
      if (action === "verify-email") {
        setSuccess("Почта подтверждена. Теперь можно войти в кабинет.");
      } else if (action === "reset-password") {
        setSuccess("Пароль изменён. Все прежние входы завершены — войдите с новым паролем.");
      } else {
        setSuccess("Запрос принят. Проверьте дальнейшие инструкции по доступу.");
      }
    } catch {
      setError("Не удалось продолжить. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthShell>
        <div className="grid gap-5">
          <span className="grid size-12 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Готово</h1>
            <p className="mt-2 text-sm leading-6 text-muted" role="status">{success}</p>
          </div>
          <Button asChild>
            <Link href="/login">Перейти ко входу</Link>
          </Button>
        </div>
      </AuthShell>
    );
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
          {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          {fields.map((field) => (
            <label className="grid gap-1.5 text-sm" key={field.name}>
              <span className="font-medium text-foreground">{field.label}</span>
              <input
                autoComplete={field.autoComplete}
                className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                name={field.name}
                placeholder={field.placeholder}
                required
                type={field.type ?? "text"}
                defaultValue={field.value}
              />
              {field.helper ? <span className="text-xs leading-5 text-muted">{field.helper}</span> : null}
            </label>
          ))}
          {consentRequired ? (
            <div className="grid gap-3 rounded-lg border border-border bg-background p-3 text-sm leading-5 text-muted">
              <label className="flex items-start gap-3">
                <input className="mt-1 size-4 accent-primary" name="accept_pilot_terms" required type="checkbox" value="yes" />
                <span>Я принимаю <Link className="text-primary underline" href="/terms" target="_blank">условия закрытого тестирования</Link>.</span>
              </label>
              <label className="flex items-start gap-3">
                <input className="mt-1 size-4 accent-primary" name="accept_data_notice" required type="checkbox" value="yes" />
                <span>Я прочитал(а), <Link className="text-primary underline" href="/privacy" target="_blank">как обрабатываются данные пилота</Link>.</span>
              </label>
            </div>
          ) : null}
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
        {tertiaryHref && tertiaryLabel ? (
          <Link className="text-center text-sm text-muted underline-offset-4 hover:text-foreground hover:underline" href={tertiaryHref}>
            {tertiaryLabel}
          </Link>
        ) : null}
      </div>
    </AuthShell>
  );
}

export function AccessLinkRequired({ description, title }: { description: string; title: string }) {
  return (
    <AuthShell>
      <div className="grid gap-5">
        <span className="grid size-12 place-items-center rounded-full bg-warning/15 text-warning">
          <LockKeyhole size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        <Button asChild>
          <Link href="/login">Вернуться ко входу</Link>
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
    if (code === "pilot_invite_required") {
      return "Регистрация доступна только по персональному приглашению.";
    }
    if (code === "pilot_invite_invalid") {
      return "Приглашение не подходит к этой почте, уже использовано или просрочено.";
    }
    if (code === "pilot_consent_required") {
      return "Для участия нужно принять условия тестирования и информацию о данных.";
    }
    if (code === "token_invalid") {
      return "Ссылка недействительна или уже использована. Запросите новую у владельца пилота.";
    }
    if (code === "rate_limited") {
      return "Слишком много попыток. Подождите немного и попробуйте снова.";
    }
    if (code === "catalog_missing") {
      return "Сервис временно не готов создать кабинет. Напишите владельцу пилота.";
    }
  } catch {
    // Non-JSON responses fall through to a generic message.
  }

  return `Сервер вернул ошибку ${response.status}. Попробуйте ещё раз.`;
}
