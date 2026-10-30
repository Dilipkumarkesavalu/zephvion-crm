/** English strings for automation rules. */
export const automationMessages = {
  resources: {
    automation_rules: {
      name: "Automation |||| Automations",
    },
  },
  crm: {
    automations: {
      title: "Automations",
      subtitle:
        "Rules that notify people or create follow-up tasks for you. They run in the database, whoever makes the change.",
      new: "New rule",
      edit: "Edit rule",
      templates: "Start from a template",
      empty: "No rules yet. Add one of the templates to get going.",
      add_template: "Add",
      active: "On",
      paused: "Off",
      runs: "Ran %{smart_count} time |||| Ran %{smart_count} times",
      last_run: "last %{date}",
      never_run: "Has not run yet",
      recent_runs: "Recent activity",
      no_runs: "Nothing has run yet.",
      saved: "Rule saved",
      deleted: "Rule deleted",
      admin_only: "Only admins can change automations.",
      fields: {
        name: "Rule name",
        event: "When",
        condition: "Only if",
        days: "Days",
        action: "Then",
        recipient: "Who",
        message: "Message",
        task_text: "Task",
        task_type: "Task type",
        due_days: "Due in (days)",
      },
      events: {
        deal_stage_changed: "A deal moves to a stage",
        lead_created: "A new lead arrives",
        ticket_created: "A ticket is opened",
        deal_idle: "A deal has had no activity for",
        invoice_overdue: "An invoice is unpaid past due by",
      },
      any: "Any",
      actions: {
        notify: "Notify someone",
        create_task: "Create a follow-up task",
      },
      recipients: {
        owner: "The record's owner",
      },
      task_hint:
        "Tasks attach to the deal's first contact or the ticket's contact.",
      daily_hint: "Checked every morning at 9:15.",
      outcomes: {
        notified: "Notified",
        "task created": "Task created",
        "skipped: nobody to notify": "Skipped: nobody to notify",
        "skipped: no contact to attach the task to":
          "Skipped: no contact for the task",
      },
    },
    notifications: {
      automation: "Automation",
    },
  },
};
