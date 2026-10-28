import { useRecordContext, useTranslate } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { ReferenceField } from "@/components/admin/reference-field";
import { Badge } from "@/components/ui/badge";

import { TopToolbar } from "../layout/TopToolbar";
import { DepartmentDot } from "../organisation/Departments";
import type { Department, Sale } from "../types";
import { isAdminRole } from "./roles";

const SalesListActions = () => (
  <TopToolbar>
    <ExportButton />
    <CreateButton label="resources.sales.action.new" />
  </TopToolbar>
);

const filters = [<SearchInput source="q" alwaysOn />];

const OptionsField = (_props: { label?: string | boolean }) => {
  const record = useRecordContext();
  const translate = useTranslate();
  if (!record) return null;
  return (
    <div className="flex flex-row gap-1">
      {record.role ? (
        <Badge
          variant="outline"
          className={
            isAdminRole(record.role)
              ? "border-blue-300 dark:border-blue-700"
              : undefined
          }
        >
          {translate(`crm.roles.${record.role}`)}
        </Badge>
      ) : (
        record.administrator && (
          <Badge
            variant="outline"
            className="border-blue-300 dark:border-blue-700"
          >
            {translate("resources.sales.fields.administrator")}
          </Badge>
        )
      )}
      {record.disabled && (
        <Badge
          variant="outline"
          className="border-orange-300 dark:border-orange-700"
        >
          {translate("resources.sales.fields.disabled")}
        </Badge>
      )}
    </div>
  );
};

export function SalesList() {
  return (
    <List
      filters={filters}
      actions={<SalesListActions />}
      sort={{ field: "first_name", order: "ASC" }}
    >
      <DataTable bulkActionButtons={false}>
        <DataTable.Col source="first_name" />
        <DataTable.Col source="last_name" />
        <DataTable.Col source="email" />
        <DataTable.Col source="department_id">
          <ReferenceField<Sale, Department>
            source="department_id"
            reference="departments"
            link={false}
            render={({ referenceRecord }) =>
              referenceRecord ? (
                <span className="flex items-center gap-2">
                  <DepartmentDot color={referenceRecord.color} />
                  {referenceRecord.name}
                </span>
              ) : null
            }
          />
        </DataTable.Col>
        <DataTable.Col label={false}>
          <OptionsField />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}
