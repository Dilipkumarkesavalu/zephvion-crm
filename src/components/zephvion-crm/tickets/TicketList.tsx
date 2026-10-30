import { formatDistanceToNow } from "date-fns";
import { LifeBuoy } from "lucide-react";
import { useGetIdentity, useListContext, useTranslate } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { SearchInput } from "@/components/admin/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TopToolbar } from "../layout/TopToolbar";
import { formatSaleName } from "../sales/saleName";
import type { Sale, Ticket } from "../types";
import { SavedViewsMenu } from "../views/SavedViewsMenu";
import {
  TicketDeadline,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "./TicketBadges";

const filters = [<SearchInput source="q" alwaysOn key="q" />];

const OPEN = "(open,in_progress,waiting_client)";
const DONE = "(resolved,closed)";

const TAB_IDS = ["open", "mine", "waiting_client", "done", "all"] as const;
type TabId = (typeof TAB_IDS)[number];

const tabFilter = (id: TabId, salesId: unknown): Record<string, unknown> => {
  switch (id) {
    case "open":
      return { "status@in": OPEN };
    case "mine":
      return { "status@in": OPEN, sales_id: salesId };
    case "waiting_client":
      return { status: "waiting_client" };
    case "done":
      return { "status@in": DONE };
    default:
      return {};
  }
};

export const TicketList = () => {
  const translate = useTranslate();
  return (
    <List
      resource="tickets"
      title={translate("resources.tickets.name", { smart_count: 2 })}
      filters={filters}
      filterDefaultValues={{ "status@in": OPEN }}
      actions={
        <TopToolbar>
          <SavedViewsMenu resource="tickets" />
          <CreateButton label="resources.tickets.action.new" />
        </TopToolbar>
      }
      sort={{ field: "created_at", order: "DESC" }}
      perPage={25}
      empty={<TicketEmpty />}
    >
      <StatusTabs />
      <TicketTable />
    </List>
  );
};

const StatusTabs = () => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const { filterValues, setFilters, displayedFilters } = useListContext();
  const {
    status: _status,
    "status@in": _statusIn,
    sales_id: _salesId,
    ...rest
  } = filterValues;
  const current =
    TAB_IDS.find((id) => {
      const filter = tabFilter(id, identity?.id);
      return (
        filter.status === filterValues.status &&
        filter["status@in"] === filterValues["status@in"] &&
        String(filter.sales_id ?? "") === String(filterValues.sales_id ?? "")
      );
    }) ?? "all";

  return (
    <Tabs
      value={current}
      onValueChange={(value) =>
        setFilters(
          { ...rest, ...tabFilter(value as TabId, identity?.id) },
          displayedFilters,
        )
      }
      className="mb-2"
    >
      <TabsList>
        {TAB_IDS.map((id) => (
          <TabsTrigger key={id} value={id}>
            {translate(`resources.tickets.tabs.${id}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

const TicketTable = () => {
  const translate = useTranslate();
  return (
    <DataTable<Ticket> rowClick="show" bulkActionButtons={false}>
      <DataTable.Col
        source="number"
        render={(record) => {
          const ticket = record as Ticket;
          return (
            <div className="flex flex-col">
              <span className="font-medium">{ticket.subject}</span>
              <span className="text-xs text-muted-foreground">
                {ticket.number}
                {ticket.company_id != null ? " · " : ""}
                {ticket.company_id != null ? (
                  <ReferenceField
                    record={ticket}
                    source="company_id"
                    reference="companies"
                    link={false}
                  />
                ) : null}
              </span>
            </div>
          );
        }}
      />
      <DataTable.Col
        source="priority"
        render={(record) => (
          <TicketPriorityBadge priority={(record as Ticket).priority} />
        )}
      />
      <DataTable.Col
        source="status"
        render={(record) => {
          const ticket = record as Ticket;
          return (
            <div className="flex flex-col items-start gap-1">
              <TicketStatusBadge status={ticket.status} />
              <TicketDeadline ticket={ticket} />
            </div>
          );
        }}
      />
      <DataTable.Col source="sales_id">
        <ReferenceField<Ticket, Sale>
          source="sales_id"
          reference="sales"
          link={false}
          render={({ referenceRecord }) =>
            referenceRecord ? formatSaleName(referenceRecord as Sale) : null
          }
          empty={
            <span className="text-muted-foreground">
              {translate("resources.tickets.unassigned")}
            </span>
          }
        />
      </DataTable.Col>
      <DataTable.Col
        source="created_at"
        render={(record) =>
          formatDistanceToNow(new Date((record as Ticket).created_at), {
            addSuffix: true,
          })
        }
      />
    </DataTable>
  );
};

const TicketEmpty = () => {
  const translate = useTranslate();
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <LifeBuoy className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">
        {translate("resources.tickets.empty")}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {translate("resources.tickets.empty_hint")}
      </p>
      <CreateButton label="resources.tickets.action.new" />
    </div>
  );
};
