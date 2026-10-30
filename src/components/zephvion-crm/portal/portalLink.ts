import type { shapeInvoices, shapeProjects, shapeTickets } from "./shapePortal";

export type PortalInvoice = ReturnType<typeof shapeInvoices>[number];
export type PortalProject = ReturnType<typeof shapeProjects>[number];
export type PortalTicket = ReturnType<typeof shapeTickets>[number];

/** What the client_portal function returns for a link. */
export interface PortalData {
  company: { name: string };
  seller: { name: string };
  balance: number;
  invoices: PortalInvoice[];
  projects: PortalProject[];
  tickets: PortalTicket[];
}

export type PortalRequest =
  | { action: "get" }
  | {
      action: "create_ticket";
      subject: string;
      description: string;
      name?: string;
    }
  | { action: "reply"; ticket_id: number; body: string };

export type PortalResponse =
  | { ok: true; portal: PortalData }
  | { ok: false; error: string };

const TOKEN_BYTES = 32;

/** 64 hex characters from the browser's secure random generator. */
export const generatePortalToken = (): string =>
  [...crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/** Only this fingerprint is stored; the token itself lives in the link. */
export const hashPortalToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/** The link to give the client: this app, opened on the portal page. */
export const buildPortalUrl = (
  token: string,
  location: Pick<Location, "origin" | "pathname"> = window.location,
): string => `${location.origin}${location.pathname}#/portal/${token}`;
