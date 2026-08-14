import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function WorkspacePage() {
  return (
    <PilotUnavailable
      backHref="/app/account"
      backLabel="Открыть аккаунт"
      description="Сейчас каждый кабинет рассчитан на одного человека. Возможность пригласить команду появится позже."
      title="Командная работа появится позже"
    />
  );
}
