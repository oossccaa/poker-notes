import { describe, expect, it } from 'vitest'
import type { Action } from './actions'
import { blankHand, type Hand } from './hand'
import { seatsFor } from './positions'
import { firstOpenStep, stepAfterAction, stepAfterCards, stepSlots, stepStatus } from './steps'

const hand = (patch: Partial<Hand>): Hand => ({ ...blankHand('h', 0), ...patch })
const folds = (from: number, to: number): Action[] =>
  seatsFor(9)
    .slice(from, to)
    .map((seat) => ({ seat, type: 'fold', to: null }))

/** CO 開、BTN 跟、盲注蓋 → 翻牌 */
const toFlop: Action[] = [
  ...folds(0, 5),
  { seat: 'CO', type: 'raise', to: 2.2 },
  { seat: 'BTN', type: 'call', to: null },
  { seat: 'SB', type: 'fold', to: null },
  { seat: 'BB', type: 'fold', to: null },
]
const preflopAllIn: Action[] = [
  ...folds(0, 5),
  { seat: 'CO', type: 'allin', to: 25 },
  { seat: 'BTN', type: 'call', to: null },
  { seat: 'SB', type: 'fold', to: null },
  { seat: 'BB', type: 'fold', to: null },
]

describe('steps', () => {
  it('牌格範圍', () => {
    expect(stepSlots('hero')).toEqual([0, 1])
    expect(stepSlots('flop')).toEqual([2, 4])
    expect(stepSlots('river')).toEqual([6, 6])
    expect(stepSlots('pre')).toBeNull()
    expect(stepSlots('result')).toBeNull()
  })

  it('新的一手從位置開始', () => {
    expect(firstOpenStep(hand({}))).toBe('pos')
    expect(stepStatus(hand({})).pre).toBe('todo')
  })

  it('打開時停在第一個沒記完的步驟', () => {
    expect(firstOpenStep(hand({ position: 'BTN' }))).toBe('hero')
    expect(firstOpenStep(hand({ position: 'BTN', hero: ['As', 'Kd'] }))).toBe('pre')
    expect(firstOpenStep(hand({ position: 'BTN', hero: ['As', 'Kd'], actions: toFlop }))).toBe('flop')
  })

  it('翻前記完、翻牌還沒選 → 翻前 done、翻牌 todo', () => {
    const s = stepStatus(hand({ position: 'BTN', hero: ['As', 'Kd'], actions: toFlop }))
    expect(s.pre).toBe('done')
    expect(s.flop).toBe('todo')
    expect(s.turn).toBe('todo')
  })

  it('大家蓋牌結束 → 後面的街用不到', () => {
    const h = hand({ position: 'BB', actions: folds(0, 8) })
    const s = stepStatus(h)
    expect(s.pre).toBe('done')
    expect(s.flop).toBe('skipped')
    expect(stepAfterAction(h)).toBe('result')
  })

  it('記行動後：還在翻前就留在翻前，進翻牌就跳翻牌', () => {
    expect(stepAfterAction(hand({ actions: folds(0, 3) }))).toBe('pre')
    expect(stepAfterAction(hand({ actions: toFlop }))).toBe('flop')
  })

  it('翻前全下：去補公牌，補完去結果', () => {
    const h = hand({ actions: preflopAllIn })
    expect(stepAfterAction(h)).toBe('flop')
    expect(stepStatus(h).flop).toBe('todo')
    const withFlop: Hand = { ...h, board: ['Kc', '7d', '2s', null, null] }
    expect(stepAfterCards(withFlop, 1)).toBe('turn')
    expect(stepAfterCards({ ...h, board: ['Kc', '7d', '2s', '9h', '3c'] }, 3)).toBe('result')
    expect(stepStatus({ ...h, board: ['Kc', '7d', '2s', '9h', '3c'] }).river).toBe('done')
  })

  it('翻牌選好、行動輪到翻牌 → 留在翻牌記行動', () => {
    expect(stepAfterCards(hand({ actions: toFlop, board: ['Kc', '7d', '2s', null, null] }), 1)).toBe('flop')
  })

  it('直接從翻牌開始記（翻前沒記完）', () => {
    const actions: Action[] = [...folds(0, 2), { type: 'street', street: 1, live: ['CO', 'BTN'] }]
    const s = stepStatus(hand({ actions }))
    expect(s.pre).toBe('done')
    expect(s.flop).toBe('todo')
    expect(stepAfterAction(hand({ actions }))).toBe('flop')
  })
})
