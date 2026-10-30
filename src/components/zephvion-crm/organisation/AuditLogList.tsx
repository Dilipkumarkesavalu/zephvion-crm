import { useRecordContext, useTranslate } from "ra-core";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { Badge } from "@/components/ui/badge";

import { formatSaleName } from "../sales/saleName";
import type { AuditLogEntry, Sale } from "../types";

const AUDITED_TABLES = [
  "leads",
  "projects",
  "companies",
  "contacts",
  "deals",
  "tasks",
  "invoices",
  "sales",
  "departments",
];

const MAX_FIELDS_SHOWN = 4;

// Noise that changes on most saves and says nothing to a reader
const HIDDEN_FIELDS = new Set(["updated_at", "last_seen", "index"]);

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const ACTION_STYLES: Record<AuditLogEntry["action"], string> = {
  insert: "border-green-300 dark:border-green-700",
  update: "border-blue-300 dark:border-blue-700",
  delete: "border-red-300 dark:border-red-700",
};

const RecordCell = (_props: { label?: string }) => {
  const record = useRecordContext<AuditLogEntry>();
  const translate = useTranslate();
  if (!record) return null;
  return (
    <span className="flex items-center gap-2">
      <Badge variant="outline" className={ACTION_STYLES[record.action]}>
        {translate(`crm.audit.actions.${record.action}`)}
      </Badge>
      <span>
        {translate(`crm.audit.tables.${record.table_name}`, {
          _: record.table_name,
        })}{" "}
        <span className="text-muted-foreground">#{record.record_id}</span>
      </span>
    </span>
  );
};

/** Updates list "field: old → new"; creations and deletions list the fields. */
const ChangesCell = (_props: { label?: string }) => {
  const record = useRecordContext<AuditLogEntry>();
  const translate = useTranslate();
  if (!record) return null;
  const entries = Object.entries(record.changes ?? {}).filter(
    ([field]) => !HIDDEN_FIELDS.has(field),
  );
  const shown = entries.slice(0, MAX_FIELDS_SHOWN);
  const hidden = entries.length - shown.length;
  return (
    <ul className="flex flex-col gap-0.5 text-sm">
      {shown.map(([field, value]) => (
        <li key={field} className="max-w-xl truncate">
          <span className="font-medium">{field}</span>
          <span className="text-muted-foreground">: </span>
          {record.action === "update" && Array.isArray(value) ? (
            <>
              <span className="text-muted-foreground line-through">
                {formatValue(value.at(0))}
              </span>
              {" → "}
              <span>{formatValue(value.at(1))}</span>
            </>
          ) : (
            <span>{formatValue(value)}</span>
          )}
        </li>
      ))}
      {hidden > 0 ? (
        <li className="text-muted-foreground">
          {translate("crm.audit.more_fields", { smart_count: hidden })}
        </li>
      ) : null}
    </ul>
  );
};

const WhoCell = (_props: { label?: string }) => {
  const record = useRecordContext<AuditLogEntry>();
  const translate = useTranslate();
  if (!record) return null;
  if (record.sales_id == null) {
    return (
      <span className="text-muted-foreground">
        {translate("crm.audit.system")}
      </span>
    );
  }
  return (
    <ReferenceField<AuditLogEntry, Sale>
      source="sales_id"
      reference="sales"
      link={false}
      render={({ referenceRecord }) =>
        referenceRecord ? formatSaleName(referenceRecord as Sale) : null
      }
    />
  );
};

const useAuditFilters = () => {
  const translate = useTranslate();
  return [
    <SelectInput
      key="table_name"
      source="table_name"
      label="resources.audit_log.fields.table_name"
      choices={AUDITED_TABLES.map((table) => ({
        id: table,
        name: translate(`crm.audit.tables.${table}`),
      }))}
      alwaysOn
    />,
    <ReferenceInput
      key="sales_id"
      source="sales_id"
      reference="sales"
      sort={{ field: "first_name", order: "ASC" }}
      alwaysOn
    >
      <AutocompleteInput
        label="resources.audit_log.fields.sales_id"
        optionText={formatSaleName}
      />
    </ReferenceInput>,
  ];
};

export const AuditLogList = () => {
  const translate = useTranslate();
  const filters = useAuditFilters();
  return (
    <List
      title={translate("crm.audit.title")}
      filters={filters}
      sort={{ field: "created_at", order: "DESC" }}
      perPage={50}
      actions={false}
      empty={
        <p className="p-8 text-center text-muted-foreground">
          {translate("crm.audit.empty")}
        </p>
      }
    >
      <DataTable bulkActionButtons={false} rowClick={false}>
        <DataTable.Col
          source="created_at"
          label={translate("resources.audit_log.fields.created_at")}
        >
          <DateField source="created_at" showTime />
        </DataTable.Col>
        <DataTable.Col
          source="sales_id"
          label={translate("resources.audit_log.fields.sales_id")}
        >
          <WhoCell />
        </DataTable.Col>
        <DataTable.Col
          source="table_name"
          label={translate("resources.audit_log.fields.record_id")}
        >
          <RecordCell />
        </DataTable.Col>
        <DataTable.Col
          disableSort
          label={translate("resources.audit_log.fields.changes")}
        >
          <ChangesCell />
        </DataTable.Col>
      </DataTable>
    </List>
  );
};
