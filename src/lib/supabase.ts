import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key for admin operations
export function createServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Fallback to anon key if service key not configured
  const key = supabaseServiceKey && supabaseServiceKey !== "your_supabase_service_role_key" 
    ? supabaseServiceKey 
    : supabaseAnonKey;
  return createClient<Database>(supabaseUrl, key);
}
