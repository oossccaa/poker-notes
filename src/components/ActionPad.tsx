import { useState } from 'react'
import { foldsUntil, suggestedSizes, type Replay, type SeatAction } from '../lib/actions'
import { formatBb } from '../lib/format'
import { parseValue, pressKey } from '../lib/numpad'
import type { Position } from '../lib/positions'
import { KEY_CLASS, Keypad } from './Keypad'

export type AmountType = 'bet' | 'raise' | 'allin'

/**
 * 行動按鈕：顯示輪到誰，四顆大按鈕「蓋牌 / 跟 / 加注 / 全下」。
 * 點後面的位置 = 中間的人都蓋牌。下注金額用 bb，有常用尺寸可以一鍵選。
 */
export function ActionPad({
  state,
  hero,
  heroStack,
  onAct,
}: {
  state: Replay
  hero: Position | null
  heroStack: number | null
  onAct: (actions: SeatAction[]) => void
}) {
  const [amount, setAmount] = useState<AmountType | null>(null)
  const name = (seat: Position) => (seat === hero ? 'Hero' : seat)
  const toAct = state.toAct
  if (toAct === null) return null

  const act = (action: SeatAction) => {
    setAmount(null)
    onAct([action])
  }

  if (amount) {
    return (
      <AmountEntry
        title={`${name(toAct)} ${amount === 'bet' ? '下注' : amount === 'raise' ? '加注到' : '全下'}`}
        type={amount}
        facing={state.facing}
        sizes={amount === 'allin' ? (toAct === hero && heroStack !== null ? [{ label: '我的籌碼', value: heroStack }] : []) : suggestedSizes(state)}
        onConfirm={(to) => act({ seat: toAct, type: amount, to })}
        onCancel={() => setAmount(null)}
      />
    )
  }

  // 翻後只列還在牌局的人（和這條街才蓋牌的人），翻前列全部座位
  const current = state.streets[state.streets.length - 1]
  const foldedNow = new Set(current.actions.filter((a) => a.type === 'fold').map((a) => a.seat))
  const seats = state.street === 0 ? state.order : state.order.filter((p) => state.live.includes(p) || foldedNow.has(p))

  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {seats.map((seat) => {
          const folded = !state.live.includes(seat)
          const isAllIn = state.allIn.includes(seat)
          const current = seat === toAct
          const pending = !current && state.needToAct.includes(seat)
          const put = state.contributed[seat]
          return (
            <button
              key={seat}
              type="button"
              disabled={!pending}
              onClick={() => onAct(foldsUntil(state, seat))}
              aria-label={pending ? `${name(seat)}：前面的人都蓋牌` : name(seat)}
              className={`flex h-11 flex-col items-center justify-center rounded-lg leading-tight ${
                current
                  ? 'bg-amber-400 text-zinc-950'
                  : folded
                    ? 'text-zinc-600'
                    : pending
                      ? 'bg-zinc-700 text-zinc-100 active:bg-zinc-600'
                      : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <span className="text-[14px] font-semibold">{seat}</span>
              <span className="text-[11px]">
                {folded ? '蓋牌' : isAllIn ? '全下' : seat === hero ? 'Hero' : put ? formatBb(put) : ' '}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-2 flex items-baseline justify-between px-1">
        <span className="text-base">
          輪到 <span className="font-bold text-amber-400">{name(toAct)}</span>
          {!state.canCheck && state.facing !== null && (
            <span className="ml-2 text-zinc-400">要跟到 {formatBb(state.facing)}bb</span>
          )}
        </span>
        <span className="text-[12px] text-zinc-500">點後面的位置 = 中間都蓋牌</span>
      </p>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <ActionButton className="bg-zinc-700 text-zinc-100" onClick={() => act({ seat: toAct, type: 'fold', to: null })}>
          蓋牌
        </ActionButton>
        {state.canCheck ? (
          <ActionButton className="bg-emerald-700 text-white" onClick={() => act({ seat: toAct, type: 'check', to: null })}>
            過牌
          </ActionButton>
        ) : (
          <ActionButton className="bg-emerald-700 text-white" onClick={() => act({ seat: toAct, type: 'call', to: null })}>
            跟
          </ActionButton>
        )}
        <ActionButton className="bg-amber-400 text-zinc-950" onClick={() => setAmount(state.betLevel === 0 ? 'bet' : 'raise')}>
          {state.betLevel === 0 ? '下注' : '加注'}
        </ActionButton>
        <ActionButton className="bg-red-600 text-white" onClick={() => setAmount('allin')}>
          全下
        </ActionButton>
      </div>
    </div>
  )
}

function ActionButton({ className, onClick, children }: { className: string; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`h-14 rounded-xl text-lg font-bold active:brightness-90 ${className}`}>
      {children}
    </button>
  )
}

/** 輸入下注 / 加注 / 全下的金額；常用尺寸點一下就確定 */
export function AmountEntry({
  title,
  type,
  initial = null,
  facing,
  sizes,
  onConfirm,
  onCancel,
}: {
  title: string
  type: AmountType
  initial?: number | null
  facing: number | null
  sizes: { label: string; value: number }[]
  onConfirm: (to: number | null) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initial === null ? '' : formatBb(initial))
  const value = parseValue(text)
  // 下注 / 加注要比現在要跟的多；不知道金額可以留空
  const tooSmall = type !== 'allin' && value !== null && facing !== null && value <= facing

  return (
    <div role="group" aria-label={title}>
      <div className="flex items-baseline justify-between px-1">
        <span className="text-base text-zinc-300">{title}</span>
        <span className="text-3xl font-bold tabular-nums">
          {text || <span className="text-zinc-600">?</span>}
          <span className="ml-1 text-lg text-zinc-400">bb</span>
        </span>
      </div>
      <p className={`h-5 px-1 text-[13px] ${tooSmall ? 'text-red-400' : 'text-zinc-500'}`}>
        {tooSmall ? `要大於 ${formatBb(facing!)}bb` : '不知道金額可以直接按確定'}
      </p>

      {sizes.length > 0 && (
        <div className="mt-1 mb-1.5 flex gap-1.5">
          {sizes.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={facing !== null && type !== 'allin' && s.value <= facing}
              onClick={() => onConfirm(s.value)}
              className="flex h-11 flex-1 flex-col items-center justify-center rounded-lg bg-zinc-700 leading-tight active:bg-zinc-600 disabled:opacity-30"
            >
              <span className="text-base font-semibold tabular-nums">{formatBb(s.value)}</span>
              {s.label && <span className="text-[11px] text-zinc-400">{s.label}</span>}
            </button>
          ))}
        </div>
      )}

      <Keypad onKey={(k) => setText((t) => pressKey(t, k))} />

      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        <button type="button" onClick={onCancel} className={`${KEY_CLASS} bg-zinc-800 text-base text-zinc-300`}>
          取消
        </button>
        <button
          type="button"
          disabled={tooSmall}
          onClick={() => onConfirm(value)}
          className={`${KEY_CLASS} col-span-2 bg-amber-400 text-zinc-950 disabled:opacity-40`}
        >
          確定
        </button>
      </div>
    </div>
  )
}
