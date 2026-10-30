import type { Project } from "../types";
import { ProjectCreate, ProjectEdit } from "./ProjectForm";
import { ProjectList } from "./ProjectList";
import { ProjectShow } from "./ProjectShow";

export default {
  list: ProjectList,
  create: ProjectCreate,
  edit: ProjectEdit,
  show: ProjectShow,
  recordRepresentation: (record: Project) => record.name,
};
