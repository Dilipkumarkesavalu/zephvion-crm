// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildTicketReplyEmail } from "./ticketEmail";

describe("buildTicketReplyEmail", () => {
  const input = {
    ticketNumber: "TKT-0007",
    subject: "Contact form not sending",
    body: "We found the issue.\n\nIt is fixed now, please try again.",
    contactFirstName: "Meera",
    agentName: "Bhavani",
    sellerName: "Zephvion Pvt. Ltd.",
  };

  it("threads the reply under the ticket number", () => {
    const email = buildTicketReplyEmail(input);

    expect(email.subject).toBe("Re: [TKT-0007] Contact form not sending");
    expect(email.text).toContain("Hi Meera,");
    expect(email.text).toContain("It is fixed now, please try again.");
    expect(email.html).toContain("<p");
  });

  it("escapes the reply in HTML and keeps the subject on one line", () => {
    const email = buildTicketReplyEmail({
      ...input,
      subject: "Hello\nBcc: x@y.z",
      body: "<script>alert(1)</script>",
      contactFirstName: null,
    });

    expect(email.subject).not.toContain("\n");
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("Hello,");
  });
});
