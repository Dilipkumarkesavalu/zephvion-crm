import type { Department } from "../../../types";
import type { Db } from "./types";

// Same defaults as the phase 1 database migration
export const DEPARTMENT_SEED: Array<Pick<Department, "name" | "color">> = [
  { name: "Leadership", color: "slate" },
  { name: "Sales and Business Development", color: "blue" },
  { name: "Delivery and Projects", color: "teal" },
  { name: "Design", color: "pink" },
  { name: "Engineering", color: "violet" },
  { name: "Marketing", color: "orange" },
  { name: "Finance and Accounts", color: "green" },
  { name: "Support and Customer Success", color: "amber" },
  { name: "HR and Admin", color: "gray" },
];

// Department id -> demo sales id of its head
const DEMO_HEADS: Record<number, number> = { 1: 0, 2: 1, 3: 2 };

export const generateDepartments = (_: Db): Department[] =>
  DEPARTMENT_SEED.map((department, index) => ({
    id: index + 1,
    ...department,
    head_sales_id: DEMO_HEADS[index + 1] ?? null,
    created_at: new Date().toISOString(),
  }));
