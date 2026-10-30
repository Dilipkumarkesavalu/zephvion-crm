import type { AutomationEvent, AutomationRule } from "../types";

/** Which field each event's condition checks, and whether it counts days. */
export const EVENT_CONDITION: Record<
  AutomationEvent,
  { field: string; isDays: boolean; resource: string }
> = {
  deal_stage_changed: { field: "stage", isDays: false, resource: "deals" },
  lead_created: { field: "source", isDays: false, resource: "leads" },
  ticket_created: { field: "priority", isDays: false, resource: "tickets" },
  deal_idle: { field: "days", isDays: true, resource: "deals" },
  invoice_overdue: { field: "days", isDays: true, resource: "invoices" },
};

/** Leads have no contact yet, so they can only notify. */
export const canCreateTask = (event: AutomationEvent) =>
  event !== "lead_created";

export const ANY = "any";

export type RuleDraft = Pick<
  AutomationRule,
  "name" | "event" | "condition" | "action" | "action_config"
>;

/** Ready-made rules most agencies want on day one. */
export const RULE_TEMPLATES: RuleDraft[] = [
  {
    name: "Kick off won deals",
    event: "deal_stage_changed",
    condition: { stage: "won" },
    action: "create_task",
    action_config: {
      recipient: "owner",
      task_text: "Send the kick-off email and start the project",
      task_type: "email",
      due_days: 1,
    },
  },
  {
    name: "Alert on urgent tickets",
    event: "ticket_created",
    condition: { priority: "urgent" },
    action: "notify",
    action_config: { recipient: "owner", message: "Urgent ticket" },
  },
  {
    name: "Website lead arrived",
    event: "lead_created",
    condition: { source: "website" },
    action: "notify",
    action_config: { recipient: "owner", message: "New website lead" },
  },
  {
    name: "Nudge quiet deals",
    event: "deal_idle",
    condition: { days: 14 },
    action: "create_task",
    action_config: {
      recipient: "owner",
      task_text: "Follow up: no activity for 2 weeks",
      task_type: "follow-up",
      due_days: 1,
    },
  },
  {
    name: "Chase overdue invoices",
    event: "invoice_overdue",
    condition: { days: 7 },
    action: "notify",
    action_config: { recipient: "owner", message: "Invoice 7 days overdue" },
  },
];

/** The rule's condition value, or "any" when it applies to every record. */
export const getConditionValue = (
  rule: Pick<RuleDraft, "event" | "condition">,
) => {
  const { field, isDays } = EVENT_CONDITION[rule.event];
  const value = rule.condition?.[field];
  if (isDays) return Number(value) > 0 ? Number(value) : 14;
  return value == null || value === "" ? ANY : String(value);
};

/** Builds the stored rule from the form, dropping settings the action ignores. */
export const toRuleRecord = (draft: RuleDraft): RuleDraft => {
  const { field, isDays } = EVENT_CONDITION[draft.event];
  const raw = draft.condition?.[field];
  const condition = isDays
    ? { [field]: Math.min(365, Math.max(1, Math.round(Number(raw) || 14))) }
    : raw && raw !== ANY
      ? { [field]: String(raw) }
      : {};
  const action =
    draft.action === "create_task" && !canCreateTask(draft.event)
      ? "notify"
      : draft.action;
  const config = draft.action_config ?? {};
  const action_config =
    action === "notify"
      ? {
          recipient: config.recipient || "owner",
          message: (config.message ?? "").trim().slice(0, 120),
        }
      : {
          recipient: config.recipient || "owner",
          task_text: (config.task_text ?? "").trim().slice(0, 300),
          task_type: config.task_type || "none",
          due_days: Math.min(
            60,
            Math.max(0, Math.round(Number(config.due_days) || 1)),
          ),
        };
  return {
    name: draft.name.trim().slice(0, 120),
    event: draft.event,
    condition,
    action,
    action_config,
  };
};
