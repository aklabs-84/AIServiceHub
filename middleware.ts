import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 매 요청마다 세션 갱신 — 토큰 만료 시 쿠키를 자동으로 업데이트
  // IMPORTANT: 이 라인은 절대 제거하거나 조건부로 만들지 말 것
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    // 정적 파일·이미지·폰트·아이콘 제외한 모든 경로에서 실행
    '/((?!_next/static|_next/image|favicon_io|android-chrome|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)$).*)',
  ],
}
