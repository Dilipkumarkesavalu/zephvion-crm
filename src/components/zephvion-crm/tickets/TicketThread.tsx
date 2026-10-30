import { formatDistanceToNow } from "date-fns";
import { Lock, Mail, MessagesSquare } from "lucide-react";
import {
  useCreate,
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRefresh,
  useTranslate,
} from "ra-core";
import { useState, type FormEvent } from "react";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { BillingResult, CrmDataProvider } from "../providers/types";
import { formatSaleName } from "../sales/saleName";
import type { Sale, Ticket, TicketComment } from "../types";

const MAX_BODY = 20000;

/** The ticket's replies and internal notes, oldest first, with a reply box. */
export const TicketThread = ({
  ticket,
  comments,
}: {
  ticket: Ticket;
  comments: TicketComment[];
}) => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {translate("resources.tickets.thread.title")}
          </h2>
        </div>
        {comments.length ? (
          <ol className="flex flex-col gap-3">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isMine={String(comment.sales_id) === String(identity?.id)}
              />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            {translate("resources.tickets.thread.empty")}
          </p>
        )}
        <ReplyForm ticket={ticket} />
      </CardContent>
    </Card>
  );
};

const useEmailReply = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const refresh = useRefresh();
  return async (commentId: TicketComment["id"]) => {
    const result: BillingResult =
      await dataProvider.emailTicketReply(commentId);
    if (result.ok) {
      notify("resources.tickets.thread.emailed_success", {
        type: "success",
        messageArgs: { to: result.to ?? "" },
      });
      refresh();
    } else {
      notify(
        `resources.tickets.thread.failures.${result.reason ?? "unknown"}`,
        {
          type: "warning",
          messageArgs: { _: result.reason ?? "Something went wrong" },
        },
      );
    }
  };
};

const CommentItem = ({
  comment,
  isMine,
}: {
  comment: TicketComment;
  isMine: boolean;
}) => {
  const translate = useTranslate();
  const emailReply = useEmailReply();
  const [isSending, setIsSending] = useState(false);
  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        comment.is_internal && "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          <ReferenceField<TicketComment, Sale>
            record={comment}
            source="sales_id"
            reference="sales"
            link={false}
            render={({ referenceRecord }) =>
              referenceRecord ? formatSaleName(referenceRecord as Sale) : null
            }
          />
        </span>
        <span>
          {formatDistanceToNow(new Date(comment.created_at), {
            addSuffix: true,
          })}
        </span>
        {comment.is_internal ? (
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <Lock className="size-3" />
            {translate("resources.tickets.thread.internal_badge")}
          </span>
        ) : null}
        {comment.emailed_at ? (
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3" />
            {translate("resources.tickets.thread.emailed", {
              to: comment.emailed_to ?? "",
            })}
          </span>
        ) : null}
        {isMine && !comment.is_internal && !comment.emailed_at ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-auto h-auto p-0 text-xs"
            disabled={isSending}
            onClick={async () => {
              setIsSending(true);
              await emailReply(comment.id);
              setIsSending(false);
            }}
          >
            {translate("resources.tickets.thread.email_now")}
          </Button>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
    </li>
  );
};

const ReplyForm = ({ ticket }: { ticket: Ticket }) => {
  const translate = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const { identity } = useGetIdentity();
  const [create, { isPending }] = useCreate<TicketComment>();
  const emailReply = useEmailReply();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [shouldEmail, setShouldEmail] = useState(ticket.contact_id != null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || identity?.id == null) return;
    create(
      "ticket_comments",
      {
        data: {
          ticket_id: ticket.id,
          sales_id: identity.id,
          body: text.slice(0, MAX_BODY),
          is_internal: isInternal,
          created_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: async (comment) => {
          setBody("");
          // A reply can change the ticket (first response), so reload it
          refresh();
          if (!isInternal && shouldEmail) {
            await emailReply(comment.id);
          } else {
            notify("resources.tickets.thread.sent", { type: "success" });
          }
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        value={body}
        maxLength={MAX_BODY}
        rows={4}
        placeholder={translate("resources.tickets.thread.placeholder")}
        onChange={(event) => setBody(event.target.value)}
        className={cn(isInternal && "border-amber-500/40")}
      />
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-1.5">
          <Checkbox
            checked={isInternal}
            onCheckedChange={(checked) => setIsInternal(checked === true)}
          />
          {translate("resources.tickets.thread.internal")}
        </label>
        {!isInternal ? (
          <label className="flex items-center gap-1.5">
            <Checkbox
              checked={shouldEmail}
              onCheckedChange={(checked) => setShouldEmail(checked === true)}
            />
            {translate("resources.tickets.thread.email_client")}
          </label>
        ) : null}
        <Button
          type="submit"
          size="sm"
          className="ml-auto"
          disabled={!body.trim() || isPending}
        >
          {translate(
            isInternal
              ? "resources.tickets.thread.add_note"
              : "resources.tickets.thread.send",
          )}
        </Button>
      </div>
    </form>
  );
};
