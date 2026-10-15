import { describe, expect, it } from 'vitest'
import { dayKey, dayLabel, formatBb, formatResultBb, formatTime } from './format'

describe('format', () => {
  it('formatBb', () => {
    expect(formatBb(25)).toBe('25')
    expect(formatBb(27.5)).toBe('27.5')
    expect(formatBb(12.34)).toBe('12.3')
    expect(formatBb(0)).toBe('0')
    expect(formatBb(-3)).toBe('-3')
    expect(formatBb(-0.01)).toBe('0')
  })

  it('formatResultBb 帶正負號', () => {
    expect(formatResultBb(27.5)).toBe('+27.5bb')
    expect(formatResultBb(-3)).toBe('-3bb')
    expect(formatResultBb(0)).toBe('0bb')
  })

  it('formatTime', () => {
    expect(formatTime(new Date(2026, 9, 15, 9, 5).getTime())).toBe('09:05')
  })

  it('dayLabel', () => {
    const now = new Date(2026, 9, 15, 21, 0).getTime()
    expect(dayLabel(new Date(2026, 9, 15, 1, 0).getTime(), now)).toBe('今天')
    expect(dayLabel(new Date(2026, 9, 14, 23, 59).getTime(), now)).toBe('昨天')
    expect(dayLabel(new Date(2026, 9, 10, 20, 0).getTime(), now)).toBe('10/10 (六)')
    expect(dayLabel(new Date(2025, 11, 31, 20, 0).getTime(), now)).toBe('2025/12/31 (三)')
  })

  it('dayKey 用本地日期', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05')
  })
})
