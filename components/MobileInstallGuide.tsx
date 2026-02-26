'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes, FaShareSquare, FaPlus } from 'react-icons/fa'
import { getPlatform, getBrowser, supportsNativeInstallPrompt } from '@/utils/platform'

interface MobileInstallGuideProps {
  appName?: string
  appUrl?: string
  onClose: () => void
}

export default function MobileInstallGuide({ appName, appUrl, onClose }: MobileInstallGuideProps) {
  const platform = getPlatform()
  const browser = getBrowser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isAppShortcut = !!appUrl
  const targetName = appName || 'AI LABS'
  const targetUrl = appUrl || (typeof window !== 'undefined' ? window.location.origin : '')

  const isSafariIOS = platform === 'ios' && browser === 'safari'
  const isAndroidChrome = platform === 'android' && browser === 'chrome'
  // 데스크톱 Chrome/Edge에서 beforeinstallprompt가 없는 경우 (시크릿 모드 등)
  const isDesktopNoPrompt = !isSafariIOS && !isAndroidChrome && supportsNativeInstallPrompt() && !isAppShortcut

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <FaTimes />
        </button>

        <div className="text-center mb-5">
          <div className="text-3xl mb-2">📱</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {isAppShortcut ? '앱처럼 설치하기' : '홈화면에 추가하기'}
          </h3>
          {isAppShortcut && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span className="font-medium text-indigo-600 dark:text-indigo-400">{targetName}</span>을
              스마트폰 홈화면에 바로가기로 저장하세요
            </p>
          )}
        </div>

        {isSafariIOS ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                1
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  하단의{' '}
                  <span className="inline-flex items-center gap-0.5 font-medium text-indigo-600 dark:text-indigo-400">
                    <FaShareSquare className="text-xs" />
                    공유
                  </span>{' '}
                  버튼을 탭하세요
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                2
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  스크롤해서{' '}
                  <span className="inline-flex items-center gap-0.5 font-medium text-indigo-600 dark:text-indigo-400">
                    <FaPlus className="text-xs" />
                    홈 화면에 추가
                  </span>{' '}
                  를 선택하세요
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                3
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                오른쪽 상단 <span className="font-medium">추가</span>를 탭하면 완료!
              </p>
            </div>
            {isAppShortcut && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                * 먼저{' '}
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 underline"
                >
                  앱 페이지
                </a>
                를 열고 공유 버튼을 눌러주세요
              </p>
            )}
          </div>
        ) : isDesktopNoPrompt ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">시크릿 모드에서는 설치가 제한됩니다</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">일반 모드로 전환 후 설치해주세요.</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                1
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                일반 탭에서 이 사이트를 열어주세요
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                2
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                주소창 오른쪽의 <span className="font-medium">설치 아이콘(⊕)</span> 또는 메뉴에서 <span className="font-medium">앱 설치</span>를 클릭하세요
              </p>
            </div>
          </div>
        ) : isAndroidChrome ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                1
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                주소창 오른쪽 <span className="font-medium">⋮ 메뉴</span>를 탭하세요
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                2
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">홈 화면에 추가</span> 또는{' '}
                <span className="font-medium">앱 설치</span>를 선택하세요
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                3
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">추가</span>를 탭하면 완료!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">iOS Safari</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">공유 버튼 → 홈 화면에 추가</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Android Chrome</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">메뉴(⋮) → 홈 화면에 추가</p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
