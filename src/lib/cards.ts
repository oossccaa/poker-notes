export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
export const SUITS = ['s', 'h', 'd', 'c'] as const

export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]
export type Card = `${Rank}${Suit}`
export type Slot = Card | null

export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
export const SUIT_NAME: Record<Suit, string> = { s: '黑桃', h: '紅心', d: '方塊', c: '梅花' }

export const makeCard = (rank: Rank, suit: Suit): Card => `${rank}${suit}`
export const rankOf = (card: Card) => card[0] as Rank
export const suitOf = (card: Card) => card[1] as Suit

export function isCard(value: unknown): value is Card {
  return (
    typeof value === 'string' &&
    value.length === 2 &&
    (RANKS as readonly string[]).includes(value[0]) &&
    (SUITS as readonly string[]).includes(value[1])
  )
}

/** 純文字記法，例如 `A♠`，給分享用 */
export const cardText = (card: Card) => `${rankOf(card)}${SUIT_SYMBOL[suitOf(card)]}`

export function hasDuplicates(slots: readonly Slot[]): boolean {
  const cards = slots.filter((c) => c !== null)
  return new Set(cards).size !== cards.length
}

/** 一手共 7 格：0–1 手牌、2–4 翻牌、5 轉牌、6 河牌 */
export const SLOT_COUNT = 7

export function slotLabel(slot: number): string {
  if (slot < 2) return `手牌 ${slot + 1}/2`
  if (slot < 5) return `翻牌 ${slot - 1}/3`
  return slot === 5 ? '轉牌' : '河牌'
}

/** 在已用過的牌之下，這個點數還能不能選（已選花色時只看那一張） */
export function rankAvailable(rank: Rank, used: ReadonlySet<Card>, suit: Suit | null): boolean {
  return suit ? !used.has(makeCard(rank, suit)) : SUITS.some((s) => !used.has(makeCard(rank, s)))
}

/** 在已用過的牌之下，這個花色還能不能選（已選點數時只看那一張） */
export function suitAvailable(suit: Suit, used: ReadonlySet<Card>, rank: Rank | null): boolean {
  return rank ? !used.has(makeCard(rank, suit)) : RANKS.some((r) => !used.has(makeCard(r, suit)))
}

/** `from` 之後、`until`（含）之前的下一個空格；沒有就回傳 null */
export function nextEmptySlot(slots: readonly Slot[], from: number, until = slots.length - 1): number | null {
  for (let i = from + 1; i <= until; i++) if (slots[i] === null) return i
  return null
}
