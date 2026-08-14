import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function WorkspacePage() {
  return (
    <PilotUnavailable
      backHref="/app/account"
      backLabel="Открыть аккаунт"
      description="В закрытом пилоте доступ выдаётся лично каждому тестировщику. Управление командой появится после проверки индивидуального сценария."
      title="Командный доступ пока закрыт"
    />
  );
}
