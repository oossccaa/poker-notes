export type NumKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back'

const MAX_INT_DIGITS = 5

/** 數字鍵盤按一下之後的字串。小數最多一位 */
export function pressKey(current: string, key: NumKey): string {
  if (key === 'back') return current.slice(0, -1)
  if (key === '.') {
    if (current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }
  const [int, dec] = current.split('.')
  if (dec !== undefined) return dec.length >= 1 ? current : current + key
  if (int === '0') return key
  if (int.length >= MAX_INT_DIGITS) return current
  return current + key
}

export function parseValue(text: string): number | null {
  if (text === '') return null
  const value = Number.parseFloat(text)
  return Number.isFinite(value) ? value : null
}
