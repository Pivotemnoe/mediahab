"use client";

import { CloudOff, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import {
  guidedFormQueueEvent,
} from "@/services/guided-queue-contract";
import { countGuidedQueueEntries } from "@/services/guided-queue-store";

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setQueueCount(countGuidedQueueEntries());
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("storage", update);
    window.addEventListener(guidedFormQueueEvent, update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("storage", update);
      window.removeEventListener(guidedFormQueueEvent, update);
    };
  }, []);

  if (online && queueCount === 0) {
    return null;
  }

  const text = online
    ? `Есть несинхронизированные поля: ${queueCount}. Откройте материал и повторите сохранение.`
    : queueCount > 0
      ? `Нет сети: ${queueCount} поле в локальной очереди, ИИ и публикации недоступны.`
      : "Нет сети: черновики сохраняются локально, ИИ и публикации недоступны.";
  const Icon = online ? CloudOff : WifiOff;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-40 flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-panel lg:bottom-4 lg:left-auto lg:right-6"
      role="status"
    >
      <Icon size={16} className="text-warning" />
      {text}
    </div>
  );
}
