import { BarChart3, Download } from "lucide-react";
import { useGetList, useTranslate } from "ra-core";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { formatMoney } from "../invoices/invoiceModel";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type {
  Deal,
  InvoicePayment,
  Lead,
  Sale,
  Ticket,
  TimeEntry,
} from "../types";
import {
  collectionsByMonth,
  getPeriodStart,
  leadsBySource,
  REPORT_PERIODS,
  salesByPerson,
  summarizeSupport,
  timeByPerson,
  toCsv,
  type ReportPeriod,
} from "./reportModel";

const FETCH_ALL = { page: 1, perPage: 5000 };
const SORT_ID = { field: "id", order: "ASC" as const };

const percent = (value: number | null) =>
  value == null ? "—" : `${Math.round(value * 100)}%`;

const download = (name: string, csv: string) => {
  const url = URL.createObjectURL(
    new Blob([String.fromCharCode(0xfeff) + csv], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

/** Sales, lead sources, support, delivery and collections for a period. */
export const ReportsPage = () => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const money = (amount: number) => formatMoney(amount, currency);
  const [period, setPeriod] = useState<ReportPeriod>("quarter");
  const start = getPeriodStart(period);

  const { data: deals = [] } = useGetList<Deal>("deals", {
    pagination: FETCH_ALL,
    sort: SORT_ID,
  });
  const { data: leads = [] } = useGetList<Lead>("leads", {
    pagination: FETCH_ALL,
    sort: SORT_ID,
  });
  const { data: tickets = [] } = useGetList<Ticket>("tickets", {
    pagination: FETCH_ALL,
    sort: SORT_ID,
  });
  const { data: entries = [] } = useGetList<TimeEntry>("time_entries", {
    pagination: FETCH_ALL,
    sort: SORT_ID,
  });
  const { data: payments = [] } = useGetList<InvoicePayment>(
    "invoice_payments",
    { pagination: FETCH_ALL, sort: SORT_ID },
  );
  const { data: sales = [] } = useGetList<Sale>("sales", {
    pagination: FETCH_ALL,
    sort: SORT_ID,
  });

  const report = useMemo(
    () => ({
      sales: salesByPerson(deals, sales, start),
      leads: leadsBySource(leads, start),
      support: summarizeSupport(tickets, start),
      time: timeByPerson(entries, sales, start),
      collections: collectionsByMonth(payments, start),
    }),
    // start is derived from period
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deals, leads, tickets, entries, payments, sales, period],
  );
  const t = (key: string, options?: Record<string, unknown>) =>
    translate(`crm.reports.${key}`, options);

  return (
    <div className="mx-auto mt-4 flex w-full max-w-5xl flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <BarChart3 className="size-6 text-muted-foreground" />
        <h1 className="mr-auto text-2xl font-semibold">{t("title")}</h1>
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value as ReportPeriod)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_PERIODS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`periods.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap">
          {["sales", "leads", "support", "delivery", "collections"].map(
            (tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`tabs.${tab}`)}
              </TabsTrigger>
            ),
          )}
        </TabsList>

        <TabsContent value="sales">
          <ReportTable
            title={t("sales.title")}
            headers={[
              t("person"),
              t("sales.won"),
              t("sales.won_value"),
              t("sales.lost"),
              t("sales.win_rate"),
              t("sales.open_value"),
            ]}
            rows={report.sales.map((row) => [
              row.person,
              row.won,
              money(row.wonValue),
              row.lost,
              percent(row.winRate),
              money(row.openValue),
            ])}
            csvRows={report.sales.map((row) => [
              row.person,
              row.won,
              row.wonValue,
              row.lost,
              row.winRate ?? "",
              row.openValue,
            ])}
            csvName="sales-by-person"
          />
        </TabsContent>

        <TabsContent value="leads">
          <ReportTable
            title={t("leads.title")}
            headers={[
              t("leads.source"),
              t("leads.leads"),
              t("leads.converted"),
              t("leads.conversion"),
              t("leads.score"),
            ]}
            rows={report.leads.map((row) => [
              translate(`resources.leads.sources.${row.source}`, {
                _: row.source,
              }),
              row.leads,
              row.converted,
              percent(row.conversionRate),
              row.averageScore,
            ])}
            csvRows={report.leads.map((row) => [
              row.source,
              row.leads,
              row.converted,
              row.conversionRate ?? "",
              row.averageScore,
            ])}
            csvName="lead-sources"
          />
        </TabsContent>

        <TabsContent value="support">
          <div className="grid gap-3 pt-2 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label={t("support.opened")}
              value={String(report.support.opened)}
            />
            <Stat
              label={t("support.still_open")}
              value={String(report.support.stillOpen)}
            />
            <Stat
              label={t("support.response_on_time")}
              value={percent(report.support.responseOnTime)}
            />
            <Stat
              label={t("support.resolved_on_time")}
              value={percent(report.support.resolvedOnTime)}
            />
            <Stat
              label={t("support.average_response")}
              value={
                report.support.averageFirstResponseHours == null
                  ? "—"
                  : `${report.support.averageFirstResponseHours} h`
              }
            />
          </div>
          <ReportTable
            title={t("support.by_priority")}
            headers={[
              translate("resources.tickets.fields.priority"),
              t("support.tickets"),
            ]}
            rows={Object.entries(report.support.byPriority).map(
              ([priority, count]) => [
                translate(`resources.tickets.priorities.${priority}`),
                count,
              ],
            )}
            csvRows={Object.entries(report.support.byPriority)}
            csvName="tickets-by-priority"
          />
        </TabsContent>

        <TabsContent value="delivery">
          <ReportTable
            title={t("delivery.title")}
            headers={[
              t("person"),
              t("delivery.hours"),
              t("delivery.billable"),
              t("delivery.billable_share"),
            ]}
            rows={report.time.map((row) => [
              row.person,
              row.hours,
              row.billableHours,
              percent(row.billableShare),
            ])}
            csvRows={report.time.map((row) => [
              row.person,
              row.hours,
              row.billableHours,
              row.billableShare ?? "",
            ])}
            csvName="hours-by-person"
          />
        </TabsContent>

        <TabsContent value="collections">
          <ReportTable
            title={t("collections.title")}
            headers={[
              t("collections.month"),
              t("collections.received"),
              t("collections.tds"),
            ]}
            rows={report.collections.map((row) => [
              row.month,
              money(row.received),
              money(row.tds),
            ])}
            csvRows={report.collections.map((row) => [
              row.month,
              row.received,
              row.tds,
            ])}
            csvName="collections-by-month"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

ReportsPage.path = "/reports";

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border bg-card p-3">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
  </div>
);

const ReportTable = ({
  title,
  headers,
  rows,
  csvRows,
  csvName,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  csvRows: unknown[][];
  csvName: string;
}) => {
  const translate = useTranslate();
  return (
    <Card className="mt-3">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="mr-auto font-semibold">{title}</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={!csvRows.length}
            onClick={() => download(csvName, toCsv(headers, csvRows))}
          >
            <Download />
            CSV
          </Button>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={header}
                      className={
                        index
                          ? "px-3 py-2 text-right font-medium"
                          : "px-3 py-2 font-medium"
                      }
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, index) => (
                      <td
                        key={index}
                        className={
                          index
                            ? "px-3 py-2 text-right tabular-nums"
                            : "px-3 py-2"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {translate("crm.reports.empty")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
