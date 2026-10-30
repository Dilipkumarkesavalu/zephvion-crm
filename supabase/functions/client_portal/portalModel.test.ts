// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isValidToken,
  parsePortalRequest,
  sha256Hex,
  shapeInvoices,
  shapeProjects,
  shapeTickets,
} from "./portalModel";

describe("tokens", () => {
  it("accepts only 64 hex characters", () => {
    expect(isValidToken("a".repeat(64))).toBe(true);
    expect(isValidToken("A".repeat(64))).toBe(false);
    expect(isValidToken("a".repeat(63))).toBe(false);
    expect(isValidToken("' or 1=1 --")).toBe(false);
  });

  it("stores a SHA-256 fingerprint, never the token", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("shapeInvoices", () => {
  it("shows sent and paid invoices and sent or accepted quotes, never drafts", () => {
    const shown = shapeInvoices([
      {
        id: 1,
        type: "invoice",
        number: "INV-1",
        status: "sent",
        total: 118000,
        amount_paid: 18000,
        payment_link_url: "https://rzp.io/l/x",
      },
      { id: 2, type: "invoice", number: "INV-2", status: "draft", total: 5000 },
      {
        id: 3,
        type: "invoice",
        number: "INV-3",
        status: "paid",
        total: 5900,
        amount_paid: 0,
        payment_link_url: "https://old",
      },
      { id: 4, type: "quote", number: "QT-1", status: "draft", total: 1 },
      { id: 5, type: "quote", number: "QT-2", status: "accepted", total: 9 },
    ]);

    expect(shown.map((invoice) => invoice.number)).toEqual([
      "INV-1",
      "INV-3",
      "QT-2",
    ]);
    expect(shown[0]).toMatchObject({
      balance: 100000,
      payment_link_url: "https://rzp.io/l/x",
    });
    expect(shown[1]).toMatchObject({ balance: 0, payment_link_url: null });
  });
});

describe("shapeProjects", () => {
  it("hides cancelled projects and orders milestones", () => {
    const [project, ...rest] = shapeProjects(
      [
        { id: 1, name: "Website", status: "active" },
        { id: 2, name: "Old", status: "cancelled" },
      ],
      [
        { project_id: 1, name: "Handover", status: "pending", position: 2 },
        { project_id: 1, name: "Design", status: "done", position: 0 },
        { project_id: 1, name: "Build", status: "in_progress", position: 1 },
      ],
    );

    expect(rest).toHaveLength(0);
    expect(project.milestones.map((milestone) => milestone.name)).toEqual([
      "Design",
      "Build",
      "Handover",
    ]);
    expect(project.progress).toBeCloseTo(1 / 3);
  });
});

describe("shapeTickets", () => {
  it("never includes internal notes", () => {
    const [ticket] = shapeTickets(
      [
        {
          id: 7,
          number: "TKT-0007",
          subject: "Form",
          status: "open",
          priority: "high",
          created_at: "2026-10-30",
        },
      ],
      [
        {
          id: 1,
          ticket_id: 7,
          body: "Check SMTP password",
          is_internal: true,
          sales_id: 2,
          created_at: "2026-10-30T10:00",
        },
        {
          id: 2,
          ticket_id: 7,
          body: "Fixed now",
          is_internal: false,
          sales_id: 2,
          created_at: "2026-10-30T11:00",
        },
        {
          id: 3,
          ticket_id: 7,
          body: "Thanks!",
          is_internal: false,
          is_from_client: true,
          created_at: "2026-10-30T12:00",
        },
      ],
      new Map([[2, "Bhavani"]]),
    );

    expect(ticket.comments.map((comment) => comment.body)).toEqual([
      "Fixed now",
      "Thanks!",
    ]);
    expect(ticket.comments[0].author).toBe("Bhavani");
    expect(ticket.comments[1]).toMatchObject({
      from_client: true,
      author: null,
    });
  });
});

describe("parsePortalRequest", () => {
  it("reads a new request and a reply", () => {
    expect(
      parsePortalRequest({
        action: "create_ticket",
        subject: " Logo ",
        description: "Change it",
        name: "Asha",
      }),
    ).toEqual({
      action: "create_ticket",
      subject: "Logo",
      description: "Change it",
      name: "Asha",
    });
    expect(
      parsePortalRequest({ action: "reply", ticket_id: "7", body: "ok" }),
    ).toEqual({
      action: "reply",
      ticketId: 7,
      body: "ok",
    });
  });

  it("refuses empty messages and unknown actions", () => {
    expect(
      parsePortalRequest({ action: "create_ticket", subject: "x" }),
    ).toHaveProperty("error");
    expect(
      parsePortalRequest({ action: "reply", ticket_id: 7, body: "  " }),
    ).toHaveProperty("error");
    expect(parsePortalRequest({ action: "delete_everything" })).toHaveProperty(
      "error",
    );
  });
});
