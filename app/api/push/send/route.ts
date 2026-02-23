import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getServerClient } from '@/lib/database/server'

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  try {
    const supabase = await getServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 관리자만 알림 발송 가능
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id ?? '')
      .single()

    if (!user || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, body, url } = await req.json()

    if (!title || !body) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 })
    }

    // 모든 구독자 조회
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')

    if (error || !subscriptions?.length) {
      return NextResponse.json({ sent: 0, message: 'No subscribers' })
    }

    const payload = JSON.stringify({ title, body, url: url || '/apps' })

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    )

    // 만료된 구독(410) 자동 삭제
    const expiredEndpoints: string[] = []
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const err = result.reason as { statusCode?: number }
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(subscriptions[i].endpoint)
        }
      }
    })

    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints)
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return NextResponse.json({ sent, total: subscriptions.length, removed: expiredEndpoints.length })
  } catch (e) {
    console.error('[push/send]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
