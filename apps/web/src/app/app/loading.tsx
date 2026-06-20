import { Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function AppLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Card className="grid max-w-md place-items-center gap-3 text-center">
        <Loader2 className="animate-spin text-primary" size={24} />
        <div className="text-sm font-medium text-foreground">Загружаем кабинет</div>
        <div className="text-xs leading-5 text-muted">
          Черновики и локальные состояния остаются в PWA shell.
        </div>
      </Card>
    </div>
  );
}
