import { describe, expect, it } from 'vitest'
import { foldsUntil, replay, suggestedSizes, undoLast, type Action } from './actions'
import { postflopOrder, seatsFor, type Position } from './positions'

const NINE = seatsFor(9)
const fold = (seat: Position, auto = false): Action => ({ seat, type: 'fold', to: null, ...(auto ? { auto } : {}) })
const check = (seat: Position): Action => ({ seat, type: 'check', to: null })
const call = (seat: Position): Action => ({ seat, type: 'call', to: null })
const bet = (seat: Position, to: number | null): Action => ({ seat, type: 'bet', to })
const raise = (seat: Position, to: number | null): Action => ({ seat, type: 'raise', to })
const allin = (seat: Position, to: number | null): Action => ({ seat, type: 'allin', to })

/** UTG～HJ 蓋牌，CO 開 2.2，BTN 3bet 7，盲注蓋牌，CO 跟 */
const PREFLOP_3BET: Action[] = [
  fold('UTG', true),
  fold('UTG+1', true),
  fold('UTG+2', true),
  fold('LJ', true),
  fold('HJ', true),
  raise('CO', 2.2),
  raise('BTN', 7),
  fold('SB'),
  fold('BB'),
  call('CO'),
]

describe('positions', () => {
  it('翻後 SB 先、BTN 最後', () => {
    expect(postflopOrder(NINE)).toEqual(['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN'])
    expect(postflopOrder(seatsFor(3))).toEqual(['SB', 'BB', 'BTN'])
  })
})

describe('replay', () => {
  it('一開始輪到 UTG，底池是盲注加前注', () => {
    const s = replay(NINE, [], 1)
    expect(s.toAct).toBe('UTG')
    expect(s.pot).toBe(2.5)
    expect(s.canCheck).toBe(false)
    expect(s.facing).toBe(1)
  })

  it('3bet 底池：跟注後進翻牌，底池正確，翻後 CO 先', () => {
    const s = replay(NINE, PREFLOP_3BET, 1)
    expect(s.street).toBe(1)
    expect(s.streets[1].potStart).toBe(16.5)
    expect(s.toAct).toBe('CO')
    expect(s.canCheck).toBe(true)
    expect(s.live).toEqual(['CO', 'BTN'])
    const labels = s.streets[0].actions.filter((a) => a.shown).map((a) => `${a.seat} ${a.label} ${a.amount ?? ''}`.trim())
    // 沒投過錢的人蓋牌不列出
    expect(labels).toEqual(['CO 開 2.2', 'BTN 3bet 7', 'CO 跟'])
  })

  it('翻牌：過牌、下注、跟注 → 轉牌；轉牌全下、蓋牌 → 結束', () => {
    const s = replay(NINE, [...PREFLOP_3BET, check('CO'), bet('BTN', 5), call('CO'), check('CO'), allin('BTN', 13), fold('CO')], 1)
    expect(s.streets.map((x) => x.potStart)).toEqual([2.5, 16.5, 26.5])
    expect(s.streets[1].actions.map((a) => a.label)).toEqual(['過牌', '下注', '跟'])
    expect(s.streets[2].actions.map((a) => a.label)).toEqual(['過牌', '全下', '蓋牌'])
    // 翻後蓋牌要列出
    expect(s.streets[2].actions[2].shown).toBe(true)
    expect(s.done).toBe(true)
    expect(s.showdown).toBe(false)
    expect(s.toAct).toBeNull()
  })

  it('大家蓋到大盲就結束', () => {
    const s = replay(NINE, NINE.slice(0, 8).map((p) => fold(p)), 1)
    expect(s.done).toBe(true)
    expect(s.showdown).toBe(false)
    expect(s.live).toEqual(['BB'])
  })

  it('跛入後大盲可以過牌', () => {
    const actions = [call('UTG'), ...NINE.slice(1, 8).map((p) => fold(p))]
    const before = replay(NINE, actions, 1)
    expect(before.toAct).toBe('BB')
    expect(before.canCheck).toBe(true)
    expect(before.streets[0].actions[0].label).toBe('跛入')

    const s = replay(NINE, [...actions, check('BB')], 1)
    expect(s.street).toBe(1)
    expect(s.streets[1].potStart).toBe(3.5)
    // 翻後 SB 已經蓋牌，BB 先
    expect(s.toAct).toBe('BB')
  })

  it('有人跛入後的第一次加注叫「加注到」，再來是 3bet、4bet', () => {
    const s = replay(NINE, [call('UTG'), raise('UTG+1', 4), raise('UTG+2', 12), raise('LJ', 30)], 0)
    expect(s.streets[0].actions.map((a) => a.label)).toEqual(['跛入', '加注到', '3bet', '4bet'])
  })

  it('加注後前面的人要再行動', () => {
    const s = replay(NINE, [raise('UTG', 2.2), ...NINE.slice(1, 6).map((p) => fold(p)), raise('BTN', 7)], 1)
    expect(s.needToAct).toEqual(['SB', 'BB', 'UTG'])
  })

  it('翻前全下被跟 → 結束並攤牌', () => {
    const s = replay(
      NINE,
      [...NINE.slice(0, 5).map((p) => fold(p)), allin('CO', 25), call('BTN'), fold('SB'), fold('BB')],
      1,
    )
    expect(s.done).toBe(true)
    expect(s.showdown).toBe(true)
    expect(s.pot).toBe(52.5)
  })

  it('全下金額比要跟的少 = 全下跟注，不會讓別人重新行動', () => {
    const toFlop = [...PREFLOP_3BET, check('CO'), bet('BTN', 10)]
    const s = replay(NINE, [...toFlop, allin('CO', 6)], 1)
    expect(s.done).toBe(true)
    expect(s.showdown).toBe(true)
  })

  it('不知道金額時底池變成 null，但流程照走', () => {
    const s = replay(NINE, [raise('UTG', null), ...NINE.slice(1, 8).map((p) => fold(p)), call('BB')], 1)
    expect(s.street).toBe(1)
    expect(s.streets[1].potStart).toBeNull()
  })

  it('不是輪到的人的行動會被略過', () => {
    const s = replay(NINE, [raise('CO', 2.2)], 1)
    expect(s.toAct).toBe('UTG')
    expect(s.streets[0].actions).toHaveLength(0)
  })

  it('3 人桌：BTN 先、翻後 SB 先', () => {
    const seats = seatsFor(3)
    expect(replay(seats, [], 1).toAct).toBe('BTN')
    const s = replay(seats, [raise('BTN', 2), fold('SB'), call('BB')], 1)
    expect(s.toAct).toBe('BB')
  })
})

describe('undoLast', () => {
  it('拿掉最後一個；自動蓋牌整組拿掉', () => {
    const actions = [fold('UTG', true), fold('UTG+1', true), raise('UTG+2', 2.2)]
    expect(undoLast(actions)).toEqual(actions.slice(0, 2))
    expect(undoLast(actions.slice(0, 2))).toEqual([])
    expect(undoLast([raise('UTG', 2), fold('UTG+1', true)])).toEqual([raise('UTG', 2)])
    expect(undoLast([])).toEqual([])
  })
})

describe('foldsUntil', () => {
  it('點 CO：前面的人自動蓋牌', () => {
    const folds = foldsUntil(replay(NINE, [], 1), 'CO')
    expect(folds.map((a) => a.seat)).toEqual(['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ'])
    expect(folds.every((a) => a.type === 'fold' && a.auto)).toBe(true)
    expect(foldsUntil(replay(NINE, [], 1), 'UTG')).toEqual([])
  })
})

describe('suggestedSizes', () => {
  it('開局、3bet、翻後', () => {
    expect(suggestedSizes(replay(NINE, [], 1)).map((s) => s.value)).toEqual([2, 2.2, 2.5, 3])
    expect(suggestedSizes(replay(NINE, [raise('UTG', 2.2)], 1)).map((s) => s.value)).toEqual([5.5, 6.6, 8.8])
    const flop = replay(NINE, PREFLOP_3BET, 1)
    expect(suggestedSizes(flop).map((s) => s.value)).toEqual([5.5, 8.3, 11, 16.5])
    expect(suggestedSizes(replay(NINE, [...PREFLOP_3BET, bet('CO', 5)], 1)).map((s) => s.value)).toEqual([12.5, 15, 20])
  })
})

describe('從後面的街開始記', () => {
  it('翻前沒記完，直接從翻牌開始：指定還在牌局的人，底池不知道', () => {
    const s = replay(NINE, [fold('UTG'), { type: 'street', street: 1, live: ['CO', 'BTN'] }], 1)
    expect(s.street).toBe(1)
    expect(s.live).toEqual(['CO', 'BTN'])
    expect(s.toAct).toBe('CO')
    expect(s.streets[1].potStart).toBeNull()
    expect(s.invalidAt).toBeNull()
  })

  it('不能跳回目前或之前的街，人數要兩個以上', () => {
    expect(replay(NINE, [{ type: 'street', street: 1, live: ['CO'] }], 1).invalidAt).toBe(0)
    expect(replay(NINE, [...PREFLOP_3BET, { type: 'street', street: 1, live: ['CO', 'BTN'] }], 1).invalidAt).toBe(10)
  })

  it('復原可以拿掉跳街', () => {
    const jump: Action = { type: 'street', street: 2, live: ['SB', 'BB'] }
    expect(undoLast([fold('UTG'), jump])).toEqual([fold('UTG')])
  })
})

describe('invalidAt / index', () => {
  it('改了前面的行動，後面接不上的會標出來', () => {
    // 原本 CO 跟，改成 CO 蓋牌 → 這手結束，後面的翻牌行動接不上
    const edited = [...PREFLOP_3BET.slice(0, 9), fold('CO'), check('CO')]
    const s = replay(NINE, edited, 1)
    expect(s.done).toBe(true)
    expect(s.invalidAt).toBe(10)
  })

  it('每個行動帶著它在列表裡的位置', () => {
    const s = replay(NINE, PREFLOP_3BET, 1)
    expect(s.streets[0].actions.find((a) => a.seat === 'BTN')?.index).toBe(6)
  })
})
