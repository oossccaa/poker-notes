export function isIOS(): boolean {
  const ua = navigator.userAgent
  // iPadOS 會假裝成 Mac
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/** 從主畫面打開（PWA） */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** LINE 內建瀏覽器 */
export function isLineInApp(): boolean {
  return /\bLine\//i.test(navigator.userAgent)
}

/** LINE 支援這個參數，會改用手機預設的瀏覽器開啟 */
export function externalBrowserUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.set('openExternalBrowser', '1')
  return url.toString()
}
