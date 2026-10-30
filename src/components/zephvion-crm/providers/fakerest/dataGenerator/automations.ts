import { RULE_TEMPLATES } from "../../../automations/automationModel";
import type { AutomationRule, AutomationRun } from "../../../types";
import type { Db } from "./types";

const HOUR_MS = 60 * 60 * 1000;

/**
 * The first three templates switched on, with a little history, so the
 * demo's Automations page shows what rules do. The demo has no database
 * to run them, so they never fire here.
 */
export const generateAutomations = (
  db: Db,
): { automation_rules: AutomationRule[]; automation_runs: AutomationRun[] } => {
  const now = Date.now();
  const rules: AutomationRule[] = RULE_TEMPLATES.slice(0, 3).map(
    (template, index) => ({
      ...template,
      id: index + 1,
      is_active: index !== 2,
      sales_id: 0,
      run_count: [4, 2, 0][index],
      last_run_at:
        index < 2
          ? new Date(now - (index + 1) * 26 * HOUR_MS).toISOString()
          : null,
      created_at: new Date(now - 30 * 24 * HOUR_MS).toISOString(),
      updated_at: new Date(now - 30 * 24 * HOUR_MS).toISOString(),
    }),
  );
  const wonDeals = db.deals.filter((deal) => deal.stage === "won").slice(0, 4);
  const urgent = db.tickets.filter((ticket) => ticket.priority === "urgent");
  const runs: AutomationRun[] = [
    ...wonDeals.map((deal, index) => ({
      id: index + 1,
      rule_id: 1,
      resource: "deals",
      record_id: deal.id,
      outcome: "task created",
      created_at: new Date(now - (index + 1) * 26 * HOUR_MS).toISOString(),
    })),
    ...urgent.map((ticket, index) => ({
      id: wonDeals.length + index + 1,
      rule_id: 2,
      resource: "tickets",
      record_id: ticket.id,
      outcome: "notified",
      created_at: ticket.created_at,
    })),
  ];
  return { automation_rules: rules, automation_runs: runs };
};
