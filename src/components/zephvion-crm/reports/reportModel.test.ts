import type {
  Deal,
  InvoicePayment,
  Lead,
  Sale,
  Ticket,
  TimeEntry,
} from "../types";
import {
  collectionsByMonth,
  getPeriodStart,
  leadsBySource,
  salesByPerson,
  summarizeSupport,
  timeByPerson,
  toCsv,
} from "./reportModel";

const TODAY = new Date(2026, 9, 30);
const sales = [
  { id: 1, first_name: "Bhavani", last_name: "" },
  { id: 2, first_name: "Manjunath", last_name: "Poojary" },
] as Sale[];

describe("getPeriodStart", () => {
  it("starts months, quarters and India's April financial year", () => {
    expect(getPeriodStart("month", TODAY)).toEqual(new Date(2026, 9, 1));
    expect(getPeriodStart("quarter", TODAY)).toEqual(new Date(2026, 7, 1));
    expect(getPeriodStart("financial_year", TODAY)?.getMonth()).toBe(3);
    expect(getPeriodStart("all", TODAY)).toBeNull();
  });
});

describe("salesByPerson", () => {
  const deal = (overrides: Partial<Deal>) =>
    ({
      id: 1,
      stage: "won",
      amount: 100000,
      sales_id: 1,
      updated_at: "2026-10-10T00:00:00.000Z",
      ...overrides,
    }) as Deal;

  it("counts deals closed in the period and open pipeline per person", () => {
    const rows = salesByPerson(
      [
        deal({ id: 1 }),
        deal({ id: 2, stage: "lost" }),
        deal({ id: 3, stage: "won", updated_at: "2025-01-01T00:00:00.000Z" }),
        deal({ id: 4, stage: "proposal-sent", amount: 50000 }),
        deal({ id: 5, sales_id: 2, amount: 300000 }),
        deal({ id: 6, archived_at: "2026-10-01" }),
      ],
      sales,
      new Date(2026, 9, 1),
    );

    expect(rows.map((row) => row.person)).toEqual([
      "Manjunath Poojary",
      "Bhavani",
    ]);
    expect(rows[1]).toMatchObject({
      won: 1,
      wonValue: 100000,
      lost: 1,
      winRate: 0.5,
      openValue: 50000,
    });
  });
});

describe("leadsBySource", () => {
  it("measures conversion per source", () => {
    const lead = (source: string, status: string, score: number) =>
      ({
        source,
        status,
        score,
        created_at: "2026-10-10T00:00:00.000Z",
      }) as Lead;
    const rows = leadsBySource(
      [
        lead("website", "converted", 80),
        lead("website", "new", 40),
        lead("website", "disqualified", 30),
        lead("referral", "converted", 90),
      ],
      null,
    );

    expect(rows[0]).toEqual({
      source: "website",
      leads: 3,
      converted: 1,
      conversionRate: 1 / 3,
      averageScore: 50,
    });
    expect(rows[1].conversionRate).toBe(1);
  });
});

describe("summarizeSupport", () => {
  it("measures replies and fixes against their deadlines", () => {
    const ticket = (overrides: Partial<Ticket>) =>
      ({
        priority: "normal",
        status: "open",
        created_at: "2026-10-10T09:00:00.000Z",
        first_response_due: "2026-10-10T17:00:00.000Z",
        resolve_due: "2026-10-13T09:00:00.000Z",
        ...overrides,
      }) as Ticket;
    const summary = summarizeSupport(
      [
        ticket({ first_responded_at: "2026-10-10T10:00:00.000Z" }),
        ticket({
          priority: "urgent",
          status: "resolved",
          first_responded_at: "2026-10-10T20:00:00.000Z",
          resolved_at: "2026-10-11T09:00:00.000Z",
        }),
        ticket({}),
      ],
      null,
    );

    expect(summary).toMatchObject({
      opened: 3,
      stillOpen: 2,
      responseOnTime: 0.5,
      resolvedOnTime: 1,
      averageFirstResponseHours: 6,
      byPriority: { normal: 2, urgent: 1 },
    });
  });
});

describe("timeByPerson", () => {
  it("adds up hours and the billable share", () => {
    const entry = (sales_id: number, hours: number, billable: boolean) =>
      ({ sales_id, hours, billable, spent_on: "2026-10-12" }) as TimeEntry;
    const rows = timeByPerson(
      [entry(1, 6, true), entry(1, 2, false), entry(2, 3, true)],
      sales,
      null,
    );

    expect(rows[0]).toEqual({
      person: "Bhavani",
      hours: 8,
      billableHours: 6,
      billableShare: 0.75,
    });
  });
});

describe("collectionsByMonth", () => {
  it("groups payments and TDS by month", () => {
    const payment = (paid_on: string, amount: number, tds_amount = 0) =>
      ({ paid_on, amount, tds_amount }) as InvoicePayment;
    expect(
      collectionsByMonth(
        [
          payment("2026-10-02", 50000),
          payment("2026-10-20", 56200, 11800),
          payment("2026-09-15", 20000),
        ],
        null,
      ),
    ).toEqual([
      { month: "2026-09", received: 20000, tds: 0 },
      { month: "2026-10", received: 106200, tds: 11800 },
    ]);
  });
});

describe("toCsv", () => {
  it("quotes commas and defuses formulas", () => {
    expect(toCsv(["Name", "Value"], [["Rao, Chennai", "=1+1"]])).toBe(
      'Name,Value\r\n"Rao, Chennai",\'=1+1',
    );
  });
});
