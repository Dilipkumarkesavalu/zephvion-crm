import { settleInvoice } from "../../../invoices/billingModel";
import { roundMoney } from "../../../invoices/invoiceModel";
import type { InvoicePayment } from "../../../types";
import type { Db } from "./types";

const PARTLY_PAID_SHARE = 0.4;
const PARTLY_PAID_COUNT = 2;

/**
 * Payments behind the demo's paid invoices, plus a couple of part payments,
 * with each invoice's amount_paid set the way the database trigger would.
 */
export const generateInvoicePayments = (db: Db): InvoicePayment[] => {
  const invoices = db.invoices.filter((invoice) => invoice.type === "invoice");
  const payments: InvoicePayment[] = [];
  const add = (payment: Omit<InvoicePayment, "id" | "created_at">) =>
    payments.push({
      ...payment,
      id: payments.length + 1,
      created_at: `${payment.paid_on}T10:00:00.000Z`,
    });

  for (const invoice of invoices.filter((item) => item.status === "paid")) {
    add({
      invoice_id: invoice.id,
      amount: Number(invoice.total),
      tds_amount: 0,
      paid_on: (invoice.paid_at ?? invoice.issue_date).slice(0, 10),
      method: payments.length % 2 ? "upi" : "bank_transfer",
      reference: `UTR${String(invoice.id).padStart(10, "0")}`,
    });
  }
  for (const invoice of invoices
    .filter((item) => item.status === "sent")
    .slice(0, PARTLY_PAID_COUNT)) {
    add({
      invoice_id: invoice.id,
      amount: roundMoney(Number(invoice.total) * PARTLY_PAID_SHARE),
      tds_amount: 0,
      paid_on: invoice.issue_date,
      method: "bank_transfer",
      reference: "Advance",
    });
  }

  for (const invoice of invoices) {
    const own = payments.filter((payment) => payment.invoice_id === invoice.id);
    if (own.length) {
      invoice.amount_paid = settleInvoice(invoice, own).amount_paid;
    }
  }
  return payments;
};
