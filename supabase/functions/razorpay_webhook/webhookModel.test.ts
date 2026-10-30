// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hmacSha256Hex, safeEqual } from "../_shared/secrets";
import { buildPaymentLinkRequest } from "../razorpay_payment_link/linkModel";
import { readPaidEvent } from "./webhookModel";

const paidEvent = {
  event: "payment_link.paid",
  payload: {
    payment_link: { entity: { notes: { invoice_id: "42" } } },
    payment: {
      entity: {
        id: "pay_Abc123",
        amount: 6800050,
        currency: "INR",
        method: "upi",
        created_at: 1793260800,
      },
    },
  },
};

describe("readPaidEvent", () => {
  it("turns a paid payment link into a payment on its invoice", () => {
    expect(readPaidEvent(paidEvent)).toEqual({
      invoiceId: 42,
      amount: 68000.5,
      paymentId: "pay_Abc123",
      method: "upi",
      paidOn: "2026-10-29",
    });
  });

  it("ignores other events and payments without an invoice", () => {
    expect(readPaidEvent({ ...paidEvent, event: "payment.failed" })).toBeNull();
    expect(
      readPaidEvent({
        ...paidEvent,
        payload: {
          ...paidEvent.payload,
          payment_link: { entity: { notes: {} } },
        },
      }),
    ).toBeNull();
  });
});

describe("webhook signature", () => {
  it("matches the standard HMAC-SHA256 test vector", async () => {
    expect(
      await hmacSha256Hex("key", "The quick brown fox jumps over the lazy dog"),
    ).toBe("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
  });

  it("compares signatures exactly", async () => {
    const signature = await hmacSha256Hex("secret", '{"a":1}');
    expect(safeEqual(signature, await hmacSha256Hex("secret", '{"a":1}'))).toBe(
      true,
    );
    expect(safeEqual(signature, await hmacSha256Hex("other", '{"a":1}'))).toBe(
      false,
    );
    expect(safeEqual(signature, signature.slice(0, 63))).toBe(false);
  });
});

describe("buildPaymentLinkRequest", () => {
  it("asks for the balance in paise with the invoice in the notes", () => {
    const request = buildPaymentLinkRequest({
      invoiceId: 42,
      invoiceNumber: "INV-2026-0007",
      balance: 68000.5,
      customerName: "Rao Logistics",
      customerEmail: "vikram@rao.in",
      customerPhone: "+91 97400 11982",
      now: new Date("2026-10-30T00:00:00.000Z"),
    });

    expect(request).toMatchObject({
      amount: 6800050,
      currency: "INR",
      description: "Invoice INV-2026-0007",
      customer: {
        name: "Rao Logistics",
        email: "vikram@rao.in",
        contact: "+919740011982",
      },
      notes: { invoice_id: "42" },
    });
    expect(request.reference_id.length).toBeLessThanOrEqual(40);
    expect(request.expire_by).toBe(1793318400 + 30 * 24 * 60 * 60);
  });
});
