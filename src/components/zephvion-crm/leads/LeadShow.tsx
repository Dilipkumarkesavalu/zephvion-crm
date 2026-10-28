import { format } from "date-fns";
import {
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
} from "lucide-react";
import {
  ShowBase,
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRefresh,
  useShowContext,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

import { formatMoney } from "../invoices/invoiceModel";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatSaleName } from "../sales/saleName";
import type { Lead, LeadStatus, Sale } from "../types";
import { convertLead } from "./convertLead";
import { LeadScoreBadge, LeadSla, LeadStatusBadge } from "./LeadBadges";
import { leadFullName } from "./leadModel";

export const LeadShow = () => (
  <ShowBase>
    <LeadShowContent />
  </ShowBase>
);

const LeadShowContent = () => {
  const translate = useTranslate();
  const { record: lead, isPending } = useShowContext<Lead>();
  const { currency } = useConfigurationContext();
  if (isPending || !lead) return null;

  return (
    <div className="mx-auto mt-2 flex w-full max-w-3xl flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold">{leadFullName(lead)}</h1>
              {lead.company_name ? (
                <p className="text-muted-foreground">{lead.company_name}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <LeadScoreBadge score={lead.score} />
                <LeadStatusBadge status={lead.status} />
              </div>
              <LeadSla lead={lead} />
            </div>
          </div>
          <LeadActions lead={lead} />
        </CardContent>
      </Card>

      {lead.status === "converted" ? <ConvertedLinks lead={lead} /> : null}

      <Card>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label={translate("resources.leads.fields.email")}>
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <Mail className="size-3.5" />
                  {lead.email}
                </a>
              ) : null}
            </Detail>
            <Detail label={translate("resources.leads.fields.phone")}>
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <Phone className="size-3.5" />
                  {lead.phone}
                </a>
              ) : null}
            </Detail>
            <Detail label={translate("resources.leads.fields.service")}>
              {lead.service}
            </Detail>
            <Detail label={translate("resources.leads.fields.budget")}>
              {lead.budget ? formatMoney(lead.budget, currency) : null}
            </Detail>
            <Detail label={translate("resources.leads.fields.source")}>
              {translate(`resources.leads.sources.${lead.source}`)}
              {lead.utm_campaign || lead.utm_source
                ? ` · ${[lead.utm_source, lead.utm_campaign].filter(Boolean).join(" / ")}`
                : ""}
            </Detail>
            <Detail label={translate("resources.leads.fields.sales_id")}>
              <ReferenceField<Lead, Sale>
                record={lead}
                source="sales_id"
                reference="sales"
                link={false}
                render={({ referenceRecord }) =>
                  referenceRecord
                    ? formatSaleName(referenceRecord as Sale)
                    : null
                }
                empty={<span>{translate("resources.leads.unassigned")}</span>}
              />
            </Detail>
            <Detail label={translate("resources.leads.fields.created_at")}>
              {format(new Date(lead.created_at), "d MMM yyyy, h:mm a")}
            </Detail>
            {lead.disqualify_reason ? (
              <Detail
                label={translate("resources.leads.fields.disqualify_reason")}
              >
                {lead.disqualify_reason}
              </Detail>
            ) : null}
          </dl>
          {lead.message ? (
            <div className="mt-6">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {translate("resources.leads.fields.message")}
              </div>
              <p className="whitespace-pre-wrap text-sm">{lead.message}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

const Detail = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-0.5 text-sm">{children || "—"}</dd>
  </div>
);

const LeadActions = ({ lead }: { lead: Lead }) => {
  const translate = useTranslate();
  const [update, { isPending }] = useUpdate();
  const setStatus = (status: LeadStatus, extra: Partial<Lead> = {}) =>
    update("leads", {
      id: lead.id,
      data: { status, ...extra },
      previousData: lead,
    });
  const isClosed =
    lead.status === "converted" || lead.status === "disqualified";

  return (
    <div className="flex flex-wrap gap-2">
      {lead.status !== "converted" ? <ConvertButton lead={lead} /> : null}
      {lead.status === "new" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("contacted")}
        >
          <Phone />
          {translate("resources.leads.action.mark_contacted")}
        </Button>
      ) : null}
      {lead.status === "new" || lead.status === "contacted" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("qualified")}
        >
          <CheckCircle2 />
          {translate("resources.leads.action.qualify")}
        </Button>
      ) : null}
      {!isClosed ? (
        <DisqualifyButton
          onConfirm={(reason) =>
            setStatus("disqualified", { disqualify_reason: reason })
          }
        />
      ) : null}
      {lead.status === "disqualified" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("contacted", { disqualify_reason: null })}
        >
          <RotateCcw />
          {translate("resources.leads.action.reopen")}
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" asChild className="ml-auto">
        <Link to={`/leads/${lead.id}`}>
          <Pencil />
          {translate("ra.action.edit")}
        </Link>
      </Button>
    </div>
  );
};

const ConvertButton = ({ lead }: { lead: Lead }) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const { identity } = useGetIdentity();
  const { dealStages, dealCategories } = useConfigurationContext();
  const [isConverting, setIsConverting] = useState(false);

  const convert = async () => {
    if (identity?.id == null) return;
    setIsConverting(true);
    try {
      const result = await convertLead({
        dataProvider,
        lead,
        salesId: identity.id,
        dealStages,
        dealCategories,
      });
      notify("resources.leads.convert_success", { type: "success" });
      refresh();
      navigate(
        result.dealId != null
          ? `/deals/${result.dealId}/show`
          : `/contacts/${result.contactId}/show`,
      );
    } catch {
      notify("resources.leads.convert_error", { type: "error" });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Button size="sm" disabled={isConverting} onClick={convert}>
      <ArrowRightLeft />
      {translate("resources.leads.action.convert")}
    </Button>
  );
};

const DisqualifyButton = ({
  onConfirm,
}: {
  onConfirm: (reason: string) => void;
}) => {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Ban />
          {translate("resources.leads.action.disqualify")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2">
        <label htmlFor="disqualify-reason" className="text-sm font-medium">
          {translate("resources.leads.disqualify_prompt")}
        </label>
        <Textarea
          id="disqualify-reason"
          value={reason}
          maxLength={500}
          placeholder={translate("resources.leads.disqualify_placeholder")}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button
          size="sm"
          variant="destructive"
          disabled={!reason.trim()}
          onClick={() => {
            onConfirm(reason.trim());
            setOpen(false);
          }}
        >
          {translate("resources.leads.action.disqualify")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

const ConvertedLinks = ({ lead }: { lead: Lead }) => {
  const translate = useTranslate();
  const links = [
    lead.converted_deal_id != null && {
      to: `/deals/${lead.converted_deal_id}/show`,
      label: translate("resources.leads.deal"),
    },
    lead.converted_contact_id != null && {
      to: `/contacts/${lead.converted_contact_id}/show`,
      label: translate("resources.leads.contact"),
    },
    lead.converted_company_id != null && {
      to: `/companies/${lead.converted_company_id}/show`,
      label: translate("resources.leads.company"),
    },
  ].filter(Boolean) as Array<{ to: string; label: string }>;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
      <CheckCircle2 className="size-4 text-emerald-600" />
      <span className="font-medium">
        {translate("resources.leads.converted")}
      </span>
      <span className="text-muted-foreground">
        {translate("resources.leads.converted_links")}
      </span>
      {links.map((link) => (
        <Button
          key={link.to}
          variant="link"
          size="sm"
          asChild
          className="h-auto p-0"
        >
          <Link to={link.to}>{link.label}</Link>
        </Button>
      ))}
    </div>
  );
};
