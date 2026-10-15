import { describe, expect, it } from 'vitest'
import type { Action } from './actions'
import type { Position } from './positions'
import { blankHand, type Hand } from './hand'
import { buildShareText, lineShareUrl } from './shareText'

const hand = (patch: Partial<Hand>): Hand => ({ ...blankHand('h1', 0), ...patch })

const fold = (seat: Position, auto = false): Action => ({ seat, type: 'fold', to: null, ...(auto ? { auto } : {}) })

/** CO 開、Hero(BTN) 3bet、CO 跟；翻牌 CO 過、Hero 下注、CO 跟；轉牌 CO 過、Hero 全下、CO 蓋 */
const ACTIONS: Action[] = [
  fold('UTG', true),
  fold('UTG+1', true),
  fold('UTG+2', true),
  fold('LJ', true),
  fold('HJ', true),
  { seat: 'CO', type: 'raise', to: 2.2 },
  { seat: 'BTN', type: 'raise', to: 7 },
  fold('SB'),
  fold('BB'),
  { seat: 'CO', type: 'call', to: null },
  { seat: 'CO', type: 'check', to: null },
  { seat: 'BTN', type: 'bet', to: 5 },
  { seat: 'CO', type: 'call', to: null },
  { seat: 'CO', type: 'check', to: null },
  { seat: 'BTN', type: 'allin', to: 13 },
  fold('CO'),
]

describe('buildShareText', () => {
  it('有記行動：每條街一行，含底池', () => {
    const text = buildShareText(
      hand({
        position: 'BTN',
        hero: ['As', 'Kd'],
        board: ['Kc', '7d', '2s', '9h', null],
        stackBb: 25,
        actions: ACTIONS,
        resultBb: 13.5,
        note: '轉牌推太大了嗎?',
      }),
    )
    expect(text).toBe(
      [
        'Hero BTN A♠K♦(25bb)',
        '翻前：CO 開 2.2bb，Hero 3bet 7bb，CO 跟',
        '翻牌 K♣7♦2♠（底池 16.5bb）：CO 過牌，Hero 下注 5bb，CO 跟',
        '轉牌 9♥（底池 26.5bb）：CO 過牌，Hero 全下 13bb，CO 蓋牌',
        '結果 +13.5bb',
        '',
        '轉牌推太大了嗎?',
      ].join('\n'),
    )
  })

  it('翻前全下：沒有行動的街只列公牌和底池', () => {
    const actions: Action[] = [
      fold('UTG', true),
      fold('UTG+1', true),
      fold('UTG+2', true),
      fold('LJ', true),
      fold('HJ', true),
      { seat: 'CO', type: 'allin', to: 20 },
      { seat: 'BTN', type: 'call', to: null },
      fold('SB'),
      fold('BB'),
    ]
    expect(buildShareText(hand({ position: 'BTN', hero: ['Qh', 'Qs'], board: ['Kc', '7d', '2s', '9h', '3c'], actions }))).toBe(
      ['Hero BTN Q♥Q♠', '翻前：CO 全下 20bb，Hero 跟', '翻牌 K♣7♦2♠', '轉牌 9♥', '河牌 3♣'].join('\n'),
    )
  })

  it('沒記行動：公牌合成一行', () => {
    const text = buildShareText(
      hand({
        position: 'BTN',
        hero: ['As', 'Kd'],
        board: ['Kc', '7d', '2s', '9h', '2d'],
        stackBb: 25,
        resultBb: 27.5,
        note: 'CO 開 2.2bb,我直接推',
      }),
    )
    expect(text).toBe(['Hero BTN A♠K♦(25bb)', '公牌 K♣7♦2♠ 9♥ 2♦', '結果 +27.5bb', '', 'CO 開 2.2bb,我直接推'].join('\n'))
  })

  it('沒資料就是空字串', () => {
    expect(buildShareText(hand({}))).toBe('')
    expect(buildShareText(hand({ starred: true }))).toBe('')
  })

  it('只有翻前', () => {
    expect(buildShareText(hand({ position: 'SB', hero: ['Qh', 'Qs'], resultBb: -12 }))).toBe('Hero SB Q♥Q♠\n結果 -12bb')
  })

  it('跳過的格子不顯示', () => {
    expect(buildShareText(hand({ hero: [null, 'Kd'], board: ['Kc', null, '2s', null, '3h'] }))).toBe(
      'Hero K♦\n公牌 K♣2♠ 3♥',
    )
  })

  it('只有備註就只有備註，備註前後空白會去掉', () => {
    expect(buildShareText(hand({ note: '  對面很鬆  \n' }))).toBe('對面很鬆')
  })
})

describe('lineShareUrl', () => {
  it('文字要編碼', () => {
    expect(lineShareUrl('A♠ 結果\n+1')).toBe('https://line.me/R/share?text=A%E2%99%A0%20%E7%B5%90%E6%9E%9C%0A%2B1')
  })
})
