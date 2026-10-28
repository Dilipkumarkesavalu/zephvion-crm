import type { Lead, LeadSource, LeadStatus } from "../types";

export type LeadTier = "hot" | "warm" | "cold";

export const OPEN_LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
];

/** First contact is due this long after a lead arrives. */
export const FIRST_RESPONSE_HOURS = 2;

const SOURCE_POINTS: Partial<Record<LeadSource, number>> = {
  referral: 20,
  website: 15,
  whatsapp: 15,
  email: 10,
  linkedin: 10,
  event: 10,
};

const budgetPoints = (budget?: number | null) => {
  const value = budget ?? 0;
  if (value >= 500000) return 40;
  if (value >= 200000) return 30;
  if (value >= 50000) return 20;
  return value > 0 ? 10 : 0;
};

const filled = (value?: string | null) => !!value && value.trim() !== "";

type ScoreInput = Pick<
  Lead,
  "budget" | "company_name" | "phone" | "email" | "source" | "message"
>;

/** Same rules as public.lead_score() in the database. */
export const computeLeadScore = (lead: ScoreInput): number =>
  Math.min(
    100,
    budgetPoints(lead.budget) +
      (filled(lead.company_name) ? 15 : 0) +
      (filled(lead.phone) ? 10 : 0) +
      (filled(lead.email) ? 5 : 0) +
      (SOURCE_POINTS[lead.source] ?? 5) +
      ((lead.message ?? "").length >= 40 ? 10 : 0),
  );

export const getLeadTier = (score: number): LeadTier =>
  score >= 60 ? "hot" : score >= 35 ? "warm" : "cold";

export type SlaState =
  | { kind: "done" }
  | { kind: "due"; minutesLeft: number }
  | { kind: "overdue"; minutesLate: number };

/** Whether first contact happened in time, is still due, or is late. */
export const getSlaState = (
  lead: Pick<Lead, "status" | "first_response_due" | "first_responded_at">,
  now: Date = new Date(),
): SlaState => {
  if (lead.status !== "new" || lead.first_responded_at) return { kind: "done" };
  if (!lead.first_response_due) return { kind: "done" };
  const minutes = Math.round(
    (new Date(lead.first_response_due).getTime() - now.getTime()) / 60000,
  );
  return minutes >= 0
    ? { kind: "due", minutesLeft: minutes }
    : { kind: "overdue", minutesLate: -minutes };
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
};

export const leadFullName = (lead: Pick<Lead, "first_name" | "last_name">) =>
  `${lead.first_name} ${lead.last_name ?? ""}`.trim();

/**
 * What the trigger does on the server, for the in-browser demo: score,
 * response deadline and first-response time.
 */
export const prepareLead = <T extends Partial<Lead>>(
  lead: T,
  now: Date = new Date(),
): T & Partial<Lead> & { score: number } => {
  const createdAt = lead.created_at ?? now.toISOString();
  const isFirstResponse =
    !!lead.status && lead.status !== "new" && !lead.first_responded_at;
  return {
    ...lead,
    created_at: createdAt,
    updated_at: now.toISOString(),
    score: computeLeadScore({
      budget: lead.budget,
      company_name: lead.company_name,
      phone: lead.phone,
      email: lead.email,
      source: lead.source ?? "manual",
      message: lead.message,
    }),
    first_response_due:
      lead.first_response_due ??
      new Date(
        new Date(createdAt).getTime() + FIRST_RESPONSE_HOURS * 3600_000,
      ).toISOString(),
    first_responded_at: isFirstResponse
      ? now.toISOString()
      : lead.first_responded_at,
  };
};
