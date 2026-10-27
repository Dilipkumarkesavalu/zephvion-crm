import { useState } from "react";
import { useGetIdentity, useGetList, useTranslate } from "ra-core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatSaleName } from "../sales/saleName";
import type { Sale } from "../types";
import { TasksListByDueDate } from "./TasksListByDueDate";

const MINE = "mine";
const EVERYONE = "all";

export const TasksListContent = () => {
  const translate = useTranslate();
  const [assignee, setAssignee] = useState(MINE);
  return (
    <div className="flex flex-col gap-4">
      <AssigneeSelect value={assignee} onChange={setAssignee} />
      <TasksListByDueDate
        assignee={
          assignee === MINE
            ? undefined
            : assignee === EVERYONE
              ? EVERYONE
              : Number(assignee)
        }
        emptyPlaceholder={
          <p className="text-sm">
            {translate("resources.tasks.empty_list_hint")}
          </p>
        }
      />
    </div>
  );
};

/** Switch between my tasks, the whole team's, or one teammate's. */
const AssigneeSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const { data: sales } = useGetList<Sale>("sales", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "first_name", order: "ASC" },
    filter: { "disabled@neq": true },
  });
  const teammates = sales?.filter((sale) => sale.id !== identity?.id) ?? [];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className="w-full sm:w-56"
        aria-label={translate("resources.tasks.assignee_filter.label")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={MINE}>
          {translate("resources.tasks.assignee_filter.mine")}
        </SelectItem>
        <SelectItem value={EVERYONE}>
          {translate("resources.tasks.assignee_filter.everyone")}
        </SelectItem>
        {teammates.map((sale) => (
          <SelectItem key={sale.id} value={String(sale.id)}>
            {formatSaleName(sale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
