import { getOtpErrorMessage, isAllowedEmail, isValidOtpCode } from "./emailOtp";

describe("isAllowedEmail", () => {
  it("accepts addresses on the allowed domain, ignoring case and spaces", () => {
    expect(isAllowedEmail(" Dilip@Zephvion.com ", "zephvion.com")).toBe(true);
  });

  it("rejects other domains, including look-alike subdomains", () => {
    expect(isAllowedEmail("dilip@gmail.com", "zephvion.com")).toBe(false);
    expect(isAllowedEmail("x@zephvion.com.evil.io", "zephvion.com")).toBe(
      false,
    );
    expect(isAllowedEmail("x@mail.zephvion.com", "zephvion.com")).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isAllowedEmail("zephvion.com", "zephvion.com")).toBe(false);
    expect(isAllowedEmail("@zephvion.com", "zephvion.com")).toBe(false);
    expect(isAllowedEmail("dilip@", undefined)).toBe(false);
  });

  it("accepts any well-formed address when no domain is configured", () => {
    expect(isAllowedEmail("someone@example.org", undefined)).toBe(true);
  });
});

describe("isValidOtpCode", () => {
  it("accepts 6 to 10 digit codes", () => {
    expect(isValidOtpCode("123456")).toBe(true);
    expect(isValidOtpCode(" 1234567890 ")).toBe(true);
  });

  it("rejects short or non-numeric codes", () => {
    expect(isValidOtpCode("12345")).toBe(false);
    expect(isValidOtpCode("12a456")).toBe(false);
  });
});

describe("getOtpErrorMessage", () => {
  it("explains a domain rejection from the database trigger", () => {
    expect(
      getOtpErrorMessage(
        new Error("Database error saving new user"),
        "zephvion.com",
      ),
    ).toBe("Only @zephvion.com email addresses can sign in.");
  });

  it("explains network failures", () => {
    expect(getOtpErrorMessage(new TypeError("Failed to fetch"), "x")).toMatch(
      /reach the sign-in server/,
    );
  });

  it("explains expired codes and rate limits", () => {
    expect(
      getOtpErrorMessage({ message: "Token has expired or is invalid" }, "x"),
    ).toMatch(/expired/);
    expect(
      getOtpErrorMessage(
        new Error(
          "For security purposes, you can only request this after 42 seconds.",
        ),
        "x",
      ),
    ).toMatch(/wait a minute/);
  });
});
