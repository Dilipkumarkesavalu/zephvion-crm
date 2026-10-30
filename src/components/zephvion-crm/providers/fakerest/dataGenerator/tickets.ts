import { prepareTicket } from "../../../tickets/ticketModel";
import type { Ticket, TicketComment } from "../../../types";
import type { Db } from "./types";

const HOUR_MS = 60 * 60 * 1000;

type TicketSeed = Pick<
  Ticket,
  "subject" | "description" | "status" | "priority" | "channel"
> & { ageHours: number; reply?: string; note?: string };

const SEEDS: TicketSeed[] = [
  {
    subject: "Website contact form not sending emails",
    description:
      "Since yesterday the enquiry form on our site shows a success message but nothing reaches our inbox.",
    status: "open",
    priority: "urgent",
    channel: "phone",
    ageHours: 2,
    note: "Checked the mail logs: SMTP password on their hosting expired.",
  },
  {
    subject: "Add the new Pune branch address to the footer",
    description: "Please add: 4th floor, Baner Road, Pune 411045.",
    status: "in_progress",
    priority: "normal",
    channel: "email",
    ageHours: 20,
    reply: "Thanks! We will have it live by tomorrow.",
  },
  {
    subject: "Invoice copy needed for GST filing",
    description: "Our accountant needs a copy of last month's invoice.",
    status: "waiting_client",
    priority: "low",
    channel: "whatsapp",
    ageHours: 30,
    reply: "Sent the PDF. Could you confirm the GSTIN on it is correct?",
  },
  {
    subject: "App crashes on Android 14 when opening the cart",
    description: "Several customers reported this after the last update.",
    status: "open",
    priority: "high",
    channel: "email",
    ageHours: 6,
  },
  {
    subject: "Change the hero banner for Diwali",
    description: "New banner artwork is in the shared drive.",
    status: "resolved",
    priority: "normal",
    channel: "email",
    ageHours: 120,
    reply: "Done and live. Happy Diwali!",
  },
];

/** A few realistic support tickets with replies and an internal note. */
export const generateTickets = (
  db: Db,
): { tickets: Ticket[]; ticket_comments: TicketComment[] } => {
  const now = Date.now();
  const team = db.sales.filter((sale) => !sale.disabled);
  const tickets: Ticket[] = [];
  const comments: TicketComment[] = [];

  SEEDS.forEach(({ ageHours, reply, note, ...seed }, index) => {
    const company = db.companies[index % db.companies.length];
    const contact = db.contacts.find(
      (candidate) => candidate.company_id === company.id,
    );
    const createdAt = new Date(now - ageHours * HOUR_MS).toISOString();
    const salesId = team[(index + 1) % team.length].id;
    const respondedAt = reply
      ? new Date(now - (ageHours - 1) * HOUR_MS).toISOString()
      : null;
    const ticket = prepareTicket(
      {
        ...seed,
        id: index + 1,
        number: `TKT-${String(index + 1).padStart(4, "0")}`,
        company_id: company.id,
        contact_id: contact?.id ?? null,
        sales_id: salesId,
        created_at: createdAt,
        first_responded_at: respondedAt,
      },
      undefined,
      new Date(now - Math.max(0, ageHours - 2) * HOUR_MS),
    ) as Ticket;
    tickets.push(ticket);

    if (note) {
      comments.push({
        id: comments.length + 1,
        ticket_id: ticket.id,
        sales_id: salesId,
        body: note,
        is_internal: true,
        created_at: new Date(now - (ageHours / 2) * HOUR_MS).toISOString(),
      });
    }
    if (reply) {
      comments.push({
        id: comments.length + 1,
        ticket_id: ticket.id,
        sales_id: salesId,
        body: reply,
        is_internal: false,
        emailed_at: ticket.first_responded_at,
        emailed_to: contact?.email_jsonb?.[0]?.email ?? null,
        created_at: ticket.first_responded_at ?? createdAt,
      });
    }
  });

  return { tickets, ticket_comments: comments };
};
