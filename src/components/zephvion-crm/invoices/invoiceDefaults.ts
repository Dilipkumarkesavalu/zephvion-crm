import type { Invoice, InvoiceType } from "../types";
import {
  DEFAULT_GST_RATE,
  INVOICE_PAYMENT_TERMS_DAYS,
  QUOTE_VALIDITY_DAYS,
  addDays,
  toISODate,
} from "./invoiceModel";
import { defaultInvoiceNotes, defaultQuoteNotes } from "./sellerDetails";

/** Initial values for a new quote or invoice. */
export const getInvoiceDefaults = (
  type: InvoiceType,
  today: Date = new Date(),
): Partial<Invoice> => ({
  type,
  status: "draft",
  tax_mode: "intra",
  issue_date: toISODate(today),
  due_date: toISODate(
    addDays(
      today,
      type === "quote" ? QUOTE_VALIDITY_DAYS : INVOICE_PAYMENT_TERMS_DAYS,
    ),
  ),
  notes: type === "quote" ? defaultQuoteNotes : defaultInvoiceNotes,
  items: [
    {
      description: "",
      hsn_sac: "998314",
      quantity: 1,
      unit_price: 0,
      gst_rate: DEFAULT_GST_RATE,
    },
  ],
});
