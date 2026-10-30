import { Copy, Mail, Sparkles } from "lucide-react";
import { useNotify, useTranslate, type Identifier } from "ra-core";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { buildMailto, type EmailResource } from "./assistantTypes";
import { useAssistant } from "./useAssistant";

/** "Draft email" for a deal, invoice, ticket or client: AI writes, you edit and send. */
export const DraftEmailButton = ({
  resource,
  recordId,
  size = "sm",
}: {
  resource: EmailResource;
  recordId: Identifier;
  size?: "sm" | "default";
}) => {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)}>
        <Sparkles />
        {translate("crm.ai.draft_email")}
      </Button>
      {open ? (
        <DraftEmailDialog
          resource={resource}
          recordId={recordId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
};

const DraftEmailDialog = ({
  resource,
  recordId,
  onClose,
}: {
  resource: EmailResource;
  recordId: Identifier;
  onClose: () => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const { run, isPending, error } = useAssistant();
  const [purpose, setPurpose] = useState(
    translate(`crm.ai.purposes.${resource}`),
  );
  const [draft, setDraft] = useState<{
    subject: string;
    body: string;
    to: string | null;
  } | null>(null);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (!purpose.trim()) return;
    const result = await run({
      action: "draft_email",
      resource,
      record_id: recordId,
      purpose: purpose.trim(),
    });
    if (result) {
      setDraft({
        subject: result.subject ?? "",
        body: result.body ?? "",
        to: result.to ?? null,
      });
    }
  };

  const copy = async () => {
    if (!draft) return;
    await navigator.clipboard?.writeText(
      draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body,
    );
    notify("crm.ai.copied", { type: "success" });
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-600" />
            {translate("crm.ai.draft_title")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={generate} className="flex flex-col gap-2">
          <Label htmlFor="ai-purpose" className="text-xs">
            {translate("crm.ai.purpose")}
          </Label>
          <div className="flex gap-2">
            <Input
              id="ai-purpose"
              value={purpose}
              maxLength={500}
              placeholder={translate("crm.ai.purpose_placeholder")}
              onChange={(event) => setPurpose(event.target.value)}
            />
            <Button type="submit" disabled={isPending || !purpose.trim()}>
              {translate(draft ? "crm.ai.regenerate" : "crm.ai.generate")}
            </Button>
          </div>
        </form>
        {isPending ? (
          <p className="text-sm text-muted-foreground">
            {translate("crm.ai.thinking")}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {draft && !isPending ? (
          <div className="flex flex-col gap-2">
            {draft.to ? (
              <p className="text-xs text-muted-foreground">
                {translate("crm.ai.to", { to: draft.to })}
              </p>
            ) : null}
            <Label className="text-xs">{translate("crm.ai.subject")}</Label>
            <Input
              value={draft.subject}
              onChange={(event) =>
                setDraft({ ...draft, subject: event.target.value })
              }
            />
            <Label className="text-xs">{translate("crm.ai.body")}</Label>
            <Textarea
              rows={12}
              value={draft.body}
              onChange={(event) =>
                setDraft({ ...draft, body: event.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              {translate("crm.ai.review")}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={copy}>
                <Copy />
                {translate("crm.ai.copy")}
              </Button>
              <Button asChild>
                <a href={buildMailto(draft.to, draft.subject, draft.body)}>
                  <Mail />
                  {translate("crm.ai.open_mail")}
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
