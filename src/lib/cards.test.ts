import { describe, expect, it } from 'vitest'
import {
  cardText,
  hasDuplicates,
  isCard,
  nextEmptySlot,
  rankAvailable,
  slotLabel,
  suitAvailable,
  type Card,
} from './cards'

describe('cards', () => {
  it('isCard 只接受標準記法', () => {
    expect(isCard('As')).toBe(true)
    expect(isCard('Td')).toBe(true)
    expect(isCard('10d')).toBe(false)
    expect(isCard('Ax')).toBe(false)
    expect(isCard(null)).toBe(false)
  })

  it('cardText 轉成花色符號', () => {
    expect(cardText('As')).toBe('A♠')
    expect(cardText('Th')).toBe('T♥')
    expect(cardText('2d')).toBe('2♦')
    expect(cardText('9c')).toBe('9♣')
  })

  it('hasDuplicates 忽略空格', () => {
    expect(hasDuplicates(['As', null, 'Kd', null])).toBe(false)
    expect(hasDuplicates(['As', 'Kd', 'As'])).toBe(true)
  })

  it('slotLabel', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(slotLabel)).toEqual([
      '手牌 1/2',
      '手牌 2/2',
      '翻牌 1/3',
      '翻牌 2/3',
      '翻牌 3/3',
      '轉牌',
      '河牌',
    ])
  })

  it('用過的牌不能再選', () => {
    const used = new Set<Card>(['As', 'Ah', 'Ad'])
    // A 還剩梅花
    expect(rankAvailable('A', used, null)).toBe(true)
    expect(rankAvailable('A', used, 's')).toBe(false)
    expect(rankAvailable('A', used, 'c')).toBe(true)
    expect(suitAvailable('s', used, 'A')).toBe(false)
    expect(suitAvailable('c', used, 'A')).toBe(true)

    used.add('Ac')
    expect(rankAvailable('A', used, null)).toBe(false)
  })

  it('花色 13 張都用完就不能選', () => {
    const used = new Set<Card>(['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'].map((r) => `${r}s` as Card))
    expect(suitAvailable('s', used, null)).toBe(false)
    expect(suitAvailable('h', used, null)).toBe(true)
  })

  it('nextEmptySlot 跳過已填的格子', () => {
    expect(nextEmptySlot(['As', null, null, null, null, null, null], 0)).toBe(1)
    expect(nextEmptySlot(['As', 'Kd', 'Qc', null, null, null, null], 0)).toBe(3)
    expect(nextEmptySlot(['As', 'Kd', 'Qc', 'Jh', 'Ts', '9s', '8s'], 2)).toBeNull()
    expect(nextEmptySlot([null, null, null, null, null, null, null], 6)).toBeNull()
    // 只填到 until 為止
    expect(nextEmptySlot(['As', null, null, null, null, null, null], 1, 1)).toBeNull()
    expect(nextEmptySlot(['As', 'Kd', 'Qc', null, null, null, null], 2, 4)).toBe(3)
  })
})
