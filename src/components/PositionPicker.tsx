import type { Position } from '../lib/positions'

/** 這桌的位置按鈕；再點一次已選的 = 取消 */
export function PositionPicker({
  positions,
  value,
  onChange,
}: {
  positions: readonly Position[]
  value: Position | null
  onChange: (value: Position | null) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {positions.map((p) => {
        const selected = p === value
        return (
          <button
            key={p}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : p)}
            className={`h-12 rounded-lg text-[15px] font-semibold ${
              selected ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-200 active:bg-zinc-700'
            }`}
          >
            {p}
          </button>
        )
      })}
    </div>
  )
}
