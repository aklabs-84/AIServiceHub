import { createServerClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server client (creates new instance per request due to cookies)
export async function getServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Component에서는 쿠키 수정 불가 - 미들웨어에서 세션 갱신 처리됨
        }
      },
      remove: (name, options) => {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        } catch {
          // Server Component에서는 쿠키 수정 불가 - 미들웨어에서 세션 갱신 처리됨
        }
      },
    },
  });
}

// Read-only server client (for layouts where cookies can't be mutated)
export async function getServerClientReadOnly(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  });
}
