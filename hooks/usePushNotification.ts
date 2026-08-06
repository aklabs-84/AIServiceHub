'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getBrowserClient } from '@/lib/database'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function usePushNotification() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<PermissionState>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  // 브라우저 구독 존재 여부와 별개로, 이 계정으로 DB에 실제 등록돼 있는지(진짜 ON 여부)
  const [isRegistered, setIsRegistered] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  const subscriptionRef = useRef<PushSubscription | null>(null)
  useEffect(() => {
    subscriptionRef.current = subscription
  }, [subscription])

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
      setSubscription(null)
      setIsRegistered(false)
      setReady(true)
      return
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscription(sub)
        checkRegistration(sub)
      })
    })
  }, [isSupported, user, checkRegistration])

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
      const permission = await Notification.requestPermission()
      setPermission(permission as PermissionState)

      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidKey) {
        console.error('VAPID public key not set')
        return false
      }

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        }))

      setSubscription(sub)

      // 서버(현재 로그인 계정)에 구독 등록/재등록
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      const ok = res.ok
      setIsRegistered(ok)
      setReady(true)
      return ok
    } catch (e) {
      console.error('[usePushNotification] subscribe error:', e)
      return false
    } finally {
      setLoading(false)
    }
  }, [isSupported, user])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false
    setLoading(true)

    try {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      setSubscription(null)

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })

      setIsRegistered(false)
      return true
    } catch (e) {
      console.error('[usePushNotification] unsubscribe error:', e)
      return false
    } finally {
      setLoading(false)
    }
  }, [subscription])

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
