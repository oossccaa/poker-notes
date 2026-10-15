import { STREET_NAMES, type PlayedAction, type Street } from './actions'
import { cardText, type Card, type Slot } from './cards'
import { formatBb, formatResultBb } from './format'
import { replayHand, STREET_SLOTS, type Hand } from './hand'
import type { Position } from './positions'

const cardsText = (slots: readonly Slot[]) =>
  slots
    .filter((c): c is Card => c !== null)
    .map(cardText)
    .join('')

/** `CO 開 2.2bb`、`Hero 跟`、`BB 過牌` */
export function describeAction(action: PlayedAction, hero: Position | null): string {
  const who = action.seat === hero ? 'Hero' : action.seat
  const amount = action.amount !== null ? ` ${formatBb(action.amount)}bb` : ''
  return `${who} ${action.label}${amount}`
}

const streetCards = (hand: Hand, street: 1 | 2 | 3) => {
  const [from, until] = STREET_SLOTS[street]
  return cardsText(hand.board.slice(from - 2, until - 1))
}

/**
 * 貼到 LINE 的純文字，例如：
 *
 *   Hero BTN A♠K♦(25bb)
 *   翻前：CO 開 2.2bb，Hero 3bet 7bb，CO 跟
 *   翻牌 K♣7♦2♠（底池 16.5bb）：CO 過牌，Hero 下注 5bb，CO 跟
 *   結果 +12.5bb
 *
 *   備註…
 *
 * 沒記行動時，公牌就合成一行「公牌 …」。沒資料的部分省略；整手都沒資料就回傳空字串。
 */
export function buildShareText(hand: Hand): string {
  const lines: string[] = []

  const head = ['Hero', hand.position, cardsText(hand.hero)].filter(Boolean).join(' ')
  const stack = hand.stackBb !== null ? `(${formatBb(hand.stackBb)}bb)` : ''
  if (head !== 'Hero' || stack) lines.push(head + stack)

  if (hand.actions.length === 0) {
    const board = [streetCards(hand, 1), streetCards(hand, 2), streetCards(hand, 3)].filter(Boolean).join(' ')
    if (board) lines.push(`公牌 ${board}`)
  } else {
    const state = replayHand(hand)
    for (const street of [0, 1, 2, 3] as Street[]) {
      const log = state.streets.find((s) => s.street === street)
      const actions = (log?.actions ?? [])
        .filter((a) => a.shown)
        .map((a) => describeAction(a, hand.position))
        .join('，')
      if (street === 0) {
        if (actions) lines.push(`翻前：${actions}`)
        continue
      }
      const cards = streetCards(hand, street)
      if (!log && !cards) continue
      let line = `${STREET_NAMES[street]}${cards ? ` ${cards}` : ''}`
      if (log && log.potStart !== null) line += `（底池 ${formatBb(log.potStart)}bb）`
      if (actions) line += `：${actions}`
      lines.push(line)
    }
  }

  if (hand.resultBb !== null) lines.push(`結果 ${formatResultBb(hand.resultBb)}`)

  const note = hand.note.trim()
  if (note) {
    if (lines.length > 0) lines.push('')
    lines.push(note)
  }

  return lines.join('\n')
}

/** 打開 LINE 的分享畫面，選朋友或群組 */
export const lineShareUrl = (text: string) => `https://line.me/R/share?text=${encodeURIComponent(text)}`
