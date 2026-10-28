import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { parseLeadPayload, safeRedirect } from "./leadPayload.ts";

/**
 * Public endpoint for the zephvion.com contact form: turns a submission into
 * a scored, auto-assigned lead in the CRM inbox.
 *
 * Accepts JSON (fetch) or a plain HTML form post. A repeat enquiry from the
 * same email within 30 days is added to the open lead instead of a new one.
 *
 * Optional secret: LEAD_FORM_ORIGINS, comma-separated sites allowed to post
 * from a browser and to redirect back to (default: zephvion.com).
 */

const DEFAULT_ORIGINS = "https://zephvion.com,https://www.zephvion.com";
const DUPLICATE_WINDOW_DAYS = 30;
const MAX_BODY_BYTES = 20_000;

const allowedOrigins = (Deno.env.get("LEAD_FORM_ORIGINS") ?? DEFAULT_ORIGINS)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsFor = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin");
  return origin && allowedOrigins.includes(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "POST",
        Vary: "Origin",
      }
    : {};
};

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsFor(req) },
  });

const readFields = async (
  req: Request,
): Promise<Record<string, unknown> | null> => {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return null;
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    }
    return Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return null;
  }
};

const appendToOpenLead = async (email: string, message: string | null) => {
  const since = new Date(
    Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: existing } = await supabaseAdmin
    .from("leads")
    .select("id, message")
    .eq("email", email)
    .in("status", ["new", "contacted", "qualified"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!existing) return false;
  const stamp = new Date().toISOString().slice(0, 10);
  const followUp = `--- Follow-up enquiry ${stamp} ---\n${message ?? "(no message)"}`;
  const { error } = await supabaseAdmin
    .from("leads")
    .update({
      message: [existing.message, followUp]
        .filter(Boolean)
        .join("\n\n")
        .slice(-5000),
    })
    .eq("id", existing.id);
  if (error) throw error;
  return true;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsFor(req) });
  }
  if (req.method !== "POST") {
    return json(req, 405, { ok: false, error: "Method not allowed" });
  }

  const fields = await readFields(req);
  if (!fields) {
    return json(req, 400, { ok: false, error: "Could not read the form." });
  }
  const redirect = safeRedirect(fields.redirect, allowedOrigins);
  const done = () =>
    redirect ? Response.redirect(redirect, 303) : json(req, 200, { ok: true });

  const result = parseLeadPayload(fields);
  // Pretend success so bots learn nothing
  if (result.kind === "spam") return done();
  if (result.kind === "invalid") {
    return json(req, 400, { ok: false, error: result.error });
  }

  try {
    const { lead } = result;
    if (lead.email && (await appendToOpenLead(lead.email, lead.message))) {
      return done();
    }
    const { error } = await supabaseAdmin.from("leads").insert(lead);
    if (error) throw error;
    return done();
  } catch (error) {
    console.error("lead_capture failed", error);
    return json(req, 500, {
      ok: false,
      error: "Something went wrong. Please email us instead.",
    });
  }
});
