/** Razorpay payment-link request for an invoice balance. */

export interface PaymentLinkInput {
  invoiceId: number;
  invoiceNumber: string;
  balance: number;
  dueDate?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  callbackUrl?: string | null;
  now?: Date;
}

const MIN_LINK_LIFETIME_SECONDS = 16 * 60;
const LINK_LIFETIME_DAYS = 30;

/** Digits only, keeping a leading +, as Razorpay expects. */
const cleanPhone = (phone?: string | null) => {
  const cleaned = (phone ?? "").replace(/[^\d+]/g, "");
  return cleaned.replace(/\D/g, "").length >= 10 ? cleaned : undefined;
};

export const buildPaymentLinkRequest = (input: PaymentLinkInput) => {
  const now = input.now ?? new Date();
  const expireBy =
    Math.floor(now.getTime() / 1000) +
    Math.max(MIN_LINK_LIFETIME_SECONDS, LINK_LIFETIME_DAYS * 24 * 60 * 60);
  return {
    amount: Math.round(input.balance * 100),
    currency: "INR",
    accept_partial: false,
    description: `Invoice ${input.invoiceNumber}`.slice(0, 2048),
    // Unique per link, as Razorpay requires; at most 40 characters
    reference_id: `${input.invoiceNumber}-${now.getTime().toString(36)}`.slice(
      0,
      40,
    ),
    expire_by: expireBy,
    customer: {
      name: input.customerName.slice(0, 100),
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      ...(cleanPhone(input.customerPhone)
        ? { contact: cleanPhone(input.customerPhone) }
        : {}),
    },
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: {
      invoice_id: String(input.invoiceId),
      invoice_number: input.invoiceNumber,
    },
    ...(input.callbackUrl
      ? { callback_url: input.callbackUrl, callback_method: "get" }
      : {}),
  };
};
