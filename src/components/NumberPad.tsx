import { useState } from 'react'
import { formatBb } from '../lib/format'
import { parseValue, pressKey } from '../lib/numpad'
import { KEY_CLASS, Keypad } from './Keypad'

/**
 * bb 數字鍵盤，不叫出系統鍵盤。
 * 結果模式用「輸 / 贏」兩顆鍵決定正負並確定；籌碼模式只有「確定」。
 */
export function NumberPad({
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
  onCancel?: () => void
}) {
  const [text, setText] = useState(initial === null ? '' : formatBb(Math.abs(initial)))
  const value = parseValue(text)

  const confirm = (sign: 1 | -1) => onConfirm(value === null ? null : value * sign || 0)

  return (
    <div role="group" aria-label={title}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-base text-zinc-400">
          {title}
          {onCancel && (
            <button type="button" onClick={onCancel} className="ml-3 h-10 text-zinc-300 underline">
              取消
            </button>
          )}
        </span>
        <span className="text-3xl font-bold tabular-nums">
          {text || <span className="text-zinc-600">0</span>}
          <span className="ml-1 text-lg text-zinc-400">bb</span>
        </span>
      </div>

      <Keypad onKey={(k) => setText((t) => pressKey(t, k))} />

      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        <button type="button" onClick={() => onConfirm(null)} className={`${KEY_CLASS} bg-zinc-800 text-base text-zinc-300`}>
          清除
        </button>
        {mode === 'result' ? (
          <>
            <button type="button" onClick={() => confirm(-1)} className={`${KEY_CLASS} bg-red-600 text-white`}>
              輸 −
            </button>
            <button type="button" onClick={() => confirm(1)} className={`${KEY_CLASS} bg-emerald-600 text-white`}>
              贏 +
            </button>
          </>
        ) : (
          <button type="button" onClick={() => confirm(1)} className={`${KEY_CLASS} col-span-2 bg-amber-400 text-zinc-950`}>
            確定
          </button>
        )}
      </div>
    </div>
  )
}
