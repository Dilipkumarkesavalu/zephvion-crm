import { useGetList } from "ra-core";

import type { Deal, Invoice } from "../types";

const FETCH_ALL = { page: 1, perPage: 1000 };

export const useDashboardRecords = () => {
  const deals = useGetList<Deal>("deals", { pagination: FETCH_ALL });
  const invoices = useGetList<Invoice>("invoices", { pagination: FETCH_ALL });
  return {
    deals: deals.data ?? [],
    invoices: invoices.data ?? [],
    isPending: deals.isPending || invoices.isPending,
  };
};
