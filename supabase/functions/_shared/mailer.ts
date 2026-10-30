import nodemailer from "npm:nodemailer@6.9.16";

/**
 * The noreply mailbox, from the SMTP_* function secrets, or null when the
 * password has not been set yet.
 */
export const getMailer = () => {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASSWORD");
  if (!host || !user || !pass) return null;
  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  return {
    from: `"${Deno.env.get("SMTP_FROM_NAME") ?? "Zephvion CRM"}" <${user}>`,
    replyTo: Deno.env.get("SMTP_REPLY_TO") ?? undefined,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
  };
};

export const DEFAULT_CRM_URL =
  "https://dilipkumarkesavalu.github.io/zephvion-crm/app/";

export const getCrmUrl = () => Deno.env.get("CRM_URL") ?? DEFAULT_CRM_URL;
