import { toISODate } from "../../../invoices/invoiceModel";
import {
  defaultMilestones,
  projectFromDeal,
} from "../../../projects/projectModel";
import type {
  MilestoneStatus,
  Project,
  ProjectMilestone,
  TimeEntry,
} from "../../../types";
import type { Db } from "./types";

const DEMO_PROJECTS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

// How far each demo project has come: milestones done, and hours so far
const STAGES: Array<{
  status: Project["status"];
  milestones: MilestoneStatus[];
  hours: number[];
  startedDaysAgo: number;
  budgetHours: number;
}> = [
  {
    status: "active",
    milestones: ["done", "in_progress", "pending"],
    hours: [6, 4.5, 7, 3, 5.5, 8],
    startedDaysAgo: 24,
    budgetHours: 80,
  },
  {
    status: "active",
    milestones: ["done", "done", "pending"],
    hours: [8, 7.5, 6, 8, 7, 8, 6.5, 8, 7, 6],
    startedDaysAgo: 50,
    budgetHours: 72,
  },
  {
    status: "planning",
    milestones: ["in_progress", "pending", "pending"],
    hours: [2, 1.5],
    startedDaysAgo: 3,
    budgetHours: 40,
  },
  {
    status: "completed",
    milestones: ["done", "done", "done"],
    hours: [5, 6, 4, 7, 3.5],
    startedDaysAgo: 90,
    budgetHours: 30,
  },
];

const DESCRIPTIONS = [
  "Design reviews",
  "Front-end build",
  "Client call",
  "Content updates",
  "QA and fixes",
  "Deployment",
];

/** Projects for some won deals, with milestones and logged time. */
export const generateProjects = (
  db: Db,
): {
  projects: Project[];
  project_milestones: ProjectMilestone[];
  time_entries: TimeEntry[];
} => {
  const wonDeals = db.deals
    .filter((deal) => deal.stage === "won")
    .slice(0, DEMO_PROJECTS);
  const projects: Project[] = [];
  const milestones: ProjectMilestone[] = [];
  const timeEntries: TimeEntry[] = [];
  const now = Date.now();

  wonDeals.forEach((deal, index) => {
    const stage = STAGES[index % STAGES.length];
    const start = new Date(now - stage.startedDaysAgo * DAY_MS);
    const base = projectFromDeal(deal, start);
    const project: Project = {
      ...(base as Project),
      id: index + 1,
      status: stage.status,
      budget_hours: stage.budgetHours,
      created_at: start.toISOString(),
      updated_at: new Date(now).toISOString(),
    };
    projects.push(project);

    defaultMilestones(Number(project.budget)).forEach((milestone, position) => {
      const status = stage.milestones[position] ?? "pending";
      const due = new Date(start.getTime() + (position + 1) * 20 * DAY_MS);
      milestones.push({
        ...milestone,
        id: milestones.length + 1,
        project_id: project.id,
        status,
        due_date: toISODate(due),
        completed_at: status === "done" ? due.toISOString() : null,
        created_at: start.toISOString(),
      });
    });

    const team = db.sales.filter((sale) => !sale.disabled);
    stage.hours.forEach((hours, entryIndex) => {
      const spent = new Date(start.getTime() + (entryIndex + 1) * 2 * DAY_MS);
      timeEntries.push({
        id: timeEntries.length + 1,
        project_id: project.id,
        sales_id: team[(index + entryIndex) % team.length].id,
        spent_on: toISODate(spent.getTime() > now ? new Date(now) : spent),
        hours,
        description: DESCRIPTIONS[entryIndex % DESCRIPTIONS.length],
        billable: entryIndex % 4 !== 3,
        created_at: spent.toISOString(),
      });
    });
  });

  return {
    projects,
    project_milestones: milestones,
    time_entries: timeEntries,
  };
};
