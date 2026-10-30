import type { Invoice } from "../types";
import { buildZohoInvoicesCsv, toZohoStateCode } from "./zohoExport";

const invoice = (overrides: Partial<Invoice>): Invoice =>
  ({
    id: 1,
    type: "invoice",
    number: "INV-2026-0001",
    status: "sent",
    company_id: 1,
    issue_date: "2026-10-01",
    due_date: "2026-10-16",
    tax_mode: "inter",
    items: [
      {
        description: "Website design",
        hsn_sac: "998314",
        quantity: 1,
        unit_price: 100000,
        gst_rate: 18,
      },
      {
        description: "Hosting, 1 year",
        quantity: 1,
        unit_price: 12000,
        gst_rate: 18,
      },
    ],
    notes: "Thanks for your business",
    subtotal: 112000,
    tax_total: 20160,
    total: 132160,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  }) as Invoice;

describe("toZohoStateCode", () => {
  it("maps state names to Zoho's two-letter codes", () => {
    expect(toZohoStateCode("Tamil Nadu")).toBe("TN");
    expect(toZohoStateCode(" maharashtra ")).toBe("MH");
    expect(toZohoStateCode("KA")).toBe("KA");
    expect(toZohoStateCode(undefined)).toBe("KA");
  });
});

describe("buildZohoInvoicesCsv", () => {
  it("writes one row per line item and skips quotes", () => {
    const csv = buildZohoInvoicesCsv(
      [invoice({}), invoice({ id: 2, type: "quote", number: "QT-2026-0001" })],
      [
        {
          id: 1,
          name: "Rao Logistics, Chennai",
          state_abbr: "Tamil Nadu",
          tax_identifier: "33ABCDE1234F1Z5",
        },
      ],
      "INR",
    );
    const lines = csv.split("\r\n");

    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(
      'INV-2026-0001,2026-10-01,2026-10-16,Sent,"Rao Logistics, Chennai",business_gst,33ABCDE1234F1Z5,TN,INR,Website design,998314,1,100000,18,Thanks for your business',
    );
    expect(lines[2]).toContain('"Hosting, 1 year"');
  });

  it("treats a client without a GSTIN as a consumer and defuses formulas", () => {
    const csv = buildZohoInvoicesCsv(
      [
        invoice({
          items: [
            {
              description: "=HYPERLINK(1)",
              quantity: 1,
              unit_price: 5,
              gst_rate: 0,
            },
          ],
        }),
      ],
      [{ id: 1, name: "Asha", state_abbr: "", tax_identifier: "" }],
      "INR",
    );

    expect(csv.split("\r\n")[1]).toContain("consumer,,KA,INR,'=HYPERLINK(1)");
  });
});
