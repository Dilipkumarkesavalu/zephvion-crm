/** Seconds Supabase requires between two codes sent to the same address. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

/** True when no domain is configured, or the address ends with @domain. */
export const isAllowedEmail = (
  email: string,
  allowedDomain: string | undefined,
): boolean => {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) return false;
  if (!allowedDomain) return true;
  return normalized.slice(atIndex + 1) === allowedDomain.trim().toLowerCase();
};

/** Supabase codes are 6 digits by default (configurable up to 10). */
export const isValidOtpCode = (code: string): boolean =>
  /^\d{6,10}$/.test(code.trim());

/** Turns Supabase auth errors into messages a user can act on. */
export const getOtpErrorMessage = (
  error: unknown,
  allowedDomain: string | undefined,
): string => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  if (/database error|not allowed|domain/i.test(message)) {
    return allowedDomain
      ? `Only @${allowedDomain} email addresses can sign in.`
      : "This email address is not allowed to sign in.";
  }
  if (/expired|invalid/i.test(message)) {
    return "That code is invalid or has expired. Request a new one.";
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Can't reach the sign-in server. Check your connection and try again.";
  }
  if (/rate limit|security purposes|too many/i.test(message)) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return message || "Something went wrong. Please try again.";
};
