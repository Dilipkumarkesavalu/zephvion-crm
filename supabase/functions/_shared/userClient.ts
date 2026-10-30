import { createClient } from "jsr:@supabase/supabase-js@2";
import { getPublishableKey } from "./publishableKey.ts";

/**
 * A client acting as the signed-in caller, so row-level security decides
 * which records they may read.
 */
export const getUserClient = (req: Request) =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", getPublishableKey(), {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
