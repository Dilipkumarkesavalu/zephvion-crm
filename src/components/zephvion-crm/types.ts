import type { Identifier, RaRecord } from "ra-core";
import type { ComponentType } from "react";

import type {
  COMPANY_CREATED,
  CONTACT_CREATED,
  CONTACT_NOTE_CREATED,
  DEAL_CREATED,
  DEAL_NOTE_CREATED,
} from "./consts";

export type SignUpData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type SalesFormData = {
  avatar?: string;
  email: string;
  secondary_emails?: string[];
  password?: string;
  first_name: string;
  last_name: string;
  administrator: boolean;
  disabled: boolean;
  role?: SaleRole;
  department_id?: Identifier | null;
};

export const SALE_ROLES = [
  "owner",
  "admin",
  "head",
  "manager",
  "member",
  "finance",
  "viewer",
] as const;

export type SaleRole = (typeof SALE_ROLES)[number];

export type Department = {
  name: string;
  color: string;
  head_sales_id?: Identifier | null;
  created_at?: string;
} & Pick<RaRecord, "id">;

export type AuditLogEntry = {
  created_at: string;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete";
  sales_id?: Identifier | null;
  changes: Record<string, unknown>;
} & Pick<RaRecord, "id">;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "website",
  "whatsapp",
  "email",
  "referral",
  "linkedin",
  "event",
  "import",
  "manual",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export type Lead = {
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  service?: string | null;
  budget?: number | null;
  message?: string | null;
  source: LeadSource;
  utm_source?: string | null;
  utm_campaign?: string | null;
  status: LeadStatus;
  sales_id?: Identifier | null;
  score: number;
  first_response_due?: string | null;
  first_responded_at?: string | null;
  disqualify_reason?: string | null;
  converted_contact_id?: Identifier | null;
  converted_company_id?: Identifier | null;
  converted_deal_id?: Identifier | null;
} & Pick<RaRecord, "id">;

export type SavedViewResource =
  | "leads"
  | "contacts"
  | "companies"
  | "deals"
  | "invoices"
  | "projects";

export type SavedView = {
  created_at: string;
  sales_id: Identifier;
  resource: SavedViewResource;
  name: string;
  filter: Record<string, unknown>;
  is_shared: boolean;
} & Pick<RaRecord, "id">;

export type Notification = {
  created_at: string;
  recipient_sales_id: Identifier;
  actor_sales_id?: Identifier | null;
  type: string;
  resource: string;
  record_id: Identifier;
  title: string;
  read_at?: string | null;
} & Pick<RaRecord, "id">;

export type Sale = {
  first_name: string;
  last_name: string;
  administrator: boolean;
  role?: SaleRole;
  department_id?: Identifier | null;
  avatar?: RAFile;
  disabled?: boolean;
  user_id: string;

  /**
   * This is a copy of the user's email, to make it easier to handle by react admin
   * DO NOT UPDATE this field directly, it should be updated by the backend
   */
  email: string;

  secondary_emails?: string[];

  /**
   * This is used by the fake rest provider to store the password
   * DO NOT USE this field in your code besides the fake rest provider
   * @deprecated
   */
  password?: string;
} & Pick<RaRecord, "id">;

export type Company = {
  name: string;
  logo: RAFile;
  sector: string;
  size: 1 | 10 | 50 | 250 | 500;
  linkedin_url: string;
  website: string;
  phone_number: string;
  address: string;
  zipcode: string;
  city: string;
  state_abbr: string;
  sales_id?: Identifier;
  created_at: string;
  description: string;
  revenue: string;
  tax_identifier: string;
  country: string;
  context_links?: string[];
  nb_contacts?: number;
  nb_deals?: number;
} & Pick<RaRecord, "id">;

export type EmailAndType = {
  email: string;
  type: "Work" | "Home" | "Other";
};

export type PhoneNumberAndType = {
  number: string;
  type: "Work" | "Home" | "Other";
};

export type Contact = {
  first_name: string;
  last_name: string;
  title: string;
  company_id?: Identifier | null;
  email_jsonb: EmailAndType[];
  avatar?: Partial<RAFile>;
  linkedin_url?: string | null;
  first_seen: string;
  last_seen: string;
  has_newsletter: boolean;
  tags: number[];
  gender: string;
  sales_id?: Identifier;
  status: string;
  background: string;
  phone_jsonb: PhoneNumberAndType[];
  nb_tasks?: number;
  company_name?: string;
} & Pick<RaRecord, "id">;

export type ContactNote = {
  contact_id: Identifier;
  text: string;
  date: string;
  sales_id: Identifier;
  status: string;
  attachments?: AttachmentNote[];
} & Pick<RaRecord, "id">;

export type Deal = {
  name: string;
  company_id: Identifier;
  contact_ids: Identifier[];
  category: string;
  stage: string;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  expected_closing_date: string;
  sales_id: Identifier;
  index: number;
} & Pick<RaRecord, "id">;

export type InvoiceType = "quote" | "invoice";

/** intra: CGST + SGST (same state), inter: IGST (different states). */
export type TaxMode = "intra" | "inter";

export type InvoiceItem = {
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
};

export type Invoice = {
  type: InvoiceType;
  number: string;
  status: string;
  company_id: Identifier;
  contact_id?: Identifier | null;
  deal_id?: Identifier | null;
  sales_id?: Identifier;
  issue_date: string;
  /** Payment due date for invoices, validity date for quotes. */
  due_date: string;
  tax_mode: TaxMode;
  items: InvoiceItem[];
  notes?: string;
  subtotal: number;
  tax_total: number;
  total: number;
  source_quote_id?: Identifier | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  /** Payments plus TDS received so far, kept up to date by the database. */
  amount_paid?: number;
  recurrence?: InvoiceRecurrence;
  /** When the next copy of a recurring invoice is drafted. */
  next_issue_date?: string | null;
  recurring_parent_id?: Identifier | null;
  payment_link_url?: string | null;
  payment_link_id?: string | null;
  project_id?: Identifier | null;
  milestone_id?: Identifier | null;
} & Pick<RaRecord, "id">;

export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type Project = {
  created_at: string;
  updated_at: string;
  name: string;
  company_id: Identifier;
  deal_id?: Identifier | null;
  /** Project manager */
  sales_id?: Identifier | null;
  status: ProjectStatus;
  start_date?: string | null;
  due_date?: string | null;
  budget: number;
  budget_hours: number;
  description?: string | null;
} & Pick<RaRecord, "id">;

export const MILESTONE_STATUSES = ["pending", "in_progress", "done"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export type ProjectMilestone = {
  created_at: string;
  project_id: Identifier;
  name: string;
  due_date?: string | null;
  amount: number;
  status: MilestoneStatus;
  completed_at?: string | null;
  position: number;
} & Pick<RaRecord, "id">;

export type TimeEntry = {
  created_at: string;
  project_id: Identifier;
  milestone_id?: Identifier | null;
  sales_id: Identifier;
  spent_on: string;
  hours: number;
  description?: string | null;
  billable: boolean;
} & Pick<RaRecord, "id">;

export const INVOICE_RECURRENCES = [
  "none",
  "monthly",
  "quarterly",
  "yearly",
] as const;
export type InvoiceRecurrence = (typeof INVOICE_RECURRENCES)[number];

export const PAYMENT_METHODS = [
  "bank_transfer",
  "upi",
  "razorpay",
  "cheque",
  "cash",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type InvoicePayment = {
  created_at: string;
  invoice_id: Identifier;
  amount: number;
  /** Tax deducted at source by the client, counts towards settling. */
  tds_amount: number;
  paid_on: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  sales_id?: Identifier | null;
  external_id?: string | null;
} & Pick<RaRecord, "id">;

export type InvoiceReminder = {
  sent_at: string;
  invoice_id: Identifier;
  kind: string;
  sent_to: string;
  sales_id?: Identifier | null;
} & Pick<RaRecord, "id">;

export type DealNote = {
  deal_id: Identifier;
  text: string;
  date: string;
  sales_id: Identifier;
  attachments?: AttachmentNote[];

  // This is defined for compatibility with `ContactNote`
  status?: undefined;
} & Pick<RaRecord, "id">;

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export type Task = {
  contact_id: Identifier;
  type: string;
  text: string;
  due_date: string;
  done_date?: string | null;
  sales_id?: Identifier;
  created_at?: string;
} & Pick<RaRecord, "id">;

export type ActivityCompanyCreated = {
  type: typeof COMPANY_CREATED;
  company_id: Identifier;
  company: Company;
  sales_id: Identifier;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactCreated = {
  type: typeof CONTACT_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  contact: Contact;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactNoteCreated = {
  type: typeof CONTACT_NOTE_CREATED;
  sales_id?: Identifier;
  contactNote: ContactNote;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityDealCreated = {
  type: typeof DEAL_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  deal: Deal;
  date: string;
};

export type ActivityDealNoteCreated = {
  type: typeof DEAL_NOTE_CREATED;
  sales_id?: Identifier;
  dealNote: DealNote;
  date: string;
};

export type Activity = RaRecord &
  (
    | ActivityCompanyCreated
    | ActivityContactCreated
    | ActivityContactNoteCreated
    | ActivityDealCreated
    | ActivityDealNoteCreated
  );

export interface RAFile {
  src: string;
  title: string;
  path?: string;
  rawFile: File;
  type?: string;
}

export type AttachmentNote = RAFile;

export interface LabeledValue {
  value: string;
  label: string;
}

export type DealStage = LabeledValue;

export interface NoteStatus extends LabeledValue {
  color: string;
}

export interface ContactGender {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export type SearchResourceName =
  | "companies"
  | "contacts"
  | "deals"
  | "tasks"
  | "contact_notes"
  | "deal_notes";

export type SearchResult = {
  resource: SearchResourceName;
  record_id: Identifier;
  title: string | null;
  subtitle: string | null;
  contact_id: Identifier | null;
  deal_id: Identifier | null;
  date: string | null;
  /** The searched fields, to show and highlight where the query matched. */
  content: string | null;
};
