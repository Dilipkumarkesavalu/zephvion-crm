import {
  Handshake,
  IndianRupee,
  ReceiptText,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  computeKpis,
  formatCompactMoney,
  getFinancialYear,
} from "./dashboardMetrics";
import { useDashboardRecords } from "./useDashboardRecords";

export const KpiTiles = () => {
  const { currency } = useConfigurationContext();
  const { deals, invoices, isPending } = useDashboardRecords();
  const kpis = computeKpis(deals, invoices);
  const money = (amount: number) => formatCompactMoney(amount, currency);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiTile
        to="/deals"
        icon={Handshake}
        accent="bg-primary/10 text-primary"
        label="Pipeline value"
        value={money(kpis.pipelineValue)}
        detail={`${kpis.openDeals} open deals`}
        isPending={isPending}
      />
      <KpiTile
        to="/invoices"
        icon={IndianRupee}
        accent="bg-teal-500/10 text-teal-600 dark:text-teal-300"
        label={`Collected · ${getFinancialYear().label}`}
        value={money(kpis.collectedThisYear)}
        detail={`${kpis.paidInvoicesThisYear} invoices paid`}
        isPending={isPending}
      />
      <KpiTile
        to="/invoices"
        icon={ReceiptText}
        accent="bg-orange-500/10 text-orange-600 dark:text-orange-300"
        label="Outstanding"
        value={money(kpis.outstanding)}
        detail={
          kpis.overdue > 0
            ? `${money(kpis.overdue)} overdue`
            : "Nothing overdue"
        }
        detailClassName={
          kpis.overdue > 0 ? "text-orange-600 dark:text-orange-300" : undefined
        }
        isPending={isPending}
      />
      <KpiTile
        to="/deals"
        icon={Trophy}
        accent="bg-violet-500/10 text-violet-600 dark:text-violet-300"
        label="Win rate"
        value={
          kpis.winRate === null ? "—" : `${Math.round(kpis.winRate * 100)}%`
        }
        detail={`${kpis.wonDeals} deals won`}
        isPending={isPending}
      />
    </div>
  );
};

interface KpiTileProps {
  to: string;
  icon: LucideIcon;
  accent: string;
  label: string;
  value: string;
  detail: string;
  detailClassName?: string;
  isPending: boolean;
}

const KpiTile = ({
  to,
  icon: Icon,
  accent,
  label,
  value,
  detail,
  detailClassName,
  isPending,
}: KpiTileProps) => (
  <Link to={to} className="group">
    <Card className="py-4 h-full transition-colors group-hover:border-primary/40">
      <CardContent className="px-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground truncate">
            {label}
          </span>
          {isPending ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {value}
            </span>
          )}
          <span
            className={cn("text-xs text-muted-foreground", detailClassName)}
          >
            {isPending ? " " : detail}
          </span>
        </div>
        <div className={cn("rounded-lg p-2 shrink-0", accent)}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  </Link>
);
