import type { NumKey } from '../lib/numpad'

const KEYS: NumKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

export const KEY_CLASS = 'h-12 rounded-lg text-[22px] font-semibold active:brightness-125'

/** 數字鍵 3×4，給 NumPad 和行動鍵盤共用 */
export function Keypad({ onKey }: { onKey: (key: NumKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          aria-label={k === 'back' ? '倒退' : k}
          onClick={() => onKey(k)}
          className={`${KEY_CLASS} bg-zinc-700`}
        >
          {k === 'back' ? '⌫' : k}
        </button>
      ))}
    </div>
  )
}
