import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ActionPad } from '../components/ActionPad'
import { CardPicker } from '../components/CardPicker'
import { BackIcon, StarIcon, TrashIcon } from '../components/Icons'
import { NumPad } from '../components/NumPad'
import { CardSlot } from '../components/PlayingCard'
import { PositionPicker } from '../components/PositionPicker'
import { useToast } from '../components/Toast'
import { useHandEditor } from '../db/useHandEditor'
import { STREET_NAMES, undoLast, type Action, type Replay } from '../lib/actions'
import { nextEmptySlot, slotLabel, type Card } from '../lib/cards'
import { copyText } from '../lib/clipboard'
import { nextFlowStep } from '../lib/flow'
import { formatBb, formatDate, formatResultBb, formatTime } from '../lib/format'
import { handSlots, replayHand, withSlot } from '../lib/hand'
import { newId } from '../lib/id'
import { seatsFor, TABLE_SIZES, type Position, type TableSize } from '../lib/positions'
import { buildShareText, describeAction, lineShareUrl } from '../lib/shareText'

type Sheet =
  | { kind: 'cards'; slot: number; until: number; flow: boolean }
  | { kind: 'actions' }
  | { kind: 'stack' }
  | { kind: 'result' }
  | null

export default function HandPage({ id }: { id: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [noteFocused, setNoteFocused] = useState(false)
  const [toast, showToast] = useToast()
  const onSaveError = useCallback(() => showToast('存檔失敗，請再試一次'), [showToast])
  const { hand, handRef, update, remove } = useHandEditor(id, onSaveError)

  const noteRef = useRef<HTMLTextAreaElement>(null)
  const actionsRef = useRef<HTMLElement>(null)
  /** 引導式記錄時問過哪些步驟（跳過的不再問） */
  const promptedRef = useRef(new Set<string>())

  // 備註自動長高
  useLayoutEffect(() => {
    const el = noteRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [hand?.note])

  // 選牌時讓目前的格子保持在鍵盤上方；記行動時讓行動紀錄看得到
  const activeSlot = sheet?.kind === 'cards' ? sheet.slot : null
  useEffect(() => {
    if (activeSlot === null) return
    document.querySelector(`[data-slot="${activeSlot}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeSlot])
  const actionsOpen = sheet?.kind === 'actions'
  useEffect(() => {
    if (actionsOpen) actionsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [actionsOpen])

  if (!hand) return <div className="min-h-dvh" />

  const slots = handSlots(hand)
  const state = replayHand(hand)
  const seats = seatsFor(hand.tableSize)
  const shareText = buildShareText(hand)

  /** 引導式記錄的下一步：手牌 → 翻前行動 → 翻牌 → 翻牌行動 → … → 結果 */
  function advanceFlow() {
    const h = handRef.current
    if (!h) return setSheet(null)
    const { step, mark } = nextFlowStep(h, promptedRef.current)
    if (mark) promptedRef.current.add(mark)
    if (!step) setSheet(null)
    else if (step.kind === 'cards') setSheet({ kind: 'cards', slot: step.from, until: step.until, flow: true })
    else setSheet({ kind: step.kind })
  }

  function startFlow(alreadyAsked: string[]) {
    promptedRef.current = new Set(alreadyAsked)
    advanceFlow()
  }

  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/', { replace: true })
  }

  function nextHand() {
    navigate(`/hand/${newId()}`, { replace: true })
  }

  function removeHand() {
    if (!window.confirm('確定刪除這一手？')) return
    remove()
    goBack()
  }

  function choosePosition(position: Position | null) {
    update({ position })
    // 選好位置、還沒填手牌，就開始引導：手牌 → 行動 → 公牌 → …
    if (position && hand!.hero.every((c) => c === null) && sheet === null) startFlow([])
  }

  function changeTableSize(tableSize: TableSize) {
    if (tableSize === hand!.tableSize) return
    if (hand!.actions.length > 0 && !window.confirm('改人數會清掉已經記的行動，確定嗎？')) return
    const position = hand!.position && seatsFor(tableSize).includes(hand!.position) ? hand!.position : null
    update({ tableSize, position, actions: [] })
  }

  function openSlot(slot: number) {
    noteRef.current?.blur()
    setSheet({ kind: 'cards', slot, until: 6, flow: false })
  }

  /** 這格處理完（選好或跳過），往下一格；範圍內都填好了就交給引導或收起 */
  function afterSlot(slot: number) {
    if (sheet?.kind !== 'cards') return
    const next = nextEmptySlot(handSlots(handRef.current!), slot, sheet.until)
    if (next !== null) setSheet({ ...sheet, slot: next })
    else if (sheet.flow) advanceFlow()
    else setSheet(null)
  }

  function pickCard(card: Card) {
    if (sheet?.kind !== 'cards' || !handRef.current) return
    update(withSlot(handRef.current, sheet.slot, card))
    afterSlot(sheet.slot)
  }

  function clearCard() {
    if (sheet?.kind !== 'cards' || !handRef.current) return
    update(withSlot(handRef.current, sheet.slot, null))
  }

  function openActions() {
    noteRef.current?.blur()
    // 已經結束就直接打開（可以復原）；不然從目前這條街接著引導
    if (state.done) setSheet({ kind: 'actions' })
    else startFlow(['hero'])
  }

  function act(added: Action[]) {
    const h = handRef.current
    if (!h || added.length === 0) return
    const before = replayHand(h)
    update({ actions: [...h.actions, ...added] })
    const after = replayHand(handRef.current!)
    // 這條街結束了就往下：公牌 → 下一條街的行動 → … → 結果
    if (after.done || after.street !== before.street) advanceFlow()
  }

  function undo() {
    const h = handRef.current
    if (h) update({ actions: undoLast(h.actions) })
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

  const name = (seat: Position | null) => (seat === null ? '' : seat === hand.position ? 'Hero' : seat)
  const actionsLabel =
    hand.actions.length === 0 ? '記錄行動' : state.done ? '修改行動' : `繼續記錄（輪到 ${name(state.toAct)}）`

  const resultTone = hand.resultBb === null || hand.resultBb === 0 ? '' : hand.resultBb > 0 ? 'text-emerald-400' : 'text-red-400'

  const bottomPad =
    sheet?.kind === 'cards' ? 'pb-[300px]' : actionsOpen ? 'pb-[420px]' : 'pb-[calc(96px+env(safe-area-inset-bottom))]'

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
        <button type="button" onClick={removeHand} aria-label="刪除這手" className="flex size-12 items-center justify-center text-zinc-500">
          <TrashIcon className="size-6" />
        </button>
      </header>

      <main className={`space-y-5 px-4 pt-2 ${bottomPad}`}>
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm text-zinc-400">位置</h2>
            <div className="flex items-center gap-2">
              <label className="relative">
                <span className="sr-only">人數</span>
                <select
                  value={hand.tableSize}
                  onChange={(e) => changeTableSize(Number(e.target.value) as TableSize)}
                  className="h-10 appearance-none rounded-lg bg-zinc-800 pr-7 pl-3 text-base text-zinc-100"
                >
                  {TABLE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} 人桌
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-zinc-400">▼</span>
              </label>
              <button
                type="button"
                aria-pressed={hand.bbAnte}
                onClick={() => update({ bbAnte: !hand.bbAnte })}
                className={`h-10 rounded-lg px-3 text-base ${hand.bbAnte ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-600 line-through'}`}
              >
                BBA
              </button>
            </div>
          </div>
          <PositionPicker positions={seats} value={hand.position} onChange={choosePosition} />
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

        <section ref={actionsRef} className="scroll-mt-16">
          <h2 className="mb-2 text-sm text-zinc-400">行動</h2>
          <ActionLog state={state} hero={hand.position} />
          <button
            type="button"
            onClick={openActions}
            className="mt-2 h-12 w-full rounded-xl border border-amber-400/50 text-base font-semibold text-amber-400 active:bg-amber-400/10"
          >
            {actionsLabel}
          </button>
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
            placeholder="對手、想問朋友的問題…"
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
          onSkip={() => afterSlot(sheet.slot)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'actions' && (
        <ActionPad
          state={state}
          hero={hand.position}
          heroStack={hand.stackBb}
          canUndo={hand.actions.length > 0}
          onAct={act}
          onUndo={undo}
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

/** 每條街一行：翻牌 底池 16.5bb · CO 過牌 · Hero 下注 5bb */
function ActionLog({ state, hero }: { state: Replay; hero: Position | null }) {
  const rows = state.streets.filter((s) => s.street > 0 || s.actions.some((a) => a.shown))
  if (rows.length === 0) return null
  return (
    <div className="mb-1 space-y-1 rounded-xl bg-zinc-900 px-3 py-2">
      {rows.map((s) => (
        <div key={s.street} className="flex gap-3 text-[15px] leading-relaxed">
          <span className="w-9 shrink-0 text-zinc-500">{STREET_NAMES[s.street]}</span>
          <p className="min-w-0 flex-1">
            {s.street > 0 && s.potStart !== null && (
              <span className="text-zinc-500">
                底池 {formatBb(s.potStart)}bb{s.actions.some((a) => a.shown) && ' · '}
              </span>
            )}
            {s.actions
              .filter((a) => a.shown)
              .map((a) => describeAction(a, hero))
              .join(' · ')}
          </p>
        </div>
      ))}
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
