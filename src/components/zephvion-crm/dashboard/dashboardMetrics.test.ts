import type { Deal, Invoice } from "../types";
import {
  computeKpis,
  computeMonthlyRevenue,
  computePipelineByStage,
  getFinancialYear,
} from "./dashboardMetrics";

const buildDeal = (overrides: Partial<Deal>): Deal =>
  ({
    id: 1,
    name: "Website",
    stage: "lead",
    amount: 0,
    archived_at: undefined,
    ...overrides,
  }) as Deal;

const buildInvoice = (overrides: Partial<Invoice>): Invoice =>
  ({
    id: 1,
    type: "invoice",
    status: "sent",
    total: 0,
    issue_date: "2026-10-01",
    due_date: "2026-10-16",
    paid_at: null,
    ...overrides,
  }) as Invoice;

const today = new Date(2026, 9, 26);

describe("getFinancialYear", () => {
  it("runs from April to March", () => {
    expect(getFinancialYear(new Date(2026, 9, 26)).label).toBe("FY 2026–27");
    expect(getFinancialYear(new Date(2027, 1, 10)).label).toBe("FY 2026–27");
    expect(getFinancialYear(new Date(2026, 2, 31)).label).toBe("FY 2025–26");
  });
});

describe("computeKpis", () => {
  it("sums open pipeline, collections, outstanding and win rate", () => {
    const deals = [
      buildDeal({ stage: "lead", amount: 100 }),
      buildDeal({ stage: "proposal-sent", amount: 200 }),
      buildDeal({ stage: "won", amount: 999 }),
      buildDeal({ stage: "won", amount: 999 }),
      buildDeal({ stage: "lost", amount: 999 }),
      buildDeal({ stage: "lead", amount: 5000, archived_at: "2026-01-01" }),
    ];
    const invoices = [
      buildInvoice({
        status: "paid",
        total: 1000,
        paid_at: "2026-06-01T10:00:00Z",
      }),
      // paid in the previous financial year: not counted
      buildInvoice({
        status: "paid",
        total: 7000,
        paid_at: "2026-03-15T10:00:00Z",
      }),
      buildInvoice({ status: "sent", total: 300, due_date: "2026-11-30" }),
      buildInvoice({ status: "sent", total: 400, due_date: "2026-10-01" }),
      buildInvoice({ type: "quote", status: "sent", total: 9999 }),
    ];

    expect(computeKpis(deals, invoices, today)).toEqual({
      pipelineValue: 300,
      openDeals: 2,
      collectedThisYear: 1000,
      paidInvoicesThisYear: 1,
      outstanding: 700,
      overdue: 400,
      winRate: 2 / 3,
      wonDeals: 2,
    });
  });

  it("reports no win rate before any deal is closed", () => {
    expect(computeKpis([buildDeal({})], [], today).winRate).toBeNull();
  });
});

describe("computeMonthlyRevenue", () => {
  it("buckets invoiced by issue month and collected by payment month", () => {
    const months = computeMonthlyRevenue(
      [
        buildInvoice({
          issue_date: "2026-09-20",
          status: "paid",
          total: 500,
          paid_at: "2026-10-02T09:00:00",
        }),
        buildInvoice({ issue_date: "2026-10-05", status: "sent", total: 200 }),
        buildInvoice({
          issue_date: "2026-10-06",
          status: "draft",
          total: 9999,
        }),
        buildInvoice({ issue_date: "2025-01-01", status: "sent", total: 9999 }),
      ],
      2,
      today,
    );

    expect(months).toEqual([
      { month: "Sept", invoiced: 500, collected: 0 },
      { month: "Oct", invoiced: 200, collected: 500 },
    ]);
  });
});

describe("computePipelineByStage", () => {
  it("lists open stages in order with counts and amounts", () => {
    const stages = [
      { value: "lead", label: "Lead" },
      { value: "proposal-sent", label: "Proposal Sent" },
      { value: "won", label: "Won" },
    ];
    const deals = [
      buildDeal({ stage: "lead", amount: 10 }),
      buildDeal({ stage: "lead", amount: 15 }),
      buildDeal({ stage: "won", amount: 99 }),
    ];

    expect(computePipelineByStage(deals, stages)).toEqual([
      { value: "lead", label: "Lead", count: 2, amount: 25 },
      { value: "proposal-sent", label: "Proposal Sent", count: 0, amount: 0 },
    ]);
  });
});
