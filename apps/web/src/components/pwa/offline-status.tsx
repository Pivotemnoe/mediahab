"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-40 flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-panel lg:bottom-4 lg:left-auto lg:right-6"
      role="status"
    >
      <WifiOff size={16} className="text-warning" />
      Нет сети: черновики сохраняются локально, ИИ и публикации недоступны.
    </div>
  );
}
