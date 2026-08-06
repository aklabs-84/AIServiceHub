'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getBrowserClient } from '@/lib/database'
import { useToast } from '@/contexts/ToastContext'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function usePushNotification() {
  const { user } = useAuth()
  const { showError, showInfo } = useToast()
  const [permission, setPermission] = useState<PermissionState>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  // 브라우저 구독 존재 여부와 별개로, 이 계정으로 DB에 실제 등록돼 있는지(진짜 ON 여부)
  const [isRegistered, setIsRegistered] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  // ref는 setter와 항상 같은 틱에 동기화(useEffect로 하면 realtime 이벤트가
  // effect 실행 전에 도착해 stale한 null을 읽고 isRegistered를 잘못 false로 되돌릴 수 있음)
  const subscriptionRef = useRef<PushSubscription | null>(null)
  const setSubscriptionSynced = useCallback((sub: PushSubscription | null) => {
    subscriptionRef.current = sub
    setSubscription(sub)
  }, [])

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  // 브라우저에 구독이 있어도, 로그인/로그아웃을 반복하는 사이 서버 등록이 실패했거나
  // 다른 계정이 같은 기기에서 구독을 가로챘을 수 있으므로 DB를 조회해 진짜 상태를 확인
  const checkRegistration = useCallback(
    async (sub: PushSubscription | null) => {
      if (!sub || !user) {
        setIsRegistered(false)
        setReady(true)
        return
      }
      const supabase = getBrowserClient()
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('endpoint', sub.endpoint)
        .maybeSingle()
      setIsRegistered(!!data)
      setReady(true)
    },
    [user]
  )

  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported')
      setReady(true)
      return
    }

    setPermission(Notification.permission as PermissionState)

    if (!user) {
      setSubscriptionSynced(null)
      setIsRegistered(false)
      setReady(true)
      return
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscriptionSynced(sub)
        checkRegistration(sub)
      })
    })
  }, [isSupported, user, checkRegistration, setSubscriptionSynced])

  // 실시간 반영: 다른 기기/탭에서 구독을 켜거나 끄거나, 만료된 구독이 서버에서
  // 자동 정리되는 경우에도 메뉴의 ON/OFF 표시가 즉시 갱신되도록 postgres_changes 구독
  useEffect(() => {
    if (!user || !isSupported) return
    const supabase = getBrowserClient()
    const channel = supabase
      .channel(`push-subscriptions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'push_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkRegistration(subscriptionRef.current)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isSupported, checkRegistration])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false
    setLoading(true)

    try {
      // 브라우저 네이티브 권한 팝업은 놓치기 쉬우므로 먼저 안내
      if (Notification.permission === 'default') {
        showInfo('브라우저 상단의 알림 권한 요청 팝업에서 "허용"을 눌러주세요')
      }

      const permission = await Notification.requestPermission()
      setPermission(permission as PermissionState)

      if (permission !== 'granted') {
        showError(
          permission === 'denied'
            ? '알림이 차단되어 있어요. 브라우저 설정에서 이 사이트의 알림 권한을 허용해주세요'
            : '알림 권한 요청이 취소됐어요'
        )
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidKey) {
        console.error('VAPID public key not set')
        showError('알림 설정 중 오류가 발생했어요 (설정 누락)')
        return false
      }

      // 기존 구독이 남아있어도, 그게 지금 서버가 쓰는 VAPID 키와 다른 키로
      // 만들어진 것이면 그대로 재사용하지 않고 폐기 후 새로 구독한다.
      // (예전 키로 만들어진 구독을 재사용하면 발송 시 Apple이 BadJwtToken으로 거부함)
      let sub = await reg.pushManager.getSubscription()
      if (sub) {
        const existingKey = arrayBufferToBase64Url(sub.options.applicationServerKey)
        if (existingKey !== vapidKey) {
          await sub.unsubscribe()
          sub = null
        }
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        })
      }

      setSubscriptionSynced(sub)

      // 서버(현재 로그인 계정)에 구독 등록/재등록. vapidKey를 같이 보내서
      // 서버가 "이 구독이 어떤 공개키로 만들어졌는지" 대조 검증할 수 있게 한다.
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sub.toJSON(), vapidKey }),
      })

      const ok = res.ok
      setIsRegistered(ok)
      setReady(true)
      if (!ok) {
        const body = await res.text().catch(() => '')
        console.error('[usePushNotification] subscribe register failed:', res.status, body)
        if (res.status === 409) {
          showError('앱이 최신 버전이 아니에요. 앱을 완전히 종료했다가 다시 열고 다시 시도해주세요')
        } else {
          showError(`알림 등록 중 오류가 발생했어요 (${res.status}). 잠시 후 다시 시도해주세요`)
        }
      }
      return ok
    } catch (e) {
      console.error('[usePushNotification] subscribe error:', e)
      showError('알림 설정 중 오류가 발생했어요')
      return false
    } finally {
      setLoading(false)
    }
  }, [isSupported, user, showError, showInfo, setSubscriptionSynced])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false
    setLoading(true)

    try {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      setSubscriptionSynced(null)

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })

      setIsRegistered(false)
      return true
    } catch (e) {
      console.error('[usePushNotification] unsubscribe error:', e)
      showError('알림 끄기 중 오류가 발생했어요')
      return false
    } finally {
      setLoading(false)
    }
  }, [subscription, showError, setSubscriptionSynced])

  return {
    permission,
    isSubscribed: isRegistered,
    isSupported,
    ready,
    loading,
    subscribe,
    unsubscribe,
  }
}

/** Base64 URL → Uint8Array 변환 (VAPID 키 변환에 필요) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** ArrayBuffer → Base64 URL 변환 (기존 구독의 applicationServerKey와 현재 VAPID 키 비교용) */
function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
