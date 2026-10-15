/** 全部位置，依翻前行動順序 */
export const POSITIONS = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const

export type Position = (typeof POSITIONS)[number]

export const TABLE_SIZES = [9, 8, 7, 6, 5, 4, 3] as const
export type TableSize = (typeof TABLE_SIZES)[number]

const SEATS: Record<TableSize, readonly Position[]> = {
  9: POSITIONS,
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  5: ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  3: ['BTN', 'SB', 'BB'],
}

/** 這個人數的座位，依翻前行動順序（最後是 SB、BB） */
export const seatsFor = (size: TableSize): readonly Position[] => SEATS[size]

/** 翻後行動順序：SB、BB 先，BTN 最後 */
export function postflopOrder(seats: readonly Position[]): Position[] {
  const sb = seats.indexOf('SB')
  return [...seats.slice(sb), ...seats.slice(0, sb)]
}
