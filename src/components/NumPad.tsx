import { useState } from 'react'
import { formatBb } from '../lib/format'
import { parseValue, pressKey, type NumKey } from '../lib/numpad'

const KEYS: NumKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

/**
 * bb 數字鍵盤，不叫出系統鍵盤。
 * 結果模式用「輸 / 贏」兩顆鍵決定正負並確定；籌碼模式只有「確定」。
 */
export function NumPad({
  title,
  mode,
  initial,
  onConfirm,
  onCancel,
}: {
  title: string
  mode: 'stack' | 'result'
  initial: number | null
  onConfirm: (value: number | null) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initial === null ? '' : formatBb(Math.abs(initial)))
  const value = parseValue(text)

  const confirm = (sign: 1 | -1) => onConfirm(value === null ? null : value * sign || 0)

  const key = 'h-12 rounded-lg text-[22px] font-semibold active:brightness-125'

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] animate-sheet-up rounded-t-2xl border-t border-zinc-800 bg-zinc-900 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-baseline justify-between px-1">
          <span className="text-base text-zinc-400">{title}</span>
          <span className="text-3xl font-bold tabular-nums">
            {text || <span className="text-zinc-600">0</span>}
            <span className="ml-1 text-lg text-zinc-400">bb</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k === 'back' ? '倒退' : k}
              onClick={() => setText((t) => pressKey(t, k))}
              className={`${key} bg-zinc-700`}
            >
              {k === 'back' ? '⌫' : k}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button type="button" onClick={() => onConfirm(null)} className={`${key} bg-zinc-800 text-base text-zinc-300`}>
            清除
          </button>
          {mode === 'result' ? (
            <>
              <button type="button" onClick={() => confirm(-1)} className={`${key} bg-red-600 text-white`}>
                輸 −
              </button>
              <button type="button" onClick={() => confirm(1)} className={`${key} bg-emerald-600 text-white`}>
                贏 +
              </button>
            </>
          ) : (
            <button type="button" onClick={() => confirm(1)} className={`${key} col-span-2 bg-amber-400 text-zinc-950`}>
              確定
            </button>
          )}
        </div>
      </div>
    </>
  )
}
