import { format } from "date-fns";
import { HandCoins } from "lucide-react";
import { useGetList, useGetMany, useTranslate } from "ra-core";
import { useMemo } from "react";
import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Invoice } from "../types";
import {
  AGEING_BUCKETS,
  computeAgeing,
  type AgeingBucket,
} from "./billingModel";
import { formatMoney } from "./invoiceModel";

const FETCH_LIMIT = 1000;

const BUCKET_TONES: Record<AgeingBucket, string> = {
  current: "text-foreground",
  days_1_30: "text-amber-600 dark:text-amber-400",
  days_31_60: "text-orange-600 dark:text-orange-400",
  days_61_90: "text-red-600 dark:text-red-400",
  days_90_plus: "text-red-700 dark:text-red-300 font-semibold",
};

/** Receivables ageing: who owes what, and how late it is. */
export const ReceivablesPage = () => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const money = (amount: number) =>
    amount ? formatMoney(amount, currency) : "—";
  const { data: invoices = [], isPending } = useGetList<Invoice>("invoices", {
    filter: { type: "invoice", status: "sent" },
    pagination: { page: 1, perPage: FETCH_LIMIT },
    sort: { field: "due_date", order: "ASC" },
  });
  const companyIds = useMemo(
    () => [...new Set(invoices.map((invoice) => invoice.company_id))],
    [invoices],
  );
  const { data: companies = [] } = useGetMany<Company>(
    "companies",
    { ids: companyIds },
    { enabled: companyIds.length > 0 },
  );
  const { clients, totals } = useMemo(
    () => computeAgeing(invoices, companies),
    [invoices, companies],
  );

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <HandCoins className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">
            {translate("resources.invoices.receivables.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {translate("resources.invoices.receivables.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile
          label={translate("resources.invoices.receivables.total")}
          value={isPending ? null : formatMoney(totals.total, currency)}
          isStrong
        />
        {AGEING_BUCKETS.map((bucket) => (
          <Tile
            key={bucket}
            label={translate(
              `resources.invoices.receivables.buckets.${bucket}`,
            )}
            value={isPending ? null : formatMoney(totals[bucket], currency)}
            tone={totals[bucket] ? BUCKET_TONES[bucket] : undefined}
          />
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {translate("resources.invoices.receivables.empty")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    {translate("resources.invoices.receivables.client")}
                  </th>
                  {AGEING_BUCKETS.map((bucket) => (
                    <th
                      key={bucket}
                      className="px-4 py-3 text-right font-medium"
                    >
                      {translate(
                        `resources.invoices.receivables.buckets.${bucket}`,
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">
                    {translate("resources.invoices.receivables.total")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((client) => (
                  <tr
                    key={String(client.companyId)}
                    className="hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/companies/${client.companyId}/show`}
                        className="font-medium hover:underline"
                      >
                        {client.companyName}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {translate("resources.invoices.receivables.invoices", {
                          smart_count: client.invoiceCount,
                        })}
                        {client.oldestDueDate
                          ? ` · ${translate("resources.invoices.receivables.oldest", { date: format(new Date(client.oldestDueDate), "d MMM yyyy") })}`
                          : ""}
                      </div>
                    </td>
                    {AGEING_BUCKETS.map((bucket) => (
                      <td
                        key={bucket}
                        className={cn(
                          "px-4 py-3 text-right tabular-nums",
                          client[bucket]
                            ? BUCKET_TONES[bucket]
                            : "text-muted-foreground",
                        )}
                      >
                        {money(client[bucket])}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatMoney(client.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

ReceivablesPage.path = "/receivables";

const Tile = ({
  label,
  value,
  tone,
  isStrong = false,
}: {
  label: string;
  value: string | null;
  tone?: string;
  isStrong?: boolean;
}) => (
  <div className="rounded-lg border bg-card p-3">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    {value == null ? (
      <Skeleton className="mt-1 h-6 w-20" />
    ) : (
      <div
        className={cn(
          "mt-1 text-lg tabular-nums",
          isStrong && "font-semibold",
          tone,
        )}
      >
        {value}
      </div>
    )}
  </div>
);
