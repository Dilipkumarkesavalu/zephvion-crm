import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * A client acting as the signed-in caller, so row-level security decides
 * which records they may read.
 */
export const getUserClient = (req: Request) =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SB_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
