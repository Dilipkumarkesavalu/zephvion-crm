import type { Identifier } from "ra-core";

import type { Company, Invoice, InvoicePayment } from "../types";
import { getBalanceDue, roundMoney, toISODate } from "./invoiceModel";

/**
 * What the refresh_invoice_payments trigger does in the database, for the
 * in-browser demo: total received, and paid once it covers the invoice.
 */
export const settleInvoice = (
  invoice: Invoice,
  payments: Pick<InvoicePayment, "amount" | "tds_amount" | "paid_on">[],
): Pick<Invoice, "amount_paid" | "status" | "paid_at"> => {
  const settled = roundMoney(
    payments.reduce(
      (total, payment) =>
        total + Number(payment.amount) + Number(payment.tds_amount || 0),
      0,
    ),
  );
  const lastPaid = payments
    .map((payment) => payment.paid_on)
    .sort()
    .at(-1);
  const isInvoice = invoice.type === "invoice";
  const isCovered = isInvoice && settled >= Number(invoice.total);

  if (isCovered && ["sent", "paid"].includes(invoice.status)) {
    return {
      amount_paid: settled,
      status: "paid",
      paid_at:
        invoice.paid_at ?? (lastPaid ? `${lastPaid}T00:00:00.000Z` : null),
    };
  }
  if (isInvoice && invoice.status === "paid" && !isCovered) {
    return { amount_paid: settled, status: "sent", paid_at: null };
  }
  return {
    amount_paid: settled,
    status: invoice.status,
    paid_at: invoice.paid_at,
  };
};

export const AGEING_BUCKETS = [
  "current",
  "days_1_30",
  "days_31_60",
  "days_61_90",
  "days_90_plus",
] as const;
export type AgeingBucket = (typeof AGEING_BUCKETS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export const getAgeingBucket = (
  dueDate: string | undefined,
  today: Date = new Date(),
): AgeingBucket => {
  if (!dueDate) return "current";
  const daysLate = Math.floor(
    (new Date(toISODate(today)).getTime() - new Date(dueDate).getTime()) /
      DAY_MS,
  );
  if (daysLate <= 0) return "current";
  if (daysLate <= 30) return "days_1_30";
  if (daysLate <= 60) return "days_31_60";
  if (daysLate <= 90) return "days_61_90";
  return "days_90_plus";
};

export type AgeingAmounts = Record<AgeingBucket, number> & { total: number };

export interface ClientAgeing extends AgeingAmounts {
  companyId: Identifier;
  companyName: string;
  invoiceCount: number;
  oldestDueDate: string | null;
}

const emptyAmounts = (): AgeingAmounts => ({
  current: 0,
  days_1_30: 0,
  days_31_60: 0,
  days_61_90: 0,
  days_90_plus: 0,
  total: 0,
});

/** Money owed per client, split by how late it is; biggest debtor first. */
export const computeAgeing = (
  invoices: Invoice[],
  companies: Pick<Company, "id" | "name">[],
  today: Date = new Date(),
): { clients: ClientAgeing[]; totals: AgeingAmounts } => {
  const names = new Map(
    companies.map((company) => [String(company.id), company.name]),
  );
  const byClient = new Map<string, ClientAgeing>();
  const totals = emptyAmounts();

  for (const invoice of invoices) {
    const balance = getBalanceDue(invoice);
    if (balance <= 0) continue;
    const key = String(invoice.company_id);
    const client = byClient.get(key) ?? {
      ...emptyAmounts(),
      companyId: invoice.company_id,
      companyName: names.get(key) ?? `#${invoice.company_id}`,
      invoiceCount: 0,
      oldestDueDate: null,
    };
    const bucket = getAgeingBucket(invoice.due_date, today);
    client[bucket] = roundMoney(client[bucket] + balance);
    client.total = roundMoney(client.total + balance);
    client.invoiceCount += 1;
    if (
      invoice.due_date &&
      (!client.oldestDueDate || invoice.due_date < client.oldestDueDate)
    ) {
      client.oldestDueDate = invoice.due_date;
    }
    byClient.set(key, client);
    totals[bucket] = roundMoney(totals[bucket] + balance);
    totals.total = roundMoney(totals.total + balance);
  }

  return {
    clients: [...byClient.values()].sort((a, b) => b.total - a.total),
    totals,
  };
};
