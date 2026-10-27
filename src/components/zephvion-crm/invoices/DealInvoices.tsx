import { FilePlus2 } from "lucide-react";
import { useGetList, useTranslate } from "ra-core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal, Invoice } from "../types";
import { DEFAULT_GST_RATE, formatMoney } from "./invoiceModel";
import { InvoiceStatusBadge, InvoiceTypeBadge } from "./InvoiceStatusBadge";

/** Quotes & invoices linked to a deal, with a shortcut to quote it. */
export const DealInvoices = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const { data: invoices = [], isPending } = useGetList<Invoice>("invoices", {
    filter: { deal_id: deal.id },
    sort: { field: "issue_date", order: "DESC" },
    pagination: { page: 1, perPage: 50 },
  });

  const quotePrefill = {
    type: "quote",
    deal_id: deal.id,
    company_id: deal.company_id,
    contact_id: deal.contact_ids?.[0] ?? null,
    items: [
      {
        description: deal.name,
        hsn_sac: "998314",
        quantity: 1,
        unit_price: deal.amount ?? 0,
        gst_rate: DEFAULT_GST_RATE,
      },
    ],
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tracking-wide">
          {translate("resources.invoices.deal_section.title")}
        </span>
        <Button asChild size="sm" variant="outline">
          <Link to="/invoices/create" state={{ record: quotePrefill }}>
            <FilePlus2 />
            {translate("resources.invoices.action.new_quote")}
          </Link>
        </Button>
      </div>
      {!isPending && invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate("resources.invoices.deal_section.empty")}
        </p>
      ) : null}
      <ul className="flex flex-col divide-y">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <Link
              to={`/invoices/${invoice.id}/show`}
              className="flex items-center justify-between gap-4 py-2 text-sm hover:bg-muted/50 rounded px-1"
            >
              <span className="flex items-center gap-3">
                <span className="font-medium">{invoice.number}</span>
                <InvoiceTypeBadge type={invoice.type} />
              </span>
              <span className="flex items-center gap-3">
                <InvoiceStatusBadge invoice={invoice} />
                <span className="tabular-nums w-28 text-right">
                  {formatMoney(invoice.total, currency)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
