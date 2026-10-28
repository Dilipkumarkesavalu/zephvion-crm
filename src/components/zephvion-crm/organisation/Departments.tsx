import { required, useRecordContext, useTranslate } from "ra-core";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { CreateButton } from "@/components/admin/create-button";
import { Create } from "@/components/admin/create";
import { DataTable } from "@/components/admin/data-table";
import { Edit } from "@/components/admin/edit";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { ReferenceInput } from "@/components/admin/reference-input";
import { ReferenceManyCount } from "@/components/admin/reference-many-count";
import { SelectInput } from "@/components/admin/select-input";
import { SimpleForm } from "@/components/admin/simple-form";
import { TextInput } from "@/components/admin/text-input";

import { TopToolbar } from "../layout/TopToolbar";
import { formatSaleName } from "../sales/saleName";
import type { Department, Sale } from "../types";
import { departmentColorChoices, departmentDotClass } from "./departmentColors";

export const DepartmentDot = ({ color }: { color?: string }) => (
  <span
    aria-hidden
    className={`inline-block size-2.5 shrink-0 rounded-full ${departmentDotClass(color)}`}
  />
);

const DepartmentNameField = (_props: { label?: string }) => {
  const record = useRecordContext<Department>();
  if (!record) return null;
  return (
    <span className="flex items-center gap-2 font-medium">
      <DepartmentDot color={record.color} />
      {record.name}
    </span>
  );
};

export const DepartmentList = () => {
  const translate = useTranslate();
  return (
    <List
      sort={{ field: "name", order: "ASC" }}
      perPage={50}
      actions={
        <TopToolbar>
          <CreateButton label="resources.departments.action.new" />
        </TopToolbar>
      }
    >
      <DataTable bulkActionButtons={false} rowClick="edit">
        <DataTable.Col
          source="name"
          label={translate("resources.departments.fields.name")}
        >
          <DepartmentNameField />
        </DataTable.Col>
        <DataTable.Col
          source="head_sales_id"
          label={translate("resources.departments.fields.head_sales_id")}
        >
          <ReferenceField<Department, Sale>
            source="head_sales_id"
            reference="sales"
            link={false}
            render={({ referenceRecord }) =>
              referenceRecord ? formatSaleName(referenceRecord as Sale) : null
            }
          />
        </DataTable.Col>
        <DataTable.Col
          label={translate("resources.departments.fields.members")}
        >
          <ReferenceManyCount reference="sales" target="department_id" />
        </DataTable.Col>
      </DataTable>
    </List>
  );
};

const DepartmentInputs = () => (
  <div className="flex w-full flex-col gap-4">
    <TextInput source="name" validate={required()} helperText={false} />
    <SelectInput
      source="color"
      choices={departmentColorChoices}
      validate={required()}
      helperText={false}
    />
    <ReferenceInput
      source="head_sales_id"
      reference="sales"
      filter={{ "disabled@neq": true }}
      sort={{ field: "first_name", order: "ASC" }}
    >
      <AutocompleteInput
        optionText={formatSaleName}
        helperText={false}
        clearable
      />
    </ReferenceInput>
  </div>
);

export const DepartmentCreate = () => (
  <div className="mx-auto mt-8 w-full max-w-lg">
    <Create redirect="list">
      <SimpleForm defaultValues={{ color: "blue" }}>
        <DepartmentInputs />
      </SimpleForm>
    </Create>
  </div>
);

export const DepartmentEdit = () => (
  <div className="mx-auto mt-8 w-full max-w-lg">
    <Edit redirect="list" mutationMode="pessimistic">
      <SimpleForm>
        <DepartmentInputs />
      </SimpleForm>
    </Edit>
  </div>
);
