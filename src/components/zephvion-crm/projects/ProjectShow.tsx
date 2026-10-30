import { format } from "date-fns";
import { ArrowLeft, Pencil } from "lucide-react";
import { ShowBase, useGetList, useShowContext, useTranslate } from "ra-core";
import { useMemo } from "react";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { formatMoney } from "../invoices/invoiceModel";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatSaleName } from "../sales/saleName";
import type {
  Invoice,
  Project,
  ProjectMilestone,
  Sale,
  TimeEntry,
} from "../types";
import { ProjectMilestones } from "./ProjectMilestones";
import {
  ProgressBar,
  ProjectHealthLabel,
  ProjectStatusBadge,
} from "./ProjectBadges";
import { summarizeProject } from "./projectModel";
import { ProjectTime } from "./ProjectTime";

const FETCH_ALL = { page: 1, perPage: 1000 };

export const ProjectShow = () => (
  <ShowBase>
    <ProjectShowContent />
  </ShowBase>
);

const ProjectShowContent = () => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const { record: project, isPending } = useShowContext<Project>();
  const projectFilter = { project_id: project?.id };
  const enabled = project?.id != null;
  const { data: milestones = [] } = useGetList<ProjectMilestone>(
    "project_milestones",
    {
      filter: projectFilter,
      pagination: FETCH_ALL,
      sort: { field: "position", order: "ASC" },
    },
    { enabled },
  );
  const { data: timeEntries = [] } = useGetList<TimeEntry>(
    "time_entries",
    {
      filter: projectFilter,
      pagination: FETCH_ALL,
      sort: { field: "spent_on", order: "DESC" },
    },
    { enabled },
  );
  const { data: invoices = [] } = useGetList<Invoice>(
    "invoices",
    {
      filter: projectFilter,
      pagination: FETCH_ALL,
      sort: { field: "issue_date", order: "DESC" },
    },
    { enabled },
  );
  const summary = useMemo(
    () =>
      project
        ? summarizeProject(project, milestones, timeEntries, invoices)
        : null,
    [project, milestones, timeEntries, invoices],
  );
  if (isPending || !project || !summary) return null;
  const money = (amount: number) => formatMoney(amount, currency);

  return (
    <div className="mx-auto mt-2 flex w-full max-w-4xl flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/projects">
            <ArrowLeft />
            {translate("resources.projects.name", { smart_count: 2 })}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <Link to={`/projects/${project.id}`}>
            <Pencil />
            {translate("ra.action.edit")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                <ReferenceField
                  record={project}
                  source="company_id"
                  reference="companies"
                />
                {project.sales_id != null ? (
                  <ReferenceField<Project, Sale>
                    record={project}
                    source="sales_id"
                    reference="sales"
                    link={false}
                    render={({ referenceRecord }) =>
                      referenceRecord
                        ? `${translate("resources.projects.fields.sales_id")}: ${formatSaleName(referenceRecord as Sale)}`
                        : null
                    }
                  />
                ) : null}
                <span>
                  {[project.start_date, project.due_date]
                    .map((date) =>
                      date ? format(new Date(date), "d MMM yyyy") : "…",
                    )
                    .join(" → ")}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <ProjectStatusBadge status={project.status} />
              <ProjectHealthLabel health={summary.health} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label={translate("resources.projects.summary.progress")}
              value={`${Math.round(summary.progress * 100)}%`}
              hint={translate("resources.projects.summary.milestones", {
                done: summary.milestonesDone,
                total: summary.milestonesTotal,
              })}
              bar={<ProgressBar value={summary.progress} />}
            />
            <Stat
              label={translate("resources.projects.summary.hours")}
              value={`${summary.hoursLogged} h`}
              hint={
                Number(project.budget_hours) > 0
                  ? translate("resources.projects.summary.hours_of", {
                      budget: project.budget_hours,
                    })
                  : translate("resources.projects.summary.billable", {
                      hours: summary.billableHours,
                    })
              }
              bar={
                summary.hoursUsed != null ? (
                  <ProgressBar value={summary.hoursUsed} isBudget />
                ) : undefined
              }
            />
            <Stat
              label={translate("resources.projects.summary.invoiced")}
              value={money(summary.invoiced)}
              hint={`${translate("resources.projects.summary.received", {
                amount: money(summary.received),
              })} · ${translate("resources.projects.summary.value", {
                amount: money(Number(project.budget)),
              })}`}
              bar={
                Number(project.budget) > 0 ? (
                  <ProgressBar
                    value={summary.invoiced / Number(project.budget)}
                  />
                ) : undefined
              }
            />
          </div>
          {project.description ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ProjectMilestones
        project={project}
        milestones={milestones}
        invoices={invoices}
        readyToBill={summary.readyToBill.length}
      />
      <ProjectTime
        project={project}
        milestones={milestones}
        timeEntries={timeEntries}
      />
    </div>
  );
};

const Stat = ({
  label,
  value,
  hint,
  bar,
}: {
  label: string;
  value: string;
  hint: string;
  bar?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="text-xl font-semibold tabular-nums">{value}</div>
    {bar}
    <div className="text-xs text-muted-foreground">{hint}</div>
  </div>
);
