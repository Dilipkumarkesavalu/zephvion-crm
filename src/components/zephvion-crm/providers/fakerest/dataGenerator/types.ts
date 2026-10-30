import type {
  AuditLogEntry,
  Company,
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Department,
  Invoice,
  InvoicePayment,
  InvoiceReminder,
  Lead,
  Project,
  ProjectMilestone,
  TimeEntry,
  Ticket,
  TicketComment,
  Notification,
  SavedView,
  Sale,
  Tag,
  Task,
} from "../../../types";
import type { ConfigurationContextValue } from "../../../root/ConfigurationContext";

export interface Db {
  companies: Company[];
  contacts: Contact[];
  contact_notes: ContactNote[];
  deals: Deal[];
  deal_notes: DealNote[];
  invoices: Invoice[];
  departments: Department[];
  notifications: Notification[];
  saved_views: SavedView[];
  leads: Lead[];
  invoice_payments: InvoicePayment[];
  invoice_reminders: InvoiceReminder[];
  projects: Project[];
  project_milestones: ProjectMilestone[];
  time_entries: TimeEntry[];
  tickets: Ticket[];
  ticket_comments: TicketComment[];
  audit_log: AuditLogEntry[];
  sales: Sale[];
  tags: Tag[];
  tasks: Task[];
  configuration: Array<{ id: number; config: ConfigurationContextValue }>;
}
