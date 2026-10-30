import { format } from "date-fns";
import { FolderKanban } from "lucide-react";
import { useGetList, useListContext, useTranslate } from "ra-core";
import { useMemo } from "react";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { SearchInput } from "@/components/admin/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TopToolbar } from "../layout/TopToolbar";
import { formatSaleName } from "../sales/saleName";
import type { Project, ProjectMilestone, Sale, TimeEntry } from "../types";
import { SavedViewsMenu } from "../views/SavedViewsMenu";
import {
  ProgressBar,
  ProjectHealthLabel,
  ProjectStatusBadge,
} from "./ProjectBadges";
import { summarizeProject } from "./projectModel";

const filters = [<SearchInput source="q" alwaysOn key="q" />];

const OPEN_FILTER = "(planning,active,on_hold)";
const TABS = [
  { id: "open", filter: { "status@in": OPEN_FILTER } },
  { id: "completed", filter: { status: "completed" } },
  { id: "all", filter: {} },
];

const FETCH_ALL = { page: 1, perPage: 2000 };

export const ProjectList = () => {
  const translate = useTranslate();
  return (
    <List
      resource="projects"
      title={translate("resources.projects.name", { smart_count: 2 })}
      filters={filters}
      filterDefaultValues={{ "status@in": OPEN_FILTER }}
      actions={
        <TopToolbar>
          <SavedViewsMenu resource="projects" />
          <CreateButton label="resources.projects.action.new" />
        </TopToolbar>
      }
      sort={{ field: "due_date", order: "ASC" }}
      perPage={25}
      empty={<ProjectEmpty />}
    >
      <StatusTabs />
      <ProjectTable />
    </List>
  );
};

const StatusTabs = () => {
  const translate = useTranslate();
  const { filterValues, setFilters, displayedFilters } = useListContext();
  const { status: _status, "status@in": _statusIn, ...rest } = filterValues;
  const current =
    TABS.find(
      (tab) =>
        (tab.filter as Record<string, string>).status === filterValues.status &&
        (tab.filter as Record<string, string>)["status@in"] ===
          filterValues["status@in"],
    )?.id ?? "all";
  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const tab = TABS.find((candidate) => candidate.id === value);
        setFilters({ ...rest, ...tab?.filter }, displayedFilters);
      }}
      className="mb-2"
    >
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {translate(`resources.projects.tabs.${tab.id}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

/** Milestones and time for the listed projects, fetched once for the page. */
const useProjectSummaries = (projects: Project[]) => {
  const ids = projects.map((project) => project.id);
  const filter = { "project_id@in": `(${ids.join(",")})` };
  const enabled = ids.length > 0;
  const { data: milestones = [] } = useGetList<ProjectMilestone>(
    "project_milestones",
    {
      filter,
      pagination: FETCH_ALL,
      sort: { field: "position", order: "ASC" },
    },
    { enabled },
  );
  const { data: timeEntries = [] } = useGetList<TimeEntry>(
    "time_entries",
    { filter, pagination: FETCH_ALL, sort: { field: "id", order: "ASC" } },
    { enabled },
  );
  return useMemo(
    () =>
      new Map(
        projects.map((project) => {
          const key = String(project.id);
          const own = <T extends { project_id: Project["id"] }>(rows: T[]) =>
            rows.filter((row) => String(row.project_id) === key);
          return [
            key,
            summarizeProject(project, own(milestones), own(timeEntries), []),
          ];
        }),
      ),
    [projects, milestones, timeEntries],
  );
};

const ProjectTable = () => {
  const translate = useTranslate();
  const { data: projects = [] } = useListContext<Project>();
  const summaries = useProjectSummaries(projects);
  return (
    <DataTable<Project> rowClick="show" bulkActionButtons={false}>
      <DataTable.Col
        source="name"
        render={(record) => {
          const project = record as Project;
          return (
            <div className="flex flex-col">
              <span className="font-medium">{project.name}</span>
              <ReferenceField
                record={project}
                source="company_id"
                reference="companies"
                link={false}
                className="text-xs text-muted-foreground"
              />
            </div>
          );
        }}
      />
      <DataTable.Col
        source="status"
        render={(record) => (
          <ProjectStatusBadge status={(record as Project).status} />
        )}
      />
      <DataTable.Col
        source="progress"
        label="resources.projects.fields.progress"
        disableSort
        render={(record) => {
          const summary = summaries.get(String(record.id));
          if (!summary) return null;
          return (
            <div className="flex w-32 flex-col gap-1">
              <ProgressBar value={summary.progress} />
              <span className="text-xs text-muted-foreground">
                {translate("resources.projects.summary.milestones", {
                  done: summary.milestonesDone,
                  total: summary.milestonesTotal,
                })}
              </span>
            </div>
          );
        }}
      />
      <DataTable.Col
        source="hours"
        label="resources.projects.fields.hours"
        disableSort
        render={(record) => {
          const summary = summaries.get(String(record.id));
          const project = record as Project;
          if (!summary) return null;
          return (
            <div className="flex w-28 flex-col gap-1">
              {summary.hoursUsed != null ? (
                <ProgressBar value={summary.hoursUsed} isBudget />
              ) : null}
              <span className="text-xs tabular-nums text-muted-foreground">
                {summary.hoursLogged}
                {Number(project.budget_hours) > 0
                  ? ` / ${project.budget_hours} h`
                  : " h"}
              </span>
            </div>
          );
        }}
      />
      <DataTable.Col
        source="due_date"
        render={(record) => {
          const project = record as Project;
          const summary = summaries.get(String(project.id));
          return (
            <div className="flex flex-col">
              <span>
                {project.due_date
                  ? format(new Date(project.due_date), "d MMM yyyy")
                  : "—"}
              </span>
              {summary ? <ProjectHealthLabel health={summary.health} /> : null}
            </div>
          );
        }}
      />
      <DataTable.Col source="sales_id">
        <ReferenceField<Project, Sale>
          source="sales_id"
          reference="sales"
          link={false}
          render={({ referenceRecord }) =>
            referenceRecord ? formatSaleName(referenceRecord as Sale) : null
          }
        />
      </DataTable.Col>
    </DataTable>
  );
};

const ProjectEmpty = () => {
  const translate = useTranslate();
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <FolderKanban className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">
        {translate("resources.projects.empty")}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {translate("resources.projects.empty_hint")}
      </p>
      <CreateButton label="resources.projects.action.new" />
    </div>
  );
};
