import { format } from "date-fns";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  CreditCard,
  FolderKanban,
  LifeBuoy,
  ReceiptText,
} from "lucide-react";
import { useDataProvider } from "ra-core";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { formatMoney } from "../invoices/invoiceModel";
import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { PortalData, PortalRequest, PortalTicket } from "./portalLink";

const STATUS_LABELS: Record<string, string> = {
  sent: "Due",
  paid: "Paid",
  accepted: "Accepted",
  open: "Open",
  in_progress: "In progress",
  waiting_client: "Waiting for you",
  resolved: "Resolved",
  closed: "Closed",
  planning: "Planning",
  active: "In progress",
  on_hold: "On hold",
  completed: "Completed",
};

const formatDate = (date: string | null) =>
  date ? format(new Date(date), "d MMM yyyy") : "—";

/**
 * What a client sees through their secret link: what they owe, how their
 * projects are going, and their support requests. No sign-in.
 */
export const PortalPage = () => {
  const { token = "" } = useParams();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const { lightModeLogo, darkModeLogo } = useConfigurationContext();
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const send = useCallback(
    async (request: PortalRequest) => {
      const result = await dataProvider.callPortal(token, request);
      if (result.ok) {
        setPortal(result.portal);
        setError(null);
      } else {
        setError(result.error);
      }
      return result.ok;
    },
    [dataProvider, token],
  );

  useEffect(() => {
    send({ action: "get" }).finally(() => setIsLoading(false));
  }, [send]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <img src={lightModeLogo} alt="" className="h-6 dark:hidden" />
          <img src={darkModeLogo} alt="" className="hidden h-6 dark:block" />
          <span className="border-l pl-3 text-sm font-medium text-muted-foreground">
            Client portal
          </span>
          {portal ? (
            <span className="ml-auto truncate text-sm font-semibold">
              {portal.company.name}
            </span>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : !portal ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-medium">
                {error ?? "This link is not valid any more."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Please ask your Zephvion contact for a new link.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PortalContent portal={portal} error={error} send={send} />
        )}
      </main>
    </div>
  );
};

PortalPage.path = "/portal/:token";

const PortalContent = ({
  portal,
  error,
  send,
}: {
  portal: PortalData;
  error: string | null;
  send: (request: PortalRequest) => Promise<boolean>;
}) => {
  const { currency } = useConfigurationContext();
  const money = (amount: number) => formatMoney(amount, currency);
  const activeProjects = portal.projects.filter(
    (project) => project.status !== "completed",
  );
  const openTickets = portal.tickets.filter(
    (ticket) => !["resolved", "closed"].includes(ticket.status),
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Hello, {portal.company.name}</h1>
        <p className="text-sm text-muted-foreground">
          Your account with {portal.seller.name}
        </p>
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary
          icon={CreditCard}
          label="Balance due"
          value={money(portal.balance)}
        />
        <Summary
          icon={FolderKanban}
          label="Projects in progress"
          value={String(activeProjects.length)}
        />
        <Summary
          icon={LifeBuoy}
          label="Open requests"
          value={String(openTickets.length)}
        />
      </div>

      <Section icon={ReceiptText} title="Invoices and quotes">
        {portal.invoices.length ? (
          <ul className="divide-y">
            {portal.invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {invoice.number}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {invoice.type === "quote" ? "Quote" : "Invoice"} ·{" "}
                      {formatDate(invoice.issue_date)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {invoice.type === "invoice" && invoice.status === "sent"
                      ? `Due ${formatDate(invoice.due_date)}`
                      : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">
                    {money(invoice.total)}
                  </div>
                  {invoice.balance > 0 && invoice.balance < invoice.total ? (
                    <div className="text-xs text-muted-foreground">
                      {money(invoice.balance)} left to pay
                    </div>
                  ) : null}
                </div>
                <StatusPill status={invoice.status} />
                {invoice.payment_link_url ? (
                  <Button asChild size="sm">
                    <a
                      href={invoice.payment_link_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pay online
                    </a>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No invoices yet." />
        )}
      </Section>

      <Section icon={FolderKanban} title="Projects">
        {portal.projects.length ? (
          <div className="flex flex-col gap-4">
            {portal.projects.map((project) => (
              <div key={project.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-auto font-medium">{project.name}</span>
                  <StatusPill status={project.status} />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(project.progress * 100)}%` }}
                  />
                </div>
                <ol className="mt-3 flex flex-col gap-1.5 text-sm">
                  {project.milestones.map((milestone) => (
                    <li
                      key={milestone.name}
                      className="flex items-center gap-2"
                    >
                      {milestone.status === "done" ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : milestone.status === "in_progress" ? (
                        <CircleDot className="size-4 text-primary" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                      <span className="flex-1">{milestone.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(milestone.due_date)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No projects yet." />
        )}
      </Section>

      <Section icon={LifeBuoy} title="Support">
        <NewRequestForm send={send} />
        {portal.tickets.length ? (
          <div className="mt-4 flex flex-col gap-3">
            {portal.tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} send={send} />
            ))}
          </div>
        ) : null}
      </Section>
    </>
  );
};

const Summary = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
}) => (
  <Card className="py-4">
    <CardContent className="flex items-center gap-3">
      <Icon className="size-5 text-muted-foreground" />
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </div>
    </CardContent>
  </Card>
);

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof CreditCard;
  title: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardContent>
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <Icon className="size-5 text-muted-foreground" />
        {title}
      </h2>
      {children}
    </CardContent>
  </Card>
);

const Empty = ({ text }: { text: string }) => (
  <p className="py-4 text-sm text-muted-foreground">{text}</p>
);

const StatusPill = ({ status }: { status: string }) => (
  <Badge
    variant="secondary"
    className={cn(
      "border-0",
      ["paid", "accepted", "resolved", "completed"].includes(status) &&
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      ["sent", "waiting_client"].includes(status) &&
        "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    )}
  >
    {STATUS_LABELS[status] ?? status}
  </Badge>
);

const NewRequestForm = ({
  send,
}: {
  send: (request: PortalRequest) => Promise<boolean>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setIsSending(true);
    const ok = await send({
      action: "create_ticket",
      subject: subject.trim(),
      description: description.trim(),
      name: name.trim(),
    });
    setIsSending(false);
    if (ok) {
      setSubject("");
      setDescription("");
      setIsOpen(false);
      setSent(true);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => setIsOpen(true)}>
          New request
        </Button>
        {sent ? (
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            Thanks, we've got it and will reply soon.
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-lg border p-3"
    >
      <Input
        value={subject}
        maxLength={200}
        required
        placeholder="Subject"
        onChange={(event) => setSubject(event.target.value)}
      />
      <Textarea
        value={description}
        maxLength={5000}
        rows={4}
        required
        placeholder="What do you need help with?"
        onChange={(event) => setDescription(event.target.value)}
      />
      <Input
        value={name}
        maxLength={120}
        placeholder="Your name (optional)"
        onChange={(event) => setName(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSending || !subject.trim() || !description.trim()}
        >
          Send request
        </Button>
      </div>
    </form>
  );
};

const TicketCard = ({
  ticket,
  send,
}: {
  ticket: PortalTicket;
  send: (request: PortalRequest) => Promise<boolean>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) return;
    setIsSending(true);
    const ok = await send({
      action: "reply",
      ticket_id: ticket.id,
      body: reply.trim(),
    });
    setIsSending(false);
    if (ok) setReply("");
  };

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full flex-wrap items-center gap-2 p-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{ticket.subject}</span>
          <span className="text-xs text-muted-foreground">
            {ticket.number} · {formatDate(ticket.created_at)} ·{" "}
            {ticket.comments.length}{" "}
            {ticket.comments.length === 1 ? "reply" : "replies"}
          </span>
        </span>
        <StatusPill status={ticket.status} />
      </button>
      {isOpen ? (
        <div className="flex flex-col gap-2 border-t p-3">
          {ticket.description ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {ticket.description}
            </p>
          ) : null}
          {ticket.comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                comment.from_client
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted",
              )}
            >
              <div className="whitespace-pre-wrap">{comment.body}</div>
              <div className="mt-1 text-[11px] opacity-70">
                {comment.from_client ? "You" : (comment.author ?? "Zephvion")} ·{" "}
                {format(new Date(comment.created_at), "d MMM, h:mm a")}
              </div>
            </div>
          ))}
          {ticket.status !== "closed" ? (
            <form onSubmit={submit} className="mt-1 flex gap-2">
              <Input
                value={reply}
                maxLength={5000}
                placeholder="Write a reply…"
                onChange={(event) => setReply(event.target.value)}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSending || !reply.trim()}
              >
                Send
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
