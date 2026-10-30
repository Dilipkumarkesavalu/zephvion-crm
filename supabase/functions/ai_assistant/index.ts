import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getUserClient } from "../_shared/userClient.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import {
  DAILY_LIMIT_PER_PERSON,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  emailPrompt,
  indianToday,
  MAX_ASK_TURNS,
  parseAssistantRequest,
  parseEmailDraft,
  parseQueryInput,
  QUERY_TOOL,
  QUERY_TOOL_NAME,
  QUERYABLE,
  summaryPrompt,
  SYSTEM_PROMPT,
  type AssistantRequest,
} from "./assistantModel.ts";
import {
  chat,
  ModelError,
  parseToolArguments,
  stripReasoning,
  type ChatMessage,
  type ModelConfig,
} from "./openModel.ts";

/**
 * The CRM's AI assistant, on an open-source model behind any
 * OpenAI-compatible API. It reads CRM data as the signed-in user, so
 * row-level security limits it to what that person may see, and it can
 * only read, never change, records.
 *
 * Secrets: AI_API_KEY (required), AI_BASE_URL and AI_MODEL (optional,
 * default Groq's Llama 3.3 70B).
 */

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const getModelConfig = (): ModelConfig | null => {
  const apiKey = Deno.env.get("AI_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: Deno.env.get("AI_BASE_URL") || DEFAULT_BASE_URL,
    model: Deno.env.get("AI_MODEL") || DEFAULT_MODEL,
  };
};

const NOTE_LENGTH = 500;
const shorten = <T extends { text?: string | null }>(rows: T[] | null) =>
  (rows ?? []).map((row) => ({
    ...row,
    text: (row.text ?? "").slice(0, NOTE_LENGTH),
  }));

/** Everything about one client the user may see, for a summary. */
const loadCompanyRecords = async (db: SupabaseClient, companyId: number) => {
  const { data: company } = await db
    .from("companies")
    .select(
      "id, name, sector, size, city, state_abbr, description, revenue, created_at",
    )
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return null;
  const [contacts, deals, invoices, projects, tickets] = await Promise.all([
    db
      .from("contacts")
      .select("id, first_name, last_name, title, status, last_seen")
      .eq("company_id", companyId)
      .limit(30),
    db
      .from("deals")
      .select("id, name, stage, amount, expected_closing_date, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(30),
    db
      .from("invoices")
      .select("type, number, status, issue_date, due_date, total, amount_paid")
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false })
      .limit(40),
    db
      .from("projects")
      .select("name, status, start_date, due_date, budget")
      .eq("company_id", companyId)
      .limit(20),
    db
      .from("tickets")
      .select("number, subject, status, priority, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const contactIds = (contacts.data ?? []).map((contact) => contact.id);
  const dealIds = (deals.data ?? []).map((deal) => deal.id);
  const [tasks, contactNotes, dealNotes] = await Promise.all([
    contactIds.length
      ? db
          .from("tasks")
          .select("text, type, due_date")
          .in("contact_id", contactIds)
          .is("done_date", null)
          .limit(20)
      : { data: [] },
    contactIds.length
      ? db
          .from("contact_notes")
          .select("text, date")
          .in("contact_id", contactIds)
          .order("date", { ascending: false })
          .limit(15)
      : { data: [] },
    dealIds.length
      ? db
          .from("deal_notes")
          .select("text, date")
          .in("deal_id", dealIds)
          .order("date", { ascending: false })
          .limit(15)
      : { data: [] },
  ]);
  return {
    company,
    contacts: contacts.data ?? [],
    deals: deals.data ?? [],
    invoices: invoices.data ?? [],
    projects: projects.data ?? [],
    tickets: tickets.data ?? [],
    open_tasks: tasks.data ?? [],
    recent_notes: [...shorten(contactNotes.data), ...shorten(dealNotes.data)],
  };
};

const firstEmail = (
  contact?: { email_jsonb?: Array<{ email: string }> } | null,
) => contact?.email_jsonb?.[0]?.email ?? null;

/** The record an email is about, with its client and contact. */
const loadEmailRecords = async (
  db: SupabaseClient,
  resource: "companies" | "deals" | "invoices" | "tickets",
  recordId: number,
) => {
  const contactColumns = "first_name, last_name, title, email_jsonb";
  if (resource === "companies") {
    const records = await loadCompanyRecords(db, recordId);
    if (!records) return null;
    const { data: contact } = await db
      .from("contacts")
      .select(contactColumns)
      .eq("company_id", recordId)
      .limit(1)
      .maybeSingle();
    return { records, to: firstEmail(contact) };
  }
  const columns = {
    deals:
      "id, name, stage, amount, expected_closing_date, description, company_id, contact_ids",
    invoices:
      "id, type, number, status, issue_date, due_date, total, amount_paid, payment_link_url, company_id, contact_id",
    tickets: "id, number, subject, description, status, company_id, contact_id",
  }[resource];
  const { data: record } = await db
    .from(resource)
    .select(columns)
    .eq("id", recordId)
    .maybeSingle();
  if (!record) return null;
  const row = record as Record<string, unknown>;
  const contactId =
    resource === "deals"
      ? (row.contact_ids as number[] | null)?.[0]
      : (row.contact_id as number | null);
  const [{ data: company }, { data: contact }, extra] = await Promise.all([
    row.company_id
      ? db
          .from("companies")
          .select("name, city")
          .eq("id", row.company_id)
          .maybeSingle()
      : { data: null },
    contactId
      ? db
          .from("contacts")
          .select(contactColumns)
          .eq("id", contactId)
          .maybeSingle()
      : { data: null },
    resource === "deals"
      ? db
          .from("deal_notes")
          .select("text, date")
          .eq("deal_id", recordId)
          .order("date", { ascending: false })
          .limit(5)
      : resource === "tickets"
        ? db
            .from("ticket_comments")
            .select("body, is_from_client, created_at")
            .eq("ticket_id", recordId)
            .eq("is_internal", false)
            .order("created_at", { ascending: false })
            .limit(5)
        : { data: [] },
  ]);
  const { email_jsonb: _emails, ...contactDetails } = (contact ?? {}) as Record<
    string,
    unknown
  >;
  return {
    records: {
      [resource.slice(0, -1)]: record,
      company,
      contact: contact ? contactDetails : null,
      recent_activity: extra.data ?? [],
    },
    to: firstEmail(contact as { email_jsonb?: Array<{ email: string }> }),
  };
};

/** Runs the model's CRM lookup as the user, so RLS applies. */
const runQuery = async (db: SupabaseClient, rawArguments: string) => {
  const input = parseQueryInput(parseToolArguments(rawArguments));
  if ("error" in input) return JSON.stringify({ error: input.error });
  const spec = QUERYABLE[input.resource];
  let query = db
    .from(input.resource)
    .select(spec.columns)
    .order(spec.order, { ascending: false, nullsFirst: false })
    .limit(input.limit);
  if (input.search) {
    query = query.or(
      spec.search
        .map((column) => `${column}.ilike.*${input.search}*`)
        .join(","),
    );
  }
  if (input.status) {
    if (input.resource === "tasks") {
      query =
        input.status === "open"
          ? query.is("done_date", null)
          : query.not("done_date", "is", null);
    } else if (spec.status) {
      query = query.eq(spec.status, input.status);
    }
  }
  if (input.companyId) {
    query = query.eq(
      input.resource === "companies" ? "id" : "company_id",
      input.companyId,
    );
  }
  const { data, error } = await query;
  if (error) return JSON.stringify({ error: "That lookup failed." });
  return JSON.stringify({ rows: data ?? [] });
};

interface Outcome {
  body: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
}

const handle = async (
  req: Request,
  request: AssistantRequest,
  config: ModelConfig,
  senderName: string,
): Promise<Outcome> => {
  const db = getUserClient(req);
  const today = indianToday();
  const system: ChatMessage = { role: "system", content: SYSTEM_PROMPT };

  if (request.action === "summarize_company") {
    const records = await loadCompanyRecords(db, request.companyId);
    if (!records)
      return {
        body: { ok: false, reason: "not found" },
        inputTokens: 0,
        outputTokens: 0,
      };
    const result = await chat(
      config,
      [system, { role: "user", content: summaryPrompt(records, today) }],
      { maxTokens: 1500 },
    );
    return {
      body: { ok: true, text: stripReasoning(result.message.content) },
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  }

  if (request.action === "draft_email") {
    const loaded = await loadEmailRecords(
      db,
      request.resource,
      request.recordId,
    );
    if (!loaded)
      return {
        body: { ok: false, reason: "not found" },
        inputTokens: 0,
        outputTokens: 0,
      };
    const result = await chat(
      config,
      [
        system,
        {
          role: "user",
          content: emailPrompt(
            loaded.records,
            request.purpose,
            senderName,
            today,
          ),
        },
      ],
      { maxTokens: 1200 },
    );
    return {
      body: {
        ok: true,
        ...parseEmailDraft(stripReasoning(result.message.content)),
        to: loaded.to,
      },
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  }

  // Questions: let the model look things up, a few rounds at most
  const messages: ChatMessage[] = [
    system,
    ...request.history,
    { role: "user", content: `Today is ${today}.\n\n${request.question}` },
  ];
  let inputTokens = 0;
  let outputTokens = 0;
  for (let turn = 0; turn < MAX_ASK_TURNS; turn++) {
    const isLastTurn = turn === MAX_ASK_TURNS - 1;
    const result = await chat(config, messages, {
      tools: isLastTurn ? undefined : [QUERY_TOOL],
      maxTokens: 1500,
    });
    inputTokens += result.inputTokens;
    outputTokens += result.outputTokens;
    const calls = result.message.tool_calls ?? [];
    if (!calls.length) {
      return {
        body: { ok: true, text: stripReasoning(result.message.content) },
        inputTokens,
        outputTokens,
      };
    }
    messages.push(result.message);
    // Every call gets an answer, so the conversation stays valid
    for (const call of calls) {
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content:
          call.function.name === QUERY_TOOL_NAME
            ? await runQuery(db, call.function.arguments)
            : JSON.stringify({ error: "Unknown tool." }),
      });
    }
  }
  return {
    body: {
      ok: true,
      text: "I couldn't finish looking that up. Try a narrower question.",
    },
    inputTokens,
    outputTokens,
  };
};

const answer = async (
  req: Request,
  sale: { id: number; first_name: string; last_name?: string },
) => {
  const body = await req.json().catch(() => null);
  const request = parseAssistantRequest(
    (body ?? {}) as Record<string, unknown>,
  );
  if ("error" in request) return createErrorResponse(400, request.error);

  const config = getModelConfig();
  if (!config) return json({ ok: false, reason: "ai_not_configured" });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("sales_id", sale.id)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT_PER_PERSON) {
    return json({ ok: false, reason: "daily_limit" });
  }

  const log = (outcome: string, inputTokens = 0, outputTokens = 0) =>
    supabaseAdmin.from("ai_requests").insert({
      sales_id: sale.id,
      action: request.action,
      resource:
        request.action === "draft_email"
          ? request.resource
          : request.action === "summarize_company"
            ? "companies"
            : null,
      record_id:
        request.action === "draft_email"
          ? request.recordId
          : request.action === "summarize_company"
            ? request.companyId
            : null,
      model: config.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      outcome,
    });

  try {
    const sender = `${sale.first_name} ${sale.last_name ?? ""}`.trim();
    const outcome = await handle(req, request, config, sender);
    await log(
      outcome.body.ok ? "ok" : String(outcome.body.reason),
      outcome.inputTokens,
      outcome.outputTokens,
    );
    return json(outcome.body);
  } catch (error) {
    console.error("ai_assistant failed", error);
    await log("error");
    const reason =
      error instanceof ModelError && error.status === 429
        ? "busy"
        : "model_error";
    return json({ ok: false, reason });
  }
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
        return answer(req, sale);
      }),
    ),
  ),
);
