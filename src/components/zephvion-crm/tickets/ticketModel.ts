import type { Ticket, TicketPriority, TicketStatus } from "../types";

/** Hours to first response and to resolution; same as public.ticket_sla_hours(). */
export const TICKET_SLA_HOURS: Record<
  TicketPriority,
  { response: number; resolve: number }
> = {
  urgent: { response: 1, resolve: 8 },
  high: { response: 4, resolve: 24 },
  normal: { response: 8, resolve: 72 },
  low: { response: 24, resolve: 120 },
};

export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_client",
];

const HOUR_MS = 60 * 60 * 1000;

export const isTicketOpen = (ticket: Pick<Ticket, "status">) =>
  OPEN_TICKET_STATUSES.includes(ticket.status);

export type TicketDeadline =
  | { kind: "none" }
  | { kind: "response" | "resolve"; minutes: number; isLate: boolean };

/**
 * The deadline that matters now: first response until someone has replied,
 * then resolution. Waiting on the client pauses neither, as in most desks
 * the clock is the team's promise.
 */
export const getTicketDeadline = (
  ticket: Pick<
    Ticket,
    "status" | "first_response_due" | "resolve_due" | "first_responded_at"
  >,
  now: Date = new Date(),
): TicketDeadline => {
  if (!isTicketOpen(ticket)) return { kind: "none" };
  const kind = ticket.first_responded_at ? "resolve" : "response";
  const due =
    kind === "response" ? ticket.first_response_due : ticket.resolve_due;
  if (!due) return { kind: "none" };
  const minutes = Math.round((new Date(due).getTime() - now.getTime()) / 60000);
  return { kind, minutes: Math.abs(minutes), isLate: minutes < 0 };
};

/**
 * What the prepare_ticket trigger does in the database, for the demo:
 * deadlines from the priority, and resolved/first-response stamps.
 */
export const prepareTicket = <T extends Partial<Ticket>>(
  ticket: T,
  previous?: Partial<Ticket>,
  now: Date = new Date(),
): T & Partial<Ticket> => {
  const createdAt = ticket.created_at ?? now.toISOString();
  const priority = ticket.priority ?? "normal";
  const status = ticket.status ?? "open";
  const sla = TICKET_SLA_HOURS[priority];
  const start = new Date(createdAt).getTime();
  const isNewPriority = !previous || previous.priority !== priority;
  return {
    ...ticket,
    created_at: createdAt,
    updated_at: now.toISOString(),
    priority,
    status,
    first_response_due: isNewPriority
      ? new Date(start + sla.response * HOUR_MS).toISOString()
      : ticket.first_response_due,
    resolve_due: isNewPriority
      ? new Date(start + sla.resolve * HOUR_MS).toISOString()
      : ticket.resolve_due,
    resolved_at: ["resolved", "closed"].includes(status)
      ? (ticket.resolved_at ?? now.toISOString())
      : null,
    first_responded_at:
      status !== "open" && !ticket.first_responded_at
        ? now.toISOString()
        : ticket.first_responded_at,
  };
};

/** "TKT-0007" after the highest number so far, for the demo. */
export const nextTicketNumber = (numbers: string[]) => {
  const highest = numbers
    .map((number) => parseInt(number.replace(/\D/g, ""), 10))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);
  return `TKT-${String(highest + 1).padStart(4, "0")}`;
};
