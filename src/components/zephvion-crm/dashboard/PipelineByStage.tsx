import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { computePipelineByStage, formatCompactMoney } from "./dashboardMetrics";
import { useDashboardRecords } from "./useDashboardRecords";

/** Open pipeline per stage as horizontal bars, earliest stage first. */
export const PipelineByStage = () => {
  const { dealStages, currency } = useConfigurationContext();
  const { deals, isPending } = useDashboardRecords();
  const stages = computePipelineByStage(deals, dealStages);
  const maxAmount = Math.max(1, ...stages.map((stage) => stage.amount));

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pipeline by stage</CardTitle>
        <Link to="/deals" className="text-xs text-primary hover:underline">
          View board
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending
          ? Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))
          : stages.map((stage, index) => (
              <div key={stage.value} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatCompactMoney(stage.amount, currency)}
                    <span className="text-xs"> · {stage.count}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(stage.amount / maxAmount) * 100}%`,
                      // later stages read darker: closer to closing
                      opacity: 0.45 + (0.55 * (index + 1)) / stages.length,
                    }}
                  />
                </div>
              </div>
            ))}
      </CardContent>
    </Card>
  );
};
