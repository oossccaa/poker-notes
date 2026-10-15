import type { PostflopStreet, Replay, Street } from './actions'
import { handSlots, replayHand, STREET_SLOTS, type Hand } from './hand'

/** 記一手的步驟，全部在同一個畫面，可以隨時切換 */
export const STEPS = ['pos', 'hero', 'pre', 'flop', 'turn', 'river', 'result', 'note'] as const
export type StepId = (typeof STEPS)[number]

export const STEP_LABELS: Record<StepId, string> = {
  pos: '位置',
  hero: '手牌',
  pre: '翻前',
  flop: '翻牌',
  turn: '轉牌',
  river: '河牌',
  result: '結果',
  note: '備註',
}

const STREET_STEPS = ['pre', 'flop', 'turn', 'river'] as const

export const stepOfStreet = (street: Street): StepId => STREET_STEPS[street]

export function streetOfStep(step: StepId): Street | null {
  const i = (STREET_STEPS as readonly string[]).indexOf(step)
  return i === -1 ? null : (i as Street)
}

/** 這一步的牌格範圍（含頭尾）；沒有牌的步驟是 null */
export function stepSlots(step: StepId): readonly [number, number] | null {
  if (step === 'hero') return [0, 1]
  const street = streetOfStep(step)
  return street ? STREET_SLOTS[street as PostflopStreet] : null
}

/** 範圍內第一個空格；都填好是 null */
export function firstEmptySlot(hand: Hand, range: readonly [number, number]): number | null {
  const slots = handSlots(hand)
  for (let i = range[0]; i <= range[1]; i++) if (slots[i] === null) return i
  return null
}

function cardsFilled(hand: Hand, range: readonly [number, number]): 'all' | 'some' | 'none' {
  const cards = handSlots(hand).slice(range[0], range[1] + 1)
  const n = cards.filter((c) => c !== null).length
  return n === cards.length ? 'all' : n === 0 ? 'none' : 'some'
}

/**
 * 每一步的狀態：done 記好了、partial 記了一部分、todo 還沒記、
 * skipped 這手在前面就結束了（大家蓋牌），這一步用不到。
 */
export type StepStatus = 'done' | 'partial' | 'todo' | 'skipped'

export function stepStatus(hand: Hand, state: Replay = replayHand(hand)): Record<StepId, StepStatus> {
  const street = (s: Street): StepStatus => {
    const cards = s === 0 ? 'all' : cardsFilled(hand, STREET_SLOTS[s as PostflopStreet])
    const log = state.streets.find((l) => l.street === s)
    if (!log) {
      if (state.done && !state.showdown) return 'skipped'
      if (state.done) return cards === 'all' ? 'done' : cards === 'some' ? 'partial' : 'todo'
      return cards === 'none' ? 'todo' : 'partial'
    }
    const finished = state.street > s || state.done
    if (finished) return cards === 'all' ? 'done' : 'partial'
    return log.actions.length === 0 && (s === 0 || cards === 'none') ? 'todo' : 'partial'
  }
  const hero = cardsFilled(hand, [0, 1])
  return {
    pos: hand.position ? 'done' : 'todo',
    hero: hero === 'all' ? 'done' : hero === 'some' ? 'partial' : 'todo',
    pre: street(0),
    flop: street(1),
    turn: street(2),
    river: street(3),
    result: hand.resultBb !== null ? 'done' : 'todo',
    note: hand.note.trim() || hand.starred ? 'done' : 'todo',
  }
}

/** 打開一手時停在哪一步：第一個還沒記完的 */
export function firstOpenStep(hand: Hand): StepId {
  const status = stepStatus(hand)
  return STEPS.find((s) => status[s] === 'todo' || status[s] === 'partial') ?? 'note'
}

/** 記完一個行動後該在哪一步：還沒結束就是目前這條街；全下就去補公牌；結束就去結果 */
export function stepAfterAction(hand: Hand): StepId {
  const state = replayHand(hand)
  if (!state.done) return stepOfStreet(state.street)
  if (state.showdown) {
    for (const s of [1, 2, 3] as const) if (cardsFilled(hand, STREET_SLOTS[s]) !== 'all') return stepOfStreet(s)
  }
  return 'result'
}

/** 這條街的公牌選完（或跳過）後：行動輪到這條街就留下來記行動，全下發牌就往下一條街 */
export function stepAfterCards(hand: Hand, street: PostflopStreet): StepId {
  const state = replayHand(hand)
  if (state.done && state.showdown) {
    for (const s of [1, 2, 3] as const)
      if (s > street && cardsFilled(hand, STREET_SLOTS[s]) !== 'all') return stepOfStreet(s)
    return 'result'
  }
  return stepOfStreet(street)
}
