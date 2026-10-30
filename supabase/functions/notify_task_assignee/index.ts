import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import { getCrmUrl, getMailer } from "../_shared/mailer.ts";
import { buildTaskEmail } from "./taskEmail.ts";

/**
 * Emails a task's assignee when someone else assigned it to them.
 *
 * The recipient always comes from the task row, never from the request, so
 * a caller can only notify the person a task is actually assigned to.
 *
 * Secrets (supabase secrets set ...): SMTP_HOST, SMTP_PORT, SMTP_USER,
 * SMTP_PASSWORD, optional SMTP_FROM_NAME and CRM_URL.
 */

const json = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const fullName = (person: { first_name: string; last_name?: string | null }) =>
  `${person.first_name} ${person.last_name ?? ""}`.trim();

async function notifyAssignee(req: Request, callerId: number) {
  const body = await req.json().catch(() => null);
  const taskId = Number(body?.task_id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return createErrorResponse(400, "task_id is required");
  }

  const { data: task, error } = await supabaseAdmin
    .from("tasks")
    .select(
      "id, text, type, due_date, done_date, sales_id, contact:contacts(first_name, last_name), contact_id",
    )
    .eq("id", taskId)
    .maybeSingle();
  if (error) {
    console.error("notify_task_assignee: failed to load task", error);
    return createErrorResponse(500, "Failed to load task");
  }
  if (!task) return createErrorResponse(404, "Task not found");

  if (task.sales_id == null || task.sales_id === callerId) {
    return json({ sent: false, reason: "no one else to notify" });
  }
  const { data: assignee } = await supabaseAdmin
    .from("sales")
    .select("id, email, first_name, last_name, disabled")
    .eq("id", task.sales_id)
    .maybeSingle();
  if (!assignee?.email || assignee.disabled || assignee.id === callerId) {
    return json({ sent: false, reason: "no one else to notify" });
  }
  if (task.done_date) return json({ sent: false, reason: "task is done" });

  const mail = getMailer();
  if (!mail) return json({ sent: false, reason: "email is not configured" });

  const { data: caller } = await supabaseAdmin
    .from("sales")
    .select("first_name, last_name")
    .eq("id", callerId)
    .single();
  const contact = task.contact as {
    first_name: string;
    last_name: string | null;
  } | null;
  const crmUrl = getCrmUrl();

  const email = buildTaskEmail({
    assigneeFirstName: assignee.first_name,
    assignerName: caller ? fullName(caller) : "A teammate",
    taskText: task.text,
    taskType: task.type,
    dueDate: task.due_date,
    contactName: contact ? fullName(contact) : null,
    link: `${crmUrl}#/contacts/${task.contact_id}/show`,
  });

  try {
    await mail.transporter.sendMail({
      from: mail.from,
      to: assignee.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (e) {
    console.error("notify_task_assignee: failed to send email", e);
    return createErrorResponse(502, "Failed to send email");
  }
  return json({ sent: true });
}

Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async (req) =>
    AuthMiddleware(req, async (req) =>
      UserMiddleware(req, async (req, user) => {
        const currentUserSale = await getUserSale(user);
        if (!currentUserSale) {
          return createErrorResponse(401, "Unauthorized");
        }
        if (req.method !== "POST") {
          return createErrorResponse(405, "Method Not Allowed");
        }
        try {
          return await notifyAssignee(req, currentUserSale.id);
        } catch (e) {
          console.error("Unhandled error in notify_task_assignee:", e);
          return createErrorResponse(500, "Internal Server Error");
        }
      }),
    ),
  ),
);
