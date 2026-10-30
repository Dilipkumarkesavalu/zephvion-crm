/** Reads a Razorpay webhook into the payment it records, if any. */

export interface RecordedPayment {
  invoiceId: number;
  amount: number;
  paymentId: string;
  method: string;
  paidOn: string;
}

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    payment_link?: { entity?: Record<string, unknown> };
  };
};

const indianDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000 + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

export const readPaidEvent = (event: RazorpayEvent): RecordedPayment | null => {
  if (event.event !== "payment_link.paid") return null;
  const payment = event.payload?.payment?.entity;
  const link = event.payload?.payment_link?.entity;
  const notes = (link?.notes ?? payment?.notes ?? {}) as Record<
    string,
    unknown
  >;
  const invoiceId = Number(notes.invoice_id);
  const paymentId = typeof payment?.id === "string" ? payment.id : "";
  const paise = Number(payment?.amount);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) return null;
  if (!paymentId || !Number.isFinite(paise) || paise <= 0) return null;
  if (payment?.currency && payment.currency !== "INR") return null;
  const createdAt = Number(payment?.created_at);
  return {
    invoiceId,
    amount: Math.round(paise) / 100,
    paymentId,
    method: typeof payment?.method === "string" ? payment.method : "razorpay",
    paidOn: indianDate(
      Number.isFinite(createdAt) ? createdAt : Date.now() / 1000,
    ),
  };
};
