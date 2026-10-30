import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import { getMailer } from "../_shared/mailer.ts";
import { safeEqual } from "../_shared/secrets.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getUserClient } from "../_shared/userClient.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import {
  buildReminderEmail,
  indianToday,
  pickReminder,
  type ReminderKind,
} from "./reminderModel.ts";

/**
 * Emails clients about unpaid invoices.
 *
 * - Daily run: called by the scheduled job with the x-cron-secret header
 *   (REMINDERS_CRON_SECRET); sends at most one reminder per invoice per
 *   stage: 3 days before, on the due date, then 7, 14 and 30 days late.
 * - Manual: a signed-in user posts { invoice_id } to remind now; row-level
 *   security decides whether they may see that invoice.
 */

const MAX_PER_RUN = 200;

type InvoiceRow = {
  id: number;
  number: string;
  due_date: string;
  total: number;
  amount_paid: number;
  payment_link_url: string | null;
  company: { name: string } | null;
  contact: {
    first_name: string;
    email_jsonb: Array<{ email: string }> | null;
  } | null;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const INVOICE_COLUMNS =
  "id, number, due_date, total, amount_paid, payment_link_url, company:companies(name), contact:contacts(first_name, email_jsonb)";

const getSeller = async () => {
  const { data } = await supabaseAdmin
    .from("configuration")
    .select("config")
    .eq("id", 1)
    .maybeSingle();
  const seller = data?.config?.seller ?? {};
  return {
    name: seller.name || "Zephvion Pvt. Ltd.",
    bank: seller.bank ?? null,
  };
};

const sendReminder = async (
  invoice: InvoiceRow,
  kind: ReminderKind | "manual",
  seller: Awaited<ReturnType<typeof getSeller>>,
  mail: NonNullable<ReturnType<typeof getMailer>>,
  salesId: number | null,
) => {
  const to = invoice.contact?.email_jsonb?.[0]?.email?.trim();
  if (!to) return { sent: false, reason: "the invoice contact has no email" };
  const balance = Number(invoice.total) - Number(invoice.amount_paid ?? 0);
  if (balance <= 0) return { sent: false, reason: "nothing is due" };

  // Record first: a unique stage index stops a second run sending it twice
  const { error: logError } = await supabaseAdmin
    .from("invoice_reminders")
    .insert({ invoice_id: invoice.id, kind, sent_to: to, sales_id: salesId });
  if (logError) return { sent: false, reason: "already reminded" };

  const email = buildReminderEmail({
    kind,
    clientName: invoice.company?.name ?? "",
    contactFirstName: invoice.contact?.first_name,
    invoiceNumber: invoice.number,
    dueDate: invoice.due_date,
    balance,
    sellerName: seller.name,
    paymentLink: invoice.payment_link_url,
    bank: seller.bank,
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
    return { sent: true, to };
  } catch (error) {
    console.error("invoice_reminders: send failed", invoice.number, error);
    await supabaseAdmin
      .from("invoice_reminders")
      .delete()
      .eq("invoice_id", invoice.id)
      .eq("kind", kind)
      .gte("sent_at", new Date(Date.now() - 60_000).toISOString());
    return { sent: false, reason: "the email could not be sent" };
  }
};

const runDaily = async () => {
  const mail = getMailer();
  if (!mail) return json({ ok: false, reason: "email is not configured" });
  const today = indianToday();
  const { data: invoices, error } = await supabaseAdmin
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .eq("type", "invoice")
    .eq("status", "sent")
    .not("due_date", "is", null)
    .order("due_date")
    .limit(MAX_PER_RUN);
  if (error) {
    console.error("invoice_reminders: failed to load invoices", error);
    return json({ ok: false, reason: "could not load invoices" }, 500);
  }

  const ids = (invoices ?? []).map((invoice) => invoice.id);
  const { data: sentRows } = ids.length
    ? await supabaseAdmin
        .from("invoice_reminders")
        .select("invoice_id, kind")
        .in("invoice_id", ids)
    : { data: [] };
  const seller = await getSeller();

  let sent = 0;
  for (const invoice of (invoices ?? []) as unknown as InvoiceRow[]) {
    const alreadySent = (sentRows ?? [])
      .filter((row) => row.invoice_id === invoice.id)
      .map((row) => row.kind);
    const kind = pickReminder(invoice.due_date, today, alreadySent);
    if (!kind) continue;
    const result = await sendReminder(invoice, kind, seller, mail, null);
    if (result.sent) sent += 1;
  }
  return json({ ok: true, sent });
};

const remindNow = async (req: Request, salesId: number) => {
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
    .select(`${INVOICE_COLUMNS}, type, status`)
    .eq("id", invoiceId)
    .single();
  if (!invoice || invoice.type !== "invoice" || invoice.status !== "sent") {
    return json({
      sent: false,
      reason: "only sent, unpaid invoices get reminders",
    });
  }
  const mail = getMailer();
  if (!mail) return json({ sent: false, reason: "email is not configured" });
  return json(
    await sendReminder(
      invoice as unknown as InvoiceRow,
      "manual",
      await getSeller(),
      mail,
      salesId,
    ),
  );
};

Deno.serve(async (req: Request) => {
  if (req.method === "POST" && req.headers.has("x-cron-secret")) {
    const expected = Deno.env.get("REMINDERS_CRON_SECRET") ?? "";
    const given = req.headers.get("x-cron-secret") ?? "";
    if (!expected || !safeEqual(given, expected)) {
      return createErrorResponse(401, "Unauthorized");
    }
    return runDaily();
  }
  return OptionsMiddleware(req, async (req) =>
    AuthMiddleware(req, async (req) =>
      UserMiddleware(req, async (req, user) => {
        const sale = user ? await getUserSale(user) : null;
        if (!sale) return createErrorResponse(401, "Unauthorized");
        if (req.method !== "POST") {
          return createErrorResponse(405, "Method Not Allowed");
        }
        try {
          return await remindNow(req, sale.id);
        } catch (error) {
          console.error("invoice_reminders: unhandled", error);
          return createErrorResponse(500, "Internal Server Error");
        }
      }),
    ),
  );
});
