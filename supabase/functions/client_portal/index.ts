import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import {
  isValidToken,
  parsePortalRequest,
  sha256Hex,
  shapeInvoices,
  shapeProjects,
  shapeTickets,
} from "./portalModel.ts";

/**
 * The client portal. A client's secret link carries a token; its SHA-256
 * fingerprint finds the one company it opens. Everything returned or
 * changed is limited to that company, and internal notes never leave.
 */

const MAX_BODY_BYTES = 20_000;
const LIST_LIMIT = 200;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const findAccess = async (token: string) => {
  const { data } = await supabaseAdmin
    .from("portal_access")
    .select("id, company_id")
    .eq("token_hash", await sha256Hex(token))
    .eq("is_active", true)
    .maybeSingle();
  return data;
};

const loadPortal = async (companyId: number) => {
  const [company, configuration, invoices, projects, tickets] =
    await Promise.all([
      supabaseAdmin
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single(),
      supabaseAdmin
        .from("configuration")
        .select("config")
        .eq("id", 1)
        .maybeSingle(),
      supabaseAdmin
        .from("invoices")
        .select(
          "id, type, number, status, issue_date, due_date, total, amount_paid, payment_link_url",
        )
        .eq("company_id", companyId)
        .order("issue_date", { ascending: false })
        .limit(LIST_LIMIT),
      supabaseAdmin
        .from("projects")
        .select("id, name, status, start_date, due_date")
        .eq("company_id", companyId)
        .order("start_date", { ascending: false })
        .limit(LIST_LIMIT),
      supabaseAdmin
        .from("tickets")
        .select(
          "id, number, subject, description, status, priority, created_at",
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
    ]);

  const projectIds = (projects.data ?? []).map((project) => project.id);
  const ticketIds = (tickets.data ?? []).map((ticket) => ticket.id);
  const [milestones, comments] = await Promise.all([
    projectIds.length
      ? supabaseAdmin
          .from("project_milestones")
          .select("project_id, name, status, due_date, position")
          .in("project_id", projectIds)
      : { data: [] },
    ticketIds.length
      ? supabaseAdmin
          .from("ticket_comments")
          .select(
            "id, ticket_id, body, is_internal, is_from_client, sales_id, created_at",
          )
          .in("ticket_id", ticketIds)
          .eq("is_internal", false)
      : { data: [] },
  ]);
  const staffIds = [
    ...new Set(
      (comments.data ?? []).map((comment) => comment.sales_id).filter(Boolean),
    ),
  ];
  const { data: staff } = staffIds.length
    ? await supabaseAdmin
        .from("sales")
        .select("id, first_name")
        .in("id", staffIds)
    : { data: [] };

  const shapedInvoices = shapeInvoices(invoices.data ?? []);
  return {
    company: { name: company.data?.name ?? "" },
    seller: {
      name: configuration.data?.config?.seller?.name || "Zephvion Pvt. Ltd.",
    },
    balance: shapedInvoices.reduce(
      (total, invoice) => total + invoice.balance,
      0,
    ),
    invoices: shapedInvoices,
    projects: shapeProjects(projects.data ?? [], milestones.data ?? []),
    tickets: shapeTickets(
      tickets.data ?? [],
      comments.data ?? [],
      new Map((staff ?? []).map((person) => [person.id, person.first_name])),
    ),
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { ok: false });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { ok: false });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: "Unknown request." });
  }

  // Same answer for a malformed and an unknown link
  if (!isValidToken(body.token)) {
    return json(404, { ok: false, error: "This link is not valid any more." });
  }
  const access = await findAccess(body.token);
  if (!access) {
    return json(404, { ok: false, error: "This link is not valid any more." });
  }

  const request = parsePortalRequest(body);
  if ("error" in request) return json(400, { ok: false, error: request.error });

  try {
    if (request.action === "create_ticket") {
      const from = request.name
        ? `\n\nFrom: ${request.name} (client portal)`
        : "";
      const { error } = await supabaseAdmin.from("tickets").insert({
        subject: request.subject,
        description: `${request.description}${from}`.slice(0, 20000),
        company_id: access.company_id,
        channel: "portal",
        priority: "normal",
      });
      if (error) throw error;
    }

    if (request.action === "reply") {
      const { data: ticket } = await supabaseAdmin
        .from("tickets")
        .select("id, number, subject, status, sales_id")
        .eq("id", request.ticketId)
        .eq("company_id", access.company_id)
        .maybeSingle();
      if (!ticket) return json(404, { ok: false, error: "Unknown request." });
      const { error } = await supabaseAdmin.from("ticket_comments").insert({
        ticket_id: ticket.id,
        body: request.body,
        is_internal: false,
        is_from_client: true,
        sales_id: null,
      });
      if (error) throw error;
      // A reply reopens a finished ticket and lets its owner know
      if (["resolved", "closed", "waiting_client"].includes(ticket.status)) {
        await supabaseAdmin
          .from("tickets")
          .update({ status: "open" })
          .eq("id", ticket.id);
      }
      if (ticket.sales_id) {
        await supabaseAdmin.from("notifications").insert({
          recipient_sales_id: ticket.sales_id,
          actor_sales_id: null,
          type: "portal_reply",
          resource: "tickets",
          record_id: ticket.id,
          title: `${ticket.number} ${ticket.subject}`.slice(0, 200),
        });
      }
    }

    await supabaseAdmin
      .from("portal_access")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", access.id);
    return json(200, { ok: true, portal: await loadPortal(access.company_id) });
  } catch (error) {
    console.error("client_portal failed", error);
    return json(500, {
      ok: false,
      error: "Something went wrong. Please try again.",
    });
  }
});
