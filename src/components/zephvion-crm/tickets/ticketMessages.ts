/** English strings for the support desk. */
export const ticketMessages = {
  resources: {
    tickets: {
      name: "Ticket |||| Tickets",
      fields: {
        number: "Ticket",
        subject: "Subject",
        description: "What's the problem?",
        company_id: "Client",
        contact_id: "Contact",
        project_id: "Project",
        sales_id: "Assigned to",
        status: "Status",
        priority: "Priority",
        channel: "Received by",
        created_at: "Opened",
        deadline: "Deadline",
      },
      action: {
        new: "New ticket",
      },
      empty: "No tickets",
      empty_hint:
        "Log client issues here. Each gets a deadline from its priority and goes to the support team.",
      tabs: {
        open: "Open",
        mine: "Assigned to me",
        waiting_client: "Waiting on client",
        done: "Resolved",
        all: "All",
      },
      statuses: {
        open: "Open",
        in_progress: "In progress",
        waiting_client: "Waiting on client",
        resolved: "Resolved",
        closed: "Closed",
      },
      priorities: {
        low: "Low",
        normal: "Normal",
        high: "High",
        urgent: "Urgent",
      },
      channels: {
        email: "Email",
        phone: "Phone",
        whatsapp: "WhatsApp",
        portal: "Client portal",
        other: "Other",
      },
      deadline: {
        response: "Reply within %{time}",
        response_late: "Reply overdue by %{time}",
        resolve: "Resolve within %{time}",
        resolve_late: "Resolution overdue by %{time}",
      },
      sla_hint:
        "Deadlines: urgent 1 h reply / 8 h fix, high 4 h / 24 h, normal 8 h / 3 days, low 1 day / 5 days.",
      unassigned: "Unassigned",
      thread: {
        title: "Conversation",
        empty: "No replies yet.",
        placeholder: "Write a reply to the client, or an internal note…",
        internal: "Internal note (team only)",
        email_client: "Email this reply to the client",
        send: "Add reply",
        add_note: "Add note",
        internal_badge: "Internal",
        from_client: "Client (portal)",
        emailed: "Emailed to %{to}",
        email_now: "Email to client",
        sent: "Reply added",
        emailed_success: "Reply emailed to %{to}",
        failures: {
          demo: "The demo doesn't send emails",
          "the ticket contact has no email":
            "Add a contact with an email to the ticket first",
          "email is not configured": "Email isn't set up for the CRM yet",
          "already emailed": "That reply was already emailed",
          "only the author can email a reply":
            "Only the person who wrote a reply can email it",
          "internal notes are never emailed":
            "Internal notes are never emailed",
        },
      },
    },
  },
};
