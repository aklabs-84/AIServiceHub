'use client'

import { useState } from 'react'
import { FaDownload, FaMobileAlt, FaCheckCircle } from 'react-icons/fa'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { isMobile, supportsNativeInstallPrompt } from '@/utils/platform'
import MobileInstallGuide from './MobileInstallGuide'

interface PWAInstallButtonProps {
  /** 개별 앱 URL 바로가기 모드 - appUrl이 있으면 해당 앱 설치 안내, 없으면 현재 사이트 PWA 설치 */
  appUrl?: string
  appName?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function PWAInstallButton({
  appUrl,
  appName,
  variant = 'secondary',
  size = 'md',
  className = '',
}: PWAInstallButtonProps) {
  const { install, isInstalled, canInstall } = usePWAInstall()
  const [showGuide, setShowGuide] = useState(false)

  const mobile = isMobile()
  const isAppShortcutMode = !!appUrl
  const supportsPWA = supportsNativeInstallPrompt()

  // 이미 설치된 경우 (사이트 PWA)
  if (!isAppShortcutMode && isInstalled) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium ${sizeClasses[size]}`}
      >
        <FaCheckCircle />
        설치됨
      </span>
    )
  }

  // 앱 바로가기 모드: 항상 표시
  // 사이트 PWA 모드: 설치 가능하거나, 모바일이거나, PWA 지원 브라우저(데스크톱 Chrome/Edge 등)인 경우 표시
  const shouldShow = isAppShortcutMode || canInstall || mobile || supportsPWA

  if (!shouldShow) return null

  const handleClick = async () => {
    if (isAppShortcutMode) {
      setShowGuide(true)
      return
    }

    if (canInstall) {
      await install()
      return
    }

    // 설치 프롬프트 없는 경우 (시크릿 모드, iOS Safari 등) → 안내 표시
    setShowGuide(true)
  }

  const label = isAppShortcutMode
    ? mobile ? '홈화면 추가' : '바로가기 추가'
    : mobile ? '홈화면 추가' : '앱 설치'

  const Icon = isAppShortcutMode || mobile ? FaMobileAlt : FaDownload

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 font-medium transition-all ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      >
        <Icon className={iconSizeClasses[size]} />
        {label}
      </button>

      {showGuide && (
        <MobileInstallGuide
          appName={appName}
          appUrl={appUrl}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  )
}

const variantClasses = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 shadow-sm',
  secondary:
    'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-4 py-2',
  ghost:
    'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg px-3 py-1.5',
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

const iconSizeClasses = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
}
