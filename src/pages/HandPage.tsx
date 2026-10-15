import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { CardPicker } from '../components/CardPicker'
import { BackIcon, StarIcon, TrashIcon } from '../components/Icons'
import { NumPad } from '../components/NumPad'
import { CardSlot } from '../components/PlayingCard'
import { PositionPicker } from '../components/PositionPicker'
import { useToast } from '../components/Toast'
import { deleteHand, getHand, saveHand } from '../db/hands'
import { nextEmptySlot, slotLabel, type Card } from '../lib/cards'
import { copyText } from '../lib/clipboard'
import { formatBb, formatDate, formatResultBb, formatTime } from '../lib/format'
import { blankHand, handSlots, isEmptyHand, withSlot, type Hand } from '../lib/hand'
import { newId } from '../lib/id'
import type { Position } from '../lib/positions'
import { buildShareText, lineShareUrl } from '../lib/shareText'

type Sheet = { kind: 'cards'; slot: number } | { kind: 'stack' } | { kind: 'result' } | null

export default function HandPage({ id }: { id: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [hand, setHand] = useState<Hand | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [noteFocused, setNoteFocused] = useState(false)
  const [toast, showToast] = useToast()

  // 最新的資料放在 ref，連續輸入時不用等 React 重新渲染
  const handRef = useRef<Hand | null>(null)
  const savedRef = useRef(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  /**
   * 每次輸入（包括備註每打一個字）都直接寫進 IndexedDB，沒有「還沒存」的空窗。
   * 整手沒內容就不存；已經存過的就刪掉。
   */
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
      saveHand(next).catch(() => showToast('存檔失敗，請再試一次'))
    },
    [showToast],
  )

  // 載入：資料庫沒有就是新的一手（第一次有輸入才會存）
  useEffect(() => {
    let cancelled = false
    void getHand(id).then((found) => {
      if (cancelled) return
      savedRef.current = Boolean(found)
      const h = found ?? blankHand(id)
      handRef.current = h
      setHand(h)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  // 備註自動長高
  useLayoutEffect(() => {
    const el = noteRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [hand?.note])

  // 選牌時讓目前的格子保持在鍵盤上方
  const activeSlot = sheet?.kind === 'cards' ? sheet.slot : null
  useEffect(() => {
    if (activeSlot === null) return
    document.querySelector(`[data-slot="${activeSlot}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeSlot])

  if (!hand) return <div className="min-h-dvh" />

  const slots = handSlots(hand)
  const shareText = buildShareText(hand)

  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/', { replace: true })
  }

  function nextHand() {
    navigate(`/hand/${newId()}`, { replace: true })
  }

  function remove() {
    if (!window.confirm('確定刪除這一手？')) return
    handRef.current = null
    if (savedRef.current) void deleteHand(id)
    savedRef.current = false
    goBack()
  }

  function choosePosition(position: Position | null) {
    update({ position })
    // 選好位置、還沒填手牌，就直接開始選牌
    if (position && hand!.hero.every((c) => c === null) && sheet === null) setSheet({ kind: 'cards', slot: 0 })
  }

  function openSlot(slot: number) {
    noteRef.current?.blur()
    setSheet({ kind: 'cards', slot })
  }

  function pickCard(card: Card) {
    if (sheet?.kind !== 'cards' || !handRef.current) return
    update(withSlot(handRef.current, sheet.slot, card))
    const next = nextEmptySlot(handSlots(handRef.current), sheet.slot)
    setSheet(next === null ? null : { kind: 'cards', slot: next })
  }

  function clearCard() {
    if (sheet?.kind !== 'cards' || !handRef.current) return
    update(withSlot(handRef.current, sheet.slot, null))
  }

  function skipCard() {
    if (sheet?.kind !== 'cards') return
    const next = nextEmptySlot(slots, sheet.slot)
    setSheet(next === null ? null : { kind: 'cards', slot: next })
  }

  async function copy() {
    if (!shareText) return showToast('這手還沒有內容')
    showToast((await copyText(shareText)) ? '已複製，可以貼到 LINE 了' : '複製失敗')
  }

  const slot = (i: number) => (
    <div key={i} data-slot={i} className="scroll-mb-[280px]">
      <CardSlot card={slots[i]} active={activeSlot === i} label={slotLabel(i)} onClick={() => openSlot(i)} />
    </div>
  )

  const resultTone = hand.resultBb === null || hand.resultBb === 0 ? '' : hand.resultBb > 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="mx-auto min-h-dvh max-w-[480px]">
      <header className="sticky top-[env(safe-area-inset-top)] z-10 flex h-14 items-center bg-ink/95 px-1 backdrop-blur">
        <button type="button" onClick={goBack} aria-label="返回列表" className="flex size-12 items-center justify-center text-zinc-300">
          <BackIcon className="size-6" />
        </button>
        <span className="flex-1 text-center text-[15px] text-zinc-400 tabular-nums">
          {formatDate(hand.createdAt)} {formatTime(hand.createdAt)}
        </span>
        <button
          type="button"
          onClick={() => update({ starred: !hand.starred })}
          aria-label="要討論"
          aria-pressed={hand.starred}
          className={`flex size-12 items-center justify-center ${hand.starred ? 'text-amber-400' : 'text-zinc-500'}`}
        >
          <StarIcon filled={hand.starred} className="size-6" />
        </button>
        <button type="button" onClick={remove} aria-label="刪除這手" className="flex size-12 items-center justify-center text-zinc-500">
          <TrashIcon className="size-6" />
        </button>
      </header>

      <main
        className={`space-y-5 px-4 pt-2 ${
          activeSlot !== null ? 'pb-[300px]' : 'pb-[calc(96px+env(safe-area-inset-bottom))]'
        }`}
      >
        <section>
          <h2 className="mb-2 text-sm text-zinc-400">位置</h2>
          <PositionPicker value={hand.position} onChange={choosePosition} />
        </section>

        <section>
          <h2 className="mb-2 text-sm text-zinc-400">手牌</h2>
          <div className="flex gap-1.5">{[0, 1].map(slot)}</div>
        </section>

        <section>
          <h2 className="mb-2 text-sm text-zinc-400">公牌</h2>
          <div className="flex gap-3">
            <div className="flex gap-1.5">{[2, 3, 4].map(slot)}</div>
            {slot(5)}
            {slot(6)}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <ValueTile label="籌碼" onClick={() => setSheet({ kind: 'stack' })}>
            {hand.stackBb !== null && `${formatBb(hand.stackBb)}bb`}
          </ValueTile>
          <ValueTile label="結果" tone={resultTone} onClick={() => setSheet({ kind: 'result' })}>
            {hand.resultBb !== null && formatResultBb(hand.resultBb)}
          </ValueTile>
        </section>

        <section>
          <h2 className="mb-2 text-sm text-zinc-400">備註</h2>
          <textarea
            ref={noteRef}
            value={hand.note}
            rows={3}
            placeholder="過程、對手、想問朋友的問題…"
            onChange={(e) => update({ note: e.target.value })}
            onFocus={() => {
              setNoteFocused(true)
              setSheet(null)
            }}
            onBlur={() => setNoteFocused(false)}
            className="block min-h-24 w-full resize-none overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-base leading-relaxed placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </section>
      </main>

      {!noteFocused && (
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-[480px] grid-cols-3 gap-2 border-t border-zinc-800 bg-ink/95 px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur">
          <button type="button" onClick={nextHand} className="h-12 rounded-xl bg-zinc-800 text-base font-semibold active:bg-zinc-700">
            ＋ 下一手
          </button>
          <button type="button" onClick={copy} className="h-12 rounded-xl bg-zinc-800 text-base font-semibold active:bg-zinc-700">
            複製
          </button>
          {shareText ? (
            <a
              href={lineShareUrl(shareText)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center rounded-xl bg-line text-base font-semibold text-white active:brightness-90"
            >
              傳到 LINE
            </a>
          ) : (
            <button
              type="button"
              onClick={() => showToast('這手還沒有內容')}
              className="h-12 rounded-xl bg-line/40 text-base font-semibold text-white/70"
            >
              傳到 LINE
            </button>
          )}
        </nav>
      )}

      {sheet?.kind === 'cards' && (
        <CardPicker
          slot={sheet.slot}
          slots={slots}
          onPick={pickCard}
          onClear={clearCard}
          onSkip={skipCard}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'stack' && (
        <NumPad
          title="籌碼"
          mode="stack"
          initial={hand.stackBb}
          onConfirm={(stackBb) => {
            update({ stackBb })
            setSheet(null)
          }}
          onCancel={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'result' && (
        <NumPad
          title="結果"
          mode="result"
          initial={hand.resultBb}
          onConfirm={(resultBb) => {
            update({ resultBb })
            setSheet(null)
          }}
          onCancel={() => setSheet(null)}
        />
      )}
      {toast}
    </div>
  )
}

function ValueTile({
  label,
  tone = '',
  onClick,
  children,
}: {
  label: string
  tone?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-16 flex-col items-start justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 active:bg-zinc-800"
    >
      <span className="text-xs text-zinc-400">{label}</span>
      {children ? (
        <span className={`text-xl font-bold tabular-nums ${tone}`}>{children}</span>
      ) : (
        <span className="text-[15px] text-zinc-600">點這裡輸入</span>
      )}
    </button>
  )
}
