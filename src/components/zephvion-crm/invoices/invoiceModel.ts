import type { Invoice, InvoiceItem, InvoiceType, TaxMode } from "../types";

export const GST_RATES = [0, 5, 12, 18, 28];

export const DEFAULT_GST_RATE = 18;

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"];

export const INVOICE_STATUSES = ["draft", "sent", "paid", "cancelled"];

/** Statuses derived from dates, never stored. */
export type DerivedStatus = "overdue" | "expired";

export const QUOTE_VALIDITY_DAYS = 30;

export const INVOICE_PAYMENT_TERMS_DAYS = 15;

const NUMBER_PREFIX: Record<InvoiceType, string> = {
  quote: "QT",
  invoice: "INV",
};

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
};

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Taxable value of a line (quantity x unit price), before GST. */
export const getLineTaxable = (item: Partial<InvoiceItem>): number =>
  roundMoney(toNumber(item.quantity) * toNumber(item.unit_price));

export const getLineTax = (item: Partial<InvoiceItem>): number =>
  roundMoney((getLineTaxable(item) * toNumber(item.gst_rate)) / 100);

export interface TaxBreakdownRow {
  rate: number;
  taxable: number;
  tax: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxTotal: number;
  total: number;
  taxByRate: TaxBreakdownRow[];
}

export const computeTotals = (
  items: Partial<InvoiceItem>[] | undefined | null,
): InvoiceTotals => {
  const byRate = new Map<number, TaxBreakdownRow>();
  let subtotal = 0;
  let taxTotal = 0;
  for (const item of items ?? []) {
    if (!item) continue;
    const rate = toNumber(item.gst_rate);
    const taxable = getLineTaxable(item);
    const tax = getLineTax(item);
    subtotal += taxable;
    taxTotal += tax;
    const row = byRate.get(rate) ?? { rate, taxable: 0, tax: 0 };
    byRate.set(rate, {
      rate,
      taxable: roundMoney(row.taxable + taxable),
      tax: roundMoney(row.tax + tax),
    });
  }
  return {
    subtotal: roundMoney(subtotal),
    taxTotal: roundMoney(taxTotal),
    total: roundMoney(subtotal + taxTotal),
    taxByRate: [...byRate.values()]
      .filter((row) => row.rate > 0)
      .sort((a, b) => a.rate - b.rate),
  };
};

export interface TaxLine {
  label: string;
  amount: number;
}

/**
 * Splits GST into the lines printed on an Indian tax invoice:
 * CGST + SGST (half rate each) within a state, IGST across states.
 */
export const getTaxLines = (
  taxByRate: TaxBreakdownRow[],
  taxMode: TaxMode,
): TaxLine[] =>
  taxByRate.flatMap(({ rate, tax }) => {
    if (taxMode === "inter") {
      return [{ label: `IGST @ ${rate}%`, amount: tax }];
    }
    const half = roundMoney(tax / 2);
    return [
      { label: `CGST @ ${rate / 2}%`, amount: half },
      { label: `SGST @ ${rate / 2}%`, amount: roundMoney(tax - half) },
    ];
  });

/** Normalises form values (strings from inputs) into a clean item list. */
export const sanitizeItems = (
  items: Partial<InvoiceItem>[] | undefined | null,
): InvoiceItem[] =>
  (items ?? [])
    .filter((item) => item && (item.description ?? "").trim() !== "")
    .map((item) => ({
      description: (item.description ?? "").trim(),
      hsn_sac: (item.hsn_sac ?? "").trim(),
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unit_price),
      gst_rate: toNumber(item.gst_rate),
    }));

const pad = (value: number) => String(value).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/** Same state as the issuer: CGST + SGST; otherwise IGST. */
export const getTaxModeForState = (
  clientState: string | undefined | null,
  homeState: string,
): TaxMode =>
  !clientState || clientState.trim().toLowerCase() === homeState.toLowerCase()
    ? "intra"
    : "inter";

export const getStatusChoices = (type: InvoiceType): string[] =>
  type === "quote" ? QUOTE_STATUSES : INVOICE_STATUSES;

/**
 * Stored status, or a derived one: overdue/expired once the due date passes,
 * partially paid while an invoice has some payments but is not yet due.
 */
export const getDisplayStatus = (
  invoice: Pick<Invoice, "type" | "status" | "due_date" | "amount_paid">,
  today: Date = new Date(),
): string => {
  const isPastDue = !!invoice.due_date && invoice.due_date < toISODate(today);
  if (invoice.status !== "sent") return invoice.status;
  if (isPastDue) return invoice.type === "invoice" ? "overdue" : "expired";
  return invoice.type === "invoice" && Number(invoice.amount_paid) > 0
    ? "partially_paid"
    : invoice.status;
};

/** Money received on an invoice, counting older ones marked paid by hand. */
export const getAmountReceived = (
  invoice: Pick<Invoice, "type" | "status" | "total" | "amount_paid">,
): number => {
  if (invoice.type !== "invoice") return 0;
  return invoice.status === "paid"
    ? Number(invoice.total)
    : Number(invoice.amount_paid ?? 0);
};

/** What the client still owes on an invoice; nothing on quotes or paid ones. */
export const getBalanceDue = (
  invoice: Pick<Invoice, "type" | "status" | "total" | "amount_paid">,
): number => {
  if (invoice.type !== "invoice" || invoice.status !== "sent") return 0;
  return Math.max(
    0,
    roundMoney(Number(invoice.total) - Number(invoice.amount_paid ?? 0)),
  );
};

/** Next number in the QT-2026-0001 / INV-2026-0001 series for the given year. */
export const getNextDocumentNumber = (
  type: InvoiceType,
  existingNumbers: string[],
  date: Date = new Date(),
): string => {
  const prefix = `${NUMBER_PREFIX[type]}-${date.getFullYear()}-`;
  const lastSequence = existingNumbers
    .filter((value) => value?.startsWith(prefix))
    .map((value) => parseInt(value.slice(prefix.length), 10))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(lastSequence + 1).padStart(4, "0")}`;
};

export const formatMoney = (amount: number, currency: string): string =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(amount));

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const twoDigitWords = (value: number): string =>
  value < 20
    ? ONES[value]
    : [TENS[Math.floor(value / 10)], ONES[value % 10]]
        .filter(Boolean)
        .join(" ");

const threeDigitWords = (value: number): string => {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", twoDigitWords(rest)]
    .filter(Boolean)
    .join(" ");
};

/** Integer to words using the Indian system (thousand, lakh, crore). */
export const integerToIndianWords = (value: number): string => {
  if (value === 0) return "Zero";
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1000);
  const rest = value % 1000;
  return [
    crore ? `${integerToIndianWords(crore)} Crore` : "",
    lakh ? `${twoDigitWords(lakh)} Lakh` : "",
    thousand ? `${twoDigitWords(thousand)} Thousand` : "",
    threeDigitWords(rest),
  ]
    .filter(Boolean)
    .join(" ");
};

/** "Rupees One Lakh Eighteen Thousand and Fifty Paise Only" */
export const amountInRupeeWords = (amount: number): string => {
  const totalPaise = Math.round(toNumber(amount) * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const paiseWords = paise ? ` and ${twoDigitWords(paise)} Paise` : "";
  return `Rupees ${integerToIndianWords(rupees)}${paiseWords} Only`;
};
