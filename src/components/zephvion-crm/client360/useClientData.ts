import { useQuery } from "@tanstack/react-query";
import { useDataProvider, type DataProvider, type Identifier } from "ra-core";

import type {
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Invoice,
  Task,
} from "../types";
import type { ClientData } from "./clientModel";

// Enough for any one client; the timeline shows the newest first anyway
const PER_CLIENT = 500;

const fetchAll = async <T extends { id: Identifier }>(
  dataProvider: DataProvider,
  resource: string,
  filter: Record<string, unknown>,
  sortField: string,
): Promise<T[]> => {
  const { data } = await dataProvider.getList<T>(resource, {
    filter,
    pagination: { page: 1, perPage: PER_CLIENT },
    sort: { field: sortField, order: "DESC" },
  });
  return data;
};

const inList = (ids: Identifier[]) => `(${ids.join(",")})`;

const fetchClientData = async (
  dataProvider: DataProvider,
  companyId: Identifier,
): Promise<ClientData> => {
  const byCompany = { company_id: companyId };
  const [contacts, deals, invoices] = await Promise.all([
    fetchAll<Contact>(dataProvider, "contacts", byCompany, "first_seen"),
    fetchAll<Deal>(dataProvider, "deals", byCompany, "created_at"),
    fetchAll<Invoice>(dataProvider, "invoices", byCompany, "issue_date"),
  ]);
  const contactIds = contacts.map((contact) => contact.id);
  const dealIds = deals.map((deal) => deal.id);

  const [tasks, contactNotes, dealNotes] = await Promise.all([
    contactIds.length
      ? fetchAll<Task>(
          dataProvider,
          "tasks",
          { "contact_id@in": inList(contactIds) },
          "due_date",
        )
      : [],
    contactIds.length
      ? fetchAll<ContactNote>(
          dataProvider,
          "contact_notes",
          { "contact_id@in": inList(contactIds) },
          "date",
        )
      : [],
    dealIds.length
      ? fetchAll<DealNote>(
          dataProvider,
          "deal_notes",
          { "deal_id@in": inList(dealIds) },
          "date",
        )
      : [],
  ]);

  return { contacts, deals, invoices, tasks, contactNotes, dealNotes };
};

/** Every record linked to one client, for the 360 overview. */
export const useClientData = (companyId: Identifier) => {
  const dataProvider = useDataProvider();
  return useQuery({
    queryKey: ["client360", String(companyId)],
    queryFn: () => fetchClientData(dataProvider, companyId),
  });
};
