import { email, required, useGetIdentity, useRecordContext } from "ra-core";
import { BooleanInput } from "@/components/admin/boolean-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";

import { SALE_ROLES, type Sale } from "../types";

const roleChoices = SALE_ROLES.map((role) => ({
  id: role,
  name: `crm.roles.${role}`,
}));

export function SalesInputs() {
  const { identity } = useGetIdentity();
  const record = useRecordContext<Sale>();
  const isSelf = record?.id === identity?.id;
  return (
    <div className="space-y-4 w-full">
      <TextInput source="first_name" validate={required()} helperText={false} />
      <TextInput source="last_name" helperText={false} />
      <TextInput
        source="email"
        validate={[required(), email()]}
        helperText={false}
      />
      <ReferenceInput
        source="department_id"
        reference="departments"
        sort={{ field: "name", order: "ASC" }}
      >
        <SelectInput
          optionText="name"
          helperText={false}
          emptyText="—"
          label="resources.sales.fields.department_id"
        />
      </ReferenceInput>
      <SelectInput
        source="role"
        choices={roleChoices}
        defaultValue="member"
        validate={required()}
        readOnly={isSelf}
        helperText={false}
      />
      <BooleanInput source="disabled" readOnly={isSelf} helperText={false} />
    </div>
  );
}
