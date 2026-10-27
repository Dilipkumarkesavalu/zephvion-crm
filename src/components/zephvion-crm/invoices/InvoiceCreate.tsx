import {
  CreateBase,
  Form,
  useGetIdentity,
  useRecordFromLocation,
  useTranslate,
} from "ra-core";

import { FormToolbar } from "../layout/FormToolbar";
import type { Invoice, InvoiceType } from "../types";
import { getInvoiceDefaults } from "./invoiceDefaults";
import { InvoiceInputs } from "./InvoiceInputs";
import { useCreateInvoiceTransform } from "./useInvoiceTransform";

export const InvoiceCreate = () => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const transform = useCreateInvoiceTransform();
  const prefill = useRecordFromLocation() as Partial<Invoice> | undefined;
  const type: InvoiceType = prefill?.type === "invoice" ? "invoice" : "quote";

  return (
    <CreateBase resource="invoices" redirect="show" transform={transform}>
      <div className="mt-4 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">
          {translate(`resources.invoices.action.new_${type}`)}
        </h1>
        <Form
          defaultValues={{
            ...getInvoiceDefaults(type),
            sales_id: identity?.id,
            ...prefill,
          }}
        >
          <InvoiceInputs />
          <FormToolbar />
        </Form>
      </div>
    </CreateBase>
  );
};
