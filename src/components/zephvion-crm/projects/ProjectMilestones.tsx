import { format } from "date-fns";
import { FileOutput, Flag, Plus, Trash2 } from "lucide-react";
import {
  useCreate,
  useDelete,
  useTranslate,
  useUpdate,
  type Identifier,
} from "ra-core";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { formatMoney } from "../invoices/invoiceModel";
import { InvoiceStatusBadge } from "../invoices/InvoiceStatusBadge";
import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  MILESTONE_STATUSES,
  type Invoice,
  type MilestoneStatus,
  type Project,
  type ProjectMilestone,
} from "../types";
import { milestoneInvoicePrefill } from "./projectModel";

/** Billable stages of a project: track each one and bill it when done. */
export const ProjectMilestones = ({
  project,
  milestones,
  invoices,
  readyToBill,
}: {
  project: Project;
  milestones: ProjectMilestone[];
  invoices: Invoice[];
  readyToBill: number;
}) => {
  const translate = useTranslate();
  const invoiceByMilestone = new Map(
    invoices
      .filter(
        (invoice) =>
          invoice.milestone_id != null && invoice.status !== "cancelled",
      )
      .map((invoice) => [String(invoice.milestone_id), invoice]),
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Flag className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {translate("resources.projects.milestones.title")}
          </h2>
        </div>
        {readyToBill > 0 ? (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {translate("resources.projects.milestones.ready_to_bill", {
              smart_count: readyToBill,
            })}
          </p>
        ) : null}
        {milestones.length ? (
          <ul className="divide-y rounded-md border">
            {milestones.map((milestone) => (
              <MilestoneRow
                key={milestone.id}
                project={project}
                milestone={milestone}
                invoice={invoiceByMilestone.get(String(milestone.id))}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {translate("resources.projects.milestones.empty")}
          </p>
        )}
        <AddMilestone projectId={project.id} nextPosition={milestones.length} />
      </CardContent>
    </Card>
  );
};

const MilestoneRow = ({
  project,
  milestone,
  invoice,
}: {
  project: Project;
  milestone: ProjectMilestone;
  invoice?: Invoice;
}) => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const [update, { isPending }] = useUpdate();
  const [deleteOne] = useDelete();
  const isDone = milestone.status === "done";

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className={cn("font-medium", isDone && "text-muted-foreground")}>
          {milestone.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatMoney(Number(milestone.amount), currency)}
          {milestone.due_date
            ? ` · ${translate("resources.projects.milestones.due_date")} ${format(new Date(milestone.due_date), "d MMM")}`
            : ""}
        </div>
      </div>
      <Select
        value={milestone.status}
        disabled={isPending}
        onValueChange={(status) =>
          update("project_milestones", {
            id: milestone.id,
            data: { status: status as MilestoneStatus },
            previousData: milestone,
          })
        }
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MILESTONE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {translate(`resources.projects.milestones.statuses.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {invoice ? (
        <Link
          to={`/invoices/${invoice.id}/show`}
          className="flex items-center gap-2 text-xs hover:underline"
        >
          {invoice.number}
          <InvoiceStatusBadge invoice={invoice} />
        </Link>
      ) : Number(milestone.amount) > 0 ? (
        <Button asChild size="sm" variant={isDone ? "default" : "outline"}>
          <Link
            to="/invoices/create"
            state={{ record: milestoneInvoicePrefill(project, milestone) }}
          >
            <FileOutput />
            {translate("resources.projects.milestones.bill")}
          </Link>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={translate("resources.projects.milestones.delete")}
        onClick={() =>
          deleteOne("project_milestones", {
            id: milestone.id,
            previousData: milestone,
          })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
};

const AddMilestone = ({
  projectId,
  nextPosition,
}: {
  projectId: Identifier;
  nextPosition: number;
}) => {
  const translate = useTranslate();
  const [create, { isPending }] = useCreate();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create(
      "project_milestones",
      {
        data: {
          project_id: projectId,
          name: name.trim().slice(0, 200),
          amount: Math.max(0, Number(amount) || 0),
          due_date: dueDate || null,
          status: "pending",
          position: nextPosition,
          created_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setName("");
          setAmount("");
          setDueDate("");
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <Input
        value={name}
        maxLength={200}
        placeholder={translate(
          "resources.projects.milestones.name_placeholder",
        )}
        onChange={(event) => setName(event.target.value)}
        className="h-8 min-w-48 flex-1"
      />
      <Input
        type="number"
        min="0"
        step="1000"
        value={amount}
        placeholder={translate("resources.projects.milestones.amount")}
        onChange={(event) => setAmount(event.target.value)}
        className="h-8 w-32"
      />
      <Input
        type="date"
        value={dueDate}
        aria-label={translate("resources.projects.milestones.due_date")}
        onChange={(event) => setDueDate(event.target.value)}
        className="h-8 w-40"
      />
      <Button type="submit" size="sm" disabled={!name.trim() || isPending}>
        <Plus />
        {translate("resources.projects.milestones.add")}
      </Button>
    </form>
  );
};
