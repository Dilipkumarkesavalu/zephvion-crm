// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildReminderEmail, indianToday, pickReminder } from "./reminderModel";

describe("indianToday", () => {
  it("uses the date in India, not UTC", () => {
    expect(indianToday(new Date("2026-10-29T20:00:00.000Z"))).toBe(
      "2026-10-30",
    );
  });
});

describe("pickReminder", () => {
  const due = "2026-10-20";

  it("follows the schedule around the due date", () => {
    expect(pickReminder(due, "2026-10-15", [])).toBeNull();
    expect(pickReminder(due, "2026-10-17", [])).toBe("before_due");
    expect(pickReminder(due, "2026-10-20", [])).toBe("due");
    expect(pickReminder(due, "2026-10-27", [])).toBe("overdue_7");
    expect(pickReminder(due, "2026-11-03", [])).toBe("overdue_14");
    expect(pickReminder(due, "2026-12-01", [])).toBe("overdue_30");
  });

  it("sends each stage once, catching up on a missed day", () => {
    expect(pickReminder(due, "2026-10-21", ["before_due"])).toBe("due");
    expect(pickReminder(due, "2026-10-22", ["due"])).toBeNull();
    expect(pickReminder(due, "2026-10-29", ["due"])).toBe("overdue_7");
  });
});

describe("buildReminderEmail", () => {
  const base = {
    clientName: "Rao Logistics",
    contactFirstName: "Vikram",
    invoiceNumber: "INV-2026-0007",
    dueDate: "2026-10-20",
    balance: 68000,
    sellerName: "Zephvion Pvt. Ltd.",
  };

  it("states the balance, due date, payment link and bank details", () => {
    const email = buildReminderEmail({
      ...base,
      kind: "overdue_7",
      paymentLink: "https://rzp.io/l/abc",
      bank: {
        accountName: "Zephvion Pvt. Ltd.",
        bankName: "IDFC FIRST Bank",
        accountNumber: "1234",
        ifsc: "IDFB0000001",
      },
    });

    expect(email.subject).toBe("Overdue: invoice INV-2026-0007 · ₹68,000.00");
    expect(email.text).toContain("Dear Vikram,");
    expect(email.text).toContain("Due date: 20 Oct 2026");
    expect(email.text).toContain("Pay online: https://rzp.io/l/abc");
    expect(email.text).toContain("A/c 1234 · IFSC IDFB0000001");
  });

  it("escapes names in the HTML and keeps the subject on one line", () => {
    const email = buildReminderEmail({
      ...base,
      kind: "due",
      contactFirstName: "<b>Eve</b>",
      invoiceNumber: "INV\nBcc: x@y.z",
    });

    expect(email.html).toContain("&lt;b&gt;Eve&lt;/b&gt;");
    expect(email.subject).not.toContain("\n");
    expect(email.text).not.toContain("Bank transfer");
  });
});
