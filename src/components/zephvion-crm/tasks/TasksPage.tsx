import { CheckSquare } from "lucide-react";
import { useTranslate } from "ra-core";
import { Card } from "@/components/ui/card";

import { AddTask } from "./AddTask";
import { TasksListContent } from "./TasksListContent";

/** Desktop "My work" page: every open task, mine or the team's. */
export const TasksPage = () => {
  const translate = useTranslate();
  return (
    <div className="mx-auto mt-2 flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-center gap-3">
        <CheckSquare className="size-6 text-muted-foreground" />
        <h1 className="flex-1 text-2xl font-semibold">
          {translate("resources.tasks.name", { smart_count: 2 })}
        </h1>
        <AddTask selectContact />
      </div>
      <Card className="p-4">
        <TasksListContent />
      </Card>
    </div>
  );
};
