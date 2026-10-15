import { useLiveQuery } from 'dexie-react-hooks'
import type { Hand } from '../lib/hand'
import { db } from './db'

export const getHand = (id: string) => db.hands.get(id)

export const saveHand = (hand: Hand) => db.hands.put({ ...hand, updatedAt: Date.now() })

export const deleteHand = (id: string) => db.hands.delete(id)

/** 全部手牌，新的在前；載入中是 undefined */
export const useHands = () => useLiveQuery(() => db.hands.orderBy('createdAt').reverse().toArray(), [])
