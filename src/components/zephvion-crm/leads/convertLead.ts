import type { DataProvider, Identifier } from "ra-core";

import type { ConfigurationContextValue } from "../root/ConfigurationContext";
import type { Company, Contact, Deal, Lead } from "../types";
import { getLeadTier, leadFullName } from "./leadModel";

const DEAL_CLOSE_DAYS = 30;

export interface ConversionResult {
  companyId: Identifier | null;
  contactId: Identifier;
  dealId: Identifier | null;
}

/** "Website redesign" -> "website" when the categories have one like it. */
export const matchDealCategory = (
  service: string | null | undefined,
  categories: ConfigurationContextValue["dealCategories"],
): string => {
  const wanted = (service ?? "").trim().toLowerCase();
  if (!wanted) return "other";
  const match = categories.find(
    ({ value, label }) =>
      wanted.includes(value.toLowerCase()) ||
      wanted.includes(label.toLowerCase()) ||
      label.toLowerCase().includes(wanted),
  );
  return match?.value ?? categories.at(-1)?.value ?? "other";
};

const findOrCreateCompany = async (
  dataProvider: DataProvider,
  lead: Lead,
  salesId: Identifier,
): Promise<Identifier | null> => {
  const name = lead.company_name?.trim();
  if (!name) return null;
  const { data: existing } = await dataProvider.getList<Company>("companies", {
    filter: { name },
    pagination: { page: 1, perPage: 1 },
    sort: { field: "id", order: "ASC" },
  });
  if (existing[0]) return existing[0].id;
  const { data: company } = await dataProvider.create<Company>("companies", {
    data: {
      name,
      sales_id: salesId,
      created_at: new Date().toISOString(),
    } as Partial<Company>,
  });
  return company.id;
};

/**
 * Turns a lead into a contact, its company (reused when one with the same
 * name exists) and, when there is a company, an opening deal.
 */
export const convertLead = async ({
  dataProvider,
  lead,
  salesId,
  dealStages,
  dealCategories,
}: {
  dataProvider: DataProvider;
  lead: Lead;
  salesId: Identifier;
  dealStages: ConfigurationContextValue["dealStages"];
  dealCategories: ConfigurationContextValue["dealCategories"];
}): Promise<ConversionResult> => {
  const ownerId = lead.sales_id ?? salesId;
  const now = new Date();
  const companyId = await findOrCreateCompany(dataProvider, lead, ownerId);

  const { data: contact } = await dataProvider.create<Contact>("contacts", {
    data: {
      first_name: lead.first_name,
      last_name: lead.last_name ?? "",
      company_id: companyId,
      email_jsonb: lead.email ? [{ email: lead.email, type: "Work" }] : [],
      phone_jsonb: lead.phone ? [{ number: lead.phone, type: "Work" }] : [],
      background: lead.message ?? "",
      status: getLeadTier(lead.score),
      tags: [],
      has_newsletter: false,
      sales_id: ownerId,
      first_seen: lead.created_at,
      last_seen: now.toISOString(),
    } as Partial<Contact>,
  });

  let dealId: Identifier | null = null;
  if (companyId != null) {
    const closing = new Date(now);
    closing.setDate(closing.getDate() + DEAL_CLOSE_DAYS);
    const { data: deal } = await dataProvider.create<Deal>("deals", {
      data: {
        name: [lead.company_name, lead.service].filter(Boolean).join(" – "),
        company_id: companyId,
        contact_ids: [contact.id],
        category: matchDealCategory(lead.service, dealCategories),
        stage: dealStages[0]?.value ?? "lead",
        description: lead.message ?? "",
        amount: lead.budget ?? 0,
        expected_closing_date: closing.toISOString().slice(0, 10),
        sales_id: ownerId,
        index: 0,
      } as Partial<Deal>,
    });
    dealId = deal.id;
  }

  await dataProvider.update<Lead>("leads", {
    id: lead.id,
    data: {
      status: "converted",
      converted_company_id: companyId,
      converted_contact_id: contact.id,
      converted_deal_id: dealId,
    },
    previousData: lead,
  });

  return { companyId, contactId: contact.id, dealId };
};

export const describeLead = (lead: Lead) =>
  [leadFullName(lead), lead.company_name].filter(Boolean).join(" · ");
