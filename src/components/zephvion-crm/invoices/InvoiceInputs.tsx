import { useEffect, useRef } from "react";
import { required, useGetOne, useSourceContext, useTranslate } from "ra-core";
import { useFormContext, useWatch } from "react-hook-form";
import { ArrayInput } from "@/components/admin/array-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { DateInput } from "@/components/admin/date-input";
import { NumberInput } from "@/components/admin/number-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { TextInput } from "@/components/admin/text-input";
import { Card, CardContent } from "@/components/ui/card";

import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, InvoiceItem, InvoiceType, TaxMode } from "../types";
import {
  GST_RATES,
  amountInRupeeWords,
  computeTotals,
  formatMoney,
  getLineTaxable,
  getStatusChoices,
  getTaxModeForState,
  getTaxLines,
  sanitizeItems,
} from "./invoiceModel";
import { SELLER_HOME_STATE } from "./sellerDetails";

const validateItems = (items: Partial<InvoiceItem>[] | undefined) =>
  sanitizeItems(items).length > 0
    ? undefined
    : "resources.invoices.validation.at_least_one_item";

export const InvoiceInputs = ({ isEdit = false }: { isEdit?: boolean }) => (
  <div className="flex flex-col xl:flex-row gap-6 items-start">
    <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
      <Card>
        <CardContent className="flex flex-col gap-6">
          <InvoiceDetailsInputs isEdit={isEdit} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <InvoiceItemsInput />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <TextInput
            source="notes"
            multiline
            rows={3}
            helperText={false}
            label="resources.invoices.fields.notes"
          />
        </CardContent>
      </Card>
    </div>
    <div className="w-full xl:w-80 xl:sticky xl:top-4 shrink-0">
      <InvoiceTotalsCard />
    </div>
  </div>
);

const InvoiceDetailsInputs = ({ isEdit }: { isEdit: boolean }) => {
  const translate = useTranslate();
  const type: InvoiceType = useWatch({ name: "type" }) ?? "quote";
  const companyId = useWatch({ name: "company_id" });

  const typeChoices = (["quote", "invoice"] as const).map((value) => ({
    id: value,
    name: translate(`resources.invoices.types.${value}`),
  }));
  const statusChoices = getStatusChoices(type).map((value) => ({
    id: value,
    name: translate(`resources.invoices.statuses.${value}`),
  }));
  const taxModeChoices = (["intra", "inter"] as TaxMode[]).map((value) => ({
    id: value,
    name: translate(`resources.invoices.tax_modes.${value}`),
  }));
  const companyFilter = companyId ? { company_id: companyId } : {};

  return (
    <>
      <TaxModeFromClient companyId={companyId} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectInput
          source="type"
          choices={typeChoices}
          disabled={isEdit}
          validate={required()}
          helperText={false}
        />
        <SelectInput
          source="status"
          choices={statusChoices}
          validate={required()}
          helperText={false}
        />
        <SelectInput
          source="tax_mode"
          choices={taxModeChoices}
          validate={required()}
          helperText={false}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReferenceInput source="company_id" reference="companies">
          <AutocompleteCompanyInput
            label="resources.invoices.fields.company_id"
            validate={required()}
            modal
          />
        </ReferenceInput>
        <ReferenceInput
          source="contact_id"
          reference="contacts"
          filter={companyFilter}
        >
          <AutocompleteInput
            label="resources.invoices.fields.contact_id"
            helperText={false}
          />
        </ReferenceInput>
        <ReferenceInput
          source="deal_id"
          reference="deals"
          filter={companyFilter}
        >
          <AutocompleteInput
            label="resources.invoices.fields.deal_id"
            optionText="name"
            helperText={false}
          />
        </ReferenceInput>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextInput
          source="number"
          disabled
          helperText={false}
          placeholder="Assigned on save"
        />
        <DateInput
          source="issue_date"
          validate={required()}
          helperText={false}
        />
        <DateInput
          source="due_date"
          label={
            type === "quote"
              ? "resources.invoices.fields.valid_until"
              : "resources.invoices.fields.due_date"
          }
          helperText={false}
        />
      </div>
    </>
  );
};

/**
 * When the client changes, picks CGST+SGST or IGST from the client state,
 * unless the user already chose the GST type by hand.
 */
const TaxModeFromClient = ({ companyId }: { companyId: unknown }) => {
  const { setValue, getFieldState } = useFormContext();
  const previousCompanyId = useRef(companyId);
  const { data: company } = useGetOne<Company>(
    "companies",
    { id: companyId as Company["id"] },
    { enabled: companyId != null && companyId !== "" },
  );

  useEffect(() => {
    if (!company || previousCompanyId.current === company.id) return;
    previousCompanyId.current = company.id;
    if (getFieldState("tax_mode").isDirty) return;
    setValue(
      "tax_mode",
      getTaxModeForState(company.state_abbr, SELLER_HOME_STATE),
    );
  }, [company, getFieldState, setValue]);

  return null;
};

const gstChoices = GST_RATES.map((rate) => ({ id: rate, name: `${rate}%` }));

const InvoiceItemsInput = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold">
        {translate("resources.invoices.sections.items")}
      </h3>
      <ArrayInput
        source="items"
        label={false}
        helperText={false}
        validate={validateItems}
      >
        <SimpleFormIterator
          inline
          disableClear
          disableReordering
          className="[&>ul>li]:border-b [&>ul>li]:pb-3"
        >
          <TextInput
            source="description"
            label="resources.invoices.fields.description"
            className="min-w-56 flex-1"
            helperText={false}
          />
          <TextInput
            source="hsn_sac"
            label="resources.invoices.fields.hsn_sac"
            className="w-28"
            helperText={false}
          />
          <NumberInput
            source="quantity"
            label="resources.invoices.fields.quantity"
            className="w-20"
            min={0}
            defaultValue={1}
            helperText={false}
          />
          <NumberInput
            source="unit_price"
            label="resources.invoices.fields.unit_price"
            className="w-32"
            min={0}
            defaultValue={0}
            helperText={false}
          />
          <SelectInput
            source="gst_rate"
            label="resources.invoices.fields.gst_rate"
            choices={gstChoices}
            defaultValue={18}
            className="w-24"
            helperText={false}
          />
          <LineAmount />
        </SimpleFormIterator>
      </ArrayInput>
    </div>
  );
};

/** Live taxable amount of the current line inside the items iterator. */
const LineAmount = () => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const sourceContext = useSourceContext();
  const [quantity, unitPrice] = useWatch({
    name: [
      sourceContext.getSource("quantity"),
      sourceContext.getSource("unit_price"),
    ],
  });
  return (
    <div className="flex flex-col gap-2 w-32">
      <span className="text-sm font-medium">
        {translate("resources.invoices.fields.amount")}
      </span>
      <span className="h-9 flex items-center justify-end tabular-nums text-sm">
        {formatMoney(
          getLineTaxable({ quantity, unit_price: unitPrice }),
          currency,
        )}
      </span>
    </div>
  );
};

const InvoiceTotalsCard = () => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const items: Partial<InvoiceItem>[] = useWatch({ name: "items" }) ?? [];
  const taxMode: TaxMode = useWatch({ name: "tax_mode" }) ?? "intra";
  const totals = computeTotals(items);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">
          {translate("resources.invoices.sections.totals")}
        </h3>
        <TotalRow
          label={translate("resources.invoices.totals.subtotal")}
          value={formatMoney(totals.subtotal, currency)}
        />
        {getTaxLines(totals.taxByRate, taxMode).map((line) => (
          <TotalRow
            key={line.label}
            label={line.label}
            value={formatMoney(line.amount, currency)}
            muted
          />
        ))}
        <div className="border-t pt-3">
          <TotalRow
            label={translate("resources.invoices.totals.total")}
            value={formatMoney(totals.total, currency)}
            strong
          />
        </div>
        {currency === "INR" && totals.total > 0 ? (
          <p className="text-xs text-muted-foreground">
            {amountInRupeeWords(totals.total)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

const TotalRow = ({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) => (
  <div
    className={`flex justify-between gap-4 text-sm ${muted ? "text-muted-foreground" : ""} ${strong ? "text-base font-semibold" : ""}`}
  >
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);
