import type { Invoice, Project, ProjectMilestone, TimeEntry } from "../types";
import {
  defaultMilestones,
  milestoneInvoicePrefill,
  projectFromDeal,
  summarizeProject,
} from "./projectModel";

const TODAY = new Date("2026-10-30T06:00:00.000Z");

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 1,
  name: "Saffron Stays website",
  company_id: 7,
  deal_id: 3,
  status: "active",
  start_date: "2026-10-01",
  due_date: "2026-12-15",
  budget: 300000,
  budget_hours: 100,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const milestone = (overrides: Partial<ProjectMilestone>): ProjectMilestone => ({
  id: 1,
  project_id: 1,
  name: "Milestone",
  amount: 100000,
  status: "pending",
  position: 0,
  created_at: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const entry = (hours: number, billable = true): TimeEntry => ({
  id: hours,
  project_id: 1,
  sales_id: 0,
  spent_on: "2026-10-20",
  hours,
  billable,
  created_at: "2026-10-20T00:00:00.000Z",
});

const invoice = (overrides: Partial<Invoice>): Invoice =>
  ({
    id: 1,
    type: "invoice",
    status: "sent",
    total: 118000,
    amount_paid: 0,
    ...overrides,
  }) as Invoice;

describe("summarizeProject", () => {
  it("measures progress by milestone value and finds what is ready to bill", () => {
    const summary = summarizeProject(
      project(),
      [
        milestone({ id: 1, amount: 90000, status: "done" }),
        milestone({ id: 2, amount: 150000, status: "done" }),
        milestone({ id: 3, amount: 60000 }),
      ],
      [entry(40), entry(12, false)],
      [
        invoice({ id: 1, milestone_id: 1, total: 106200, status: "paid" }),
        invoice({ id: 2, status: "cancelled", milestone_id: 2 }),
        invoice({ id: 3, status: "draft", milestone_id: 3, total: 70800 }),
      ],
      TODAY,
    );

    expect(summary.progress).toBeCloseTo(0.8);
    expect(summary.milestonesDone).toBe(2);
    expect(summary.hoursLogged).toBe(52);
    expect(summary.billableHours).toBe(40);
    expect(summary.hoursUsed).toBeCloseTo(0.52);
    expect(summary.invoiced).toBe(106200);
    expect(summary.received).toBe(106200);
    expect(summary.readyToBill.map((item) => item.id)).toEqual([2]);
    expect(summary.health).toBe("on_track");
  });

  it("flags projects past their date or nearly out of hours", () => {
    expect(
      summarizeProject(project({ due_date: "2026-10-01" }), [], [], [], TODAY)
        .health,
    ).toBe("late");
    expect(summarizeProject(project(), [], [entry(95)], [], TODAY).health).toBe(
      "at_risk",
    );
    expect(
      summarizeProject(
        project({ status: "completed", due_date: "2026-10-01" }),
        [],
        [],
        [],
        TODAY,
      ).health,
    ).toBe("closed");
  });

  it("has no hours share without an hours budget", () => {
    expect(
      summarizeProject(project({ budget_hours: 0 }), [], [entry(5)], [], TODAY)
        .hoursUsed,
    ).toBeNull();
  });
});

describe("defaultMilestones", () => {
  it("splits the budget 30/50/20 and always adds up", () => {
    const milestones = defaultMilestones(100001);

    expect(milestones.map((item) => item.amount)).toEqual([
      30000.3, 50000.5, 20000.2,
    ]);
    expect(
      milestones.reduce((total, item) => total + item.amount, 0),
    ).toBeCloseTo(100001);
  });
});

describe("projectFromDeal", () => {
  it("carries the deal over with a 60-day plan", () => {
    expect(
      projectFromDeal(
        {
          id: 3,
          name: "Website",
          company_id: 7,
          amount: 250000,
          sales_id: 2,
          description: "Booking site",
        },
        TODAY,
      ),
    ).toMatchObject({
      deal_id: 3,
      company_id: 7,
      budget: 250000,
      start_date: "2026-10-30",
      due_date: "2026-12-29",
      status: "planning",
    });
  });
});

describe("milestoneInvoicePrefill", () => {
  it("drafts an invoice for the milestone, linked to the project", () => {
    const prefill = milestoneInvoicePrefill(
      project(),
      milestone({ id: 9, name: "Delivery", amount: 150000 }),
      TODAY,
    );

    expect(prefill).toMatchObject({
      type: "invoice",
      status: "draft",
      company_id: 7,
      deal_id: 3,
      project_id: 1,
      milestone_id: 9,
    });
    expect(prefill.items?.[0]).toMatchObject({
      description: "Saffron Stays website: Delivery",
      unit_price: 150000,
      gst_rate: 18,
    });
  });
});
