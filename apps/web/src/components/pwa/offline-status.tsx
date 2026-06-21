"use client";

import { CloudOff, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import {
  guidedFormQueueEvent,
} from "@/services/guided-queue-contract";
import {
  getGuidedQueueReplayReadiness,
  type GuidedQueueReplayReadiness,
} from "@/services/guided-queue-replay";
import { listGuidedQueueEntries } from "@/services/guided-queue-store";

export function OfflineStatus() {
  const [readiness, setReadiness] = useState<GuidedQueueReplayReadiness>(() =>
    getGuidedQueueReplayReadiness({ entries: [], online: true }),
  );

  useEffect(() => {
    const update = () => {
      setReadiness(getGuidedQueueReplayReadiness({
        entries: listGuidedQueueEntries(),
        online: navigator.onLine,
      }));
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

  if (!readiness.shellMessage) {
    return null;
  }

  const Icon = readiness.status === "manual_retry_required" ? CloudOff : WifiOff;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-40 flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-panel lg:bottom-4 lg:left-auto lg:right-6"
      role="status"
    >
      <Icon size={16} className="text-warning" />
      {readiness.shellMessage}
    </div>
  );
}
