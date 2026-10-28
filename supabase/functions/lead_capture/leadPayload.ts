/**
 * Turns a website form submission into a lead row, or explains why not.
 * Pure, so it can be tested without Deno or a database.
 */

export const LEAD_SOURCES = [
  "website",
  "whatsapp",
  "email",
  "referral",
  "linkedin",
  "event",
] as const;

/** Bots fill every field; people never see this one. */
export const HONEYPOT_FIELD = "company_website";

export interface LeadRow {
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  service: string | null;
  budget: number | null;
  message: string | null;
  source: string;
  utm_source: string | null;
  utm_campaign: string | null;
}

export type ParseResult =
  | { kind: "lead"; lead: LeadRow }
  | { kind: "spam" }
  | { kind: "invalid"; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_DIGITS = /\d/g;

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const cleaned = String(value)
    // Strip invisible control characters, keeping tabs and line breaks
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .trim();
  return cleaned ? cleaned.slice(0, max) : null;
};

/** "₹2,00,000", "200000" or "2 lakh" -> 200000 */
export const parseBudget = (value: unknown): number | null => {
  const raw = text(value, 40)?.toLowerCase();
  if (!raw) return null;
  const number = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return null;
  const multiplier = /crore|\d\s*cr\b/.test(raw)
    ? 10_000_000
    : /lakh|lac|\d\s*l\b/.test(raw)
      ? 100_000
      : /thousand|\d\s*k\b/.test(raw)
        ? 1_000
        : 1;
  return Math.min(Math.round(number * multiplier), 1_000_000_000_000);
};

const splitName = (fields: Record<string, unknown>) => {
  const first = text(fields.first_name, 120);
  if (first) return { first, last: text(fields.last_name, 120) };
  const full = text(fields.name, 240);
  if (!full) return { first: null, last: null };
  const [head, ...rest] = full.split(/\s+/);
  return {
    first: head.slice(0, 120),
    last: rest.join(" ").slice(0, 120) || null,
  };
};

export const parseLeadPayload = (
  fields: Record<string, unknown>,
): ParseResult => {
  if (text(fields[HONEYPOT_FIELD], 200)) return { kind: "spam" };

  const { first, last } = splitName(fields);
  if (!first) return { kind: "invalid", error: "Please tell us your name." };

  const email = text(fields.email, 254)?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) {
    return { kind: "invalid", error: "Please check your email address." };
  }
  const phone = text(fields.phone, 30);
  if (phone && (phone.match(PHONE_DIGITS)?.length ?? 0) < 7) {
    return { kind: "invalid", error: "Please check your phone number." };
  }
  if (!email && !phone) {
    return {
      kind: "invalid",
      error: "Please leave an email address or a phone number.",
    };
  }

  const requestedSource = text(fields.source, 20)?.toLowerCase();
  const source = LEAD_SOURCES.find((value) => value === requestedSource);

  return {
    kind: "lead",
    lead: {
      first_name: first,
      last_name: last,
      email,
      phone,
      company_name: text(fields.company ?? fields.company_name, 200),
      service: text(fields.service, 60),
      budget: parseBudget(fields.budget),
      message: text(fields.message, 5000),
      source: source ?? "website",
      utm_source: text(fields.utm_source, 100),
      utm_campaign: text(fields.utm_campaign, 100),
    },
  };
};

/** Only redirect back to the company's own site after a plain HTML post. */
export const safeRedirect = (
  value: unknown,
  allowedOrigins: string[],
): string | null => {
  const raw = text(value, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return allowedOrigins.includes(url.origin) ? url.toString() : null;
  } catch {
    return null;
  }
};
