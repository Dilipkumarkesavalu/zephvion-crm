import { prepareLead } from "../../../leads/leadModel";
import type { Lead } from "../../../types";
import type { Db } from "./types";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type LeadSeed = Omit<
  Lead,
  "id" | "created_at" | "updated_at" | "score" | "first_response_due"
> & { ageMs: number };

// Indian businesses enquiring about Zephvion's services, newest first
const LEAD_SEEDS: LeadSeed[] = [
  {
    first_name: "Kavya",
    last_name: "Menon",
    email: "kavya@saffronstays.in",
    phone: "+91 98861 22410",
    company_name: "Saffron Stays",
    service: "Website",
    budget: 350000,
    message:
      "We run 14 boutique homestays in Kerala and need a booking-ready website with a blog.",
    source: "website",
    utm_source: "google",
    utm_campaign: "web-design-kochi",
    status: "new",
    sales_id: 1,
    ageMs: 40 * MINUTE,
  },
  {
    first_name: "Arjun",
    last_name: "Bhatia",
    email: "arjun@ledgerly.app",
    phone: "+91 99000 31877",
    company_name: "Ledgerly",
    service: "Mobile app",
    budget: 1200000,
    message:
      "Fintech startup, seed funded. Need an Android and iOS app for invoice financing, MVP in 4 months.",
    source: "referral",
    status: "new",
    sales_id: 0,
    ageMs: 3 * HOUR,
  },
  {
    first_name: "Meera",
    last_name: "Krishnan",
    email: "meera.k@greenleafagro.com",
    company_name: "Greenleaf Agro",
    service: "Branding",
    budget: 150000,
    message: "Rebrand for our organic fertiliser range before a trade fair.",
    source: "linkedin",
    status: "contacted",
    sales_id: 1,
    first_responded_at: new Date(Date.now() - 20 * HOUR).toISOString(),
    ageMs: 1 * DAY,
  },
  {
    first_name: "Rohit",
    last_name: "Sharma",
    phone: "+91 90080 55123",
    service: "Digital marketing",
    budget: 40000,
    message: "Need Instagram ads for my gym.",
    source: "whatsapp",
    status: "new",
    sales_id: null,
    ageMs: 50 * MINUTE,
  },
  {
    first_name: "Fatima",
    last_name: "Sheikh",
    email: "fatima@noorinteriors.in",
    phone: "+91 98201 77345",
    company_name: "Noor Interiors",
    service: "Website",
    budget: 200000,
    message:
      "Portfolio website with project galleries and an enquiry form for our Mumbai studio.",
    source: "website",
    utm_source: "instagram",
    status: "qualified",
    sales_id: 2,
    first_responded_at: new Date(Date.now() - 2 * DAY).toISOString(),
    ageMs: 3 * DAY,
  },
  {
    first_name: "Vikram",
    last_name: "Rao",
    email: "vikram@rao-logistics.com",
    company_name: "Rao Logistics",
    service: "Digital system",
    budget: 800000,
    message:
      "Fleet tracking dashboard and driver app to replace our spreadsheets.",
    source: "event",
    status: "contacted",
    sales_id: 0,
    first_responded_at: new Date(Date.now() - 4 * DAY).toISOString(),
    ageMs: 5 * DAY,
  },
  {
    first_name: "Sneha",
    last_name: "Patil",
    email: "sneha.patil@gmail.com",
    service: "Website",
    budget: 15000,
    message: "Simple one page site.",
    source: "website",
    status: "disqualified",
    disqualify_reason: "Budget too small for a custom build",
    sales_id: 1,
    first_responded_at: new Date(Date.now() - 6 * DAY).toISOString(),
    ageMs: 7 * DAY,
  },
  {
    first_name: "Deepak",
    last_name: "Nair",
    email: "deepak@tidalwave.co.in",
    phone: "+91 97400 11982",
    company_name: "Tidal Wave Media",
    service: "Consulting",
    budget: 250000,
    message: "Want an audit of our current CRM and marketing stack.",
    source: "email",
    status: "new",
    sales_id: 2,
    ageMs: 5 * HOUR,
  },
];

export const generateLeads = (_: Db): Lead[] => {
  const now = Date.now();
  return LEAD_SEEDS.map(({ ageMs, ...seed }, index) =>
    prepareLead(
      {
        ...seed,
        id: index + 1,
        created_at: new Date(now - ageMs).toISOString(),
      },
      new Date(now - ageMs),
    ),
  ) as Lead[];
};
