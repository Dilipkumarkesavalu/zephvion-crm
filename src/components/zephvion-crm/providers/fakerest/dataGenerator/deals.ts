import { add } from "date-fns";
import { datatype, random } from "faker/locale/en_US";

import { defaultDealStages } from "../../../root/defaultConfiguration";
import type { Deal } from "../../../types";
import type { Db } from "./types";
import { DEAL_NAMES, DEAL_VALUE_RANGES } from "./samples";
import { randomDate, weightedArrayElement } from "./utils";

const NUMBER_OF_DEALS = 38;
const DEAL_AMOUNT_STEP = 5000;

const STAGES = [
  "lead",
  "discovery",
  "proposal-sent",
  "in-negociation",
  "won",
  "lost",
];
const STAGE_WEIGHTS = [4, 5, 7, 6, 11, 4];

const CATEGORIES = [
  "website",
  "branding",
  "digital-system",
  "mobile-app",
  "marketing",
  "consulting",
  "other",
];
const CATEGORY_WEIGHTS = [10, 5, 5, 3, 6, 3, 1];

const DESCRIPTIONS: Record<string, string> = {
  website:
    "Mobile-first website with CMS, lead forms connected to the CRM and WhatsApp click-to-chat.",
  branding:
    "Refresh of the visual identity ahead of the new product launch, including packaging guidelines.",
  "digital-system":
    "A structured system to replace spreadsheets: bookings, billing and reports in one place.",
  "mobile-app":
    "Customer app for Android and iOS with UPI payments and push notifications.",
  marketing:
    "Monthly retainer covering social media, performance ads and creatives.",
  consulting:
    "Audit of the current digital presence and a 12-month growth roadmap.",
  other: "One-off production work for the marketing team.",
};

const roundTo = (value: number, step: number) =>
  Math.round(value / step) * step;

export const generateDeals = (db: Db): Deal[] => {
  const eightMonthsAgo = add(new Date(), { months: -8 });
  const deals = Array.from(Array(NUMBER_OF_DEALS).keys()).map((id) => {
    const company = random.arrayElement(db.companies);
    company.nb_deals = (company.nb_deals ?? 0) + 1;
    const contacts = random.arrayElements(
      db.contacts.filter((contact) => contact.company_id === company.id),
      datatype.number({ min: 1, max: 2 }),
    );
    const category = weightedArrayElement(
      CATEGORIES,
      CATEGORY_WEIGHTS,
    ) as string;
    const stage = weightedArrayElement(STAGES, STAGE_WEIGHTS) as string;
    const [min, max] = DEAL_VALUE_RANGES[category];
    const created_at = randomDate(eightMonthsAgo).toISOString();
    const expected_closing_date = randomDate(
      add(new Date(created_at), { weeks: 2 }),
      add(new Date(created_at), { months: 4 }),
    )
      .toISOString()
      .split("T")[0];

    return {
      id,
      name: random.arrayElement(DEAL_NAMES[category]),
      company_id: company.id,
      contact_ids: contacts.map((contact) => contact.id),
      category,
      stage,
      description: DESCRIPTIONS[category],
      amount: roundTo(datatype.number({ min, max }), DEAL_AMOUNT_STEP),
      created_at,
      updated_at: randomDate(new Date(created_at)).toISOString(),
      expected_closing_date,
      sales_id: company.sales_id!,
      index: 0,
    };
  });
  // compute index based on stage
  defaultDealStages.forEach((stage) => {
    deals
      .filter((deal) => deal.stage === stage.value)
      .forEach((deal, index) => {
        deals[deal.id].index = index;
      });
  });
  return deals;
};
