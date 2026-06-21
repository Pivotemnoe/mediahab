"use client";

import { useEffect } from "react";

interface ServiceWorkerCapabilities {
  capabilities?: {
    backgroundSync?: boolean;
    mutationReplay?: boolean;
    offlineNavigationFallback?: boolean;
  };
  replayPolicy?: {
    guidedFormQueue?: string;
  };
}

function setConnectivityState() {
  document.documentElement.dataset.connection = navigator.onLine ? "online" : "offline";
}

async function setServiceWorkerCapabilities() {
  try {
    const response = await fetch("/sw-capabilities.json", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      document.documentElement.dataset.serviceWorkerCapabilities = "unavailable";
      return;
    }
    const payload = await response.json() as ServiceWorkerCapabilities;
    document.documentElement.dataset.serviceWorkerCapabilities = "loaded";
    document.documentElement.dataset.serviceWorkerMutationReplay = payload.capabilities?.mutationReplay ? "available" : "manual";
    document.documentElement.dataset.serviceWorkerBackgroundSync = payload.capabilities?.backgroundSync ? "available" : "disabled";
    document.documentElement.dataset.guidedQueueReplay = payload.replayPolicy?.guidedFormQueue ?? "manual_retry_required";
  } catch {
    document.documentElement.dataset.serviceWorkerCapabilities = "unavailable";
  }
}

export function PwaRuntime() {
  useEffect(() => {
    setConnectivityState();
    void setServiceWorkerCapabilities();
    window.addEventListener("online", setConnectivityState);
    window.addEventListener("offline", setConnectivityState);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        document.documentElement.dataset.serviceWorker = "registration-failed";
      });
    }

    return () => {
      window.removeEventListener("online", setConnectivityState);
      window.removeEventListener("offline", setConnectivityState);
    };
  }, []);

  return null;
}
