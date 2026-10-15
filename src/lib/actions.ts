import { postflopOrder, type Position } from './positions'

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin'

export type Street = 0 | 1 | 2 | 3
export type PostflopStreet = 1 | 2 | 3
export const STREET_NAMES = ['翻前', '翻牌', '轉牌', '河牌'] as const

/**
 * 一個人的行動。
 * `to`：下注 / 加注 / 全下「加到多少」（這條街的總額，單位 bb）；不知道就是 null。
 * 蓋牌、過牌、跟注不用填。`auto` 是「點後面的位置」時自動補上的蓋牌。
 */
export interface SeatAction {
  seat: Position
  type: ActionType
  to: number | null
  auto?: boolean
}

/** 前面的街沒記完，直接從這條街開始記；`live` 是還在牌局裡的人 */
export interface StreetJump {
  type: 'street'
  street: PostflopStreet
  live: Position[]
}

/** 存進資料庫的行動列表，依時間順序 */
export type Action = SeatAction | StreetJump

export const isSeatAction = (a: Action): a is SeatAction => a.type !== 'street'

/** 重播後加上說明的行動 */
export interface PlayedAction extends SeatAction {
  /** 在 hand.actions 裡的位置，編輯用 */
  index: number
  street: Street
  /** 開、3bet、跛入、跟、過牌、蓋牌、下注、加注到、全下 */
  label: string
  /** 顯示用金額；跟注、過牌、蓋牌是 null */
  amount: number | null
  /** 要不要列出來：翻前沒投過錢的人蓋牌就省略（大部分人都是直接蓋） */
  shown: boolean
}

export interface StreetLog {
  street: Street
  /** 這條街開始時的底池；有不知道的金額（或前面的街沒記）就是 null */
  potStart: number | null
  actions: PlayedAction[]
}

export interface Replay {
  streets: StreetLog[]
  /** 目前這條街（結束時是最後一條） */
  street: Street
  /** 這條街的行動順序（全部座位） */
  order: Position[]
  live: Position[]
  allIn: Position[]
  /** 依順序還要行動的人，第一個就是輪到的人 */
  needToAct: Position[]
  toAct: Position | null
  /** 輪到的人可以過牌（沒有人下注，或大盲的 option） */
  canCheck: boolean
  /** 這條街目前要跟到多少；不知道是 null */
  facing: number | null
  /** 這條街已經有幾次下注 / 加注（翻前大盲算 1） */
  betLevel: number
  /** 目前底池（含這條街已經投入的） */
  pot: number | null
  /** 每個人這條街投入多少 */
  contributed: Partial<Record<Position, number | null>>
  done: boolean
  /** 結束時還有兩個人以上（攤牌，或全下後發完公牌） */
  showdown: boolean
  /** 第一個接不上的行動（改了前面的行動之後可能發生）；都接得上是 null */
  invalidAt: number | null
}

const add = (a: number | null, b: number | null) => (a === null || b === null ? null : a + b)

/**
 * 依序重播這手的行動，算出每條街、底池、輪到誰。
 * `seats` 是翻前行動順序；`ante` 是死錢（大盲前注 1bb）。
 * 接不上的行動（不是輪到的人、已經結束）會略過，並記在 `invalidAt`。
 */
export function replay(seats: readonly Position[], actions: readonly Action[], ante: number): Replay {
  let street: Street = 0
  let order: Position[] = [...seats]
  const live = new Set<Position>(seats)
  const allIn = new Set<Position>()
  const voluntary = new Set<Position>()
  let contributed = new Map<Position, number | null>([
    ['SB', 0.5],
    ['BB', 1],
  ])
  let matched = new Map<Position, number>([['BB', 1]])
  let betLevel = 1
  let facing: number | null = 1
  let limpers = 0
  let pot: number | null = 1.5 + ante
  let needToAct: Position[] = [...order]
  const streets: StreetLog[] = [{ street: 0, potStart: pot, actions: [] }]
  let done = false
  let showdown = false
  let invalidAt: number | null = null

  /** 加注後，除了自己以外還沒蓋牌、還沒全下的人都要再行動 */
  const reopen = (actor: Position) => {
    const i = order.indexOf(actor)
    needToAct = [...order.slice(i + 1), ...order.slice(0, i)].filter((p) => live.has(p) && !allIn.has(p))
  }

  const put = (seat: Position, to: number | null) => {
    const before = contributed.get(seat) ?? 0
    pot = to === null || before === null ? null : add(pot, to - before)
    contributed.set(seat, to)
  }

  const startStreet = (next: PostflopStreet, potStart: number | null) => {
    street = next
    order = postflopOrder(seats)
    contributed = new Map()
    matched = new Map()
    betLevel = 0
    facing = 0
    pot = potStart
    needToAct = order.filter((p) => live.has(p) && !allIn.has(p))
    streets.push({ street, potStart, actions: [] })
  }

  actions.forEach((action, index) => {
    if (invalidAt !== null) return

    if (!isSeatAction(action)) {
      const players = action.live.filter((p) => seats.includes(p))
      if (done || action.street <= street || players.length < 2) {
        invalidAt = index
        return
      }
      live.clear()
      players.forEach((p) => live.add(p))
      allIn.clear()
      startStreet(action.street, null)
      return
    }

    if (done || action.seat !== needToAct[0]) {
      invalidAt = index
      return
    }

    const { seat } = action
    let label = ''
    let amount: number | null = null
    let shown = true
    let raised = false

    switch (action.type) {
      case 'fold':
        live.delete(seat)
        label = '蓋牌'
        shown = street > 0 || voluntary.has(seat)
        break
      case 'check':
        label = '過牌'
        break
      case 'call':
        label = street === 0 && betLevel === 1 && seat !== 'BB' ? '跛入' : '跟'
        if (label === '跛入') limpers++
        put(seat, facing)
        matched.set(seat, betLevel)
        voluntary.add(seat)
        break
      case 'bet':
      case 'raise': {
        betLevel++
        facing = action.to
        put(seat, action.to)
        matched.set(seat, betLevel)
        voluntary.add(seat)
        amount = action.to
        raised = true
        if (street === 0) label = betLevel === 2 ? (limpers > 0 ? '加注到' : '開') : `${betLevel}bet`
        else label = betLevel === 1 ? '下注' : '加注到'
        break
      }
      case 'allin': {
        allIn.add(seat)
        voluntary.add(seat)
        label = '全下'
        amount = action.to
        put(seat, action.to)
        // 金額不到要跟的數字就是「全下跟注」，不會讓別人重新行動
        const isCall = action.to !== null && facing !== null && action.to <= facing
        if (!isCall) {
          betLevel++
          facing = action.to
          raised = true
        }
        matched.set(seat, betLevel)
        break
      }
    }

    streets[streets.length - 1].actions.push({ ...action, index, street, label, amount, shown })
    if (raised) reopen(seat)
    else needToAct = needToAct.slice(1)

    if (live.size === 1) {
      done = true
      return
    }
    if (needToAct.length > 0) return

    // 這條街結束
    const canBet = [...live].filter((p) => !allIn.has(p))
    if (street === 3 || canBet.length <= 1) {
      done = true
      showdown = true
      return
    }
    startStreet((street + 1) as PostflopStreet, pot)
  })

  const toAct = done ? null : (needToAct[0] ?? null)
  return {
    streets,
    street,
    order,
    live: order.filter((p) => live.has(p)),
    allIn: order.filter((p) => allIn.has(p)),
    needToAct: done ? [] : needToAct,
    toAct,
    canCheck: toAct !== null && (matched.get(toAct) ?? 0) === betLevel,
    facing,
    betLevel,
    pot,
    contributed: Object.fromEntries(contributed),
    done,
    showdown,
    invalidAt,
  }
}

/** 復原：拿掉最後一個行動；如果是自動補的蓋牌，就把連在一起的自動蓋牌一起拿掉 */
export function undoLast(actions: readonly Action[]): Action[] {
  if (actions.length === 0) return []
  const isAuto = (a: Action) => isSeatAction(a) && a.auto === true
  let end = actions.length - 1
  if (isAuto(actions[end])) while (end > 0 && isAuto(actions[end - 1])) end--
  return actions.slice(0, end)
}

/** 點後面的位置：中間還要行動的人都補一個自動蓋牌 */
export function foldsUntil(state: Replay, seat: Position): SeatAction[] {
  const i = state.needToAct.indexOf(seat)
  if (i <= 0) return []
  return state.needToAct.slice(0, i).map((p) => ({ seat: p, type: 'fold', to: null, auto: true }))
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** 下注 / 加注的常用尺寸；label 是小字說明（開局尺寸不用） */
export function suggestedSizes(state: Replay): { label: string; value: number }[] {
  const { street, betLevel, facing, pot } = state
  if (street === 0) {
    if (betLevel === 1) {
      const limped = state.streets[0].actions.some((a) => a.label === '跛入')
      const sizes = limped ? [3, 4, 5, 6] : [2, 2.2, 2.5, 3]
      return sizes.map((v) => ({ label: '', value: v }))
    }
    if (facing === null) return []
    return [2.5, 3, 4].map((x) => ({ label: `×${x}`, value: round1(facing * x) }))
  }
  if (betLevel === 0) {
    if (pot === null) return []
    return [
      { label: '⅓ 池', value: round1(pot / 3) },
      { label: '½ 池', value: round1(pot / 2) },
      { label: '⅔ 池', value: round1((pot * 2) / 3) },
      { label: '滿池', value: round1(pot) },
    ]
  }
  if (facing === null) return []
  return [2.5, 3, 4].map((x) => ({ label: `×${x}`, value: round1(facing * x) }))
}
