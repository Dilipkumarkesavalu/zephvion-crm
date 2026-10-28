import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  computeForecast,
  isStaleDeal,
  STALE_AFTER_DAYS,
} from "../deals/forecast";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatCompactMoney } from "./dashboardMetrics";
import { useDashboardRecords } from "./useDashboardRecords";

/** Next three months of open deals, weighted by each stage's odds. */
export const ForecastCard = () => {
  const { dealStages, currency } = useConfigurationContext();
  const { deals, isPending } = useDashboardRecords();
  const forecast = computeForecast(deals, dealStages);
  const staleCount = deals.filter((deal) => isStaleDeal(deal)).length;
  const total = forecast.reduce((sum, month) => sum + month.weighted, 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Forecast · next 3 months</CardTitle>
        {!isPending ? (
          <span className="text-sm text-muted-foreground">
            Weighted{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatCompactMoney(total, currency)}
            </span>
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {isPending
            ? Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))
            : forecast.map((month) => (
                <div key={month.month} className="rounded-lg border p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {format(new Date(month.month), "MMM yyyy")}
                  </div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">
                    {formatCompactMoney(month.weighted, currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {month.count} deals · best case{" "}
                    {formatCompactMoney(month.bestCase, currency)}
                  </div>
                </div>
              ))}
        </div>
        {staleCount > 0 ? (
          <Link
            to="/deals"
            className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
          >
            <AlertTriangle className="size-4" />
            {staleCount} open {staleCount === 1 ? "deal has" : "deals have"} had
            no activity for {STALE_AFTER_DAYS}+ days
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
};
