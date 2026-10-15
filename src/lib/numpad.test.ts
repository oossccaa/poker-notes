import { describe, expect, it } from 'vitest'
import { parseValue, pressKey, type NumKey } from './numpad'

const type = (keys: NumKey[], start = '') => keys.reduce(pressKey, start)

describe('numpad', () => {
  it('一般輸入', () => {
    expect(type(['2', '5'])).toBe('25')
    expect(type(['2', '7', '.', '5'])).toBe('27.5')
  })

  it('小數最多一位、只能一個小數點', () => {
    expect(type(['1', '.', '2', '3'])).toBe('1.2')
    expect(type(['1', '.', '.', '2'])).toBe('1.2')
  })

  it('開頭的 0 會被取代，直接按小數點補 0', () => {
    expect(type(['0', '5'])).toBe('5')
    expect(type(['.', '5'])).toBe('0.5')
  })

  it('整數最多 5 位', () => {
    expect(type(['1', '2', '3', '4', '5', '6'])).toBe('12345')
  })

  it('倒退', () => {
    expect(type(['1', '2', 'back'])).toBe('1')
    expect(type(['back'])).toBe('')
  })

  it('parseValue', () => {
    expect(parseValue('')).toBeNull()
    expect(parseValue('0.')).toBe(0)
    expect(parseValue('27.5')).toBe(27.5)
  })
})
