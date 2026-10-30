import { useTranslate } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Invoice } from "../types";
import { getDisplayStatus } from "./invoiceModel";

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  sent: "bg-primary/10 text-primary border-primary/20",
  accepted:
    "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20",
  paid: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20",
  declined: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  partially_paid:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  overdue:
    "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  expired:
    "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
};

interface InvoiceStatusBadgeProps {
  invoice: Pick<Invoice, "type" | "status" | "due_date" | "amount_paid">;
  className?: string;
}

export const InvoiceStatusBadge = ({
  invoice,
  className,
}: InvoiceStatusBadgeProps) => {
  const translate = useTranslate();
  const status = getDisplayStatus(invoice);
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_CLASSES[status], "font-medium", className)}
    >
      {translate(`resources.invoices.statuses.${status}`, { _: status })}
    </Badge>
  );
};

export const InvoiceTypeBadge = ({ type }: { type: Invoice["type"] }) => {
  const translate = useTranslate();
  return (
    <span
      className={cn(
        "text-xs font-medium uppercase tracking-wide",
        type === "invoice" ? "text-primary" : "text-muted-foreground",
      )}
    >
      {translate(`resources.invoices.types.${type}`)}
    </span>
  );
};
