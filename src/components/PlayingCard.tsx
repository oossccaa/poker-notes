import { SUIT_NAME, rankOf, suitOf, type Card, type Slot } from '../lib/cards'
import { SUIT_COLOR, SuitIcon } from './SuitIcon'

const cardLabel = (card: Card) => `${SUIT_NAME[suitOf(card)]} ${rankOf(card)}`

/** 一手牌頁的牌格。空的就是虛線框 */
export function CardSlot({
  card,
  active = false,
  label,
  onClick,
}: {
  card: Slot
  active?: boolean
  label: string
  onClick: () => void
}) {
  const ring = active ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-ink' : ''
  if (!card) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}：空`}
        className={`h-[76px] w-[54px] shrink-0 rounded-lg border-2 border-dashed border-zinc-700 text-2xl text-zinc-600 active:bg-zinc-900 ${ring}`}
      >
        +
      </button>
    )
  }
  const color = SUIT_COLOR[suitOf(card)]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}：${cardLabel(card)}`}
      className={`flex h-[76px] w-[54px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg bg-stone-100 shadow active:brightness-90 ${color} ${ring}`}
    >
      <span className="text-[26px] leading-none font-bold">{rankOf(card)}</span>
      <SuitIcon suit={suitOf(card)} className="size-6" />
    </button>
  )
}

/** 列表裡的小牌 */
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
