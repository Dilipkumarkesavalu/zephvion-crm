import { ResponsiveBar } from "@nivo/bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatMoney } from "../invoices/invoiceModel";
import { computeMonthlyRevenue, formatCompactMoney } from "./dashboardMetrics";
import { useDashboardRecords } from "./useDashboardRecords";

const SERIES = [
  { key: "invoiced", label: "Invoiced", color: "#0d82e4" },
  { key: "collected", label: "Collected", color: "#0bb8a7" },
] as const;

const axisTheme = {
  axis: {
    ticks: { text: { fill: "var(--color-muted-foreground)", fontSize: 11 } },
  },
  grid: { line: { stroke: "var(--color-border)" } },
};

export const RevenueChart = () => {
  const { currency } = useConfigurationContext();
  const { invoices, isPending } = useDashboardRecords();
  const data = computeMonthlyRevenue(invoices);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue</CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: series.color }}
              />
              {series.label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <div className="h-[280px]">
            <ResponsiveBar
              data={data.map((month) => ({ ...month }))}
              indexBy="month"
              keys={SERIES.map((series) => series.key)}
              groupMode="grouped"
              colors={SERIES.map((series) => series.color)}
              margin={{ top: 10, right: 10, bottom: 30, left: 56 }}
              padding={0.35}
              innerPadding={3}
              borderRadius={3}
              enableLabel={false}
              enableGridY
              theme={axisTheme}
              axisBottom={{ tickSize: 0, tickPadding: 10 }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickValues: 5,
                format: (value: number) => formatCompactMoney(value, currency),
              }}
              tooltip={({ id, value, indexValue, color }) => (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted-foreground">
                    {indexValue} ·{" "}
                    {SERIES.find((series) => series.key === id)?.label}
                  </span>
                  <strong className="tabular-nums">
                    {formatMoney(value, currency)}
                  </strong>
                </div>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
