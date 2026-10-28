import type { Contact, Deal, Invoice, Task } from "../types";
import {
  buildClientSummary,
  buildClientTimeline,
  type ClientData,
} from "./clientModel";

const TODAY = new Date("2026-10-28T10:00:00.000Z");

const deal = (overrides: Partial<Deal>): Deal =>
  ({
    id: 1,
    name: "Website rebuild",
    company_id: 1,
    contact_ids: [],
    category: "website",
    stage: "proposal-sent",
    description: "",
    amount: 100000,
    created_at: "2026-09-01T09:00:00.000Z",
    updated_at: "2026-09-10T09:00:00.000Z",
    expected_closing_date: "2026-11-30",
    sales_id: 0,
    index: 0,
    ...overrides,
  }) as Deal;

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
    subtotal: 0,
    tax_total: 0,
    total: 11800,
    created_at: "2026-10-01T09:00:00.000Z",
    updated_at: "2026-10-01T09:00:00.000Z",
    ...overrides,
  }) as Invoice;

const task = (overrides: Partial<Task>): Task => ({
  id: 1,
  contact_id: 7,
  type: "Call",
  text: "Follow up",
  due_date: "2026-10-20T00:00:00.000Z",
  ...overrides,
});

const contact = { id: 7, first_name: "Asha", last_name: "Rao" } as Contact;

const data = (overrides: Partial<ClientData>): ClientData => ({
  contacts: [],
  deals: [],
  invoices: [],
  tasks: [],
  contactNotes: [],
  dealNotes: [],
  ...overrides,
});

describe("buildClientSummary", () => {
  it("splits deals into open pipeline and won value, ignoring archived and lost deals", () => {
    const summary = buildClientSummary(
      data({
        deals: [
          deal({ id: 1, amount: 100000 }),
          deal({ id: 2, amount: 50000, stage: "won" }),
          deal({ id: 3, amount: 70000, stage: "lost" }),
          deal({ id: 4, amount: 30000, archived_at: "2026-10-01" }),
        ],
      }),
      TODAY,
    );

    expect(summary.openPipeline).toBe(100000);
    expect(summary.openDeals).toBe(1);
    expect(summary.wonValue).toBe(50000);
  });

  it("counts only issued invoices and flags unpaid ones past due as overdue", () => {
    const summary = buildClientSummary(
      data({
        invoices: [
          invoice({ id: 1, total: 11800 }),
          invoice({ id: 2, total: 5900, status: "paid" }),
          invoice({ id: 3, total: 1000, due_date: "2026-12-01" }),
          invoice({ id: 4, total: 99999, status: "draft" }),
          invoice({ id: 5, total: 88888, type: "quote" }),
        ],
      }),
      TODAY,
    );

    expect(summary.invoiced).toBe(18700);
    expect(summary.paid).toBe(5900);
    expect(summary.outstanding).toBe(12800);
    expect(summary.overdue).toBe(11800);
  });

  it("counts open and overdue tasks and ignores future dates for last activity", () => {
    const summary = buildClientSummary(
      data({
        tasks: [
          task({ id: 1 }),
          task({ id: 2, due_date: "2026-11-05T00:00:00.000Z" }),
          task({ id: 3, done_date: "2026-10-25T00:00:00.000Z" }),
        ],
      }),
      TODAY,
    );

    expect(summary.openTasks).toBe(2);
    expect(summary.overdueTasks).toBe(1);
    expect(summary.lastActivity).toBe("2026-10-25T00:00:00.000Z");
  });
});

describe("buildClientTimeline", () => {
  it("merges every source newest first with links to the record", () => {
    const timeline = buildClientTimeline(
      data({
        contacts: [{ ...contact, first_seen: "2026-08-01T00:00:00.000Z" }],
        deals: [deal({ stage: "won", updated_at: "2026-09-20T00:00:00.000Z" })],
        invoices: [
          invoice({ status: "paid", paid_at: "2026-10-10T00:00:00.000Z" }),
        ],
        tasks: [task({})],
        dealNotes: [
          {
            id: 9,
            deal_id: 1,
            text: "Kick-off done",
            date: "2026-09-05T00:00:00.000Z",
            sales_id: 0,
          },
        ],
      }),
    );

    expect(timeline.map((event) => event.event)).toEqual([
      "task_due",
      "invoice_paid",
      "invoice_issued",
      "deal_won",
      "deal_note",
      "deal_created",
      "contact_added",
    ]);
    expect(timeline[0].values?.contact).toBe("Asha Rao");
    expect(timeline[1].link).toBe("/invoices/1/show");
    expect(timeline[4].values?.target).toBe("Website rebuild");
  });
});
