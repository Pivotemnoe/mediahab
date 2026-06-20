"use client";

import { useEffect } from "react";

function setConnectivityState() {
  document.documentElement.dataset.connection = navigator.onLine ? "online" : "offline";
}

export function PwaRuntime() {
  useEffect(() => {
    setConnectivityState();
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
