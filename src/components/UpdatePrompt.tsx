import { useRegisterSW } from 'virtual:pwa-register/react'

/** 有新版本時讓使用者自己按更新，不會在記到一半時自動重新整理 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+8px)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-100 py-1 pr-1 pl-4 text-[15px] whitespace-nowrap text-zinc-900 shadow-lg">
      有新版本
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="h-9 rounded-full bg-zinc-900 px-3 font-semibold text-white"
      >
        更新
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)} className="h-9 px-2 text-zinc-500">
        稍後
      </button>
    </div>
  )
}
