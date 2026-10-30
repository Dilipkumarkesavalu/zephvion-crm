// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pickPublishableKey } from "./publishableKey";

const envOf = (values: Record<string, string>) => (name: string) =>
  values[name];

describe("pickPublishableKey", () => {
  it("prefers a key set by hand", () => {
    expect(
      pickPublishableKey(
        envOf({ SB_PUBLISHABLE_KEY: "manual", SUPABASE_ANON_KEY: "anon" }),
      ),
    ).toBe("manual");
  });

  it("reads the default key from the hosted JSON map", () => {
    expect(
      pickPublishableKey(
        envOf({
          SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_x"}',
          SUPABASE_ANON_KEY: "anon",
        }),
      ),
    ).toBe("sb_publishable_x");
  });

  it("falls back to the anon key when the map is missing or broken", () => {
    expect(pickPublishableKey(envOf({ SUPABASE_ANON_KEY: "anon" }))).toBe(
      "anon",
    );
    expect(
      pickPublishableKey(
        envOf({ SUPABASE_PUBLISHABLE_KEYS: "oops", SUPABASE_ANON_KEY: "anon" }),
      ),
    ).toBe("anon");
  });

  it("returns an empty string when nothing is set", () => {
    expect(pickPublishableKey(envOf({}))).toBe("");
  });
});
