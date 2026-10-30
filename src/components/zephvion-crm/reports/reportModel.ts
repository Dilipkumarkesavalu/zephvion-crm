import type {
  Deal,
  InvoicePayment,
  Lead,
  Sale,
  Ticket,
  TimeEntry,
} from "../types";
import { getFinancialYear } from "../dashboard/dashboardMetrics";
import { roundMoney } from "../invoices/invoiceModel";

export type ReportPeriod = "month" | "quarter" | "financial_year" | "all";

export const REPORT_PERIODS: ReportPeriod[] = [
  "month",
  "quarter",
  "financial_year",
  "all",
];

/** First day of the period, or null for all time. */
export const getPeriodStart = (
  period: ReportPeriod,
  today: Date = new Date(),
): Date | null => {
  switch (period) {
    case "month":
      return new Date(today.getFullYear(), today.getMonth(), 1);
    case "quarter":
      return new Date(today.getFullYear(), today.getMonth() - 2, 1);
    case "financial_year":
      return getFinancialYear(today).start;
    default:
      return null;
  }
};

const inPeriod = (date: string | null | undefined, start: Date | null) =>
  !start || (!!date && new Date(date) >= start);

const ratio = (part: number, whole: number) =>
  whole > 0 ? part / whole : null;

const personName = (sales: Sale[], id: unknown) => {
  const sale = sales.find((candidate) => String(candidate.id) === String(id));
  return sale
    ? `${sale.first_name} ${sale.last_name ?? ""}`.trim()
    : "Unassigned";
};

export interface SalesRow {
  person: string;
  won: number;
  wonValue: number;
  lost: number;
  winRate: number | null;
  openValue: number;
}

/** Won and lost deals closed in the period, and open pipeline, per owner. */
export const salesByPerson = (
  deals: Deal[],
  sales: Sale[],
  start: Date | null,
): SalesRow[] => {
  const rows = new Map<string, SalesRow>();
  for (const deal of deals.filter((item) => !item.archived_at)) {
    const key = String(deal.sales_id ?? "none");
    const row = rows.get(key) ?? {
      person: personName(sales, deal.sales_id),
      won: 0,
      wonValue: 0,
      lost: 0,
      winRate: null,
      openValue: 0,
    };
    const closedInPeriod = inPeriod(deal.updated_at, start);
    if (deal.stage === "won" && closedInPeriod) {
      row.won += 1;
      row.wonValue = roundMoney(row.wonValue + Number(deal.amount));
    } else if (deal.stage === "lost" && closedInPeriod) {
      row.lost += 1;
    } else if (deal.stage !== "won" && deal.stage !== "lost") {
      row.openValue = roundMoney(row.openValue + Number(deal.amount));
    }
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((row) => ({ ...row, winRate: ratio(row.won, row.won + row.lost) }))
    .filter((row) => row.won || row.lost || row.openValue)
    .sort((a, b) => b.wonValue - a.wonValue || b.openValue - a.openValue);
};

export interface LeadSourceRow {
  source: string;
  leads: number;
  converted: number;
  conversionRate: number | null;
  averageScore: number;
}

/** Where leads came from in the period and how many became clients. */
export const leadsBySource = (
  leads: Lead[],
  start: Date | null,
): LeadSourceRow[] => {
  const rows = new Map<string, { leads: Lead[] }>();
  for (const lead of leads.filter((item) => inPeriod(item.created_at, start))) {
    const row = rows.get(lead.source) ?? { leads: [] };
    row.leads.push(lead);
    rows.set(lead.source, row);
  }
  return [...rows.entries()]
    .map(([source, { leads: group }]) => {
      const converted = group.filter(
        (lead) => lead.status === "converted",
      ).length;
      return {
        source,
        leads: group.length,
        converted,
        conversionRate: ratio(converted, group.length),
        averageScore: Math.round(
          group.reduce((total, lead) => total + lead.score, 0) / group.length,
        ),
      };
    })
    .sort((a, b) => b.leads - a.leads);
};

export interface SupportSummary {
  opened: number;
  stillOpen: number;
  responseOnTime: number | null;
  resolvedOnTime: number | null;
  averageFirstResponseHours: number | null;
  byPriority: Record<string, number>;
}

/** Tickets opened in the period and how often deadlines were met. */
export const summarizeSupport = (
  tickets: Ticket[],
  start: Date | null,
): SupportSummary => {
  const opened = tickets.filter((ticket) => inPeriod(ticket.created_at, start));
  const responded = opened.filter((ticket) => ticket.first_responded_at);
  const resolved = opened.filter((ticket) => ticket.resolved_at);
  const onTime = (items: Ticket[], at: keyof Ticket, due: keyof Ticket) =>
    ratio(
      items.filter(
        (ticket) => !ticket[due] || String(ticket[at]) <= String(ticket[due]),
      ).length,
      items.length,
    );
  const responseHours = responded.map(
    (ticket) =>
      (new Date(ticket.first_responded_at!).getTime() -
        new Date(ticket.created_at).getTime()) /
      3_600_000,
  );
  const byPriority: Record<string, number> = {};
  for (const ticket of opened) {
    byPriority[ticket.priority] = (byPriority[ticket.priority] ?? 0) + 1;
  }
  return {
    opened: opened.length,
    stillOpen: opened.filter(
      (ticket) => !["resolved", "closed"].includes(ticket.status),
    ).length,
    responseOnTime: onTime(
      responded,
      "first_responded_at",
      "first_response_due",
    ),
    resolvedOnTime: onTime(resolved, "resolved_at", "resolve_due"),
    averageFirstResponseHours: responseHours.length
      ? Math.round(
          (responseHours.reduce((total, hours) => total + hours, 0) /
            responseHours.length) *
            10,
        ) / 10
      : null,
    byPriority,
  };
};

export interface TimeRow {
  person: string;
  hours: number;
  billableHours: number;
  billableShare: number | null;
}

/** Hours logged in the period per person, and how much was billable. */
export const timeByPerson = (
  entries: TimeEntry[],
  sales: Sale[],
  start: Date | null,
): TimeRow[] => {
  const rows = new Map<string, TimeRow>();
  for (const entry of entries.filter((item) =>
    inPeriod(item.spent_on, start),
  )) {
    const key = String(entry.sales_id);
    const row = rows.get(key) ?? {
      person: personName(sales, entry.sales_id),
      hours: 0,
      billableHours: 0,
      billableShare: null,
    };
    row.hours = roundMoney(row.hours + Number(entry.hours));
    if (entry.billable) {
      row.billableHours = roundMoney(row.billableHours + Number(entry.hours));
    }
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((row) => ({
      ...row,
      billableShare: ratio(row.billableHours, row.hours),
    }))
    .sort((a, b) => b.hours - a.hours);
};

export interface CollectionMonth {
  month: string;
  received: number;
  tds: number;
}

/** Money received per month in the period (payments plus TDS). */
export const collectionsByMonth = (
  payments: InvoicePayment[],
  start: Date | null,
): CollectionMonth[] => {
  const rows = new Map<string, CollectionMonth>();
  for (const payment of payments.filter((item) =>
    inPeriod(item.paid_on, start),
  )) {
    const month = payment.paid_on.slice(0, 7);
    const row = rows.get(month) ?? { month, received: 0, tds: 0 };
    row.received = roundMoney(row.received + Number(payment.amount));
    row.tds = roundMoney(row.tds + Number(payment.tds_amount || 0));
    rows.set(month, row);
  }
  return [...rows.values()].sort((a, b) => a.month.localeCompare(b.month));
};

const csvCell = (value: unknown): string => {
  const text = value == null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (headers: string[], rows: unknown[][]): string =>
  [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
