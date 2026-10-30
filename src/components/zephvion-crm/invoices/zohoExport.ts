import type { Company, Invoice } from "../types";
import { SELLER_HOME_STATE } from "./sellerDetails";

/**
 * Invoices as a Zoho Books "Import Invoices" CSV: one row per line item,
 * rows of the same invoice sharing its number. Zoho maps the columns on
 * import, so the headers follow its own field names.
 */

// Zoho Books' place-of-supply codes for Indian states and union territories
const STATE_CODES: Record<string, string> = {
  "andaman and nicobar islands": "AN",
  "andhra pradesh": "AP",
  "arunachal pradesh": "AR",
  assam: "AS",
  bihar: "BR",
  chandigarh: "CH",
  chhattisgarh: "CG",
  "dadra and nagar haveli and daman and diu": "DN",
  delhi: "DL",
  goa: "GA",
  gujarat: "GJ",
  haryana: "HR",
  "himachal pradesh": "HP",
  "jammu and kashmir": "JK",
  jharkhand: "JH",
  karnataka: "KA",
  kerala: "KL",
  ladakh: "LA",
  lakshadweep: "LD",
  "madhya pradesh": "MP",
  maharashtra: "MH",
  manipur: "MN",
  meghalaya: "ML",
  mizoram: "MZ",
  nagaland: "NL",
  odisha: "OD",
  puducherry: "PY",
  punjab: "PB",
  rajasthan: "RJ",
  sikkim: "SK",
  "tamil nadu": "TN",
  telangana: "TS",
  tripura: "TR",
  "uttar pradesh": "UP",
  uttarakhand: "UK",
  "west bengal": "WB",
};

export const toZohoStateCode = (state: string | undefined): string => {
  const cleaned = (state ?? "").trim();
  if (/^[A-Z]{2}$/.test(cleaned)) return cleaned;
  return (
    STATE_CODES[cleaned.toLowerCase()] ??
    STATE_CODES[SELLER_HOME_STATE.toLowerCase()]
  );
};

const STATUS_FOR_ZOHO: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  cancelled: "Void",
};

export const ZOHO_HEADERS = [
  "Invoice Number",
  "Invoice Date",
  "Due Date",
  "Invoice Status",
  "Customer Name",
  "GST Treatment",
  "GST Identification Number (GSTIN)",
  "Place of Supply",
  "Currency Code",
  "Item Name",
  "HSN/SAC",
  "Quantity",
  "Item Price",
  "Item Tax %",
  "Notes",
];

const csvCell = (value: string | number | null | undefined): string => {
  const text = value == null ? "" : String(value);
  // Stop spreadsheet apps treating a cell as a formula
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const buildZohoInvoicesCsv = (
  invoices: Invoice[],
  companies: Pick<Company, "id" | "name" | "state_abbr" | "tax_identifier">[],
  currency: string,
): string => {
  const companiesById = new Map(
    companies.map((company) => [String(company.id), company]),
  );
  const rows = invoices
    .filter((invoice) => invoice.type === "invoice")
    .flatMap((invoice) => {
      const company = companiesById.get(String(invoice.company_id));
      const gstin = company?.tax_identifier?.trim() ?? "";
      return invoice.items.map((item) => [
        invoice.number,
        invoice.issue_date,
        invoice.due_date,
        STATUS_FOR_ZOHO[invoice.status] ?? "Sent",
        company?.name ?? "",
        gstin ? "business_gst" : "consumer",
        gstin,
        toZohoStateCode(company?.state_abbr),
        currency,
        item.description,
        item.hsn_sac ?? "",
        item.quantity,
        item.unit_price,
        item.gst_rate,
        invoice.notes ?? "",
      ]);
    });
  return [ZOHO_HEADERS, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
};
