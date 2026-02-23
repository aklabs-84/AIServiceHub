export type Platform = 'ios' | 'android' | 'macos' | 'windows' | 'desktop'
export type Browser = 'chrome' | 'safari' | 'edge' | 'samsung' | 'other'

export function getPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Mac/.test(ua)) return 'macos'
  if (/Win/.test(ua)) return 'windows'
  return 'desktop'
}

export function getBrowser(): Browser {
  if (typeof window === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/SamsungBrowser/.test(ua)) return 'samsung'
  if (/Edg\//.test(ua)) return 'edge'
  if (/Chrome/.test(ua) && !/Chromium/.test(ua)) return 'chrome'
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari'
  return 'other'
}

export function isMobile(): boolean {
  const platform = getPlatform()
  return platform === 'ios' || platform === 'android'
}

export function supportsNativeInstallPrompt(): boolean {
  const browser = getBrowser()
  const platform = getPlatform()
  // Chrome/Edge on desktop and Android support beforeinstallprompt
  if (browser === 'chrome' && platform !== 'ios') return true
  if (browser === 'edge') return true
  if (browser === 'samsung') return true
  return false
}
