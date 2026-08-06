import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/database/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint, keys, vapidKey } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
    }

    // 클라이언트가 구독 생성 시 실제로 쓴 공개키가, 서버가 발송 시 서명에 쓰는
    // 키와 다르면 이 구독은 저장해봐야 영원히 발송 실패(BadJwtToken)만 남는다.
    // 낡은 빌드(캐시된 JS)가 예전 키를 들고 있는 경우를 여기서 바로 잡아낸다.
    const serverPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (vapidKey && serverPublicKey && vapidKey !== serverPublicKey) {
      console.error('[push/subscribe] VAPID key mismatch — client used a stale/different public key', {
        clientKeyPrefix: vapidKey.slice(0, 12),
        serverKeyPrefix: serverPublicKey.slice(0, 12),
      })
      return NextResponse.json(
        { error: 'VAPID key mismatch: client is running an outdated build. Please reload.' },
        { status: 409 }
      )
    }

    const supabase = await getServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('[push/subscribe]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[push/subscribe]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
