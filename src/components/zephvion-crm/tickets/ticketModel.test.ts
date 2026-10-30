import {
  getTicketDeadline,
  nextTicketNumber,
  prepareTicket,
} from "./ticketModel";

const NOW = new Date("2026-10-30T10:00:00.000Z");

describe("prepareTicket", () => {
  it("sets deadlines from the priority", () => {
    const ticket = prepareTicket(
      {
        subject: "Site down",
        priority: "urgent",
        created_at: "2026-10-30T09:00:00.000Z",
      },
      undefined,
      NOW,
    );

    expect(ticket.first_response_due).toBe("2026-10-30T10:00:00.000Z");
    expect(ticket.resolve_due).toBe("2026-10-30T17:00:00.000Z");
    expect(ticket.status).toBe("open");
  });

  it("keeps deadlines unless the priority changes", () => {
    const previous = prepareTicket(
      { subject: "x", priority: "low", created_at: "2026-10-30T09:00:00.000Z" },
      undefined,
      NOW,
    );
    const same = prepareTicket({ ...previous, subject: "y" }, previous, NOW);
    const raised = prepareTicket(
      { ...previous, priority: "high" },
      previous,
      NOW,
    );

    expect(same.first_response_due).toBe(previous.first_response_due);
    expect(raised.first_response_due).toBe("2026-10-30T13:00:00.000Z");
  });

  it("stamps resolution and clears it when reopened", () => {
    const resolved = prepareTicket(
      {
        subject: "x",
        status: "resolved",
        created_at: "2026-10-29T09:00:00.000Z",
      },
      { priority: "normal" },
      NOW,
    );
    expect(resolved.resolved_at).toBe(NOW.toISOString());
    expect(resolved.first_responded_at).toBe(NOW.toISOString());

    const reopened = prepareTicket(
      { ...resolved, status: "open" },
      resolved,
      NOW,
    );
    expect(reopened.resolved_at).toBeNull();
  });
});

describe("getTicketDeadline", () => {
  const ticket = {
    status: "open" as const,
    first_response_due: "2026-10-30T11:30:00.000Z",
    resolve_due: "2026-10-30T08:00:00.000Z",
  };

  it("tracks the first response until someone replies", () => {
    expect(getTicketDeadline(ticket, NOW)).toEqual({
      kind: "response",
      minutes: 90,
      isLate: false,
    });
  });

  it("then tracks resolution", () => {
    expect(
      getTicketDeadline(
        { ...ticket, first_responded_at: "2026-10-30T09:10:00.000Z" },
        NOW,
      ),
    ).toEqual({ kind: "resolve", minutes: 120, isLate: true });
  });

  it("has no deadline once resolved", () => {
    expect(getTicketDeadline({ ...ticket, status: "resolved" }, NOW)).toEqual({
      kind: "none",
    });
  });
});

describe("nextTicketNumber", () => {
  it("continues the series", () => {
    expect(nextTicketNumber(["TKT-0009", "TKT-0012", "TKT-0003"])).toBe(
      "TKT-0013",
    );
    expect(nextTicketNumber([])).toBe("TKT-0001");
  });
});
