import type { Identifier } from "ra-core";

import {
  getAmountReceived,
  getBalanceDue,
  getDisplayStatus,
  roundMoney,
} from "../invoices/invoiceModel";
import type {
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Invoice,
  Task,
} from "../types";

export type TimelineKind = "deal" | "invoice" | "task" | "note" | "contact";

export const TIMELINE_KINDS: TimelineKind[] = [
  "deal",
  "invoice",
  "task",
  "note",
  "contact",
];

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  /** Translation key under crm.client360.events */
  event: string;
  date: string;
  title: string;
  /** Extra values for the event's translation (amount, stage, ...) */
  values?: Record<string, string | number>;
  link: string;
  sales_id?: Identifier | null;
}

export interface ClientData {
  contacts: Contact[];
  deals: Deal[];
  invoices: Invoice[];
  tasks: Task[];
  contactNotes: ContactNote[];
  dealNotes: DealNote[];
}

export interface ClientSummary {
  openPipeline: number;
  openDeals: number;
  wonValue: number;
  wonDeals: number;
  invoiced: number;
  paid: number;
  outstanding: number;
  overdue: number;
  openTasks: number;
  overdueTasks: number;
  lastActivity: string | null;
}

const CLOSED_STAGES = ["won", "lost"];

const isLiveInvoice = (invoice: Invoice) =>
  invoice.type === "invoice" &&
  invoice.status !== "draft" &&
  invoice.status !== "cancelled";

const sum = (values: number[]) =>
  roundMoney(values.reduce((total, value) => total + (value || 0), 0));

/** Money and workload figures for the client 360 header. */
export const buildClientSummary = (
  data: ClientData,
  today: Date = new Date(),
): ClientSummary => {
  const activeDeals = data.deals.filter((deal) => !deal.archived_at);
  const openDeals = activeDeals.filter(
    (deal) => !CLOSED_STAGES.includes(deal.stage),
  );
  const wonDeals = data.deals.filter((deal) => deal.stage === "won");
  const invoices = data.invoices.filter(isLiveInvoice);
  const unpaid = invoices.filter((invoice) => invoice.status !== "paid");
  const overdue = unpaid.filter(
    (invoice) => getDisplayStatus(invoice, today) === "overdue",
  );
  const openTasks = data.tasks.filter((task) => !task.done_date);
  const now = today.toISOString();
  const timeline = buildClientTimeline(data);

  return {
    openPipeline: sum(openDeals.map((deal) => deal.amount)),
    openDeals: openDeals.length,
    wonValue: sum(wonDeals.map((deal) => deal.amount)),
    wonDeals: wonDeals.length,
    invoiced: sum(invoices.map((invoice) => invoice.total)),
    paid: sum(invoices.map(getAmountReceived)),
    outstanding: sum(unpaid.map(getBalanceDue)),
    overdue: sum(overdue.map(getBalanceDue)),
    openTasks: openTasks.length,
    overdueTasks: openTasks.filter((task) => task.due_date < now).length,
    // Upcoming task due dates are not activity
    lastActivity: timeline.find((event) => event.date <= now)?.date ?? null,
  };
};

const contactName = (contact?: Contact) =>
  contact ? `${contact.first_name} ${contact.last_name ?? ""}`.trim() : "";

/**
 * Everything that happened with a client, newest first: deals, quotes and
 * invoices, tasks, notes and new contacts.
 */
export const buildClientTimeline = (data: ClientData): TimelineEvent[] => {
  const contactsById = new Map(
    data.contacts.map((contact) => [String(contact.id), contact]),
  );
  const dealsById = new Map(data.deals.map((deal) => [String(deal.id), deal]));
  const events: TimelineEvent[] = [];

  for (const contact of data.contacts) {
    if (!contact.first_seen) continue;
    events.push({
      id: `contact.${contact.id}`,
      kind: "contact",
      event: "contact_added",
      date: contact.first_seen,
      title: contactName(contact),
      values: { title: contact.title ?? "" },
      link: `/contacts/${contact.id}/show`,
      sales_id: contact.sales_id,
    });
  }

  for (const deal of data.deals) {
    const link = `/deals/${deal.id}/show`;
    events.push({
      id: `deal.${deal.id}.created`,
      kind: "deal",
      event: "deal_created",
      date: deal.created_at,
      title: deal.name,
      values: { amount: deal.amount },
      link,
      sales_id: deal.sales_id,
    });
    if (CLOSED_STAGES.includes(deal.stage) && deal.updated_at) {
      events.push({
        id: `deal.${deal.id}.${deal.stage}`,
        kind: "deal",
        event: deal.stage === "won" ? "deal_won" : "deal_lost",
        date: deal.updated_at,
        title: deal.name,
        values: { amount: deal.amount },
        link,
        sales_id: deal.sales_id,
      });
    }
  }

  for (const invoice of data.invoices) {
    const link = `/invoices/${invoice.id}/show`;
    events.push({
      id: `invoice.${invoice.id}.issued`,
      kind: "invoice",
      event: invoice.type === "quote" ? "quote_issued" : "invoice_issued",
      date: invoice.issue_date || invoice.created_at,
      title: invoice.number,
      values: { amount: invoice.total, status: invoice.status },
      link,
      sales_id: invoice.sales_id,
    });
    if (invoice.type === "invoice" && invoice.paid_at) {
      events.push({
        id: `invoice.${invoice.id}.paid`,
        kind: "invoice",
        event: "invoice_paid",
        date: invoice.paid_at,
        title: invoice.number,
        values: { amount: invoice.total },
        link,
        sales_id: invoice.sales_id,
      });
    }
  }

  for (const task of data.tasks) {
    const contact = contactsById.get(String(task.contact_id));
    events.push({
      id: `task.${task.id}`,
      kind: "task",
      event: task.done_date ? "task_done" : "task_due",
      date: task.done_date || task.due_date,
      title: task.text,
      values: { contact: contactName(contact), type: task.type },
      link: `/contacts/${task.contact_id}/show`,
      sales_id: task.sales_id,
    });
  }

  for (const note of data.contactNotes) {
    const contact = contactsById.get(String(note.contact_id));
    events.push({
      id: `contactNote.${note.id}`,
      kind: "note",
      event: "contact_note",
      date: note.date,
      title: note.text,
      values: { target: contactName(contact) },
      link: `/contacts/${note.contact_id}/show`,
      sales_id: note.sales_id,
    });
  }

  for (const note of data.dealNotes) {
    const deal = dealsById.get(String(note.deal_id));
    events.push({
      id: `dealNote.${note.id}`,
      kind: "note",
      event: "deal_note",
      date: note.date,
      title: note.text,
      values: { target: deal?.name ?? "" },
      link: `/deals/${note.deal_id}/show`,
      sales_id: note.sales_id,
    });
  }

  return events
    .filter((event) => !!event.date)
    .sort((a, b) => b.date.localeCompare(a.date));
};
