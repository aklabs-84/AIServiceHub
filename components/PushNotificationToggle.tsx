'use client'

import { useState } from 'react'
import { FaBell, FaBellSlash } from 'react-icons/fa'
import { usePushNotification } from '@/hooks/usePushNotification'
import { useAuth } from '@/contexts/AuthContext'

interface PushNotificationToggleProps {
  variant?: 'button' | 'banner'
  className?: string
}

export default function PushNotificationToggle({
  variant = 'button',
  className = '',
}: PushNotificationToggleProps) {
  const { user } = useAuth()
  const { permission, isSubscribed, isSupported, ready, loading, subscribe, unsubscribe } =
    usePushNotification()
  const [dismissed, setDismissed] = useState(false)

  // 로그인 전, 미지원, 거부됨, 초기 상태 확인 전에는 표시하지 않음(깜빡임 방지)
  if (!user || !isSupported || permission === 'denied' || !ready) return null

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  if (variant === 'banner') {
    if (isSubscribed || dismissed || permission === 'granted') return null

    return (
      <div className={`flex items-center justify-between gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <FaBell className="text-indigo-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 truncate">
              새 앱 알림 받기
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-300">
              새로운 AI 앱이 등록되면 알려드릴게요
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleToggle}
            disabled={loading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? '...' : '허용'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-2 py-1.5 text-indigo-400 hover:text-indigo-600 text-xs rounded-lg transition-colors"
          >
            나중에
          </button>
        </div>
      </div>
    )
  }

  // button variant
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={isSubscribed ? '알림 끄기' : '알림 받기'}
      className={`inline-flex items-center gap-1.5 text-sm font-bold transition-all rounded-full px-3 py-1.5 ${
        isSubscribed
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
      } disabled:opacity-60 disabled:cursor-wait ${className}`}
    >
      {isSubscribed ? <FaBell /> : <FaBellSlash />}
      <span>{loading ? '처리 중...' : isSubscribed ? '알림 ON' : '알림 OFF'}</span>
    </button>
  )
}
