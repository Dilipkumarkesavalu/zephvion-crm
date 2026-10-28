import { formatDistanceToNow } from "date-fns";
import { Inbox } from "lucide-react";
import { useListContext, useTranslate } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { SearchInput } from "@/components/admin/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { formatMoney } from "../invoices/invoiceModel";
import { TopToolbar } from "../layout/TopToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatSaleName } from "../sales/saleName";
import type { Lead, Sale } from "../types";
import { SavedViewsMenu } from "../views/SavedViewsMenu";
import { LeadScoreBadge, LeadSla, LeadStatusBadge } from "./LeadBadges";
import { leadFullName, OPEN_LEAD_STATUSES } from "./leadModel";

const filters = [<SearchInput source="q" alwaysOn key="q" />];

const OPEN_FILTER = `(${OPEN_LEAD_STATUSES.join(",")})`;

const TABS: Array<{ id: string; filter: Record<string, string> }> = [
  { id: "open", filter: { "status@in": OPEN_FILTER } },
  { id: "new", filter: { status: "new" } },
  { id: "qualified", filter: { status: "qualified" } },
  { id: "converted", filter: { status: "converted" } },
  { id: "disqualified", filter: { status: "disqualified" } },
  { id: "all", filter: {} },
];

export const LeadList = () => {
  const translate = useTranslate();
  return (
    <List
      resource="leads"
      title={translate("resources.leads.name", { smart_count: 2 })}
      filters={filters}
      filterDefaultValues={{ "status@in": OPEN_FILTER }}
      actions={<LeadListActions />}
      sort={{ field: "created_at", order: "DESC" }}
      perPage={25}
      empty={<LeadEmpty />}
    >
      <StatusTabs />
      <LeadTable />
    </List>
  );
};

const LeadListActions = () => (
  <TopToolbar>
    <SavedViewsMenu resource="leads" />
    <CreateButton label="resources.leads.action.new" />
  </TopToolbar>
);

const StatusTabs = () => {
  const translate = useTranslate();
  const { filterValues, setFilters, displayedFilters } = useListContext();
  const { status: _status, "status@in": _statusIn, ...rest } = filterValues;
  const current =
    TABS.find(
      (tab) =>
        tab.filter.status === filterValues.status &&
        tab.filter["status@in"] === filterValues["status@in"],
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
            {translate(`resources.leads.tabs.${tab.id}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

const LeadTable = () => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  return (
    <DataTable<Lead> rowClick="show" bulkActionButtons={false}>
      <DataTable.Col
        source="first_name"
        label="resources.leads.fields.lead"
        render={(lead) => (
          <div className="flex flex-col">
            <span className="font-medium">{leadFullName(lead as Lead)}</span>
            <span className="text-xs text-muted-foreground">
              {lead.company_name ?? lead.email ?? lead.phone}
            </span>
          </div>
        )}
      />
      <DataTable.Col
        source="score"
        render={(lead) => <LeadScoreBadge score={lead.score} />}
      />
      <DataTable.Col
        source="service"
        render={(lead) => (
          <div className="flex flex-col">
            <span>{lead.service ?? "—"}</span>
            {lead.budget ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatMoney(lead.budget, currency)}
              </span>
            ) : null}
          </div>
        )}
      />
      <DataTable.Col
        source="source"
        render={(lead) => translate(`resources.leads.sources.${lead.source}`)}
      />
      <DataTable.Col
        source="status"
        render={(lead) => (
          <div className="flex flex-col items-start gap-1">
            <LeadStatusBadge status={lead.status} />
            <LeadSla lead={lead as Lead} />
          </div>
        )}
      />
      <DataTable.Col source="sales_id">
        <ReferenceField<Lead, Sale>
          source="sales_id"
          reference="sales"
          link={false}
          render={({ referenceRecord }) =>
            referenceRecord ? formatSaleName(referenceRecord as Sale) : null
          }
          empty={
            <span className="text-muted-foreground">
              {translate("resources.leads.unassigned")}
            </span>
          }
        />
      </DataTable.Col>
      <DataTable.Col
        source="created_at"
        render={(lead) =>
          formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })
        }
      />
    </DataTable>
  );
};

const LeadEmpty = () => {
  const translate = useTranslate();
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <Inbox className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">
        {translate("resources.leads.empty")}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {translate("resources.leads.empty_hint")}
      </p>
      <CreateButton label="resources.leads.action.new" />
    </div>
  );
};
