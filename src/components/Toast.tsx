import { useCallback, useState } from 'react'

/** 畫面上方的短暫提示 */
export function useToast() {
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)

  const show = useCallback((text: string) => setToast({ text, key: Date.now() }), [])

  const node = toast ? (
    <div
      key={toast.key}
      role="status"
      onAnimationEnd={() => setToast(null)}
      className="fixed top-[calc(env(safe-area-inset-top)+12px)] left-1/2 z-50 animate-toast rounded-full bg-zinc-100 px-4 py-2 text-[15px] font-medium whitespace-nowrap text-zinc-900 shadow-lg"
    >
      {toast.text}
    </div>
  ) : null

  return [node, show] as const
}
