import { email, required, useGetIdentity, useTranslate } from "ra-core";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { Create } from "@/components/admin/create";
import { Edit } from "@/components/admin/edit";
import { NumberInput } from "@/components/admin/number-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { SimpleForm } from "@/components/admin/simple-form";
import { TextInput } from "@/components/admin/text-input";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatSaleName } from "../sales/saleName";
import { LEAD_SOURCES, LEAD_STATUSES, type Sale } from "../types";

const LeadInputs = ({ showStatus = false }: { showStatus?: boolean }) => {
  const translate = useTranslate();
  const { dealCategories } = useConfigurationContext();
  const sourceChoices = LEAD_SOURCES.map((id) => ({
    id,
    name: translate(`resources.leads.sources.${id}`),
  }));
  const statusChoices = LEAD_STATUSES.map((id) => ({
    id,
    name: translate(`resources.leads.statuses.${id}`),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput source="first_name" validate={required()} />
        <TextInput source="last_name" />
        <TextInput source="email" type="email" validate={email()} />
        <TextInput source="phone" />
        <TextInput source="company_name" />
        <SelectInput
          source="service"
          choices={dealCategories.map(({ label }) => ({
            id: label,
            name: label,
          }))}
          emptyText="—"
        />
        <NumberInput source="budget" min={0} step={1000} />
        <SelectInput
          source="source"
          choices={sourceChoices}
          validate={required()}
        />
      </div>
      <TextInput source="message" multiline rows={4} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ReferenceInput
          source="sales_id"
          reference="sales"
          filter={{ "disabled@neq": true }}
          sort={{ field: "first_name", order: "ASC" }}
        >
          <AutocompleteInput
            optionText={(sale: Sale) => formatSaleName(sale)}
            helperText={false}
          />
        </ReferenceInput>
        {showStatus ? (
          <SelectInput
            source="status"
            choices={statusChoices}
            validate={required()}
          />
        ) : null}
      </div>
    </div>
  );
};

export const LeadCreate = () => {
  const { identity } = useGetIdentity();
  if (!identity) return null;
  return (
    <div className="mx-auto mt-4 w-full max-w-2xl">
      <Create redirect="show">
        <SimpleForm
          defaultValues={{
            source: "manual",
            status: "new",
            sales_id: identity.id,
          }}
        >
          <LeadInputs />
        </SimpleForm>
      </Create>
    </div>
  );
};

export const LeadEdit = () => (
  <div className="mx-auto mt-4 w-full max-w-2xl">
    <Edit redirect="show" mutationMode="pessimistic">
      <SimpleForm>
        <LeadInputs showStatus />
      </SimpleForm>
    </Edit>
  </div>
);
