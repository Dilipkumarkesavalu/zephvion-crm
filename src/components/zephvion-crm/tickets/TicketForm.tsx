import { required, useGetIdentity, useTranslate } from "ra-core";
import { useWatch } from "react-hook-form";
import { useLocation } from "react-router";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { Create } from "@/components/admin/create";
import { Edit } from "@/components/admin/edit";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { SimpleForm } from "@/components/admin/simple-form";
import { TextInput } from "@/components/admin/text-input";

import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput";
import { formatSaleName } from "../sales/saleName";
import {
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Contact,
  type Sale,
  type Ticket,
} from "../types";

const contactName = (contact: Contact) =>
  `${contact.first_name} ${contact.last_name ?? ""}`.trim();

const TicketInputs = ({ isEdit = false }: { isEdit?: boolean }) => {
  const translate = useTranslate();
  const companyId = useWatch({ name: "company_id" });
  const companyFilter = companyId ? { company_id: companyId } : {};
  const choices = (values: readonly string[], key: string) =>
    values.map((id) => ({
      id,
      name: translate(`resources.tickets.${key}.${id}`),
    }));
  return (
    <div className="flex flex-col gap-4">
      <TextInput source="subject" validate={required()} helperText={false} />
      <TextInput source="description" multiline rows={5} helperText={false} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ReferenceInput source="company_id" reference="companies">
          <AutocompleteCompanyInput label="resources.tickets.fields.company_id" />
        </ReferenceInput>
        <ReferenceInput
          source="contact_id"
          reference="contacts"
          filter={companyFilter}
        >
          <AutocompleteInput
            optionText={(contact: Contact) => contactName(contact)}
            helperText={false}
          />
        </ReferenceInput>
        <ReferenceInput
          source="project_id"
          reference="projects"
          filter={companyFilter}
        >
          <AutocompleteInput optionText="name" helperText={false} />
        </ReferenceInput>
        <ReferenceInput
          source="sales_id"
          reference="sales"
          filter={{ "disabled@neq": true }}
          sort={{ field: "first_name", order: "ASC" }}
        >
          <AutocompleteInput
            optionText={(sale: Sale) => formatSaleName(sale)}
            helperText="resources.tickets.unassigned"
          />
        </ReferenceInput>
        <SelectInput
          source="priority"
          choices={choices(TICKET_PRIORITIES, "priorities")}
          validate={required()}
          helperText="resources.tickets.sla_hint"
        />
        <SelectInput
          source="channel"
          choices={choices(TICKET_CHANNELS, "channels")}
          validate={required()}
          helperText={false}
        />
        {isEdit ? (
          <SelectInput
            source="status"
            choices={choices(TICKET_STATUSES, "statuses")}
            validate={required()}
            helperText={false}
          />
        ) : null}
      </div>
    </div>
  );
};

export const TicketCreate = () => {
  const { identity } = useGetIdentity();
  const location = useLocation();
  const prefill = (location.state as { record?: Partial<Ticket> } | null)
    ?.record;
  if (!identity) return null;
  return (
    <div className="mx-auto mt-4 w-full max-w-2xl">
      <Create
        redirect="show"
        transform={(values: Partial<Ticket>) => ({
          ...values,
          status: "open",
          created_at: new Date().toISOString(),
        })}
      >
        <SimpleForm
          defaultValues={{ priority: "normal", channel: "email", ...prefill }}
        >
          <TicketInputs />
        </SimpleForm>
      </Create>
    </div>
  );
};

export const TicketEdit = () => (
  <div className="mx-auto mt-4 w-full max-w-2xl">
    <Edit redirect="show" mutationMode="pessimistic">
      <SimpleForm>
        <TicketInputs isEdit />
      </SimpleForm>
    </Edit>
  </div>
);
