import { useMemo, useState } from 'react'
import {
  RANKS,
  SUITS,
  SUIT_NAME,
  makeCard,
  rankAvailable,
  slotLabel,
  suitAvailable,
  type Card,
  type Rank,
  type Slot,
  type Suit,
} from '../lib/cards'
import { SUIT_COLOR, SuitIcon } from './SuitIcon'

/**
 * 選牌鍵盤：從底部滑出，點數 + 花色兩下一張，先按哪個都可以。
 * 這手已經用過的牌會反灰，不可能選到重複。
 */
export function CardPicker({
  slot,
  slots,
  onPick,
  onClear,
  onSkip,
  onClose,
}: {
  slot: number
  slots: readonly Slot[]
  onPick: (card: Card) => void
  onClear: () => void
  onSkip: () => void
  onClose: () => void
}) {
  // 換格子時自動清掉選到一半的點數 / 花色
  const [pending, setPending] = useState<{ slot: number; rank: Rank | null; suit: Suit | null }>({
    slot,
    rank: null,
    suit: null,
  })
  const rank = pending.slot === slot ? pending.rank : null
  const suit = pending.slot === slot ? pending.suit : null

  const used = useMemo(
    () => new Set(slots.filter((c, i): c is Card => c !== null && i !== slot)),
    [slots, slot],
  )

  function choose(nextRank: Rank | null, nextSuit: Suit | null) {
    if (nextRank && nextSuit) {
      setPending({ slot, rank: null, suit: null })
      onPick(makeCard(nextRank, nextSuit))
    } else {
      setPending({ slot, rank: nextRank, suit: nextSuit })
    }
  }

  const rankKey = (r: Rank) => {
    const disabled = !rankAvailable(r, used, suit)
    const selected = r === rank
    return (
      <button
        key={r}
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={() => choose(selected ? null : r, suit)}
        className={`h-12 basis-[calc((100%-36px)/7)] rounded-lg text-[22px] font-semibold transition-colors disabled:opacity-20 ${
          selected ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-700 text-zinc-50 active:bg-zinc-600'
        }`}
      >
        {r}
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-label="選牌"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] animate-sheet-up rounded-t-2xl border-t border-zinc-800 bg-zinc-900 px-3 pt-1 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center">
        <span className="flex-1 pl-1 text-base font-semibold text-amber-400">{slotLabel(slot)}</span>
        <button type="button" onClick={onClear} className="h-11 px-3 text-zinc-300 active:text-white">
          清除
        </button>
        <button type="button" onClick={onSkip} className="h-11 px-3 text-zinc-300 active:text-white">
          跳過
        </button>
        <button type="button" onClick={onClose} className="h-11 px-3 font-semibold text-zinc-50 active:text-white">
          收起
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">{RANKS.slice(0, 7).map(rankKey)}</div>
        <div className="flex justify-center gap-1.5">{RANKS.slice(7).map(rankKey)}</div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {SUITS.map((s) => {
          const disabled = !suitAvailable(s, used, rank)
          const selected = s === suit
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={SUIT_NAME[s]}
              onClick={() => choose(rank, selected ? null : s)}
              className={`flex h-14 items-center justify-center rounded-xl bg-stone-100 disabled:opacity-20 ${SUIT_COLOR[s]} ${
                selected ? 'ring-3 ring-amber-400' : 'active:brightness-90'
              }`}
            >
              <SuitIcon suit={s} className="size-8" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
