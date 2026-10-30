import type { Invoice } from "../types";
import { computeAgeing, getAgeingBucket, settleInvoice } from "./billingModel";

const TODAY = new Date("2026-10-30T06:00:00.000Z");

const invoice = (overrides: Partial<Invoice>): Invoice =>
  ({
    id: 1,
    type: "invoice",
    number: "INV-2026-0001",
    status: "sent",
    company_id: 1,
    issue_date: "2026-10-01",
    due_date: "2026-10-16",
    tax_mode: "intra",
    items: [],
    subtotal: 100000,
    tax_total: 18000,
    total: 118000,
    amount_paid: 0,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  }) as Invoice;

describe("settleInvoice", () => {
  it("keeps a partly paid invoice open", () => {
    expect(
      settleInvoice(invoice({}), [
        { amount: 50000, tds_amount: 0, paid_on: "2026-10-10" },
      ]),
    ).toEqual({ amount_paid: 50000, status: "sent", paid_at: undefined });
  });

  it("marks it paid once payments plus TDS cover the total", () => {
    expect(
      settleInvoice(invoice({}), [
        { amount: 50000, tds_amount: 0, paid_on: "2026-10-10" },
        { amount: 56200, tds_amount: 11800, paid_on: "2026-10-20" },
      ]),
    ).toEqual({
      amount_paid: 118000,
      status: "paid",
      paid_at: "2026-10-20T00:00:00.000Z",
    });
  });

  it("reopens a paid invoice when a payment is removed", () => {
    expect(
      settleInvoice(invoice({ status: "paid", paid_at: "2026-10-20" }), [
        { amount: 50000, tds_amount: 0, paid_on: "2026-10-10" },
      ]),
    ).toEqual({ amount_paid: 50000, status: "sent", paid_at: null });
  });

  it("never marks a draft paid", () => {
    expect(
      settleInvoice(invoice({ status: "draft" }), [
        { amount: 118000, tds_amount: 0, paid_on: "2026-10-10" },
      ]).status,
    ).toBe("draft");
  });
});

describe("getAgeingBucket", () => {
  it("groups by days past the due date", () => {
    expect(getAgeingBucket("2026-11-05", TODAY)).toBe("current");
    expect(getAgeingBucket("2026-10-30", TODAY)).toBe("current");
    expect(getAgeingBucket("2026-10-29", TODAY)).toBe("days_1_30");
    expect(getAgeingBucket("2026-09-20", TODAY)).toBe("days_31_60");
    expect(getAgeingBucket("2026-08-15", TODAY)).toBe("days_61_90");
    expect(getAgeingBucket("2026-05-01", TODAY)).toBe("days_90_plus");
  });
});

describe("computeAgeing", () => {
  it("adds up balances per client, biggest debtor first", () => {
    const { clients, totals } = computeAgeing(
      [
        invoice({ id: 1, company_id: 1, amount_paid: 18000 }),
        invoice({ id: 2, company_id: 1, due_date: "2026-11-15", total: 50000 }),
        invoice({
          id: 3,
          company_id: 2,
          due_date: "2026-07-01",
          total: 300000,
        }),
        invoice({ id: 4, company_id: 2, status: "paid" }),
        invoice({ id: 5, company_id: 2, status: "draft" }),
        invoice({ id: 6, company_id: 3, type: "quote" }),
      ],
      [
        { id: 1, name: "Saffron Stays" },
        { id: 2, name: "Rao Logistics" },
      ],
      TODAY,
    );

    expect(clients.map((client) => client.companyName)).toEqual([
      "Rao Logistics",
      "Saffron Stays",
    ]);
    expect(clients[1]).toMatchObject({
      current: 50000,
      days_1_30: 100000,
      total: 150000,
      invoiceCount: 2,
      oldestDueDate: "2026-10-16",
    });
    expect(clients[0].days_90_plus).toBe(300000);
    expect(totals.total).toBe(450000);
  });
});
