import { useDataProvider } from "ra-core";
import { useCallback } from "react";

import type { Invoice, InvoiceType } from "../types";
import {
  computeTotals,
  getNextDocumentNumber,
  sanitizeItems,
} from "./invoiceModel";

const NUMBER_LOOKBACK = 100;

/** Fetches recent numbers of a type and returns the next one in the series. */
export const useNextDocumentNumber = () => {
  const dataProvider = useDataProvider();
  return useCallback(
    async (type: InvoiceType): Promise<string> => {
      const { data } = await dataProvider.getList<Invoice>("invoices", {
        filter: { type },
        sort: { field: "id", order: "DESC" },
        pagination: { page: 1, perPage: NUMBER_LOOKBACK },
      });
      return getNextDocumentNumber(
        type,
        data.map((invoice) => invoice.number),
      );
    },
    [dataProvider],
  );
};

/** Normalises items and stores computed totals so lists can sort and sum them. */
export const withComputedTotals = (values: Partial<Invoice>) => {
  const items = sanitizeItems(values.items);
  const { subtotal, taxTotal, total } = computeTotals(items);
  // The database keeps amount_paid from the recorded payments
  const { amount_paid: _amountPaid, ...rest } = values;
  const isRecurring =
    rest.type === "invoice" && !!rest.recurrence && rest.recurrence !== "none";
  return {
    ...rest,
    recurrence: isRecurring ? rest.recurrence : "none",
    next_issue_date: isRecurring ? rest.next_issue_date : null,
    items,
    subtotal,
    tax_total: taxTotal,
    total,
    updated_at: new Date().toISOString(),
  };
};

export const useCreateInvoiceTransform = () => {
  const getNextNumber = useNextDocumentNumber();
  return useCallback(
    async (values: Partial<Invoice>) => {
      const type = values.type ?? "quote";
      return {
        ...withComputedTotals(values),
        number: await getNextNumber(type),
        created_at: new Date().toISOString(),
      };
    },
    [getNextNumber],
  );
};
