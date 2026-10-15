/** 依翻前行動順序。不分桌型，8 人桌就不用 UTG+2 */
export const POSITIONS = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const

export type Position = (typeof POSITIONS)[number]
