import { Clock, Flame, Inbox } from "lucide-react";
import { useGetList } from "ra-core";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getLeadTier, getSlaState } from "../leads/leadModel";
import type { Lead } from "../types";

/** How many leads are waiting, how many are hot, and how many are late. */
export const LeadInboxCard = () => {
  const { data: leads = [], isPending } = useGetList<Lead>("leads", {
    pagination: { page: 1, perPage: 500 },
    sort: { field: "created_at", order: "DESC" },
    filter: { "status@in": "(new,contacted,qualified)" },
  });
  const waiting = leads.filter((lead) => lead.status === "new");
  const overdue = waiting.filter(
    (lead) => getSlaState(lead).kind === "overdue",
  );
  const hot = leads.filter((lead) => getLeadTier(lead.score) === "hot");

  const rows = [
    { icon: Inbox, label: "Waiting for first contact", value: waiting.length },
    {
      icon: Clock,
      label: "Past the 2-hour response time",
      value: overdue.length,
      isAlert: overdue.length > 0,
    },
    { icon: Flame, label: "Hot open leads", value: hot.length },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lead inbox</CardTitle>
        <Link to="/leads" className="text-xs text-primary hover:underline">
          Open inbox
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isPending
          ? Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))
          : rows.map(({ icon: Icon, label, value, isAlert }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <Icon
                  className={
                    isAlert
                      ? "size-4 text-destructive"
                      : "size-4 text-muted-foreground"
                  }
                />
                <span className="flex-1">{label}</span>
                <span
                  className={
                    isAlert
                      ? "font-semibold tabular-nums text-destructive"
                      : "font-semibold tabular-nums"
                  }
                >
                  {value}
                </span>
              </div>
            ))}
      </CardContent>
    </Card>
  );
};
