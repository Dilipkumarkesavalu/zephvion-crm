import type { Invoice } from "../types";
import { InvoiceCreate } from "./InvoiceCreate";
import { InvoiceEdit } from "./InvoiceEdit";
import { InvoiceList } from "./InvoiceList";
import { InvoiceShow } from "./InvoiceShow";

export default {
  list: InvoiceList,
  create: InvoiceCreate,
  edit: InvoiceEdit,
  show: InvoiceShow,
  recordRepresentation: (record: Invoice) => record.number,
};
