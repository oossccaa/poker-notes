import { useLiveQuery } from 'dexie-react-hooks'
import { normalizeHand, type Hand } from '../lib/hand'
import { db } from './db'

export const getHand = async (id: string) => {
  const stored = await db.hands.get(id)
  return stored ? normalizeHand(stored) : undefined
}

/** 最近一手，新的一手沿用它的人數和前注 */
export const getLatestHand = async () => {
  const stored = await db.hands.orderBy('createdAt').last()
  return stored ? normalizeHand(stored) : undefined
}

export const saveHand = (hand: Hand) => db.hands.put({ ...hand, updatedAt: Date.now() })

export const deleteHand = (id: string) => db.hands.delete(id)

/** 全部手牌，新的在前；載入中是 undefined */
export const useHands = () =>
  useLiveQuery(async () => (await db.hands.orderBy('createdAt').reverse().toArray()).map(normalizeHand), [])
