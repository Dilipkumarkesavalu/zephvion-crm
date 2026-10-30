import { useGetList, useTranslate } from "ra-core";
import { AlertTriangle, FileCheck2, FileText, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Invoice } from "../types";
import {
  formatMoney,
  getAmountReceived,
  getBalanceDue,
  getDisplayStatus,
} from "./invoiceModel";

const SUMMARY_FETCH_LIMIT = 1000;

interface SummaryTotals {
  outstanding: { amount: number; count: number };
  overdue: { amount: number; count: number };
  collected: { amount: number; count: number };
  openQuotes: { amount: number; count: number };
}

const emptyBucket = () => ({ amount: 0, count: 0 });

const addTo = (bucket: { amount: number; count: number }, amount: number) => ({
  amount: bucket.amount + Number(amount || 0),
  count: bucket.count + 1,
});

const summarizeInvoices = (invoices: Invoice[]): SummaryTotals =>
  invoices.reduce<SummaryTotals>(
    (acc, invoice) => {
      const status = getDisplayStatus(invoice);
      if (invoice.type === "quote") {
        return ["draft", "sent"].includes(status)
          ? { ...acc, openQuotes: addTo(acc.openQuotes, invoice.total) }
          : acc;
      }
      if (status === "paid") {
        return { ...acc, collected: addTo(acc.collected, invoice.total) };
      }
      if (["sent", "overdue", "partially_paid"].includes(status)) {
        const balance = getBalanceDue(invoice);
        const received = getAmountReceived(invoice);
        return {
          ...acc,
          outstanding: addTo(acc.outstanding, balance),
          overdue:
            status === "overdue" ? addTo(acc.overdue, balance) : acc.overdue,
          collected: received ? addTo(acc.collected, received) : acc.collected,
        };
      }
      return acc;
    },
    {
      outstanding: emptyBucket(),
      overdue: emptyBucket(),
      collected: emptyBucket(),
      openQuotes: emptyBucket(),
    },
  );

export const InvoiceSummary = () => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const { data = [], isPending } = useGetList<Invoice>("invoices", {
    pagination: { page: 1, perPage: SUMMARY_FETCH_LIMIT },
  });
  const totals = summarizeInvoices(data);
  const invoicesLabel = (count: number) =>
    translate("resources.invoices.summary.invoices_count", {
      smart_count: count,
    });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <SummaryTile
        icon={Wallet}
        label={translate("resources.invoices.summary.outstanding")}
        value={formatMoney(totals.outstanding.amount, currency)}
        detail={invoicesLabel(totals.outstanding.count)}
        accent="text-primary bg-primary/10"
        isPending={isPending}
      />
      <SummaryTile
        icon={AlertTriangle}
        label={translate("resources.invoices.summary.overdue")}
        value={formatMoney(totals.overdue.amount, currency)}
        detail={invoicesLabel(totals.overdue.count)}
        accent="text-orange-600 bg-orange-500/10"
        isPending={isPending}
      />
      <SummaryTile
        icon={FileCheck2}
        label={translate("resources.invoices.summary.collected")}
        value={formatMoney(totals.collected.amount, currency)}
        detail={invoicesLabel(totals.collected.count)}
        accent="text-teal-600 bg-teal-500/10"
        isPending={isPending}
      />
      <SummaryTile
        icon={FileText}
        label={translate("resources.invoices.summary.open_quotes")}
        value={formatMoney(totals.openQuotes.amount, currency)}
        detail={translate("resources.invoices.summary.quotes_count", {
          smart_count: totals.openQuotes.count,
        })}
        accent="text-muted-foreground bg-muted"
        isPending={isPending}
      />
    </div>
  );
};

interface SummaryTileProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  accent: string;
  isPending: boolean;
}

const SummaryTile = ({
  icon: Icon,
  label,
  value,
  detail,
  accent,
  isPending,
}: SummaryTileProps) => (
  <Card className="py-4">
    <CardContent className="px-4 flex items-start gap-3">
      <div className={cn("rounded-lg p-2 shrink-0", accent)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums truncate">
          {isPending ? "—" : value}
        </div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </CardContent>
  </Card>
);
