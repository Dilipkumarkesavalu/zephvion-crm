import { FilePlus2, FileText } from "lucide-react";
import { useListContext, useTranslate } from "ra-core";
import { Link } from "react-router";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { SearchInput } from "@/components/admin/search-input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TopToolbar } from "../layout/TopToolbar";
import { SavedViewsMenu } from "../views/SavedViewsMenu";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Invoice, InvoiceType } from "../types";
import { formatISODateString } from "../deals/dealUtils";
import { formatMoney } from "./invoiceModel";
import { InvoiceStatusBadge, InvoiceTypeBadge } from "./InvoiceStatusBadge";
import { InvoiceSummary } from "./InvoiceSummary";

const filters = [<SearchInput source="q" alwaysOn key="q" />];

export const InvoiceList = () => {
  const translate = useTranslate();
  return (
    <div className="mt-4">
      <InvoiceSummary />
      <List
        resource="invoices"
        title={translate("resources.invoices.name", { smart_count: 2 })}
        filters={filters}
        actions={<InvoiceListActions />}
        sort={{ field: "issue_date", order: "DESC" }}
        perPage={25}
        empty={<InvoiceEmpty />}
      >
        <TypeTabs />
        <InvoiceTable />
      </List>
    </div>
  );
};

const InvoiceTable = () => {
  const { currency } = useConfigurationContext();
  return (
    <DataTable<Invoice> rowClick="show" bulkActionButtons={false}>
      <DataTable.Col
        source="number"
        render={(record) => (
          <div className="flex flex-col">
            <span className="font-medium">{record.number}</span>
            <InvoiceTypeBadge type={record.type} />
          </div>
        )}
      />
      <DataTable.Col source="company_id">
        <ReferenceField
          source="company_id"
          reference="companies"
          link={false}
        />
      </DataTable.Col>
      <DataTable.Col source="deal_id" disableSort>
        <ReferenceField
          source="deal_id"
          reference="deals"
          link={false}
          empty={<span className="text-muted-foreground">—</span>}
        />
      </DataTable.Col>
      <DataTable.Col
        source="issue_date"
        render={(record) => formatISODateString(record.issue_date)}
      />
      <DataTable.Col
        source="due_date"
        render={(record) =>
          record.due_date ? formatISODateString(record.due_date) : "—"
        }
      />
      <DataTable.Col
        source="status"
        render={(record) => <InvoiceStatusBadge invoice={record as Invoice} />}
      />
      <DataTable.Col
        source="total"
        headerClassName="text-right"
        cellClassName="text-right tabular-nums font-medium"
        render={(record) => formatMoney(record.total, currency)}
      />
    </DataTable>
  );
};

const TYPE_TABS: Array<InvoiceType | "all"> = ["all", "quote", "invoice"];

const TypeTabs = () => {
  const translate = useTranslate();
  const { filterValues, setFilters, displayedFilters } = useListContext();
  const current = (filterValues.type as InvoiceType | undefined) ?? "all";

  const handleChange = (value: string) => {
    const { type: _omit, ...rest } = filterValues;
    setFilters(
      value === "all" ? rest : { ...rest, type: value },
      displayedFilters,
    );
  };

  return (
    <Tabs value={current} onValueChange={handleChange} className="mb-2">
      <TabsList>
        {TYPE_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {translate(`resources.invoices.tabs.${tab}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

const InvoiceListActions = () => (
  <TopToolbar>
    <SavedViewsMenu resource="invoices" />
    <NewDocumentButtons />
  </TopToolbar>
);

const NewDocumentButtons = () => {
  const translate = useTranslate();
  return (
    <>
      <Button asChild variant="outline" size="sm">
        <Link to="/invoices/create" state={{ record: { type: "quote" } }}>
          <FileText />
          {translate("resources.invoices.action.new_quote")}
        </Link>
      </Button>
      <Button asChild size="sm">
        <Link to="/invoices/create" state={{ record: { type: "invoice" } }}>
          <FilePlus2 />
          {translate("resources.invoices.action.new_invoice")}
        </Link>
      </Button>
    </>
  );
};

const InvoiceEmpty = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <FileText className="size-10 text-muted-foreground" />
      <h3 className="text-lg font-semibold">
        {translate("resources.invoices.empty.title")}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {translate("resources.invoices.empty.description")}
      </p>
      <div className="flex gap-2">
        <NewDocumentButtons />
      </div>
    </div>
  );
};
