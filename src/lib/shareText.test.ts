import { describe, expect, it } from 'vitest'
import { blankHand, type Hand } from './hand'
import { buildShareText, lineShareUrl } from './shareText'

const hand = (patch: Partial<Hand>): Hand => ({ ...blankHand('h1', 0), ...patch })

describe('buildShareText', () => {
  it('完整的一手', () => {
    const text = buildShareText(
      hand({
        position: 'BTN',
        hero: ['As', 'Kd'],
        board: ['Kc', '7d', '2s', '9h', '2d'],
        stackBb: 25,
        resultBb: 27.5,
        note: 'CO 開 2.2bb,我直接推,CO 想很久跟了 QQ\n這裡推是不是太激進?',
      }),
    )
    expect(text).toBe(
      [
        'Hero BTN A♠K♦(25bb)',
        '公牌 K♣7♦2♠ 9♥ 2♦',
        '結果 +27.5bb',
        '',
        'CO 開 2.2bb,我直接推,CO 想很久跟了 QQ',
        '這裡推是不是太激進?',
      ].join('\n'),
    )
  })

  it('沒資料就是空字串', () => {
    expect(buildShareText(hand({}))).toBe('')
    expect(buildShareText(hand({ starred: true }))).toBe('')
  })

  it('只有翻前', () => {
    expect(buildShareText(hand({ position: 'SB', hero: ['Qh', 'Qs'], resultBb: -12 }))).toBe(
      'Hero SB Q♥Q♠\n結果 -12bb',
    )
  })

  it('跳過的格子不顯示', () => {
    expect(buildShareText(hand({ hero: [null, 'Kd'], board: ['Kc', null, '2s', null, '3h'] }))).toBe(
      'Hero K♦\n公牌 K♣2♠ 3♥',
    )
  })

  it('只有籌碼', () => {
    expect(buildShareText(hand({ stackBb: 12.5 }))).toBe('Hero(12.5bb)')
  })

  it('只有備註就只有備註，備註前後空白會去掉', () => {
    expect(buildShareText(hand({ note: '  對面很鬆  \n' }))).toBe('對面很鬆')
  })
})

describe('lineShareUrl', () => {
  it('文字要編碼', () => {
    expect(lineShareUrl('A♠ 結果\n+1')).toBe(
      'https://line.me/R/share?text=A%E2%99%A0%20%E7%B5%90%E6%9E%9C%0A%2B1',
    )
  })
})
