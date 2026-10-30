import { format } from "date-fns";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  ShowBase,
  useGetList,
  useShowContext,
  useTranslate,
  useUpdate,
} from "ra-core";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatSaleName } from "../sales/saleName";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Contact,
  type Sale,
  type Ticket,
  type TicketComment,
} from "../types";
import {
  TicketDeadline,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "./TicketBadges";
import { TicketThread } from "./TicketThread";
import { DraftEmailButton } from "../assistant/DraftEmailButton";

export const TicketShow = () => (
  <ShowBase>
    <TicketShowContent />
  </ShowBase>
);

const TicketShowContent = () => {
  const translate = useTranslate();
  const { record: ticket, isPending } = useShowContext<Ticket>();
  const { data: comments = [] } = useGetList<TicketComment>(
    "ticket_comments",
    {
      filter: { ticket_id: ticket?.id },
      pagination: { page: 1, perPage: 500 },
      sort: { field: "created_at", order: "ASC" },
    },
    { enabled: ticket?.id != null },
  );
  if (isPending || !ticket) return null;

  return (
    <div className="mx-auto mt-2 flex w-full max-w-4xl flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/tickets">
            <ArrowLeft />
            {translate("resources.tickets.name", { smart_count: 2 })}
          </Link>
        </Button>
        <div className="ml-auto">
          <DraftEmailButton resource="tickets" recordId={ticket.id} />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/tickets/${ticket.id}`}>
            <Pencil />
            {translate("ra.action.edit")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="text-xs font-medium text-muted-foreground">
                {ticket.number} ·{" "}
                {translate(`resources.tickets.channels.${ticket.channel}`)} ·{" "}
                {format(new Date(ticket.created_at), "d MMM yyyy, h:mm a")}
              </div>
              <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
                <TicketDeadline ticket={ticket} />
              </div>
              {ticket.description ? (
                <p className="whitespace-pre-wrap text-sm">
                  {ticket.description}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <TicketThread ticket={ticket} comments={comments} />
        </div>
        <TicketSidebar ticket={ticket} />
      </div>
    </div>
  );
};

/** Quick changes: status, priority and who it's assigned to. */
const TicketSidebar = ({ ticket }: { ticket: Ticket }) => {
  const translate = useTranslate();
  const [update, { isPending }] = useUpdate();
  const { data: team = [] } = useGetList<Sale>("sales", {
    filter: { "disabled@neq": true },
    pagination: { page: 1, perPage: 200 },
    sort: { field: "first_name", order: "ASC" },
  });
  const change = (data: Partial<Ticket>) =>
    update("tickets", { id: ticket.id, data, previousData: ticket });

  return (
    <Card className="h-fit">
      <CardContent className="flex flex-col gap-4 text-sm">
        <Field label={translate("resources.tickets.fields.status")}>
          <Select
            value={ticket.status}
            disabled={isPending}
            onValueChange={(status) =>
              change({ status: status as Ticket["status"] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {translate(`resources.tickets.statuses.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={translate("resources.tickets.fields.priority")}>
          <Select
            value={ticket.priority}
            disabled={isPending}
            onValueChange={(priority) =>
              change({ priority: priority as Ticket["priority"] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {translate(`resources.tickets.priorities.${priority}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={translate("resources.tickets.fields.sales_id")}>
          <Select
            value={ticket.sales_id != null ? String(ticket.sales_id) : ""}
            disabled={isPending}
            onValueChange={(salesId) => change({ sales_id: Number(salesId) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={translate("resources.tickets.unassigned")}
              />
            </SelectTrigger>
            <SelectContent>
              {team.map((sale) => (
                <SelectItem key={sale.id} value={String(sale.id)}>
                  {formatSaleName(sale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {ticket.company_id != null ? (
          <Field label={translate("resources.tickets.fields.company_id")}>
            <ReferenceField
              record={ticket}
              source="company_id"
              reference="companies"
            />
          </Field>
        ) : null}
        {ticket.contact_id != null ? (
          <Field label={translate("resources.tickets.fields.contact_id")}>
            <ReferenceField<Ticket, Contact>
              record={ticket}
              source="contact_id"
              reference="contacts"
              render={({ referenceRecord }) =>
                referenceRecord ? (
                  <Link
                    to={`/contacts/${referenceRecord.id}/show`}
                    className="hover:underline"
                  >
                    {`${referenceRecord.first_name} ${referenceRecord.last_name ?? ""}`.trim()}
                  </Link>
                ) : null
              }
            />
          </Field>
        ) : null}
        {ticket.project_id != null ? (
          <Field label={translate("resources.tickets.fields.project_id")}>
            <ReferenceField
              record={ticket}
              source="project_id"
              reference="projects"
            />
          </Field>
        ) : null}
      </CardContent>
    </Card>
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
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    {children}
  </div>
);
