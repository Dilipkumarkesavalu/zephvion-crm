import type { Sale } from "../types";

/** "Dilip Kumar", or just "Bhavani" when there is no last name. */
export const formatSaleName = (sale: Pick<Sale, "first_name" | "last_name">) =>
  `${sale.first_name} ${sale.last_name ?? ""}`.trim();
