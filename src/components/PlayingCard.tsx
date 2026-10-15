import { SUIT_NAME, rankOf, suitOf, type Card, type Slot } from '../lib/cards'
import { SUIT_COLOR, SuitIcon } from './SuitIcon'

const cardLabel = (card: Card) => `${SUIT_NAME[suitOf(card)]} ${rankOf(card)}`

const SIZES = {
  lg: { box: 'h-[76px] w-[54px]', rank: 'text-[26px]', suit: 'size-6' },
  md: { box: 'h-[60px] w-[44px]', rank: 'text-[22px]', suit: 'size-5' },
}

/** 可以點的牌格。空的就是虛線框 */
export function CardSlot({
  card,
  active = false,
  size = 'lg',
  label,
  onClick,
}: {
  card: Slot
  active?: boolean
  size?: keyof typeof SIZES
  label: string
  onClick: () => void
}) {
  const s = SIZES[size]
  const ring = active ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-zinc-900' : ''
  if (!card) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}：空`}
        className={`${s.box} shrink-0 rounded-lg border-2 border-dashed border-zinc-600 text-xl text-zinc-500 active:bg-zinc-800 ${ring}`}
      >
        +
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}：${cardLabel(card)}`}
      className={`flex ${s.box} shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-stone-100 shadow active:brightness-90 ${SUIT_COLOR[suitOf(card)]} ${ring}`}
    >
      <span className={`${s.rank} leading-none font-bold`}>{rankOf(card)}</span>
      <SuitIcon suit={suitOf(card)} className={s.suit} />
    </button>
  )
}

/** 列表、摘要裡的小牌 */
export function MiniCard({ card }: { card: Card }) {
  return (
    <span
      aria-label={cardLabel(card)}
      className={`inline-flex h-6 items-center gap-px rounded bg-stone-100 px-1 text-[15px] leading-none font-bold ${SUIT_COLOR[suitOf(card)]}`}
    >
      {rankOf(card)}
      <SuitIcon suit={suitOf(card)} className="size-3" />
    </span>
  )
}

/** 一組小牌（例如翻牌），空格不顯示 */
export function MiniCards({ slots }: { slots: readonly Slot[] }) {
  const cards = slots.filter((c): c is Card => c !== null)
  if (cards.length === 0) return null
  return (
    <span className="inline-flex gap-0.5">
      {cards.map((c) => (
        <MiniCard key={c} card={c} />
      ))}
    </span>
  )
}
