import type { Deal } from "../types";
import { computeForecast, getStageProbability, isStaleDeal } from "./forecast";

const STAGES = [
  { value: "lead", label: "Lead" },
  { value: "discovery", label: "Discovery" },
  { value: "proposal-sent", label: "Proposal Sent" },
  { value: "in-negociation", label: "In Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const TODAY = new Date(2026, 9, 28);

const deal = (overrides: Partial<Deal>): Deal =>
  ({
    id: 1,
    name: "Deal",
    company_id: 1,
    contact_ids: [],
    category: "website",
    stage: "proposal-sent",
    description: "",
    amount: 100000,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-25T00:00:00.000Z",
    expected_closing_date: "2026-11-15",
    sales_id: 0,
    index: 0,
    ...overrides,
  }) as Deal;

describe("computeForecast", () => {
  it("weights open deals by stage in their closing month", () => {
    const forecast = computeForecast(
      [
        deal({ id: 1, amount: 100000, stage: "proposal-sent" }),
        deal({ id: 2, amount: 200000, stage: "lead" }),
        deal({
          id: 3,
          amount: 400000,
          stage: "in-negociation",
          expected_closing_date: "2026-12-05",
        }),
      ],
      STAGES,
      TODAY,
    );

    expect(forecast.map((month) => month.month)).toEqual([
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
    ]);
    expect(forecast[1]).toMatchObject({
      weighted: 70000,
      bestCase: 300000,
      count: 2,
    });
    expect(forecast[2]).toMatchObject({ weighted: 300000, count: 1 });
  });

  it("rolls overdue deals into this month and skips closed or archived ones", () => {
    const forecast = computeForecast(
      [
        deal({ id: 1, expected_closing_date: "2026-09-10" }),
        deal({ id: 2, stage: "won" }),
        deal({ id: 3, archived_at: "2026-10-01" }),
        deal({ id: 4, expected_closing_date: "2027-06-01" }),
      ],
      STAGES,
      TODAY,
    );

    expect(forecast[0]).toMatchObject({ weighted: 50000, count: 1 });
    expect(forecast[1].count + forecast[2].count).toBe(0);
  });
});

describe("getStageProbability", () => {
  it("spreads custom stages evenly between 0 and 1", () => {
    const custom = [
      { value: "intro", label: "Intro" },
      { value: "pitch", label: "Pitch" },
      { value: "won", label: "Won" },
    ];
    expect(getStageProbability("intro", custom)).toBeCloseTo(1 / 3);
    expect(getStageProbability("pitch", custom)).toBeCloseTo(2 / 3);
  });
});

describe("isStaleDeal", () => {
  it("flags open deals untouched for two weeks", () => {
    expect(
      isStaleDeal(deal({ updated_at: "2026-10-01T00:00:00.000Z" }), TODAY),
    ).toBe(true);
    expect(isStaleDeal(deal({}), TODAY)).toBe(false);
    expect(
      isStaleDeal(
        deal({ stage: "won", updated_at: "2026-01-01T00:00:00.000Z" }),
        TODAY,
      ),
    ).toBe(false);
  });
});
