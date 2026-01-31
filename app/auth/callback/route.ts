import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  } catch (error) {
    console.error('Auth callback error:', error);
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
