import {
  ArrowLeft,
  Check,
  Download,
  FileOutput,
  Send,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  ShowBase,
  useCreate,
  useNotify,
  useRecordContext,
  useRedirect,
  useTranslate,
  useUpdate,
} from "ra-core";
import { Link } from "react-router";
import { DeleteButton } from "@/components/admin/delete-button";
import { EditButton } from "@/components/admin/edit-button";
import { Button } from "@/components/ui/button";

import type { Invoice } from "../types";
import { getInvoiceDefaults } from "./invoiceDefaults";
import { InvoiceDocument } from "./InvoiceDocument";
import { InvoicePayments } from "./InvoicePayments";
import { getDisplayStatus } from "./invoiceModel";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { useNextDocumentNumber } from "./useInvoiceTransform";

export const InvoiceShow = () => (
  <ShowBase resource="invoices">
    <InvoiceShowContent />
  </ShowBase>
);

const InvoiceShowContent = () => {
  const record = useRecordContext<Invoice>();
  if (!record) return null;
  return (
    <div className="mt-4 flex flex-col gap-4 pb-8">
      <InvoiceShowToolbar invoice={record} />
      {record.type === "invoice" ? <InvoicePayments invoice={record} /> : null}
      <InvoiceDocument invoice={record} />
    </div>
  );
};

const InvoiceShowToolbar = ({ invoice }: { invoice: Invoice }) => {
  const translate = useTranslate();
  return (
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/invoices">
            <ArrowLeft />
            {translate("resources.invoices.action.back")}
          </Link>
        </Button>
        <InvoiceStatusBadge invoice={invoice} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusActions invoice={invoice} />
        {invoice.type === "quote" && invoice.status !== "declined" ? (
          <ConvertToInvoiceButton quote={invoice} />
        ) : null}
        <DownloadPdfButton invoice={invoice} />
        <EditButton />
        <DeleteButton redirect="/invoices" />
      </div>
    </div>
  );
};

interface StatusActionConfig {
  status: string;
  label: string;
  icon: LucideIcon;
}

const getStatusActions = (invoice: Invoice): StatusActionConfig[] => {
  const status = getDisplayStatus(invoice);
  if (invoice.status === "draft") {
    return [{ status: "sent", label: "mark_sent", icon: Send }];
  }
  // Invoices are marked paid by recording payments
  if (invoice.type === "quote" && (status === "sent" || status === "expired")) {
    return [
      { status: "accepted", label: "mark_accepted", icon: Check },
      { status: "declined", label: "mark_declined", icon: X },
    ];
  }
  return [];
};

const StatusActions = ({ invoice }: { invoice: Invoice }) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [update, { isPending }] = useUpdate();

  const setStatus = (status: string) =>
    update(
      "invoices",
      {
        id: invoice.id,
        data: {
          status,
          paid_at:
            status === "paid" ? new Date().toISOString() : invoice.paid_at,
          updated_at: new Date().toISOString(),
        },
        previousData: invoice,
      },
      {
        mutationMode: "pessimistic",
        onSuccess: () =>
          notify("resources.invoices.notifications.status_updated", {
            type: "success",
          }),
        onError: () =>
          notify("resources.invoices.notifications.error", { type: "error" }),
      },
    );

  return (
    <>
      {getStatusActions(invoice).map(({ status, label, icon: Icon }) => (
        <Button
          key={status}
          size="sm"
          variant={status === "declined" ? "outline" : "default"}
          disabled={isPending}
          onClick={() => setStatus(status)}
        >
          <Icon />
          {translate(`resources.invoices.action.${label}`)}
        </Button>
      ))}
    </>
  );
};

const ConvertToInvoiceButton = ({ quote }: { quote: Invoice }) => {
  const translate = useTranslate();
  const notify = useNotify();
  const redirect = useRedirect();
  const getNextNumber = useNextDocumentNumber();
  const [create, { isPending: isCreating }] = useCreate();
  const [update, { isPending: isUpdating }] = useUpdate();

  const handleConvert = async () => {
    try {
      const defaults = getInvoiceDefaults("invoice");
      const now = new Date().toISOString();
      const number = await getNextNumber("invoice");
      const invoice = await create(
        "invoices",
        {
          data: {
            ...defaults,
            number,
            company_id: quote.company_id,
            contact_id: quote.contact_id ?? null,
            deal_id: quote.deal_id ?? null,
            sales_id: quote.sales_id,
            tax_mode: quote.tax_mode,
            items: quote.items,
            subtotal: quote.subtotal,
            tax_total: quote.tax_total,
            total: quote.total,
            source_quote_id: quote.id,
            created_at: now,
            updated_at: now,
          },
        },
        { returnPromise: true },
      );
      if (quote.status !== "accepted") {
        await update(
          "invoices",
          {
            id: quote.id,
            data: { status: "accepted", updated_at: now },
            previousData: quote,
          },
          { mutationMode: "pessimistic", returnPromise: true },
        );
      }
      notify("resources.invoices.notifications.converted", {
        type: "success",
        messageArgs: { number },
      });
      redirect("show", "invoices", invoice.id);
    } catch {
      notify("resources.invoices.notifications.error", { type: "error" });
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isCreating || isUpdating}
      onClick={handleConvert}
    >
      <FileOutput />
      {translate("resources.invoices.action.convert")}
    </Button>
  );
};

/**
 * Opens the browser print dialog with only the document visible; "Save as PDF"
 * produces the file. The document title becomes the suggested file name.
 */
const DownloadPdfButton = ({ invoice }: { invoice: Invoice }) => {
  const translate = useTranslate();
  const handleClick = () => {
    const previousTitle = document.title;
    document.title = invoice.number;
    window.addEventListener(
      "afterprint",
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );
    window.print();
  };
  return (
    <Button size="sm" variant="outline" onClick={handleClick}>
      <Download />
      {translate("resources.invoices.action.download_pdf")}
    </Button>
  );
};
