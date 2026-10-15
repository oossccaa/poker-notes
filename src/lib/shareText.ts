import { cardText, type Card, type Slot } from './cards'
import { formatBb, formatResultBb } from './format'
import type { Hand } from './hand'

const cardsText = (slots: readonly Slot[]) =>
  slots
    .filter((c): c is Card => c !== null)
    .map(cardText)
    .join('')

/**
 * 貼到 LINE 的純文字，例如：
 *
 *   Hero BTN A♠K♦(25bb)
 *   公牌 K♣7♦2♠ 9♥ 2♦
 *   結果 +27.5bb
 *
 *   CO 開 2.2bb,我直接推…
 *
 * 沒資料的部分省略；整手都沒資料就回傳空字串。
 */
export function buildShareText(hand: Hand): string {
  const lines: string[] = []

  const head = ['Hero', hand.position, cardsText(hand.hero)].filter(Boolean).join(' ')
  const stack = hand.stackBb !== null ? `(${formatBb(hand.stackBb)}bb)` : ''
  if (head !== 'Hero' || stack) lines.push(head + stack)

  const board = [cardsText(hand.board.slice(0, 3)), cardsText(hand.board.slice(3, 4)), cardsText(hand.board.slice(4, 5))]
    .filter(Boolean)
    .join(' ')
  if (board) lines.push(`公牌 ${board}`)

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
