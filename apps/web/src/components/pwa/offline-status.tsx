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

interface OfflineQueueStatus {
  readiness: GuidedQueueReplayReadiness;
}

export function OfflineStatus() {
  const [queueStatus, setQueueStatus] = useState<OfflineQueueStatus>(() => ({
    readiness: getGuidedQueueReplayReadiness({ entries: [], online: true }),
  }));

  useEffect(() => {
    const update = () => {
      const entries = listGuidedQueueEntries();
      setQueueStatus({
        readiness: getGuidedQueueReplayReadiness({
          entries,
          online: navigator.onLine,
        }),
      });
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

  if (!queueStatus.readiness.shellMessage) {
    return null;
  }

  const Icon = queueStatus.readiness.status === "manual_retry_required" ? CloudOff : WifiOff;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-40 flex items-start justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-panel lg:bottom-4 lg:left-auto lg:right-6"
      role="status"
    >
      <Icon size={16} className="mt-0.5 shrink-0 text-warning" />
      <span className="min-w-0">{queueStatus.readiness.shellMessage}</span>
    </div>
  );
}
