import { replay, type Action, type Replay } from './actions'
import type { Slot } from './cards'
import { seatsFor, TABLE_SIZES, type Position, type TableSize } from './positions'

export interface Hand {
  id: string
  schemaVersion: 2
  /** 這桌幾個人，決定有哪些位置和行動順序 */
  tableSize: TableSize
  /** 大盲前注（1bb 死錢），只影響底池計算 */
  bbAnte: boolean
  position: Position | null
  /** 固定 2 格 */
  hero: Slot[]
  /** 固定 5 格：翻牌 3、轉牌、河牌 */
  board: Slot[]
  /** 依序的行動 */
  actions: Action[]
  stackBb: number | null
  resultBb: number | null
  note: string
  starred: boolean
  /** 這手的時間 */
  createdAt: number
  updatedAt: number
}

export function blankHand(
  id: string,
  now = Date.now(),
  table: Pick<Hand, 'tableSize' | 'bbAnte'> = { tableSize: 9, bbAnte: true },
): Hand {
  return {
    id,
    schemaVersion: 2,
    tableSize: table.tableSize,
    bbAnte: table.bbAnte,
    position: null,
    hero: [null, null],
    board: [null, null, null, null, null],
    actions: [],
    stackBb: null,
    resultBb: null,
    note: '',
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** 舊版（schemaVersion 1）沒有人數、前注、行動，補上預設值 */
export function normalizeHand(stored: Partial<Hand> & Pick<Hand, 'id'>): Hand {
  const base = blankHand(stored.id, stored.createdAt)
  const hand = { ...base, ...stored, schemaVersion: 2 as const }
  if (!TABLE_SIZES.includes(hand.tableSize)) hand.tableSize = 9
  if (!Array.isArray(hand.actions)) hand.actions = []
  return hand
}

/** 什麼都沒填（★ 不算內容）就不值得存 */
export function isEmptyHand(hand: Hand): boolean {
  return (
    hand.position === null &&
    hand.hero.every((c) => c === null) &&
    hand.board.every((c) => c === null) &&
    hand.actions.length === 0 &&
    hand.stackBb === null &&
    hand.resultBb === null &&
    hand.note.trim() === ''
  )
}

/** 7 個牌格攤平：0–1 手牌、2–4 翻牌、5 轉牌、6 河牌 */
export const handSlots = (hand: Hand): Slot[] => [...hand.hero, ...hand.board]

/** 每條街的公牌在哪幾格（含頭尾） */
export const STREET_SLOTS = { 1: [2, 4], 2: [5, 5], 3: [6, 6] } as const

export function withSlot(hand: Hand, slot: number, card: Slot): Pick<Hand, 'hero' | 'board'> {
  const slots = handSlots(hand)
  slots[slot] = card
  return { hero: slots.slice(0, 2), board: slots.slice(2) }
}

export const replayHand = (hand: Hand): Replay =>
  replay(seatsFor(hand.tableSize), hand.actions, hand.bbAnte ? 1 : 0)
