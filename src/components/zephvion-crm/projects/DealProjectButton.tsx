import { FolderKanban } from "lucide-react";
import { useGetList, useTranslate } from "ra-core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

import type { Deal, Project } from "../types";
import { projectFromDeal } from "./projectModel";

/** On a won deal: start its project, or open it once it exists. */
export const DealProjectButton = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const { data: projects = [], isPending } = useGetList<Project>("projects", {
    filter: { deal_id: deal.id },
    pagination: { page: 1, perPage: 1 },
    sort: { field: "id", order: "ASC" },
  });
  if (isPending) return null;
  const project = projects[0];
  if (project) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to={`/projects/${project.id}/show`}>
          <FolderKanban />
          {translate("resources.projects.action.open_project")}
        </Link>
      </Button>
    );
  }
  if (deal.stage !== "won") return null;
  return (
    <Button asChild size="sm">
      <Link to="/projects/create" state={{ record: projectFromDeal(deal) }}>
        <FolderKanban />
        {translate("resources.projects.action.start_from_deal")}
      </Link>
    </Button>
  );
};
