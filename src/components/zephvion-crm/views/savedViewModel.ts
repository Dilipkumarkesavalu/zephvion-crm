import type { Identifier } from "ra-core";

import type { SavedView } from "../types";

/** Drops empty values so `{ q: "" }` and `{}` count as the same view. */
export const cleanFilter = (
  filter: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(filter).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

export const isSameFilter = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean =>
  stableStringify(cleanFilter(a)) === stableStringify(cleanFilter(b));

/** Own views first, then views teammates shared, each sorted by name. */
export const splitViews = (
  views: SavedView[],
  currentSalesId: Identifier | undefined,
): { mine: SavedView[]; shared: SavedView[] } => {
  const byName = (a: SavedView, b: SavedView) => a.name.localeCompare(b.name);
  const isMine = (view: SavedView) =>
    String(view.sales_id) === String(currentSalesId);
  return {
    mine: views.filter(isMine).sort(byName),
    shared: views
      .filter((view) => !isMine(view) && view.is_shared)
      .sort(byName),
  };
};
