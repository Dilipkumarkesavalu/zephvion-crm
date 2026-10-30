import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getUserClient } from "../_shared/userClient.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { buildPaymentLinkRequest } from "./linkModel.ts";

/**
 * Creates a Razorpay payment link for an invoice's unpaid balance and saves
 * it on the invoice, so it prints on the PDF and goes out with reminders.
 * The razorpay_webhook function records the payment when the client pays.
 *
 * Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
 */

const RAZORPAY_API = "https://api.razorpay.com/v1/payment_links";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const createLink = async (req: Request) => {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    return json({ ok: false, reason: "razorpay_not_configured" });
  }

  const body = await req.json().catch(() => null);
  const invoiceId = Number(body?.invoice_id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return createErrorResponse(400, "invoice_id is required");
  }
  // Read as the caller so row-level security applies
  const { data: visible } = await getUserClient(req)
    .from("invoices")
    .select("id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!visible) return createErrorResponse(404, "Invoice not found");

  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select(
      "id, type, status, number, total, amount_paid, due_date, company:companies(name), contact:contacts(first_name, last_name, email_jsonb, phone_jsonb)",
    )
    .eq("id", invoiceId)
    .single();
  const balance = Number(invoice?.total) - Number(invoice?.amount_paid ?? 0);
  if (!invoice || invoice.type !== "invoice" || invoice.status !== "sent") {
    return json({
      ok: false,
      reason: "only sent, unpaid invoices can be paid online",
    });
  }
  if (!(balance > 0)) return json({ ok: false, reason: "nothing is due" });

  const contact = invoice.contact as {
    first_name?: string;
    last_name?: string;
    email_jsonb?: Array<{ email: string }>;
    phone_jsonb?: Array<{ number: string }>;
  } | null;
  const company = invoice.company as { name?: string } | null;
  const request = buildPaymentLinkRequest({
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    balance,
    dueDate: invoice.due_date,
    customerName:
      company?.name ||
      `${contact?.first_name ?? ""} ${contact?.last_name ?? ""}`.trim() ||
      "Client",
    customerEmail: contact?.email_jsonb?.[0]?.email,
    customerPhone: contact?.phone_jsonb?.[0]?.number,
  });

  const response = await fetch(RAZORPAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify(request),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.short_url) {
    console.error(
      "razorpay_payment_link: Razorpay refused",
      response.status,
      result?.error,
    );
    return json(
      {
        ok: false,
        reason:
          result?.error?.description ?? "Razorpay could not create the link",
      },
      502,
    );
  }

  const { error } = await supabaseAdmin
    .from("invoices")
    .update({ payment_link_url: result.short_url, payment_link_id: result.id })
    .eq("id", invoice.id);
  if (error) console.error("razorpay_payment_link: could not save link", error);
  return json({ ok: true, url: result.short_url });
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
          return await createLink(req);
        } catch (error) {
          console.error("razorpay_payment_link: unhandled", error);
          return createErrorResponse(500, "Internal Server Error");
        }
      }),
    ),
  ),
);
