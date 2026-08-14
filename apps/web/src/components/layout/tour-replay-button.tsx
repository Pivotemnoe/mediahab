"use client";

import { CircleHelp } from "lucide-react";

import {
  FIRST_RUN_TOUR_OPEN_EVENT,
  FIRST_RUN_TOUR_STORAGE_KEY,
} from "@/components/layout/first-run-tour";
import { Button } from "@/components/ui/button";

export function TourReplayButton() {
  function replayTour() {
    try {
      window.localStorage.removeItem(FIRST_RUN_TOUR_STORAGE_KEY);
    } catch {
      // The open event still works when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(FIRST_RUN_TOUR_OPEN_EVENT));
  }

  return (
    <Button onClick={replayTour} type="button" variant="secondary">
      <CircleHelp size={16} />
      Показать обучение ещё раз
    </Button>
  );
}
