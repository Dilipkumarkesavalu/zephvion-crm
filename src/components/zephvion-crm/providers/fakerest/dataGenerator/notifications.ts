import type { AuditLogEntry, Notification } from "../../../types";
import type { Db } from "./types";

const HOUR = 60 * 60 * 1000;
const DEMO_USER_ID = 0;

/**
 * The database writes these with triggers; the demo has none, so it starts
 * with a few recent assignments to the demo user.
 */
export const generateNotifications = (db: Db): Notification[] => {
  const tasks = db.tasks
    .filter((task) => !task.done_date && task.sales_id === DEMO_USER_ID)
    .slice(0, 3);
  const deals = db.deals
    .filter((deal) => deal.sales_id === DEMO_USER_ID)
    .slice(0, 2);
  const assigners = db.sales.filter((sale) => sale.id !== DEMO_USER_ID);

  const items = [
    ...tasks.map((task) => ({
      resource: "tasks",
      record_id: task.id,
      title: task.text,
    })),
    ...deals.map((deal) => ({
      resource: "deals",
      record_id: deal.id,
      title: deal.name,
    })),
  ];

  return items.map((item, index) => ({
    id: index + 1,
    created_at: new Date(Date.now() - (index * 5 + 1) * HOUR).toISOString(),
    recipient_sales_id: DEMO_USER_ID,
    actor_sales_id: assigners.at(index % assigners.length)?.id ?? null,
    type: `${item.resource}_assigned`,
    resource: item.resource,
    record_id: item.record_id,
    title: item.title,
    read_at: index < 3 ? null : new Date().toISOString(),
  }));
};

export const generateAuditLog = (db: Db): AuditLogEntry[] =>
  db.deals.slice(0, 8).map((deal, index) => ({
    id: index + 1,
    created_at: new Date(Date.now() - (index * 7 + 2) * HOUR).toISOString(),
    table_name: "deals",
    record_id: String(deal.id),
    action: index % 3 === 0 ? "insert" : "update",
    sales_id: deal.sales_id ?? DEMO_USER_ID,
    changes:
      index % 3 === 0
        ? { name: deal.name, stage: deal.stage, amount: deal.amount }
        : { stage: ["discovery", deal.stage] },
  }));
