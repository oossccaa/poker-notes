import { handSlots, replayHand, STREET_SLOTS, type Hand } from './hand'

export type FlowStep =
  | { kind: 'cards'; from: number; until: number }
  | { kind: 'actions' }
  | { kind: 'result' }
  | null

/**
 * 引導式記錄：手牌 → 翻前行動 → 翻牌 → 翻牌行動 → … → 結果。
 * 每一步只問一次（`prompted` 記著問過哪些），使用者跳過就往下走，不會一直重問。
 * 回傳下一步，以及要記進 `prompted` 的 key。
 */
export function nextFlowStep(hand: Hand, prompted: ReadonlySet<string>): { step: FlowStep; mark?: string } {
  const slots = handSlots(hand)
  const firstEmpty = (from: number, until: number) => {
    for (let i = from; i <= until; i++) if (slots[i] === null) return i
    return null
  }

  if (!prompted.has('hero')) {
    const i = firstEmpty(0, 1)
    if (i !== null) return { step: { kind: 'cards', from: i, until: 1 }, mark: 'hero' }
  }

  const state = replayHand(hand)
  if (!state.done) {
    if (state.street > 0) {
      const key = `street${state.street}`
      const [from, until] = STREET_SLOTS[state.street as 1 | 2 | 3]
      const i = firstEmpty(from, until)
      if (!prompted.has(key) && i !== null) return { step: { kind: 'cards', from: i, until }, mark: key }
    }
    return { step: { kind: 'actions' } }
  }

  // 全下或攤牌：剩下的公牌一次補完
  if (state.showdown && !prompted.has('runout')) {
    const i = firstEmpty(2, 6)
    if (i !== null) return { step: { kind: 'cards', from: i, until: 6 }, mark: 'runout' }
  }

  if (hand.resultBb === null && !prompted.has('result')) return { step: { kind: 'result' }, mark: 'result' }
  return { step: null }
}
