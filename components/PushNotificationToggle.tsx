'use client'

import { useState } from 'react'
import { FaBell, FaBellSlash } from 'react-icons/fa'
import { usePushNotification } from '@/hooks/usePushNotification'

interface PushNotificationToggleProps {
  variant?: 'button' | 'banner'
  className?: string
}

export default function PushNotificationToggle({
  variant = 'button',
  className = '',
}: PushNotificationToggleProps) {
  const { permission, isSubscribed, isSupported, loading, subscribe, unsubscribe } =
    usePushNotification()
  const [dismissed, setDismissed] = useState(false)

  // 미지원 또는 거부됨
  if (!isSupported || permission === 'denied') return null

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
      className={`inline-flex items-center gap-1.5 text-sm font-medium transition-all ${
        isSubscribed
          ? 'text-indigo-600 dark:text-indigo-400 hover:text-gray-500 dark:hover:text-gray-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
      } disabled:opacity-60 ${className}`}
    >
      {isSubscribed ? <FaBell className="text-indigo-500" /> : <FaBellSlash />}
      <span>{isSubscribed ? '알림 ON' : '알림'}</span>
    </button>
  )
}
