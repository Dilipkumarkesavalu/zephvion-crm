import type { SavedView } from "../types";
import { cleanFilter, isSameFilter, splitViews } from "./savedViewModel";

const view = (overrides: Partial<SavedView>): SavedView => ({
  id: 1,
  sales_id: 0,
  resource: "contacts",
  name: "View",
  filter: {},
  is_shared: false,
  created_at: "2026-10-28T00:00:00.000Z",
  ...overrides,
});

describe("cleanFilter", () => {
  it("drops empty search text and null values", () => {
    expect(cleanFilter({ q: "", status: "hot", sales_id: null })).toEqual({
      status: "hot",
    });
  });
});

describe("isSameFilter", () => {
  it("ignores key order and empty values", () => {
    expect(
      isSameFilter(
        { status: "hot", "tags@cs": "{1}" },
        { "tags@cs": "{1}", status: "hot", q: "" },
      ),
    ).toBe(true);
  });

  it("tells different values apart", () => {
    expect(isSameFilter({ status: "hot" }, { status: "warm" })).toBe(false);
  });
});

describe("splitViews", () => {
  it("keeps own views and teammates' shared views, hiding their private ones", () => {
    const { mine, shared } = splitViews(
      [
        view({ id: 1, name: "Zeta", sales_id: 0 }),
        view({ id: 2, name: "Alpha", sales_id: 0 }),
        view({ id: 3, name: "Team", sales_id: 1, is_shared: true }),
        view({ id: 4, name: "Private", sales_id: 1 }),
      ],
      0,
    );

    expect(mine.map((v) => v.name)).toEqual(["Alpha", "Zeta"]);
    expect(shared.map((v) => v.name)).toEqual(["Team"]);
  });
});
