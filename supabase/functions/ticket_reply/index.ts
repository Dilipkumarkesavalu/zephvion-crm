import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import { getMailer } from "../_shared/mailer.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getUserClient } from "../_shared/userClient.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { buildTicketReplyEmail } from "./ticketEmail.ts";

/**
 * Emails a ticket reply to the ticket's contact. Only the reply's author can
 * send it, only once, and never an internal note.
 */

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const sendReply = async (req: Request, salesId: number) => {
  const body = await req.json().catch(() => null);
  const commentId = Number(body?.comment_id);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return createErrorResponse(400, "comment_id is required");
  }
  // Read as the caller so row-level security applies
  const { data: comment } = await getUserClient(req)
    .from("ticket_comments")
    .select("id, ticket_id, sales_id, body, is_internal, emailed_at")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return createErrorResponse(404, "Reply not found");
  if (comment.sales_id !== salesId) {
    return json({ ok: false, reason: "only the author can email a reply" });
  }
  if (comment.is_internal) {
    return json({ ok: false, reason: "internal notes are never emailed" });
  }
  if (comment.emailed_at) return json({ ok: false, reason: "already emailed" });

  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select("number, subject, contact:contacts(first_name, email_jsonb)")
    .eq("id", comment.ticket_id)
    .single();
  const contact = ticket?.contact as {
    first_name?: string;
    email_jsonb?: Array<{ email: string }>;
  } | null;
  const to = contact?.email_jsonb?.[0]?.email?.trim();
  if (!ticket || !to) {
    return json({ ok: false, reason: "the ticket contact has no email" });
  }

  const mail = getMailer();
  if (!mail) return json({ ok: false, reason: "email is not configured" });

  const [{ data: agent }, { data: configuration }] = await Promise.all([
    supabaseAdmin
      .from("sales")
      .select("first_name, last_name")
      .eq("id", salesId)
      .single(),
    supabaseAdmin
      .from("configuration")
      .select("config")
      .eq("id", 1)
      .maybeSingle(),
  ]);
  const email = buildTicketReplyEmail({
    ticketNumber: ticket.number,
    subject: ticket.subject,
    body: comment.body,
    contactFirstName: contact?.first_name,
    agentName:
      `${agent?.first_name ?? ""} ${agent?.last_name ?? ""}`.trim() ||
      "Zephvion support",
    sellerName: configuration?.config?.seller?.name || "Zephvion Pvt. Ltd.",
  });

  try {
    await mail.transporter.sendMail({
      from: mail.from,
      replyTo: mail.replyTo,
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (error) {
    console.error("ticket_reply: send failed", ticket.number, error);
    return json({ ok: false, reason: "the email could not be sent" }, 502);
  }
  await supabaseAdmin
    .from("ticket_comments")
    .update({ emailed_at: new Date().toISOString(), emailed_to: to })
    .eq("id", comment.id);
  return json({ ok: true, to });
};

Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async (req) =>
    AuthMiddleware(req, async (req) =>
      UserMiddleware(req, async (req, user) => {
        const sale = user ? await getUserSale(user) : null;
        if (!sale) return createErrorResponse(401, "Unauthorized");
        if (req.method !== "POST") {
          return createErrorResponse(405, "Method Not Allowed");
        }
        try {
          return await sendReply(req, sale.id);
        } catch (error) {
          console.error("ticket_reply: unhandled", error);
          return createErrorResponse(500, "Internal Server Error");
        }
      }),
    ),
  ),
);
