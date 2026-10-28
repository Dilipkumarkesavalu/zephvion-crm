import type { SalesFormData } from "../types";

export const isAdminRole = (role?: string) =>
  role === "owner" || role === "admin";

/** The role decides admin access; keep the administrator flag in step. */
export const withAdministratorFromRole = (
  data: SalesFormData,
): SalesFormData =>
  data.role ? { ...data, administrator: isAdminRole(data.role) } : data;
