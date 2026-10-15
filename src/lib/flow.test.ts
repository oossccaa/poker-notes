import { describe, expect, it } from 'vitest'
import type { Action } from './actions'
import { nextFlowStep } from './flow'
import { blankHand, type Hand } from './hand'
import { seatsFor } from './positions'

const hand = (patch: Partial<Hand>): Hand => ({ ...blankHand('h', 0), ...patch })
const foldAllToBB: Action[] = seatsFor(9)
  .slice(0, 8)
  .map((seat) => ({ seat, type: 'fold', to: null }))
const limpedPot: Action[] = [
  { seat: 'UTG', type: 'call', to: null },
  ...seatsFor(9)
    .slice(1, 8)
    .map((seat): Action => ({ seat, type: 'fold', to: null })),
  { seat: 'BB', type: 'check', to: null },
]

describe('nextFlowStep', () => {
  it('先問手牌', () => {
    expect(nextFlowStep(hand({}), new Set())).toEqual({ step: { kind: 'cards', from: 0, until: 1 }, mark: 'hero' })
    expect(nextFlowStep(hand({ hero: ['As', null] }), new Set()).step).toEqual({ kind: 'cards', from: 1, until: 1 })
  })

  it('手牌問過（或填好）就記翻前行動', () => {
    expect(nextFlowStep(hand({}), new Set(['hero'])).step).toEqual({ kind: 'actions' })
    expect(nextFlowStep(hand({ hero: ['As', 'Kd'] }), new Set()).step).toEqual({ kind: 'actions' })
  })

  it('翻前結束後先問翻牌，問過就記翻牌行動', () => {
    const h = hand({ hero: ['As', 'Kd'], actions: limpedPot })
    expect(nextFlowStep(h, new Set())).toEqual({ step: { kind: 'cards', from: 2, until: 4 }, mark: 'street1' })
    expect(nextFlowStep(h, new Set(['street1'])).step).toEqual({ kind: 'actions' })
    expect(nextFlowStep({ ...h, board: ['Kc', '7d', '2s', null, null] }, new Set()).step).toEqual({ kind: 'actions' })
  })

  it('大家蓋牌結束 → 問結果，問過就停', () => {
    const h = hand({ hero: ['As', 'Kd'], actions: foldAllToBB })
    expect(nextFlowStep(h, new Set())).toEqual({ step: { kind: 'result' }, mark: 'result' })
    expect(nextFlowStep(h, new Set(['result'])).step).toBeNull()
    expect(nextFlowStep({ ...h, resultBb: 1.5 }, new Set()).step).toBeNull()
  })

  it('翻前全下 → 一次補完公牌', () => {
    const actions: Action[] = [
      ...seatsFor(9)
        .slice(0, 5)
        .map((seat): Action => ({ seat, type: 'fold', to: null })),
      { seat: 'CO', type: 'allin', to: 25 },
      { seat: 'BTN', type: 'call', to: null },
      { seat: 'SB', type: 'fold', to: null },
      { seat: 'BB', type: 'fold', to: null },
    ]
    const h = hand({ hero: ['As', 'Kd'], actions })
    expect(nextFlowStep(h, new Set())).toEqual({ step: { kind: 'cards', from: 2, until: 6 }, mark: 'runout' })
    expect(nextFlowStep(h, new Set(['runout'])).step).toEqual({ kind: 'result' })
  })
})
