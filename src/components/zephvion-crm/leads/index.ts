import type { Lead } from "../types";
import { LeadCreate, LeadEdit } from "./LeadForm";
import { LeadList } from "./LeadList";
import { LeadShow } from "./LeadShow";
import { leadFullName } from "./leadModel";

export default {
  list: LeadList,
  create: LeadCreate,
  edit: LeadEdit,
  show: LeadShow,
  recordRepresentation: (record: Lead) => leadFullName(record),
};
