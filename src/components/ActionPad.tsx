import { useState } from 'react'
import { foldsUntil, STREET_NAMES, suggestedSizes, type Action, type Replay } from '../lib/actions'
import { formatBb } from '../lib/format'
import { parseValue, pressKey } from '../lib/numpad'
import type { Position } from '../lib/positions'
import { KEY_CLASS, Keypad } from './Keypad'

type AmountType = 'bet' | 'raise' | 'allin'

/**
 * 行動鍵盤：從底部滑出，顯示輪到誰，四顆大按鈕「蓋牌 / 跟 / 加注 / 全下」。
 * 點後面的位置 = 中間的人都蓋牌。下注金額用 bb，有常用尺寸可以一鍵選。
 */
export function ActionPad({
  state,
  hero,
  heroStack,
  canUndo,
  onAct,
  onUndo,
  onClose,
}: {
  state: Replay
  hero: Position | null
  heroStack: number | null
  canUndo: boolean
  onAct: (actions: Action[]) => void
  onUndo: () => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState<{ type: AmountType; text: string } | null>(null)
  const name = (seat: Position) => (seat === hero ? 'Hero' : seat)
  const { toAct } = state

  const act = (action: Action) => {
    setAmount(null)
    onAct([action])
  }

  return (
    <div
      role="dialog"
      aria-label="記錄行動"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] animate-sheet-up rounded-t-2xl border-t border-zinc-800 bg-zinc-900 px-3 pt-1 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center">
        <span className="flex-1 pl-1 text-base font-semibold">
          <span className="text-amber-400">{STREET_NAMES[state.street]}</span>
          {state.pot !== null && <span className="ml-2 text-zinc-400">底池 {formatBb(state.pot)}bb</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setAmount(null)
            onUndo()
          }}
          disabled={!canUndo}
          className="h-11 px-3 text-zinc-300 active:text-white disabled:text-zinc-700"
        >
          復原
        </button>
        <button type="button" onClick={onClose} className="h-11 px-3 font-semibold text-zinc-50 active:text-white">
          收起
        </button>
      </div>

      {state.done || toAct === null ? (
        <p className="px-1 pt-2 pb-4 text-[15px] leading-relaxed text-zinc-300">
          這手結束了：
          {state.showdown ? `${state.live.map(name).join('、')} 攤牌` : `${state.live.map(name).join('')} 贏下底池`}。
          <br />
          <span className="text-zinc-500">記錯了可以按「復原」。</span>
        </p>
      ) : amount ? (
        <AmountEntry
          title={`${name(toAct)} ${amount.type === 'bet' ? '下注' : amount.type === 'raise' ? '加注到' : '全下'}`}
          type={amount.type}
          text={amount.text}
          facing={state.facing}
          sizes={
            amount.type === 'allin'
              ? toAct === hero && heroStack !== null
                ? [{ label: '我的籌碼', value: heroStack }]
                : []
              : suggestedSizes(state)
          }
          onText={(text) => setAmount({ ...amount, text })}
          onConfirm={(to) => act({ seat: toAct, type: amount.type, to })}
          onCancel={() => setAmount(null)}
        />
      ) : (
        <>
          <div className="mt-1 grid grid-cols-5 gap-1.5">
            {state.order.map((seat) => {
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
                  className={`flex h-12 flex-col items-center justify-center rounded-lg leading-tight ${
                    current
                      ? 'bg-amber-400 text-zinc-950'
                      : folded
                        ? 'bg-zinc-900 text-zinc-600 line-through'
                        : pending
                          ? 'bg-zinc-700 text-zinc-100 active:bg-zinc-600'
                          : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="text-[14px] font-semibold">{seat}</span>
                  <span className="text-[11px]">
                    {isAllIn ? '全下' : seat === hero ? 'Hero' : put ? formatBb(put) : ' '}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 px-1 text-[13px] text-zinc-500">點後面的位置 = 中間的人都蓋牌</p>

          <p className="mt-2 px-1 text-base">
            輪到 <span className="font-bold text-amber-400">{name(toAct)}</span>
            {!state.canCheck && state.facing !== null && (
              <span className="ml-2 text-zinc-400">要跟到 {formatBb(state.facing)}bb</span>
            )}
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
            <ActionButton
              className="bg-amber-400 text-zinc-950"
              onClick={() => setAmount({ type: state.betLevel === 0 ? 'bet' : 'raise', text: '' })}
            >
              {state.betLevel === 0 ? '下注' : '加注'}
            </ActionButton>
            <ActionButton className="bg-red-600 text-white" onClick={() => setAmount({ type: 'allin', text: '' })}>
              全下
            </ActionButton>
          </div>
        </>
      )}
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

function AmountEntry({
  title,
  type,
  text,
  facing,
  sizes,
  onText,
  onConfirm,
  onCancel,
}: {
  title: string
  type: AmountType
  text: string
  facing: number | null
  sizes: { label: string; value: number }[]
  onText: (text: string) => void
  onConfirm: (to: number | null) => void
  onCancel: () => void
}) {
  const value = parseValue(text)
  // 下注 / 加注要比現在要跟的多；不知道金額可以留空
  const tooSmall = type !== 'allin' && value !== null && facing !== null && value <= facing

  return (
    <div className="pt-1">
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
        <div className="mt-1 mb-2 flex gap-1.5">
          {sizes.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={facing !== null && type !== 'allin' && s.value <= facing}
              onClick={() => onConfirm(s.value)}
              className="flex h-12 flex-1 flex-col items-center justify-center rounded-lg bg-zinc-700 leading-tight active:bg-zinc-600 disabled:opacity-30"
            >
              <span className="text-base font-semibold tabular-nums">{formatBb(s.value)}</span>
              {s.label && <span className="text-[11px] text-zinc-400">{s.label}</span>}
            </button>
          ))}
        </div>
      )}

      <Keypad onKey={(k) => onText(pressKey(text, k))} />

      <div className="mt-2 grid grid-cols-3 gap-1.5">
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
