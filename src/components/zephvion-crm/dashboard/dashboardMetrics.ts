import type { Deal, DealStage, Invoice } from "../types";
import {
  getBalanceDue,
  getDisplayStatus,
  toISODate,
} from "../invoices/invoiceModel";

const CLOSED_STAGES = ["won", "lost"];

/** Indian financial year (April to March) containing the date. */
export const getFinancialYear = (date: Date = new Date()) => {
  const startYear =
    date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return {
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31, 23, 59, 59, 999),
    label: `FY ${startYear}–${String(startYear + 1).slice(2)}`,
  };
};

export interface DashboardKpis {
  pipelineValue: number;
  openDeals: number;
  collectedThisYear: number;
  paidInvoicesThisYear: number;
  outstanding: number;
  overdue: number;
  winRate: number | null;
  wonDeals: number;
}

export const computeKpis = (
  deals: Deal[],
  invoices: Invoice[],
  today: Date = new Date(),
): DashboardKpis => {
  const activeDeals = deals.filter((deal) => !deal.archived_at);
  const openDeals = activeDeals.filter(
    (deal) => !CLOSED_STAGES.includes(deal.stage),
  );
  const won = activeDeals.filter((deal) => deal.stage === "won").length;
  const lost = activeDeals.filter((deal) => deal.stage === "lost").length;
  const financialYear = getFinancialYear(today);

  const paidThisYear = invoices.filter((invoice) => {
    if (invoice.type !== "invoice" || invoice.status !== "paid") return false;
    const paidOn = new Date(invoice.paid_at ?? invoice.issue_date);
    return paidOn >= financialYear.start && paidOn <= financialYear.end;
  });
  const unpaid = invoices.filter(
    (invoice) => invoice.type === "invoice" && invoice.status === "sent",
  );

  return {
    pipelineValue: sumBy(openDeals, (deal) => deal.amount),
    openDeals: openDeals.length,
    collectedThisYear: sumBy(paidThisYear, (invoice) => invoice.total),
    paidInvoicesThisYear: paidThisYear.length,
    outstanding: sumBy(unpaid, getBalanceDue),
    overdue: sumBy(
      unpaid.filter(
        (invoice) => getDisplayStatus(invoice, today) === "overdue",
      ),
      getBalanceDue,
    ),
    winRate: won + lost > 0 ? won / (won + lost) : null,
    wonDeals: won,
  };
};

export interface MonthlyRevenue {
  month: string;
  invoiced: number;
  collected: number;
}

const monthKey = (date: Date) => toISODate(date).slice(0, 7);

/** Invoiced (by issue date) and collected (by payment date) per month. */
export const computeMonthlyRevenue = (
  invoices: Invoice[],
  months = 6,
  today: Date = new Date(),
): MonthlyRevenue[] => {
  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - (months - 1 - index),
      1,
    );
    return {
      key: monthKey(date),
      month: date.toLocaleString("en-IN", { month: "short" }),
      invoiced: 0,
      collected: 0,
    };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  invoices
    .filter(
      (invoice) =>
        invoice.type === "invoice" &&
        !["draft", "cancelled"].includes(invoice.status),
    )
    .forEach((invoice) => {
      const issued = byKey.get(invoice.issue_date.slice(0, 7));
      if (issued) issued.invoiced += Number(invoice.total) || 0;
      if (invoice.status === "paid" && invoice.paid_at) {
        const paid = byKey.get(monthKey(new Date(invoice.paid_at)));
        if (paid) paid.collected += Number(invoice.total) || 0;
      }
    });

  return buckets.map(({ month, invoiced, collected }) => ({
    month,
    invoiced: Math.round(invoiced),
    collected: Math.round(collected),
  }));
};

export interface StageSummary {
  value: string;
  label: string;
  count: number;
  amount: number;
}

/** Open pipeline grouped by stage, in the configured stage order. */
export const computePipelineByStage = (
  deals: Deal[],
  stages: DealStage[],
): StageSummary[] =>
  stages
    .filter((stage) => !CLOSED_STAGES.includes(stage.value))
    .map((stage) => {
      const inStage = deals.filter(
        (deal) => !deal.archived_at && deal.stage === stage.value,
      );
      return {
        value: stage.value,
        label: stage.label,
        count: inStage.length,
        amount: sumBy(inStage, (deal) => deal.amount),
      };
    });

const sumBy = <T>(items: T[], getValue: (item: T) => number) =>
  items.reduce((total, item) => total + (Number(getValue(item)) || 0), 0);

/** ₹3.7L / ₹1.2Cr style amounts for tiles and axes. */
export const formatCompactMoney = (amount: number, currency: string): string =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
