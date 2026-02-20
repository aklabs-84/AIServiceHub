import { createBrowserClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (singleton)
let browserClient: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

// Admin client (service role, bypasses RLS) - server-side only
let adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }
    adminClient = createClient(
      process.env.SUPABASE_URL || supabaseUrl,
      serviceRoleKey
    );
  }
  return adminClient;
}
