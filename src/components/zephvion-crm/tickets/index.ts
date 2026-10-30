import type { Ticket } from "../types";
import { TicketCreate, TicketEdit } from "./TicketForm";
import { TicketList } from "./TicketList";
import { TicketShow } from "./TicketShow";

export default {
  list: TicketList,
  create: TicketCreate,
  edit: TicketEdit,
  show: TicketShow,
  recordRepresentation: (record: Ticket) =>
    `${record.number} ${record.subject}`,
};
