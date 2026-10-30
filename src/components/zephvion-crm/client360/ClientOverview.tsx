import { format } from "date-fns";
import {
  CheckSquare,
  FileText,
  Handshake,
  MessageSquare,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useTranslate, type Identifier } from "ra-core";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { formatRelativeDate } from "../misc/RelativeDate";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatSaleName } from "../sales/saleName";
import type { Sale } from "../types";
import {
  buildClientSummary,
  buildClientTimeline,
  TIMELINE_KINDS,
  type TimelineEvent,
  type TimelineKind,
} from "./clientModel";
import { useClientData } from "./useClientData";
import { AiSummaryCard } from "../assistant/AiSummaryCard";

const PAGE_SIZE = 25;

const KIND_STYLES: Record<TimelineKind, { icon: LucideIcon; tone: string }> = {
  deal: { icon: Handshake, tone: "bg-blue-500/15 text-blue-600" },
  invoice: { icon: FileText, tone: "bg-emerald-500/15 text-emerald-600" },
  task: { icon: CheckSquare, tone: "bg-amber-500/15 text-amber-600" },
  note: { icon: MessageSquare, tone: "bg-violet-500/15 text-violet-600" },
  contact: { icon: UserPlus, tone: "bg-slate-500/15 text-slate-600" },
};

const useMoney = () => {
  const { currency } = useConfigurationContext();
  return useMemo(() => {
    const formatter = new Intl.NumberFormat(
      currency === "INR" ? "en-IN" : "en-US",
      {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      },
    );
    return (value: number) => formatter.format(value || 0);
  }, [currency]);
};

/** Client 360: money, workload and one timeline of everything that happened. */
export const ClientOverview = ({ companyId }: { companyId: Identifier }) => {
  const { data, isPending, error } = useClientData(companyId);
  const translate = useTranslate();

  if (isPending) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <p className="py-6 text-sm text-destructive">
        {translate("crm.client360.error")}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4 pt-2">
      <AiSummaryCard companyId={companyId} />
      <ClientOverviewContent data={data} />
    </div>
  );
};

const ClientOverviewContent = ({
  data,
}: {
  data: Parameters<typeof buildClientSummary>[0];
}) => {
  const translate = useTranslate();
  const money = useMoney();
  const summary = useMemo(() => buildClientSummary(data), [data]);
  const timeline = useMemo(() => buildClientTimeline(data), [data]);

  return (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          label={translate("crm.client360.open_pipeline")}
          value={money(summary.openPipeline)}
          hint={translate("crm.client360.deals_count", {
            smart_count: summary.openDeals,
          })}
        />
        <Metric
          label={translate("crm.client360.won")}
          value={money(summary.wonValue)}
          hint={translate("crm.client360.deals_count", {
            smart_count: summary.wonDeals,
          })}
        />
        <Metric
          label={translate("crm.client360.outstanding")}
          value={money(summary.outstanding)}
          hint={
            summary.overdue
              ? translate("crm.client360.overdue_amount", {
                  amount: money(summary.overdue),
                })
              : translate("crm.client360.paid_amount", {
                  amount: money(summary.paid),
                })
          }
          isAlert={summary.overdue > 0}
        />
        <Metric
          label={translate("crm.client360.open_tasks")}
          value={String(summary.openTasks)}
          hint={
            summary.overdueTasks
              ? translate("crm.client360.overdue_tasks", {
                  smart_count: summary.overdueTasks,
                })
              : summary.lastActivity
                ? translate("crm.common.last_activity_with_date", {
                    date: formatRelativeDate(summary.lastActivity, "en"),
                  })
                : translate("crm.client360.no_activity")
          }
          isAlert={summary.overdueTasks > 0}
        />
      </div>
      <Timeline events={timeline} />
    </div>
  );
};

const Metric = ({
  label,
  value,
  hint,
  isAlert = false,
}: {
  label: string;
  value: string;
  hint: string;
  isAlert?: boolean;
}) => (
  <div className="rounded-lg border bg-muted/30 p-3">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    <div
      className={cn(
        "mt-0.5 text-xs",
        isAlert ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      {hint}
    </div>
  </div>
);

const Timeline = ({ events }: { events: TimelineEvent[] }) => {
  const translate = useTranslate();
  const [kind, setKind] = useState<TimelineKind | "all">("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const filtered =
    kind === "all" ? events : events.filter((event) => event.kind === kind);
  const groups = groupByMonth(filtered.slice(0, shown));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-sm font-semibold">
          {translate("crm.client360.timeline")}
        </h3>
        {(["all", ...TIMELINE_KINDS] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={kind === value ? "default" : "outline"}
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => {
              setKind(value);
              setShown(PAGE_SIZE);
            }}
          >
            {translate(`crm.client360.kinds.${value}`)}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {translate("crm.client360.empty")}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(([month, items]) => (
            <section key={month}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {month}
              </div>
              <ol className="relative space-y-1 border-l pl-5">
                {items.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))}
              </ol>
            </section>
          ))}
          {filtered.length > shown ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShown((count) => count + PAGE_SIZE)}
            >
              {translate("crm.common.load_more")}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};

const groupByMonth = (events: TimelineEvent[]) => {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const month = format(new Date(event.date), "MMMM yyyy");
    groups.set(month, [...(groups.get(month) ?? []), event]);
  }
  return [...groups.entries()];
};

const TimelineItem = ({ event }: { event: TimelineEvent }) => {
  const translate = useTranslate();
  const money = useMoney();
  const { icon: Icon, tone } = KIND_STYLES[event.kind];
  const isUpcoming = event.date > new Date().toISOString();
  const values = {
    ...event.values,
    amount:
      typeof event.values?.amount === "number"
        ? money(event.values.amount)
        : "",
  };

  return (
    <li className="relative">
      <span
        className={cn(
          "absolute -left-[33px] top-2 flex size-6 items-center justify-center rounded-full ring-4 ring-background",
          tone,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <Link
        to={event.link}
        className="block rounded-md px-2 py-1.5 hover:bg-muted/60"
      >
        <div className="text-xs text-muted-foreground">
          {translate(`crm.client360.events.${event.event}`, values)}
          {event.sales_id != null ? (
            <>
              {" · "}
              <ReferenceField<TimelineEvent, Sale>
                record={event}
                source="sales_id"
                reference="sales"
                link={false}
                render={({ referenceRecord }) =>
                  referenceRecord ? formatSaleName(referenceRecord as Sale) : ""
                }
              />
            </>
          ) : null}
        </div>
        <div className="line-clamp-2 text-sm font-medium">{event.title}</div>
        <div
          className={cn(
            "text-xs",
            isUpcoming ? "text-amber-600" : "text-muted-foreground",
          )}
        >
          {format(new Date(event.date), "d MMM yyyy")}
        </div>
      </Link>
    </li>
  );
};
