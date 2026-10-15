import Dexie, { type EntityTable } from 'dexie'
import type { Hand } from '../lib/hand'

export const db = new Dexie('poker-notes') as Dexie & {
  hands: EntityTable<Hand, 'id'>
}

// 已發佈的版本不要改；要改索引就加 version(2) 並寫 upgrade()
db.version(1).stores({
  hands: 'id, createdAt',
})
