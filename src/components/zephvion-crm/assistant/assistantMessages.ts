/** English strings for the AI assistant. */
export const assistantMessages = {
  crm: {
    ai: {
      ask: "Ask AI",
      ask_title: "Ask about your CRM",
      ask_hint:
        "Answers come from the records you can see. The assistant can read but never change anything.",
      ask_placeholder: "e.g. Which invoices are overdue?",
      send: "Ask",
      thinking: "Looking that up…",
      examples: [
        "Which invoices are overdue, and who owes the most?",
        "What deals are expected to close this month?",
        "Which urgent tickets are still open?",
        "Summarise new leads from this week",
      ].join("|"),
      clear: "New conversation",
      summary_title: "AI summary",
      summarize: "Summarise this client",
      resummarize: "Refresh",
      draft_email: "Draft email",
      draft_title: "Draft an email with AI",
      purpose: "What is the email for?",
      purpose_placeholder: "e.g. Follow up on the proposal we sent last week",
      purposes: {
        deals: "Follow up on this deal and suggest a short call",
        invoices: "Polite reminder about this invoice and how to pay",
        tickets: "Update the client on this request",
        companies: "Check in with this client and offer help",
      },
      generate: "Write draft",
      regenerate: "Write again",
      subject: "Subject",
      body: "Email",
      copy: "Copy",
      copied: "Copied",
      open_mail: "Open in email",
      to: "To %{to}",
      review: "Check the draft before sending: AI can get details wrong.",
      failures: {
        demo: "The demo has no AI model connected.",
        ai_not_configured:
          "The AI assistant isn't connected yet: an admin needs to add the AI_API_KEY secret.",
        daily_limit: "You've reached today's AI limit. Try again tomorrow.",
        busy: "The AI service is busy right now. Try again in a minute.",
        model_error: "The AI service didn't answer. Try again.",
        "not found": "That record couldn't be found.",
      },
    },
  },
};
