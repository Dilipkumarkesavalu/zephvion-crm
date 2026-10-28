// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseBudget, parseLeadPayload, safeRedirect } from "./leadPayload";

describe("parseLeadPayload", () => {
  it("builds a website lead from a typical contact form", () => {
    const result = parseLeadPayload({
      name: "Asha Rao Iyer",
      email: " Asha@Example.COM ",
      phone: "+91 98450 12345",
      company: "Rao Textiles",
      service: "Website",
      budget: "₹2,00,000",
      message: "We need a new site with a product catalogue.",
      utm_source: "google",
    });

    expect(result).toEqual({
      kind: "lead",
      lead: {
        first_name: "Asha",
        last_name: "Rao Iyer",
        email: "asha@example.com",
        phone: "+91 98450 12345",
        company_name: "Rao Textiles",
        service: "Website",
        budget: 200000,
        message: "We need a new site with a product catalogue.",
        source: "website",
        utm_source: "google",
        utm_campaign: null,
      },
    });
  });

  it("silently drops submissions that fill the hidden honeypot field", () => {
    expect(
      parseLeadPayload({
        name: "Bot",
        email: "bot@spam.io",
        company_website: "http://spam.io",
      }),
    ).toEqual({ kind: "spam" });
  });

  it("needs a name and a way to reach the person", () => {
    expect(parseLeadPayload({ email: "a@b.co" })).toMatchObject({
      kind: "invalid",
    });
    expect(parseLeadPayload({ name: "Ravi" })).toMatchObject({
      kind: "invalid",
      error: "Please leave an email address or a phone number.",
    });
  });

  it("rejects a malformed email or phone", () => {
    expect(parseLeadPayload({ name: "Ravi", email: "ravi@" })).toMatchObject({
      kind: "invalid",
    });
    expect(parseLeadPayload({ name: "Ravi", phone: "12" })).toMatchObject({
      kind: "invalid",
    });
  });

  it("only accepts known sources and falls back to website", () => {
    const lead = (source: string) => {
      const result = parseLeadPayload({
        name: "Ravi",
        phone: "9845012345",
        source,
      });
      return result.kind === "lead" ? result.lead.source : null;
    };
    expect(lead("WhatsApp")).toBe("whatsapp");
    expect(lead("admin")).toBe("website");
  });
});

describe("parseBudget", () => {
  it("understands Indian amounts and shorthand", () => {
    expect(parseBudget("₹1,50,000")).toBe(150000);
    expect(parseBudget("2 lakh")).toBe(200000);
    expect(parseBudget("1.5 crore")).toBe(15000000);
    expect(parseBudget("80k")).toBe(80000);
    expect(parseBudget("not sure")).toBeNull();
  });
});

describe("safeRedirect", () => {
  const allowed = ["https://zephvion.com"];

  it("allows a thank-you page on the company site", () => {
    expect(safeRedirect("https://zephvion.com/thank-you", allowed)).toBe(
      "https://zephvion.com/thank-you",
    );
  });

  it("refuses other sites", () => {
    expect(safeRedirect("https://evil.example/phish", allowed)).toBeNull();
    expect(safeRedirect("javascript:alert(1)", allowed)).toBeNull();
  });
});
