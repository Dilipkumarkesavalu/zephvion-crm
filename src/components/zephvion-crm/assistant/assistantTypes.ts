import type { Identifier } from "ra-core";

export type EmailResource = "companies" | "deals" | "invoices" | "tickets";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** What the ai_assistant function accepts. */
export type AssistantPayload =
  | { action: "summarize_company"; company_id: Identifier }
  | {
      action: "draft_email";
      resource: EmailResource;
      record_id: Identifier;
      purpose: string;
    }
  | { action: "ask"; question: string; history: ChatTurn[] };

export interface AssistantResult {
  ok: boolean;
  /** Summary or answer, in Markdown */
  text?: string;
  subject?: string;
  body?: string;
  /** The contact's email, for drafted emails */
  to?: string | null;
  /** Why it failed: ai_not_configured, daily_limit, busy, model_error, demo… */
  reason?: string;
}

/** A mailto: link that opens the draft in the user's email app. */
export const buildMailto = (
  to: string | null | undefined,
  subject: string,
  body: string,
) =>
  `mailto:${encodeURIComponent(to ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
