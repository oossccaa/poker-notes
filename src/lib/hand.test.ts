import { describe, expect, it } from 'vitest'
import { blankHand, handSlots, isEmptyHand, normalizeHand, withSlot } from './hand'

describe('hand', () => {
  it('空白的一手是空的，★ 不算內容', () => {
    expect(isEmptyHand(blankHand('a'))).toBe(true)
    expect(isEmptyHand({ ...blankHand('a'), starred: true })).toBe(true)
    expect(isEmptyHand({ ...blankHand('a'), note: '   ' })).toBe(true)
  })

  it('任何一欄有填就不是空的', () => {
    expect(isEmptyHand({ ...blankHand('a'), position: 'BTN' })).toBe(false)
    expect(isEmptyHand({ ...blankHand('a'), hero: ['As', null] })).toBe(false)
    expect(isEmptyHand({ ...blankHand('a'), board: [null, null, null, null, '2c'] })).toBe(false)
    expect(isEmptyHand({ ...blankHand('a'), resultBb: 0 })).toBe(false)
    expect(isEmptyHand({ ...blankHand('a'), stackBb: 30 })).toBe(false)
    expect(isEmptyHand({ ...blankHand('a'), note: 'x' })).toBe(false)
    expect(isEmptyHand({ ...blankHand('a'), actions: [{ seat: 'UTG', type: 'fold', to: null }] })).toBe(false)
  })

  it('人數、前注不算內容', () => {
    expect(isEmptyHand(blankHand('a', 0, { tableSize: 6, bbAnte: false }))).toBe(true)
  })

  it('舊版資料補上人數、前注、行動', () => {
    const old = { id: 'x', schemaVersion: 1, position: 'BTN', hero: ['As', 'Kd'], createdAt: 5 } as never
    const h = normalizeHand(old)
    expect(h.schemaVersion).toBe(2)
    expect(h.tableSize).toBe(9)
    expect(h.bbAnte).toBe(true)
    expect(h.actions).toEqual([])
    expect(h.position).toBe('BTN')
    expect(h.hero).toEqual(['As', 'Kd'])
    expect(h.createdAt).toBe(5)
  })

  it('withSlot 寫進正確的格子', () => {
    const h = blankHand('a')
    expect(withSlot(h, 1, 'Kd')).toEqual({ hero: [null, 'Kd'], board: [null, null, null, null, null] })
    expect(withSlot(h, 5, '9h')).toEqual({ hero: [null, null], board: [null, null, null, '9h', null] })
    expect(handSlots({ ...h, ...withSlot(h, 6, '2c') })).toHaveLength(7)
  })
})
