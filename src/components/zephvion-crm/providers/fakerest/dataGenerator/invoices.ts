import { add } from "date-fns";
import { random } from "faker/locale/en_US";

import {
  DEFAULT_GST_RATE,
  INVOICE_PAYMENT_TERMS_DAYS,
  QUOTE_VALIDITY_DAYS,
  computeTotals,
  getTaxModeForState,
  getNextDocumentNumber,
  toISODate,
} from "../../../invoices/invoiceModel";
import {
  defaultInvoiceNotes,
  defaultQuoteNotes,
  sellerDetails,
} from "../../../invoices/sellerDetails";
import type { Deal, Invoice, InvoiceItem } from "../../../types";
import type { Db } from "./types";
import { SERVICE_PACKAGES } from "./samples";
import { weightedBoolean } from "./utils";

const PRICE_STEP = 100;

type DraftInvoice = Omit<Invoice, "id" | "number">;

const roundTo = (value: number, step: number) =>
  Math.round(value / step) * step;

const packageItems = (deal: Deal): InvoiceItem[] =>
  (SERVICE_PACKAGES[deal.category] ?? SERVICE_PACKAGES.other).map((line) => ({
    description: line.description,
    hsn_sac: line.hsnSac,
    quantity: 1,
    unit_price: roundTo(deal.amount * line.share, PRICE_STEP),
    gst_rate: DEFAULT_GST_RATE,
  }));

const milestoneItem = (
  deal: Deal,
  label: string,
  share: number,
): InvoiceItem => ({
  description: `${label} – ${deal.name}`,
  hsn_sac: SERVICE_PACKAGES[deal.category]?.[0]?.hsnSac ?? "998314",
  quantity: 1,
  unit_price: roundTo(deal.amount * share, PRICE_STEP),
  gst_rate: DEFAULT_GST_RATE,
});

const buildDocument = (
  deal: Deal,
  db: Db,
  values: Pick<DraftInvoice, "type" | "status" | "items"> & {
    issue: Date;
    paid?: boolean;
  },
): DraftInvoice => {
  const company = db.companies[deal.company_id as number];
  const { subtotal, taxTotal, total } = computeTotals(values.items);
  const termDays =
    values.type === "quote" ? QUOTE_VALIDITY_DAYS : INVOICE_PAYMENT_TERMS_DAYS;
  const issueISO = values.issue.toISOString();
  return {
    type: values.type,
    status: values.status,
    company_id: deal.company_id,
    contact_id: deal.contact_ids[0] ?? null,
    deal_id: deal.id,
    sales_id: deal.sales_id,
    issue_date: toISODate(values.issue),
    due_date: toISODate(add(values.issue, { days: termDays })),
    tax_mode: getTaxModeForState(company?.state_abbr, sellerDetails.homeState),
    items: values.items,
    notes: values.type === "quote" ? defaultQuoteNotes : defaultInvoiceNotes,
    subtotal,
    tax_total: taxTotal,
    total,
    source_quote_id: null,
    paid_at: values.paid
      ? add(values.issue, {
          days: random.arrayElement([3, 7, 12]),
        }).toISOString()
      : null,
    created_at: issueISO,
    updated_at: issueISO,
  };
};

const isPast = (date: Date, days = 0) =>
  add(date, { days }).getTime() < Date.now();

/** Quotes for deals in the pipeline; quotes plus milestone invoices for won deals. */
const documentsForDeal = (deal: Deal, db: Db): DraftInvoice[] => {
  const quoteDate = add(new Date(deal.created_at), { days: 5 });
  if (["lead", "discovery"].includes(deal.stage) || !isPast(quoteDate)) {
    return [];
  }
  const quoteStatus: Record<string, string> = {
    "proposal-sent": weightedBoolean(80) ? "sent" : "draft",
    "in-negociation": "sent",
    won: "accepted",
    lost: "declined",
  };
  const quote = buildDocument(deal, db, {
    type: "quote",
    status: quoteStatus[deal.stage] ?? "draft",
    items: packageItems(deal),
    issue: quoteDate,
  });
  if (deal.stage !== "won") return [quote];

  const advanceDate = add(quoteDate, { days: 7 });
  if (!isPast(advanceDate)) return [quote];
  const advance = buildDocument(deal, db, {
    type: "invoice",
    status: isPast(advanceDate, 10) ? "paid" : "sent",
    items: [milestoneItem(deal, "Advance payment (50%)", 0.5)],
    issue: advanceDate,
    paid: isPast(advanceDate, 10),
  });
  const finalDate = new Date(deal.expected_closing_date);
  if (!isPast(finalDate)) return [quote, advance];

  const isFinalPaid =
    isPast(finalDate, INVOICE_PAYMENT_TERMS_DAYS) && weightedBoolean(60);
  const final = buildDocument(deal, db, {
    type: "invoice",
    status: isFinalPaid ? "paid" : "sent",
    items: [milestoneItem(deal, "Final payment on delivery (50%)", 0.5)],
    issue: finalDate,
    paid: isFinalPaid,
  });
  return [quote, advance, final];
};

export const generateInvoices = (db: Db): Invoice[] => {
  const drafts = db.deals
    .flatMap((deal) => documentsForDeal(deal, db))
    .sort((a, b) => a.issue_date.localeCompare(b.issue_date));

  const invoices: Invoice[] = [];
  drafts.forEach((draft) => {
    const number = getNextDocumentNumber(
      draft.type,
      invoices.map((invoice) => invoice.number),
      new Date(draft.issue_date),
    );
    const sourceQuote =
      draft.type === "invoice"
        ? invoices.find(
            (invoice) =>
              invoice.type === "quote" && invoice.deal_id === draft.deal_id,
          )
        : undefined;
    invoices.push({
      ...draft,
      id: invoices.length,
      number,
      source_quote_id: sourceQuote?.id ?? null,
    });
  });
  return invoices;
};
