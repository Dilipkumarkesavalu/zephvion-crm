export const disableEmailPasswordAuthentication =
  import.meta.env.VITE_DISABLE_EMAIL_PASSWORD_AUTHENTICATION === "true";

export const googleWorkplaceDomain: string | undefined = import.meta.env
  .VITE_GOOGLE_WORKPLACE_DOMAIN;

/** Passwordless login: a one-time code is emailed to the user. */
export const emailOtpLogin =
  import.meta.env.VITE_LOGIN_WITH_EMAIL_OTP === "true";

/** Only addresses on this domain may sign in (e.g. "zephvion.com"). */
export const allowedEmailDomain: string | undefined = import.meta.env
  .VITE_ALLOWED_EMAIL_DOMAIN;
