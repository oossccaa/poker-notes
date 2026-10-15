import { useCallback, useEffect, useRef, useState } from 'react'
import { blankHand, isEmptyHand, type Hand } from '../lib/hand'
import { deleteHand, getHand, getLatestHand, saveHand } from './hands'

/**
 * 編輯一手牌：每次 `update` 都直接寫進 IndexedDB，沒有「還沒存」的空窗。
 * 資料庫沒有這手就是新的一手（沿用上一手的人數和前注），第一次有內容才存；
 * 內容清空了就刪掉。
 */
export function useHandEditor(id: string, onSaveError: () => void) {
  const [hand, setHand] = useState<Hand | null>(null)
  // 最新的資料放在 ref，連續輸入時不用等 React 重新渲染
  const handRef = useRef<Hand | null>(null)
  const savedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const found = await getHand(id)
      const latest = found ? undefined : await getLatestHand()
      if (cancelled) return
      savedRef.current = Boolean(found)
      const h = found ?? blankHand(id, Date.now(), latest ?? undefined)
      handRef.current = h
      setHand(h)
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const update = useCallback(
    (patch: Partial<Hand>) => {
      const prev = handRef.current
      if (!prev) return
      const next = { ...prev, ...patch }
      handRef.current = next
      setHand(next)
      if (isEmptyHand(next)) {
        if (savedRef.current) {
          savedRef.current = false
          void deleteHand(next.id)
        }
        return
      }
      savedRef.current = true
      saveHand(next).catch(onSaveError)
    },
    [onSaveError],
  )

  const remove = useCallback(() => {
    handRef.current = null
    if (savedRef.current) void deleteHand(id)
    savedRef.current = false
  }, [id])

  return { hand, handRef, update, remove }
}
