import { AlarmClock, ArrowUp, ChevronsUp } from "lucide-react";
import { useTranslate } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { formatDuration } from "../leads/leadModel";
import type { Ticket, TicketPriority, TicketStatus } from "../types";
import { getTicketDeadline } from "./ticketModel";

const STATUS_CLASSES: Record<TicketStatus, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  waiting_client: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_CLASSES: Record<TicketPriority, string> = {
  urgent: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  normal: "border-border text-muted-foreground",
  low: "border-border text-muted-foreground",
};

export const TicketStatusBadge = ({ status }: { status: TicketStatus }) => {
  const translate = useTranslate();
  return (
    <Badge
      variant="secondary"
      className={cn("border-0", STATUS_CLASSES[status])}
    >
      {translate(`resources.tickets.statuses.${status}`)}
    </Badge>
  );
};

export const TicketPriorityBadge = ({
  priority,
}: {
  priority: TicketPriority;
}) => {
  const translate = useTranslate();
  const Icon =
    priority === "urgent" ? ChevronsUp : priority === "high" ? ArrowUp : null;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1", PRIORITY_CLASSES[priority])}
    >
      {Icon ? <Icon className="size-3" /> : null}
      {translate(`resources.tickets.priorities.${priority}`)}
    </Badge>
  );
};

/** The deadline that matters now, red once it has passed. */
export const TicketDeadline = ({
  ticket,
}: {
  ticket: Pick<
    Ticket,
    "status" | "first_response_due" | "resolve_due" | "first_responded_at"
  >;
}) => {
  const translate = useTranslate();
  const deadline = getTicketDeadline(ticket);
  if (deadline.kind === "none") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        deadline.isLate
          ? "text-destructive"
          : "text-amber-600 dark:text-amber-400",
      )}
    >
      <AlarmClock className="size-3" />
      {translate(
        `resources.tickets.deadline.${deadline.kind}${deadline.isLate ? "_late" : ""}`,
        { time: formatDuration(deadline.minutes) },
      )}
    </span>
  );
};
