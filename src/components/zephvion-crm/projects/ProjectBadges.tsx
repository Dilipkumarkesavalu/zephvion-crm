import { useTranslate } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ProjectStatus } from "../types";
import type { ProjectHealth } from "./projectModel";

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  planning: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary",
  on_hold: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const HEALTH_CLASSES: Record<ProjectHealth, string> = {
  on_track: "text-emerald-700 dark:text-emerald-400",
  at_risk: "text-amber-700 dark:text-amber-400",
  late: "text-destructive",
  closed: "text-muted-foreground",
};

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => {
  const translate = useTranslate();
  return (
    <Badge
      variant="secondary"
      className={cn("border-0", STATUS_CLASSES[status])}
    >
      {translate(`resources.projects.statuses.${status}`)}
    </Badge>
  );
};

export const ProjectHealthLabel = ({ health }: { health: ProjectHealth }) => {
  const translate = useTranslate();
  return (
    <span className={cn("text-xs font-medium", HEALTH_CLASSES[health])}>
      {translate(`resources.projects.health.${health}`)}
    </span>
  );
};

/** Thin bar for a 0–1 share; turns amber then red as it passes 90% / 100%. */
export const ProgressBar = ({
  value,
  isBudget = false,
}: {
  value: number;
  isBudget?: boolean;
}) => {
  const tone = !isBudget
    ? "bg-primary"
    : value > 1
      ? "bg-destructive"
      : value >= 0.9
        ? "bg-amber-500"
        : "bg-primary";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", tone)}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
};
