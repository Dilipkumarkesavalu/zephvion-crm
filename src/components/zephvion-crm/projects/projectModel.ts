import type {
  Deal,
  Invoice,
  Project,
  ProjectMilestone,
  TimeEntry,
} from "../types";
import { getInvoiceDefaults } from "../invoices/invoiceDefaults";
import {
  DEFAULT_GST_RATE,
  getAmountReceived,
  roundMoney,
  toISODate,
} from "../invoices/invoiceModel";

export type ProjectHealth = "on_track" | "at_risk" | "late" | "closed";

/** Hours used past this share of the budget make a project "at risk". */
const AT_RISK_HOURS_SHARE = 0.9;

export interface ProjectSummary {
  milestonesDone: number;
  milestonesTotal: number;
  /** Share of milestone value delivered, 0 to 1 */
  progress: number;
  hoursLogged: number;
  billableHours: number;
  /** Share of budgeted hours used; null without a budget */
  hoursUsed: number | null;
  invoiced: number;
  received: number;
  /** Delivered milestones with no invoice yet */
  readyToBill: ProjectMilestone[];
  health: ProjectHealth;
}

const sum = (values: number[]) =>
  roundMoney(values.reduce((total, value) => total + (Number(value) || 0), 0));

export const getProjectHealth = (
  project: Pick<Project, "status" | "due_date">,
  hoursUsed: number | null,
  today: Date = new Date(),
): ProjectHealth => {
  if (project.status === "completed" || project.status === "cancelled") {
    return "closed";
  }
  if (project.due_date && project.due_date < toISODate(today)) return "late";
  if (hoursUsed != null && hoursUsed >= AT_RISK_HOURS_SHARE) return "at_risk";
  return "on_track";
};

export const summarizeProject = (
  project: Project,
  milestones: ProjectMilestone[],
  timeEntries: TimeEntry[],
  invoices: Invoice[],
  today: Date = new Date(),
): ProjectSummary => {
  const done = milestones.filter((milestone) => milestone.status === "done");
  const totalValue = sum(milestones.map((milestone) => milestone.amount));
  const progress = milestones.length
    ? totalValue > 0
      ? sum(done.map((milestone) => milestone.amount)) / totalValue
      : done.length / milestones.length
    : 0;
  const hoursLogged = sum(timeEntries.map((entry) => entry.hours));
  const hoursUsed =
    Number(project.budget_hours) > 0
      ? hoursLogged / Number(project.budget_hours)
      : null;
  const liveInvoices = invoices.filter(
    (invoice) => invoice.type === "invoice" && invoice.status !== "cancelled",
  );
  const issued = liveInvoices.filter((invoice) => invoice.status !== "draft");
  const billedMilestones = new Set(
    liveInvoices
      .map((invoice) => invoice.milestone_id)
      .filter((id) => id != null)
      .map(String),
  );

  return {
    milestonesDone: done.length,
    milestonesTotal: milestones.length,
    progress,
    hoursLogged,
    billableHours: sum(
      timeEntries.filter((entry) => entry.billable).map((entry) => entry.hours),
    ),
    hoursUsed,
    // Drafts mark a milestone as billed but are not invoiced until sent
    invoiced: sum(issued.map((invoice) => invoice.total)),
    received: sum(issued.map(getAmountReceived)),
    readyToBill: done.filter(
      (milestone) =>
        Number(milestone.amount) > 0 &&
        !billedMilestones.has(String(milestone.id)),
    ),
    health: getProjectHealth(project, hoursUsed, today),
  };
};

/** Common Indian agency terms: 30% advance, 50% on delivery, 20% at handover. */
const DEFAULT_SPLIT = [
  { name: "Advance and kick-off", share: 0.3 },
  { name: "Delivery", share: 0.5 },
  { name: "Handover and sign-off", share: 0.2 },
];

export const defaultMilestones = (
  budget: number,
): Array<Pick<ProjectMilestone, "name" | "amount" | "position" | "status">> => {
  const amounts = DEFAULT_SPLIT.map(({ share }) => roundMoney(budget * share));
  // Put any rounding difference on the last milestone so they add up
  amounts[amounts.length - 1] = roundMoney(budget - sum(amounts.slice(0, -1)));
  return DEFAULT_SPLIT.map(({ name }, index) => ({
    name,
    amount: amounts[index],
    position: index,
    status: "pending",
  }));
};

/** A new project for a won deal, due on its expected closing date or in 60 days. */
export const projectFromDeal = (
  deal: Pick<
    Deal,
    "id" | "name" | "company_id" | "amount" | "sales_id" | "description"
  >,
  today: Date = new Date(),
): Partial<Project> => {
  const due = new Date(today);
  due.setDate(due.getDate() + 60);
  return {
    name: deal.name,
    company_id: deal.company_id,
    deal_id: deal.id,
    sales_id: deal.sales_id,
    status: "planning",
    start_date: toISODate(today),
    due_date: toISODate(due),
    budget: Number(deal.amount) || 0,
    budget_hours: 0,
    description: deal.description ?? "",
  };
};

/** Values for a new invoice billing one milestone (opens the invoice form). */
export const milestoneInvoicePrefill = (
  project: Pick<Project, "id" | "name" | "company_id" | "deal_id">,
  milestone: Pick<ProjectMilestone, "id" | "name" | "amount">,
  today: Date = new Date(),
): Partial<Invoice> => ({
  ...getInvoiceDefaults("invoice", today),
  company_id: project.company_id,
  deal_id: project.deal_id ?? null,
  project_id: project.id,
  milestone_id: milestone.id,
  items: [
    {
      description: `${project.name}: ${milestone.name}`,
      hsn_sac: "998314",
      quantity: 1,
      unit_price: Number(milestone.amount) || 0,
      gst_rate: DEFAULT_GST_RATE,
    },
  ],
});
