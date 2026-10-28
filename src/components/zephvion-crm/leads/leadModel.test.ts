import {
  computeLeadScore,
  formatDuration,
  getLeadTier,
  getSlaState,
  prepareLead,
} from "./leadModel";

const NOW = new Date("2026-10-28T10:00:00.000Z");

describe("computeLeadScore", () => {
  it("rewards a big referral with full details", () => {
    const score = computeLeadScore({
      budget: 600000,
      company_name: "Rao Textiles",
      phone: "9845012345",
      email: "asha@rao.in",
      source: "referral",
      message: "Looking for a full rebrand and a new website this quarter.",
    });

    expect(score).toBe(100);
    expect(getLeadTier(score)).toBe("hot");
  });

  it("scores a bare manual entry as cold", () => {
    const score = computeLeadScore({ source: "manual", email: "x@y.in" });

    expect(score).toBe(10);
    expect(getLeadTier(score)).toBe("cold");
  });

  it("places a mid-size website enquiry in warm", () => {
    const score = computeLeadScore({
      budget: 60000,
      source: "website",
      email: "a@b.in",
    });

    expect(score).toBe(40);
    expect(getLeadTier(score)).toBe("warm");
  });
});

describe("getSlaState", () => {
  const due = "2026-10-28T11:30:00.000Z";

  it("counts down while a new lead waits for first contact", () => {
    expect(
      getSlaState({ status: "new", first_response_due: due }, NOW),
    ).toEqual({ kind: "due", minutesLeft: 90 });
  });

  it("reports how late the first contact is", () => {
    expect(
      getSlaState(
        { status: "new", first_response_due: "2026-10-28T07:00:00.000Z" },
        NOW,
      ),
    ).toEqual({ kind: "overdue", minutesLate: 180 });
  });

  it("is done once the lead has been contacted", () => {
    expect(
      getSlaState({ status: "contacted", first_response_due: due }, NOW),
    ).toEqual({ kind: "done" });
  });
});

describe("formatDuration", () => {
  it("keeps it short", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(150)).toBe("2h 30m");
    expect(formatDuration(60 * 72)).toBe("3d");
  });
});

describe("prepareLead", () => {
  it("sets the score and a two-hour response deadline on a new lead", () => {
    const lead = prepareLead(
      { first_name: "Ravi", source: "website", status: "new" },
      NOW,
    );

    expect(lead.score).toBe(15);
    expect(lead.first_response_due).toBe("2026-10-28T12:00:00.000Z");
    expect(lead.first_responded_at).toBeUndefined();
  });

  it("stamps the first response when the status moves on", () => {
    const lead = prepareLead(
      {
        first_name: "Ravi",
        source: "website",
        status: "contacted",
        created_at: "2026-10-28T09:00:00.000Z",
      },
      NOW,
    );

    expect(lead.first_responded_at).toBe(NOW.toISOString());
  });
});
