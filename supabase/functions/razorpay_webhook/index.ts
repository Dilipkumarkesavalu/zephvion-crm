import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { hmacSha256Hex, safeEqual } from "../_shared/secrets.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { readPaidEvent } from "./webhookModel.ts";

/**
 * Razorpay calls this when a payment link is paid; the payment is recorded
 * against its invoice, which marks the invoice paid once covered. Replays
 * are harmless: each Razorpay payment id is recorded once.
 *
 * Secret: RAZORPAY_WEBHOOK_SECRET (the secret set on the webhook in the
 * Razorpay dashboard, event "payment_link.paid").
 */

const MAX_BODY_BYTES = 100_000;

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply(405, { ok: false });
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return reply(503, { ok: false, reason: "not configured" });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return reply(413, { ok: false });
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !safeEqual(signature, await hmacSha256Hex(secret, raw))) {
    return reply(401, { ok: false });
  }

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return reply(400, { ok: false });
  }
  const payment = readPaidEvent(event as Parameters<typeof readPaidEvent>[0]);
  // Acknowledge events we do not act on, so Razorpay stops retrying them
  if (!payment) return reply(200, { ok: true, ignored: true });

  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("id")
    .eq("id", payment.invoiceId)
    .maybeSingle();
  if (!invoice) return reply(200, { ok: true, ignored: true });

  const { error } = await supabaseAdmin.from("invoice_payments").upsert(
    {
      invoice_id: payment.invoiceId,
      amount: payment.amount,
      paid_on: payment.paidOn,
      method: "razorpay",
      reference: `${payment.paymentId} (${payment.method})`.slice(0, 200),
      external_id: payment.paymentId,
      sales_id: null,
    },
    { onConflict: "external_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("razorpay_webhook: could not record payment", error);
    return reply(500, { ok: false });
  }
  return reply(200, { ok: true });
});
