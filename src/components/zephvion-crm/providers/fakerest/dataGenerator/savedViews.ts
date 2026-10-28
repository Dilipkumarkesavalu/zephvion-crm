import type { SavedView } from "../../../types";
import type { Db } from "./types";

/** A few team views so the demo's Views menu is not empty. */
export const generateSavedViews = (_: Db): SavedView[] => {
  const createdAt = new Date().toISOString();
  return [
    {
      id: 1,
      sales_id: 0,
      resource: "contacts",
      name: "Hot leads",
      filter: { status: "hot" },
      is_shared: true,
      created_at: createdAt,
    },
    {
      id: 2,
      sales_id: 0,
      resource: "contacts",
      name: "Contacts with open tasks",
      filter: { "nb_tasks@gt": 0 },
      is_shared: false,
      created_at: createdAt,
    },
    {
      id: 3,
      sales_id: 1,
      resource: "companies",
      name: "Fintech clients",
      filter: { sector: "financials" },
      is_shared: true,
      created_at: createdAt,
    },
  ];
};
