import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cliente de servidor (service key). Devuelve null si aún no hay credenciales,
// para que la app corra en local antes de conectar Supabase.
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const supabaseConfigured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
