import { Clock, Flame } from "lucide-react";
import { useTranslate } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Lead, LeadStatus } from "../types";
import { formatDuration, getLeadTier, getSlaState } from "./leadModel";

const TIER_CLASSES = {
  hot: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  warm: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  cold: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "bg-primary/10 text-primary",
  contacted: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  qualified: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  disqualified: "bg-muted text-muted-foreground",
  converted: "bg-emerald-600 text-white",
};

export const LeadScoreBadge = ({ score }: { score: number }) => {
  const translate = useTranslate();
  const tier = getLeadTier(score);
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 tabular-nums", TIER_CLASSES[tier])}
      title={translate("resources.leads.score_hint")}
    >
      {tier === "hot" ? <Flame className="size-3" /> : null}
      {translate(`resources.leads.tiers.${tier}`)} · {score}
    </Badge>
  );
};

export const LeadStatusBadge = ({ status }: { status: LeadStatus }) => {
  const translate = useTranslate();
  return (
    <Badge
      variant="secondary"
      className={cn("border-0", STATUS_CLASSES[status])}
    >
      {translate(`resources.leads.statuses.${status}`)}
    </Badge>
  );
};

/** Countdown to the first-response deadline, red once it has passed. */
export const LeadSla = ({
  lead,
}: {
  lead: Pick<Lead, "status" | "first_response_due" | "first_responded_at">;
}) => {
  const translate = useTranslate();
  const sla = getSlaState(lead);
  if (sla.kind === "done") return null;
  const isOverdue = sla.kind === "overdue";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isOverdue ? "text-destructive" : "text-amber-600 dark:text-amber-400",
      )}
    >
      <Clock className="size-3" />
      {isOverdue
        ? translate("resources.leads.sla.overdue", {
            time: formatDuration(sla.minutesLate),
          })
        : translate("resources.leads.sla.due", {
            time: formatDuration(sla.minutesLeft),
          })}
    </span>
  );
};
