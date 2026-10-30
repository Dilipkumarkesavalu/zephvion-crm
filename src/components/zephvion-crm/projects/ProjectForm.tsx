import {
  required,
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRedirect,
  useTranslate,
} from "ra-core";
import { useRef } from "react";
import { useWatch } from "react-hook-form";
import { useLocation } from "react-router";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { BooleanInput } from "@/components/admin/boolean-input";
import { Create } from "@/components/admin/create";
import { DateInput } from "@/components/admin/date-input";
import { Edit } from "@/components/admin/edit";
import { NumberInput } from "@/components/admin/number-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { SimpleForm } from "@/components/admin/simple-form";
import { TextInput } from "@/components/admin/text-input";

import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput";
import { formatSaleName } from "../sales/saleName";
import { PROJECT_STATUSES, type Project, type Sale } from "../types";
import { defaultMilestones } from "./projectModel";

type ProjectFormValues = Partial<Project> & {
  with_default_milestones?: boolean;
};

const ProjectInputs = ({ isCreate = false }: { isCreate?: boolean }) => {
  const translate = useTranslate();
  const companyId = useWatch({ name: "company_id" });
  const statusChoices = PROJECT_STATUSES.map((id) => ({
    id,
    name: translate(`resources.projects.statuses.${id}`),
  }));
  return (
    <div className="flex flex-col gap-4">
      <TextInput source="name" validate={required()} helperText={false} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ReferenceInput source="company_id" reference="companies">
          <AutocompleteCompanyInput
            label="resources.projects.fields.company_id"
            validate={required()}
          />
        </ReferenceInput>
        <ReferenceInput
          source="deal_id"
          reference="deals"
          filter={companyId ? { company_id: companyId } : {}}
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
            helperText={false}
          />
        </ReferenceInput>
        <SelectInput
          source="status"
          choices={statusChoices}
          validate={required()}
          helperText={false}
        />
        <DateInput source="start_date" helperText={false} />
        <DateInput source="due_date" helperText={false} />
        <NumberInput source="budget" min={0} step={1000} helperText={false} />
        <NumberInput
          source="budget_hours"
          min={0}
          step={1}
          helperText={false}
        />
      </div>
      <TextInput source="description" multiline rows={3} helperText={false} />
      {isCreate ? (
        <BooleanInput
          source="with_default_milestones"
          label="resources.projects.default_milestones"
        />
      ) : null}
    </div>
  );
};

export const ProjectCreate = () => {
  const { identity } = useGetIdentity();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();
  const location = useLocation();
  // The choice is not a column, so it is kept aside for after the save
  const wantsMilestones = useRef(false);
  const prefill = (location.state as { record?: Partial<Project> } | null)
    ?.record;
  if (!identity) return null;

  const addDefaultMilestones = async (project: Project) => {
    try {
      await Promise.all(
        defaultMilestones(Number(project.budget)).map((milestone) =>
          dataProvider.create("project_milestones", {
            data: {
              ...milestone,
              project_id: project.id,
              created_at: new Date().toISOString(),
            },
          }),
        ),
      );
    } catch {
      notify("resources.invoices.notifications.error", { type: "error" });
    }
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-2xl">
      <Create
        transform={({
          with_default_milestones,
          ...values
        }: ProjectFormValues) => {
          wantsMilestones.current = !!with_default_milestones;
          return {
            ...values,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }}
        mutationOptions={{
          // Replaces the default success handling, so it redirects itself
          onSuccess: async (project: Project) => {
            if (wantsMilestones.current && Number(project.budget) > 0) {
              await addDefaultMilestones(project);
            }
            redirect("show", "projects", project.id);
          },
        }}
      >
        <SimpleForm
          defaultValues={{
            status: "planning",
            sales_id: identity.id,
            budget: 0,
            budget_hours: 0,
            with_default_milestones: true,
            ...prefill,
          }}
        >
          <ProjectInputs isCreate />
        </SimpleForm>
      </Create>
    </div>
  );
};

export const ProjectEdit = () => (
  <div className="mx-auto mt-4 w-full max-w-2xl">
    <Edit redirect="show" mutationMode="pessimistic">
      <SimpleForm>
        <ProjectInputs />
      </SimpleForm>
    </Edit>
  </div>
);
