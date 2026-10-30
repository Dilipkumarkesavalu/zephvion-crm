/**
 * English strings for quotes & invoices. Kept apart from englishCrmMessages so
 * the French catalog (which must mirror englishCrmMessages exactly) falls back
 * to these until it gets its own translation.
 */
export const invoiceMessages = {
  crm: {
    settings: {
      sections: {
        billing: "Billing details",
      },
      billing: {
        hint: "Printed on every quote and invoice. Bank details only appear on invoices once the account number and IFSC are filled in.",
        address: "Registered address (one line per row)",
        gstin: "GSTIN",
        pan: "PAN",
        email: "Billing email",
        phone: "Billing phone",
        bank_account_name: "Account name",
        bank_name: "Bank",
        bank_account_number: "Account number",
        bank_ifsc: "IFSC",
      },
    },
  },
  resources: {
    invoices: {
      name: "Quote & Invoice |||| Quotes & Invoices",
      fields: {
        type: "Type",
        number: "Number",
        status: "Status",
        company_id: "Client",
        contact_id: "Contact person",
        deal_id: "Deal",
        issue_date: "Issue date",
        due_date: "Due date",
        valid_until: "Valid until",
        tax_mode: "GST type",
        items: "Line items",
        notes: "Notes & terms",
        total: "Total",
        description: "Description",
        hsn_sac: "HSN/SAC",
        quantity: "Qty",
        unit_price: "Rate",
        gst_rate: "GST %",
        amount: "Amount",
      },
      types: {
        quote: "Quote",
        invoice: "Invoice",
      },
      document_titles: {
        quote: "Quotation",
        invoice: "Tax Invoice",
      },
      statuses: {
        draft: "Draft",
        sent: "Sent",
        accepted: "Accepted",
        declined: "Declined",
        paid: "Paid",
        cancelled: "Cancelled",
        overdue: "Overdue",
        expired: "Expired",
      },
      tax_modes: {
        intra: "Intra-state (CGST + SGST)",
        inter: "Inter-state (IGST)",
      },
      tabs: {
        all: "All",
        quote: "Quotes",
        invoice: "Invoices",
      },
      summary: {
        outstanding: "Outstanding",
        overdue: "Overdue",
        collected: "Collected",
        open_quotes: "Open quotes",
        invoices_count: "%{smart_count} invoice |||| %{smart_count} invoices",
        quotes_count: "%{smart_count} quote |||| %{smart_count} quotes",
      },
      action: {
        new_quote: "New quote",
        new_invoice: "New invoice",
        download_pdf: "Download PDF",
        mark_sent: "Mark as sent",
        mark_paid: "Mark as paid",
        mark_accepted: "Accepted",
        mark_declined: "Declined",
        convert: "Convert to invoice",
        add_item: "Add line",
        back: "All quotes & invoices",
      },
      sections: {
        details: "Details",
        billing: "Bill to",
        from: "From",
        items: "Line items",
        totals: "Summary",
      },
      totals: {
        subtotal: "Taxable amount",
        tax: "GST",
        total: "Total",
        in_words: "Amount in words",
      },
      document: {
        bank_details: "Bank details",
        signature: "Authorised signatory",
        thanks: "Thank you for your business.",
        converted_from: "Created from quote %{number}",
      },
      deal_section: {
        title: "Quotes & invoices",
        empty: "No quotes or invoices for this deal yet.",
      },
      notifications: {
        status_updated: "Status updated",
        converted: "Invoice %{number} created from the quote",
        error: "Something went wrong, please try again",
      },
      empty: {
        title: "No quotes or invoices yet",
        description:
          "Create a quote from a deal, then convert it into a GST invoice when the client accepts.",
      },
      validation: {
        at_least_one_item: "Add at least one line item with a description",
      },
    },
  },
};
