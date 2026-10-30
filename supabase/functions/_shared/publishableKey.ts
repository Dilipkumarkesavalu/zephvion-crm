/**
 * The project's public (publishable / anon) key. Hosted Supabase exposes it
 * as SUPABASE_PUBLISHABLE_KEYS (a JSON map) and SUPABASE_ANON_KEY;
 * SB_PUBLISHABLE_KEY is only set when configured by hand.
 */
export const pickPublishableKey = (
  env: (name: string) => string | undefined,
): string => {
  const explicit = env("SB_PUBLISHABLE_KEY");
  if (explicit) return explicit;
  try {
    const keys = JSON.parse(env("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (keys && typeof keys === "object") {
      const key = keys.default ?? Object.values(keys)[0];
      if (typeof key === "string" && key) return key;
    }
  } catch {
    // Not JSON: fall through to the legacy anon key
  }
  return env("SUPABASE_ANON_KEY") ?? "";
};

export const getPublishableKey = () =>
  pickPublishableKey((name) => Deno.env.get(name));
