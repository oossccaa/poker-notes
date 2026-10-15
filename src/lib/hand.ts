import type { Slot } from './cards'
import type { Position } from './positions'

export interface Hand {
  id: string
  schemaVersion: 1
  position: Position | null
  /** 固定 2 格 */
  hero: Slot[]
  /** 固定 5 格：翻牌 3、轉牌、河牌 */
  board: Slot[]
  stackBb: number | null
  resultBb: number | null
  note: string
  starred: boolean
  /** 這手的時間 */
  createdAt: number
  updatedAt: number
}

export function blankHand(id: string, now = Date.now()): Hand {
  return {
    id,
    schemaVersion: 1,
    position: null,
    hero: [null, null],
    board: [null, null, null, null, null],
    stackBb: null,
    resultBb: null,
    note: '',
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** 什麼都沒填（★ 不算內容）就不值得存 */
export function isEmptyHand(hand: Hand): boolean {
  return (
    hand.position === null &&
    hand.hero.every((c) => c === null) &&
    hand.board.every((c) => c === null) &&
    hand.stackBb === null &&
    hand.resultBb === null &&
    hand.note.trim() === ''
  )
}

/** 7 個牌格攤平：0–1 手牌、2–6 公牌 */
export const handSlots = (hand: Hand): Slot[] => [...hand.hero, ...hand.board]

export function withSlot(hand: Hand, slot: number, card: Slot): Pick<Hand, 'hero' | 'board'> {
  const slots = handSlots(hand)
  slots[slot] = card
  return { hero: slots.slice(0, 2), board: slots.slice(2) }
}
