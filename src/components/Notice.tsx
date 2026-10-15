import { useState } from 'react'
import { externalBrowserUrl, isIOS, isLineInApp, isStandalone } from '../lib/platform'

const DISMISS_KEY = 'installGuideDismissedAt'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return at > 0 && Date.now() - at < SNOOZE_MS
  } catch {
    return false
  }
}

/** 首頁最上面的提示：LINE 內建瀏覽器 → iOS 加到主畫面引導，最多顯示一個 */
export function Notice() {
  const [hidden, setHidden] = useState(dismissedRecently)

  if (isLineInApp()) {
    return (
      <div className="mx-4 mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[15px] leading-relaxed">
        <p>你正在 LINE 裡打開，這裡記的資料可能會不見。</p>
        <a href={externalBrowserUrl()} className="mt-2 inline-block font-semibold text-amber-400 underline">
          改用瀏覽器開啟
        </a>
      </div>
    )
  }

  if (isIOS() && !isStandalone() && !hidden) {
    return (
      <div className="mx-4 mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[15px] leading-relaxed">
        <p className="font-semibold text-amber-400">先加到主畫面再開始記</p>
        <p className="mt-1 text-zinc-300">
          點 Safari 下方的分享按鈕 <ShareIcon /> →「加入主畫面」，之後從主畫面打開。
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          在 Safari 裡記的手牌不會跟到主畫面的 App，而且太久沒開可能會被 Safari 清掉。
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, String(Date.now()))
            } catch {
              // 存不了就只在這次隱藏
            }
            setHidden(true)
          }}
          className="mt-2 h-10 text-zinc-300 underline"
        >
          知道了
        </button>
      </div>
    )
  }

  return null
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline size-5 -translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-label="分享">
      <path d="M12 3v12M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5v10h14V11h-1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
