/**
 * English strings for departments, roles, notifications and the audit log.
 * Kept apart from englishCrmMessages (which the French catalog must mirror
 * exactly), like invoiceMessages.
 */
export const organisationMessages = {
  resources: {
    departments: {
      name: "Department |||| Departments",
      fields: {
        name: "Name",
        color: "Colour",
        head_sales_id: "Department head",
        members: "Members",
      },
      empty: "No departments yet",
      action: {
        new: "New department",
      },
    },
    sales: {
      fields: {
        role: "Role",
        department_id: "Department",
      },
    },
    audit_log: {
      name: "Audit log",
      fields: {
        created_at: "When",
        sales_id: "Who",
        action: "Action",
        table_name: "Record type",
        record_id: "Record",
        changes: "Changes",
      },
    },
  },
  crm: {
    command: {
      go_to: "Go to",
      create: "Create",
      new_contact: "New contact",
      new_company: "New company",
      new_deal: "New deal",
      new_invoice: "New quote or invoice",
    },
    roles: {
      owner: "Owner",
      admin: "Admin",
      head: "Department head",
      manager: "Manager",
      member: "Member",
      finance: "Finance",
      viewer: "Viewer",
    },
    role_hints: {
      owner: "Everything, including other owners",
      admin: "Users, departments, settings and all records",
      head: "Leads a department",
      manager: "Manages a team",
      member: "Works on their own records",
      finance: "Invoices, payments and margins",
      viewer: "Read-only access",
    },
    audit: {
      title: "Audit log",
      subtitle: "Every change to clients, deals, tasks, invoices and users.",
      actions: {
        insert: "created",
        update: "changed",
        delete: "deleted",
      },
      tables: {
        companies: "Company",
        contacts: "Contact",
        deals: "Deal",
        tasks: "Task",
        invoices: "Invoice",
        sales: "User",
        departments: "Department",
      },
      system: "System",
      empty: "Nothing has changed yet.",
      more_fields: "+%{smart_count} more",
    },
    notifications: {
      title: "Notifications",
      open: "Open notifications",
      empty: "You're all caught up.",
      mark_all_read: "Mark all as read",
      assigned: {
        tasks: "%{actor} assigned you a task",
        deals: "%{actor} assigned you a deal",
        contacts: "%{actor} assigned you a contact",
        companies: "%{actor} assigned you a company",
      },
      someone: "Someone",
    },
  },
};
