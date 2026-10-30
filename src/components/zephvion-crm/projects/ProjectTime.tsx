import { format } from "date-fns";
import { Clock, Trash2 } from "lucide-react";
import {
  useCreate,
  useDelete,
  useGetIdentity,
  useNotify,
  useTranslate,
} from "ra-core";
import { useState, type FormEvent } from "react";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toISODate } from "../invoices/invoiceModel";
import { formatSaleName } from "../sales/saleName";
import type { Project, ProjectMilestone, Sale, TimeEntry } from "../types";

const NO_MILESTONE = "none";
const MIN_HOURS = 0.25;
const MAX_HOURS = 24;

/** Who worked how long on the project, and a form to log your own time. */
export const ProjectTime = ({
  project,
  milestones,
  timeEntries,
}: {
  project: Project;
  milestones: ProjectMilestone[];
  timeEntries: TimeEntry[];
}) => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const milestoneNames = new Map(
    milestones.map((milestone) => [String(milestone.id), milestone.name]),
  );
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {translate("resources.projects.time.title")}
          </h2>
        </div>
        <LogTimeForm project={project} milestones={milestones} />
        {timeEntries.length ? (
          <ul className="divide-y rounded-md border text-sm">
            {timeEntries.map((entry) => (
              <TimeRow
                key={entry.id}
                entry={entry}
                milestoneName={
                  entry.milestone_id != null
                    ? milestoneNames.get(String(entry.milestone_id))
                    : undefined
                }
                isMine={String(entry.sales_id) === String(identity?.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {translate("resources.projects.time.empty")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const TimeRow = ({
  entry,
  milestoneName,
  isMine,
}: {
  entry: TimeEntry;
  milestoneName?: string;
  isMine: boolean;
}) => {
  const translate = useTranslate();
  const [deleteOne] = useDelete();
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className="w-14 shrink-0 font-semibold tabular-nums">
        {Number(entry.hours)} h
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate">
          {entry.description || milestoneName || "—"}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(entry.spent_on), "d MMM yyyy")} ·{" "}
          <ReferenceField<TimeEntry, Sale>
            record={entry}
            source="sales_id"
            reference="sales"
            link={false}
            render={({ referenceRecord }) =>
              referenceRecord ? formatSaleName(referenceRecord as Sale) : null
            }
          />
          {milestoneName && entry.description ? ` · ${milestoneName}` : ""}
          {!entry.billable
            ? ` · ${translate("resources.projects.time.non_billable")}`
            : ""}
        </div>
      </div>
      {isMine ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={translate("resources.projects.time.delete")}
          onClick={() =>
            deleteOne("time_entries", { id: entry.id, previousData: entry })
          }
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </li>
  );
};

const LogTimeForm = ({
  project,
  milestones,
}: {
  project: Project;
  milestones: ProjectMilestone[];
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const { identity } = useGetIdentity();
  const [create, { isPending }] = useCreate();
  const [hours, setHours] = useState("");
  const [spentOn, setSpentOn] = useState(toISODate(new Date()));
  const [description, setDescription] = useState("");
  const [milestoneId, setMilestoneId] = useState(NO_MILESTONE);
  const [billable, setBillable] = useState(true);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(hours);
    if (!(value >= MIN_HOURS && value <= MAX_HOURS)) {
      notify("resources.projects.time.invalid_hours", { type: "error" });
      return;
    }
    if (identity?.id == null) return;
    create(
      "time_entries",
      {
        data: {
          project_id: project.id,
          milestone_id:
            milestoneId === NO_MILESTONE ? null : Number(milestoneId),
          sales_id: identity.id,
          spent_on: spentOn,
          hours: Math.round(value * 100) / 100,
          description: description.trim().slice(0, 1000) || null,
          billable,
          created_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setHours("");
          setDescription("");
          notify("resources.projects.time.logged", { type: "success" });
        },
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 rounded-md bg-muted/30 p-2"
    >
      <Input
        type="number"
        min={MIN_HOURS}
        max={MAX_HOURS}
        step="0.25"
        value={hours}
        placeholder={translate("resources.projects.time.hours")}
        onChange={(event) => setHours(event.target.value)}
        className="h-8 w-24"
      />
      <Input
        type="date"
        value={spentOn}
        aria-label={translate("resources.projects.time.spent_on")}
        onChange={(event) => setSpentOn(event.target.value)}
        className="h-8 w-40"
      />
      <Input
        value={description}
        maxLength={1000}
        placeholder={translate("resources.projects.time.description")}
        onChange={(event) => setDescription(event.target.value)}
        className="h-8 min-w-48 flex-1"
      />
      {milestones.length ? (
        <Select value={milestoneId} onValueChange={setMilestoneId}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_MILESTONE}>—</SelectItem>
            {milestones.map((milestone) => (
              <SelectItem key={milestone.id} value={String(milestone.id)}>
                {milestone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <label className="flex items-center gap-1.5 text-xs">
        <Checkbox
          checked={billable}
          onCheckedChange={(checked) => setBillable(checked === true)}
        />
        {translate("resources.projects.time.billable")}
      </label>
      <Button type="submit" size="sm" disabled={!hours || isPending}>
        {translate("resources.projects.time.log")}
      </Button>
    </form>
  );
};
