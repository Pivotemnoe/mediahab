import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  children: ReactNode;
  status?: "danger" | "info" | "neutral" | "success" | "warning";
};

export function StatusBadge({ children, status = "neutral" }: StatusBadgeProps) {
  return <Badge tone={status}>{children}</Badge>;
}
