import { EditBase, Form, useRecordContext } from "ra-core";

import { FormToolbar } from "../layout/FormToolbar";
import type { Invoice } from "../types";
import { InvoiceInputs } from "./InvoiceInputs";
import { withComputedTotals } from "./useInvoiceTransform";

export const InvoiceEdit = () => (
  <EditBase
    resource="invoices"
    redirect="show"
    mutationMode="pessimistic"
    transform={withComputedTotals}
  >
    <div className="mt-4 flex flex-col gap-4">
      <EditTitle />
      <Form>
        <InvoiceInputs isEdit />
        <FormToolbar />
      </Form>
    </div>
  </EditBase>
);

const EditTitle = () => {
  const record = useRecordContext<Invoice>();
  return <h1 className="text-2xl font-semibold">{record?.number}</h1>;
};
