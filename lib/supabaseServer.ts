import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase Environment Variables');
}

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => {
        cookieStore.set({ name, value, ...options });
      },
      remove: (name, options) => {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
};

// Read-only client for server components where cookies cannot be mutated (e.g., layout)
export const createSupabaseServerClientReadOnly = async () => {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {
        // no-op: avoid modifying cookies in layouts
      },
      remove: () => {
        // no-op: avoid modifying cookies in layouts
      },
    },
  });
};
