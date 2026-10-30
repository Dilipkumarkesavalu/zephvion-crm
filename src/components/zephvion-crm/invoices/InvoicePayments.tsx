import { format } from "date-fns";
import { BellRing, Link2, Plus, Trash2, Wallet } from "lucide-react";
import {
  useDataProvider,
  useDelete,
  useGetList,
  useNotify,
  useRefresh,
  useTranslate,
  type Identifier,
} from "ra-core";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BillingResult, CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  PAYMENT_METHODS,
  type Invoice,
  type InvoicePayment,
  type InvoiceReminder,
  type PaymentMethod,
} from "../types";
import {
  formatMoney,
  getAmountReceived,
  getBalanceDue,
  toISODate,
} from "./invoiceModel";
import { DraftEmailButton } from "../assistant/DraftEmailButton";

/**
 * Money received against an invoice: record payments (with TDS), remind the
 * client, and share a Razorpay link for the balance.
 */
export const InvoicePayments = ({ invoice }: { invoice: Invoice }) => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const money = (amount: number) => formatMoney(amount, currency);
  const { data: payments = [] } = useGetList<InvoicePayment>(
    "invoice_payments",
    {
      filter: { invoice_id: invoice.id },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "paid_on", order: "DESC" },
    },
  );
  const { data: reminders = [] } = useGetList<InvoiceReminder>(
    "invoice_reminders",
    {
      filter: { invoice_id: invoice.id },
      pagination: { page: 1, perPage: 20 },
      sort: { field: "sent_at", order: "DESC" },
    },
  );
  const balance = getBalanceDue(invoice);
  const isOpen = invoice.status === "sent" && balance > 0;

  return (
    <Card className="print:hidden mx-auto w-full max-w-[210mm]">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Wallet className="size-5 text-muted-foreground" />
          <h2 className="mr-auto text-lg font-semibold">
            {translate("resources.invoices.payments.title")}
          </h2>
          {isOpen ? (
            <>
              <DraftEmailButton resource="invoices" recordId={invoice.id} />
              <PaymentLinkButton invoice={invoice} />
              <ReminderButton invoiceId={invoice.id} />
              <RecordPaymentButton invoiceId={invoice.id} balance={balance} />
            </>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <Figure
            label={translate("resources.invoices.payments.total")}
            value={money(Number(invoice.total))}
          />
          <Figure
            label={translate("resources.invoices.payments.received")}
            value={money(getAmountReceived(invoice))}
          />
          <Figure
            label={translate("resources.invoices.payments.balance")}
            value={money(balance)}
            isStrong={balance > 0}
          />
        </div>

        {invoice.status === "draft" ? (
          <p className="text-sm text-muted-foreground">
            {translate("resources.invoices.payments.draft_hint")}
          </p>
        ) : null}

        {invoice.payment_link_url ? (
          <p className="text-sm">
            {translate("resources.invoices.payments.link_label")}{" "}
            <a
              href={invoice.payment_link_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {invoice.payment_link_url}
            </a>
          </p>
        ) : null}

        {payments.length ? (
          <ul className="divide-y rounded-md border text-sm">
            {payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} money={money} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {translate("resources.invoices.payments.empty")}
          </p>
        )}

        {reminders.length ? (
          <div className="text-xs text-muted-foreground">
            {translate("resources.invoices.payments.reminders_sent")}{" "}
            {reminders
              .map(
                (reminder) =>
                  `${format(new Date(reminder.sent_at), "d MMM")} (${reminder.sent_to})`,
              )
              .join(", ")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const Figure = ({
  label,
  value,
  isStrong = false,
}: {
  label: string;
  value: string;
  isStrong?: boolean;
}) => (
  <div className="rounded-md bg-muted/40 p-3">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div
      className={
        isStrong
          ? "text-base font-semibold tabular-nums"
          : "text-base tabular-nums"
      }
    >
      {value}
    </div>
  </div>
);

const PaymentRow = ({
  payment,
  money,
}: {
  payment: InvoicePayment;
  money: (amount: number) => string;
}) => {
  const translate = useTranslate();
  const refresh = useRefresh();
  const [deleteOne, { isPending }] = useDelete();
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="font-medium tabular-nums">
          {money(Number(payment.amount))}
          {Number(payment.tds_amount) > 0 ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              {translate("resources.invoices.payments.plus_tds", {
                amount: money(Number(payment.tds_amount)),
              })}
            </span>
          ) : null}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {format(new Date(payment.paid_on), "d MMM yyyy")} ·{" "}
          {translate(`resources.invoices.payments.methods.${payment.method}`)}
          {payment.reference ? ` · ${payment.reference}` : ""}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={isPending}
        aria-label={translate("resources.invoices.payments.delete")}
        onClick={() =>
          deleteOne(
            "invoice_payments",
            { id: payment.id, previousData: payment },
            { mutationMode: "pessimistic", onSuccess: () => refresh() },
          )
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
};

interface PaymentFormValues {
  amount: string;
  tds_amount: string;
  paid_on: string;
  method: PaymentMethod;
  reference: string;
}

const RecordPaymentButton = ({
  invoiceId,
  balance,
}: {
  invoiceId: Identifier;
  balance: number;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState } =
    useForm<PaymentFormValues>({
      defaultValues: {
        amount: String(balance),
        tds_amount: "0",
        paid_on: toISODate(new Date()),
        method: "bank_transfer",
        reference: "",
      },
    });

  const submit = async (values: PaymentFormValues) => {
    const amount = Number(values.amount) || 0;
    const tds = Number(values.tds_amount) || 0;
    if (amount < 0 || tds < 0 || amount + tds <= 0) {
      notify("resources.invoices.payments.invalid_amount", { type: "error" });
      return;
    }
    try {
      await dataProvider.create("invoice_payments", {
        data: {
          invoice_id: invoiceId,
          amount,
          tds_amount: tds,
          paid_on: values.paid_on,
          method: values.method,
          reference: values.reference.trim() || null,
          created_at: new Date().toISOString(),
        },
      });
      notify("resources.invoices.payments.recorded", { type: "success" });
      setOpen(false);
      reset();
      refresh();
    } catch {
      notify("resources.invoices.notifications.error", { type: "error" });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">
          <Plus />
          {translate("resources.invoices.payments.record")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={translate("resources.invoices.payments.amount")}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("amount", { required: true })}
              />
            </Field>
            <Field label={translate("resources.invoices.payments.tds")}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("tds_amount")}
              />
            </Field>
            <Field label={translate("resources.invoices.payments.paid_on")}>
              <Input type="date" {...register("paid_on", { required: true })} />
            </Field>
            <Field label={translate("resources.invoices.payments.method")}>
              <Select
                value={watch("method")}
                onValueChange={(value) =>
                  setValue("method", value as PaymentMethod)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {translate(
                        `resources.invoices.payments.methods.${method}`,
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={translate("resources.invoices.payments.reference")}>
            <Input
              maxLength={200}
              placeholder={translate(
                "resources.invoices.payments.reference_placeholder",
              )}
              {...register("reference")}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            {translate("resources.invoices.payments.tds_hint")}
          </p>
          <Button type="submit" size="sm" disabled={formState.isSubmitting}>
            {translate("resources.invoices.payments.save")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

const useBillingAction = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [isPending, setIsPending] = useState(false);
  const run = async (
    action: () => Promise<BillingResult>,
    onSuccess: (result: BillingResult) => void,
  ) => {
    setIsPending(true);
    try {
      const result = await action();
      if (result.ok) {
        onSuccess(result);
        refresh();
      } else {
        notify(
          `resources.invoices.payments.failures.${result.reason ?? "unknown"}`,
          {
            type: "warning",
            messageArgs: { _: result.reason ?? "Something went wrong" },
          },
        );
      }
    } finally {
      setIsPending(false);
    }
  };
  return { run, isPending };
};

const ReminderButton = ({ invoiceId }: { invoiceId: Identifier }) => {
  const translate = useTranslate();
  const notify = useNotify();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const { run, isPending } = useBillingAction();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        run(
          () => dataProvider.sendInvoiceReminder(invoiceId),
          (result) =>
            notify("resources.invoices.payments.reminder_sent", {
              type: "success",
              messageArgs: { to: result.to ?? "" },
            }),
        )
      }
    >
      <BellRing />
      {translate("resources.invoices.payments.remind")}
    </Button>
  );
};

const PaymentLinkButton = ({ invoice }: { invoice: Invoice }) => {
  const translate = useTranslate();
  const notify = useNotify();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const { run, isPending } = useBillingAction();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        run(
          () => dataProvider.createPaymentLink(invoice.id),
          (result) => {
            if (result.url) navigator.clipboard?.writeText(result.url);
            notify("resources.invoices.payments.link_created", {
              type: "success",
            });
          },
        )
      }
    >
      <Link2 />
      {translate(
        invoice.payment_link_url
          ? "resources.invoices.payments.new_link"
          : "resources.invoices.payments.link",
      )}
    </Button>
  );
};
