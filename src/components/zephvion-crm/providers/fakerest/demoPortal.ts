import type { DataProvider } from "ra-core";

import {
  hashPortalToken,
  type PortalRequest,
  type PortalResponse,
} from "../../portal/portalLink";
import {
  shapeInvoices,
  shapeProjects,
  shapeTickets,
  type Row,
} from "../../portal/shapePortal";
import type { Company, PortalAccess, Sale, Ticket } from "../../types";

const ALL = { page: 1, perPage: 10000 };
const BY_ID = { field: "id", order: "ASC" as const };
const INVALID = "This link is not valid any more.";

const list = async (
  dataProvider: DataProvider,
  resource: string,
  filter: Record<string, unknown> = {},
) =>
  (
    await dataProvider.getList(resource, {
      filter,
      pagination: ALL,
      sort: BY_ID,
    })
  ).data as Row[];

/**
 * The client_portal function's behaviour for the in-browser demo, built
 * from the demo's records.
 */
export const callDemoPortal = async (
  dataProvider: DataProvider,
  token: string,
  request: PortalRequest,
): Promise<PortalResponse> => {
  if (!/^[0-9a-f]{64}$/.test(token)) return { ok: false, error: INVALID };
  const tokenHash = await hashPortalToken(token);
  const [access] = (await list(dataProvider, "portal_access", {
    token_hash: tokenHash,
    is_active: true,
  })) as unknown as PortalAccess[];
  if (!access) return { ok: false, error: INVALID };
  const companyId = access.company_id;

  if (request.action === "create_ticket") {
    await dataProvider.create<Ticket>("tickets", {
      data: {
        subject: request.subject.slice(0, 200),
        description: `${request.description}${request.name ? `\n\nFrom: ${request.name} (client portal)` : ""}`,
        company_id: companyId,
        channel: "portal",
        priority: "normal",
        status: "open",
      },
    });
  }
  if (request.action === "reply") {
    const { data: ticket } = await dataProvider.getOne<Ticket>("tickets", {
      id: request.ticket_id,
    });
    if (String(ticket?.company_id) !== String(companyId)) {
      return { ok: false, error: "Unknown request." };
    }
    await dataProvider.create("ticket_comments", {
      data: {
        ticket_id: ticket.id,
        body: request.body.slice(0, 5000),
        is_internal: false,
        is_from_client: true,
        sales_id: null,
        created_at: new Date().toISOString(),
      },
    });
    if (["resolved", "closed", "waiting_client"].includes(ticket.status)) {
      await dataProvider.update("tickets", {
        id: ticket.id,
        data: { status: "open" },
        previousData: ticket,
      });
    }
  }

  const { data: company } = await dataProvider.getOne<Company>("companies", {
    id: companyId,
  });
  const invoices = await list(dataProvider, "invoices", {
    company_id: companyId,
  });
  const projects = await list(dataProvider, "projects", {
    company_id: companyId,
  });
  const tickets = await list(dataProvider, "tickets", {
    company_id: companyId,
  });
  const projectIds = new Set(projects.map((project) => String(project.id)));
  const ticketIds = new Set(tickets.map((ticket) => String(ticket.id)));
  const milestones = (await list(dataProvider, "project_milestones")).filter(
    (milestone) => projectIds.has(String(milestone.project_id)),
  );
  const comments = (await list(dataProvider, "ticket_comments")).filter(
    (comment) => ticketIds.has(String(comment.ticket_id)),
  );
  const staff = (await list(dataProvider, "sales")) as unknown as Sale[];

  const shapedInvoices = shapeInvoices(invoices);
  return {
    ok: true,
    portal: {
      company: { name: company.name },
      seller: { name: "Zephvion Pvt. Ltd." },
      balance: shapedInvoices.reduce(
        (total, invoice) => total + invoice.balance,
        0,
      ),
      invoices: shapedInvoices,
      projects: shapeProjects(projects, milestones),
      tickets: shapeTickets(
        [...tickets].sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at)),
        ),
        comments,
        new Map(staff.map((person) => [Number(person.id), person.first_name])),
      ),
    },
  };
};
