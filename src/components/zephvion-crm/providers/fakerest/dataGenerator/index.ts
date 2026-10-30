import { generateCompanies } from "./companies";
import { generateContactNotes } from "./contactNotes";
import { generateContacts } from "./contacts";
import { generateDealNotes } from "./dealNotes";
import { generateDepartments } from "./departments";
import { generateDeals } from "./deals";
import { finalize } from "./finalize";
import { generateInvoices } from "./invoices";
import { generateLeads } from "./leads";
import { generateInvoicePayments } from "./invoicePayments";
import { generateProjects } from "./projects";
import { generateTickets } from "./tickets";
import { generateAutomations } from "./automations";
import { generateAuditLog, generateNotifications } from "./notifications";
import { generateSales } from "./sales";
import { generateSavedViews } from "./savedViews";
import { generateTags } from "./tags";
import { generateTasks } from "./tasks";
import type { Db } from "./types";

export default (): Db => {
  const db = {} as Db;
  db.departments = generateDepartments(db);
  db.sales = generateSales(db);
  db.tags = generateTags(db);
  db.companies = generateCompanies(db);
  db.contacts = generateContacts(db);
  db.contact_notes = generateContactNotes(db);
  db.deals = generateDeals(db);
  db.deal_notes = generateDealNotes(db);
  db.tasks = generateTasks(db);
  db.invoices = generateInvoices(db);
  db.notifications = generateNotifications(db);
  db.audit_log = generateAuditLog(db);
  db.saved_views = generateSavedViews(db);
  db.leads = generateLeads(db);
  db.invoice_payments = generateInvoicePayments(db);
  db.invoice_reminders = [];
  Object.assign(db, generateProjects(db));
  Object.assign(db, generateTickets(db));
  Object.assign(db, generateAutomations(db));
  db.portal_access = [];
  db.configuration = [
    {
      id: 1,
      config: {} as Db["configuration"][number]["config"],
    },
  ];
  finalize(db);

  return db;
};
