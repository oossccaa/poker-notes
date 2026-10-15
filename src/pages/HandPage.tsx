import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ActionPad, AmountEntry, type AmountType } from '../components/ActionPad'
import { CardKeyboard } from '../components/CardKeyboard'
import { HandSummary } from '../components/HandSummary'
import { BackIcon, StarIcon, TrashIcon } from '../components/Icons'
import { NumberPad } from '../components/NumberPad'
import { CardSlot } from '../components/PlayingCard'
import { PositionPicker } from '../components/PositionPicker'
import { StepBar } from '../components/StepBar'
import { useToast } from '../components/Toast'
import { useHandEditor } from '../db/useHandEditor'
import {
  isSeatAction,
  replay,
  STREET_NAMES,
  suggestedSizes,
  undoLast,
  type Action,
  type PlayedAction,
  type PostflopStreet,
  type Replay,
  type Street,
} from '../lib/actions'
import { nextEmptySlot, slotLabel, type Card } from '../lib/cards'
import { copyText } from '../lib/clipboard'
import { formatBb, formatDate, formatTime } from '../lib/format'
import { handSlots, replayHand, withSlot, type Hand } from '../lib/hand'
import { newId } from '../lib/id'
import { seatsFor, TABLE_SIZES, type Position, type TableSize } from '../lib/positions'
import { buildShareText, lineShareUrl } from '../lib/shareText'
import {
  firstEmptySlot,
  firstOpenStep,
  stepAfterAction,
  stepAfterCards,
  stepOfStreet,
  stepSlots,
  stepStatus,
  streetOfStep,
  type StepId,
} from '../lib/steps'

/** 進到這一步時要不要先選牌：還有空格、沒按過跳過、這一步用得到 */
function cardSlotFor(hand: Hand, step: StepId, skipped: ReadonlySet<StepId>): number | null {
  const range = stepSlots(step)
  if (!range || skipped.has(step) || stepStatus(hand)[step] === 'skipped') return null
  return firstEmptySlot(hand, range)
}

export default function HandPage({ id }: { id: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, showToast] = useToast()
  const onSaveError = useCallback(() => showToast('存檔失敗，請再試一次'), [showToast])
  const { hand, handRef, update, remove } = useHandEditor(id, onSaveError)

  const [step, setStep] = useState<StepId | null>(null)
  /** 正在選哪一格牌；null 就是不在選牌 */
  const [cardSlot, setCardSlot] = useState<number | null>(null)
  /** 正在修改第幾個行動（從摘要點進來） */
  const [editing, setEditing] = useState<number | null>(null)
  const [stackOpen, setStackOpen] = useState(false)
  const [noteFocused, setNoteFocused] = useState(false)
  /** 這次記錄中按過「跳過」的選牌步驟，回來時不再自動跳出選牌 */
  const skippedRef = useRef(new Set<StepId>())

  // 打開時停在第一個還沒記完的步驟
  useEffect(() => {
    if (!hand || step !== null) return
    const first = firstOpenStep(hand)
    setStep(first)
    setCardSlot(cardSlotFor(hand, first, skippedRef.current))
  }, [hand, step])

  if (!hand || step === null) return <div className="min-h-dvh" />

  const state = replayHand(hand)
  const status = stepStatus(hand, state)
  const slots = handSlots(hand)
  const shareText = buildShareText(hand)
  const street = streetOfStep(step)

  function enter(next: StepId) {
    setStep(next)
    setEditing(null)
    setStackOpen(false)
    setCardSlot(cardSlotFor(handRef.current!, next, skippedRef.current))
  }

  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/', { replace: true })
  }

  function removeHand() {
    if (!window.confirm('確定刪除這一手？')) return
    remove()
    goBack()
  }

  async function copy() {
    if (!shareText) return showToast('這手還沒有內容')
    showToast((await copyText(shareText)) ? '已複製，可以貼到 LINE 了' : '複製失敗')
  }

  // ── 位置 ──
  function choosePosition(position: Position | null) {
    update({ position })
    if (position && firstEmptySlot(handRef.current!, [0, 1]) !== null) enter('hero')
  }

  function changeTableSize(tableSize: TableSize) {
    if (tableSize === hand!.tableSize) return
    if (hand!.actions.length > 0 && !window.confirm('改人數會清掉已經記的行動，確定嗎？')) return
    const position = hand!.position && seatsFor(tableSize).includes(hand!.position) ? hand!.position : null
    update({ tableSize, position, actions: [] })
  }

  // ── 選牌 ──
  /** 這格處理完（選好或跳過）：往這一步的下一個空格；都好了就自動往下一步 */
  function afterSlot(slot: number) {
    const h = handRef.current!
    const range = stepSlots(step!)!
    const next = nextEmptySlot(handSlots(h), slot, range[1])
    if (next !== null) return setCardSlot(next)
    setCardSlot(null)
    if (step === 'hero') return enter('pre')
    const target = stepAfterCards(h, streetOfStep(step!) as PostflopStreet)
    if (target !== step) enter(target)
  }

  function pickCard(card: Card) {
    if (cardSlot === null) return
    update(withSlot(handRef.current!, cardSlot, card))
    afterSlot(cardSlot)
  }

  function skipCard() {
    if (cardSlot === null) return
    if (nextEmptySlot(slots, cardSlot, stepSlots(step!)![1]) === null) skippedRef.current.add(step!)
    afterSlot(cardSlot)
  }

  // ── 行動 ──
  function setActions(actions: Action[]) {
    update({ actions })
  }

  function act(added: Action[]) {
    if (added.length === 0) return
    setActions([...handRef.current!.actions, ...added])
    const target = stepAfterAction(handRef.current!)
    if (target !== step) enter(target)
  }

  function undo() {
    setActions(undoLast(handRef.current!.actions))
    const after = replayHand(handRef.current!)
    // 復原到前一條街就跟著回去
    if (!after.done && stepOfStreet(after.street) !== step) enter(stepOfStreet(after.street))
  }

  function restartStreet(s: Street) {
    const first = state.streets.find((l) => l.street === s)?.actions[0]?.index
    if (first === undefined) return
    if (!window.confirm(`${STREET_NAMES[s]}（含）之後的行動會清掉，確定嗎？`)) return
    setActions(handRef.current!.actions.slice(0, first))
    enter(stepOfStreet(s))
  }

  /** 修改金額：後面接不上的行動要先問過再清掉 */
  function changeAmount(index: number, to: number | null) {
    const h = handRef.current!
    let actions = h.actions.map((a, i) => (i === index && isSeatAction(a) ? { ...a, to } : a))
    const check = replay(seatsFor(h.tableSize), actions, h.bbAnte ? 1 : 0)
    if (check.invalidAt !== null) {
      if (!window.confirm('改了之後，後面有行動接不上，會被清掉。確定嗎？')) return
      actions = actions.slice(0, check.invalidAt)
    }
    setActions(actions)
    setEditing(null)
    if (check.invalidAt !== null) enter(stepAfterAction(handRef.current!))
  }

  function redoFrom(action: PlayedAction) {
    const h = handRef.current!
    if (action.index < h.actions.length - 1 && !window.confirm('這個行動之後的都會清掉，確定嗎？')) return
    setActions(h.actions.slice(0, action.index))
    enter(stepOfStreet(action.street))
  }

  const slotButton = (i: number, size: 'lg' | 'md' = 'lg') => (
    <CardSlot key={i} card={slots[i]} size={size} active={cardSlot === i} label={slotLabel(i)} onClick={() => setCardSlot(i)} />
  )

  // ── 下方輸入區：依步驟換內容 ──
  function renderInput() {
    const edited = editing === null ? undefined : findPlayed(state, editing)
    if (edited) {
      return (
        <EditAction
          action={edited}
          hand={hand!}
          onAmount={(to) => changeAmount(edited.index, to)}
          onRedo={() => redoFrom(edited)}
          onCancel={() => setEditing(null)}
        />
      )
    }

    if (cardSlot !== null && (step === 'hero' || street)) {
      return (
        <>
          {step === 'hero' ? (
            <div className="mb-2 flex gap-1.5">{[0, 1].map((i) => slotButton(i))}</div>
          ) : (
            <StreetHeader hand={hand!} state={state} street={street!} slotButton={slotButton} onUndo={undo} />
          )}
          <CardKeyboard
            slot={cardSlot}
            slots={slots}
            onPick={pickCard}
            onClear={() => update(withSlot(handRef.current!, cardSlot, null))}
            onSkip={skipCard}
          />
        </>
      )
    }

    switch (step) {
      case 'pos':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="relative">
                <span className="sr-only">人數</span>
                <select
                  value={hand!.tableSize}
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
                aria-pressed={hand!.bbAnte}
                onClick={() => update({ bbAnte: !hand!.bbAnte })}
                className={`h-10 rounded-lg px-3 text-base ${hand!.bbAnte ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-600 line-through'}`}
              >
                BBA
              </button>
              <button
                type="button"
                onClick={() => setStackOpen(true)}
                className="ml-auto h-10 rounded-lg bg-zinc-800 px-3 text-base text-zinc-100"
              >
                籌碼 {hand!.stackBb !== null ? `${formatBb(hand!.stackBb)}bb` : '—'}
              </button>
            </div>
            {stackOpen ? (
              <NumberPad
                title="我的籌碼"
                mode="stack"
                initial={hand!.stackBb}
                onConfirm={(stackBb) => {
                  update({ stackBb })
                  setStackOpen(false)
                }}
                onCancel={() => setStackOpen(false)}
              />
            ) : (
              <>
                <p className="px-1 text-sm text-zinc-400">我的位置</p>
                <PositionPicker positions={seatsFor(hand!.tableSize)} value={hand!.position} onChange={choosePosition} />
              </>
            )}
          </div>
        )

      case 'hero':
        return (
          <>
            <div className="mb-2 flex gap-1.5">{[0, 1].map((i) => slotButton(i))}</div>
            <p className="px-1 text-sm text-zinc-500">點牌可以修改</p>
          </>
        )

      case 'result':
        return (
          <NumberPad
            key={`result-${hand!.resultBb}`}
            title="這手輸贏"
            mode="result"
            initial={hand!.resultBb}
            onConfirm={(resultBb) => {
              update({ resultBb })
              enter('note')
            }}
          />
        )

      case 'note':
        return (
          <div className="space-y-2">
            <textarea
              value={hand!.note}
              rows={4}
              placeholder="對手、想問朋友的問題…"
              onChange={(e) => update({ note: e.target.value })}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => setNoteFocused(false)}
              className="block w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-base leading-relaxed placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              aria-pressed={hand!.starred}
              onClick={() => update({ starred: !hand!.starred })}
              className={`flex h-11 items-center gap-2 rounded-lg px-3 text-base ${hand!.starred ? 'bg-amber-400/15 text-amber-400' : 'bg-zinc-800 text-zinc-300'}`}
            >
              <StarIcon filled={hand!.starred} className="size-5" /> 要討論
            </button>
          </div>
        )
    }

    // 翻前 / 翻牌 / 轉牌 / 河牌
    const s = street!
    const log = state.streets.find((l) => l.street === s)
    return (
      <>
        <StreetHeader hand={hand!} state={state} street={s} slotButton={slotButton} onUndo={undo} />
        {!state.done && state.street === s ? (
          <ActionPad state={state} hero={hand!.position} heroStack={hand!.stackBb} onAct={act} />
        ) : log ? (
          <Notice>
            {STREET_NAMES[s]}記完了
            {state.done && state.street === s &&
              (state.showdown ? `，${names(state.live, hand!.position)} 攤牌` : `，${names(state.live, hand!.position)} 贏下底池`)}
            。
            {log.actions.length > 0 && (
              <button type="button" onClick={() => restartStreet(s)} className="mt-2 block h-10 text-amber-400 underline">
                從{STREET_NAMES[s]}重記
              </button>
            )}
          </Notice>
        ) : state.done ? (
          state.showdown ? (
            <Notice>已經全下了，這條街不用記行動，選好公牌就好。</Notice>
          ) : (
            <Notice>
              這手在{STREET_NAMES[state.street]}就結束了。
              <button type="button" onClick={() => enter('result')} className="mt-2 block h-10 text-amber-400 underline">
                去記結果
              </button>
            </Notice>
          )
        ) : (
          <JumpToStreet
            key={s}
            state={state}
            street={s as PostflopStreet}
            hero={hand!.position}
            onBack={() => enter(stepOfStreet(state.street))}
            onStart={(live) => act([{ type: 'street', street: s as PostflopStreet, live }])}
          />
        )}
      </>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-env(safe-area-inset-top))] max-w-[480px] flex-col">
      <header className="flex h-12 shrink-0 items-center px-1">
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

      <StepBar step={step} status={status} onSelect={enter} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <HandSummary
          hand={hand}
          state={state}
          step={step}
          status={status}
          editing={editing}
          onSelectStep={enter}
          onEditAction={(index) => {
            setCardSlot(null)
            setEditing(index)
          }}
        />
      </div>

      <section className="shrink-0 rounded-t-2xl border-t border-zinc-800 bg-zinc-900 px-3 pt-2.5 pb-2.5">{renderInput()}</section>

      {!noteFocused && (
        <nav className="grid shrink-0 grid-cols-3 gap-2 bg-zinc-900 px-3 pb-[max(8px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => navigate(`/hand/${newId()}`, { replace: true })}
            className="h-11 rounded-xl bg-zinc-800 text-base font-semibold active:bg-zinc-700"
          >
            ＋ 下一手
          </button>
          <button type="button" onClick={copy} className="h-11 rounded-xl bg-zinc-800 text-base font-semibold active:bg-zinc-700">
            複製
          </button>
          {shareText ? (
            <a
              href={lineShareUrl(shareText)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center justify-center rounded-xl bg-line text-base font-semibold text-white active:brightness-90"
            >
              傳到 LINE
            </a>
          ) : (
            <button
              type="button"
              onClick={() => showToast('這手還沒有內容')}
              className="h-11 rounded-xl bg-line/40 text-base font-semibold text-white/70"
            >
              傳到 LINE
            </button>
          )}
        </nav>
      )}
      {toast}
    </div>
  )
}

const names = (seats: Position[], hero: Position | null) => seats.map((p) => (p === hero ? 'Hero' : p)).join('、')

function findPlayed(state: Replay, index: number): PlayedAction | undefined {
  for (const log of state.streets) {
    const found = log.actions.find((a) => a.index === index)
    if (found) return found
  }
  return undefined
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="px-1 pt-1 pb-2 text-[15px] leading-relaxed text-zinc-300">{children}</div>
}

/** 街名、這條街的公牌、底池、復原 */
function StreetHeader({
  hand,
  state,
  street,
  slotButton,
  onUndo,
}: {
  hand: Hand
  state: Replay
  street: Street
  slotButton: (i: number, size?: 'lg' | 'md') => ReactNode
  onUndo: () => void
}) {
  const range = stepSlots(stepOfStreet(street))
  const log = state.streets.find((l) => l.street === street)
  const pot = state.street === street ? state.pot : (log?.potStart ?? null)
  return (
    <div className="mb-2 flex items-center gap-2">
      {range && <div className="flex gap-1.5">{Array.from({ length: range[1] - range[0] + 1 }, (_, k) => slotButton(range[0] + k, 'md'))}</div>}
      <div className="min-w-0 flex-1 pl-1">
        <div className="text-base font-semibold text-amber-400">{STREET_NAMES[street]}</div>
        {pot !== null && <div className="text-sm text-zinc-400">底池 {formatBb(pot)}bb</div>}
      </div>
      <button
        type="button"
        onClick={onUndo}
        disabled={hand.actions.length === 0}
        className="h-10 px-3 text-zinc-300 active:text-white disabled:text-zinc-700"
      >
        復原
      </button>
    </div>
  )
}

/** 前面的街還沒記完，直接從這條街開始：選還在牌局的人 */
function JumpToStreet({
  state,
  street,
  hero,
  onBack,
  onStart,
}: {
  state: Replay
  street: PostflopStreet
  hero: Position | null
  onBack: () => void
  onStart: (live: Position[]) => void
}) {
  const [picked, setPicked] = useState<Position[]>(hero && state.live.includes(hero) ? [hero] : [])
  const toggle = (p: Position) => setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))
  return (
    <div className="space-y-2 px-1">
      <p className="text-[15px] text-zinc-300">
        {STREET_NAMES[state.street]}還沒記完。
        <button type="button" onClick={onBack} className="ml-1 h-10 text-amber-400 underline">
          回到{STREET_NAMES[state.street]}
        </button>
      </p>
      <p className="text-[15px] text-zinc-300">或直接從{STREET_NAMES[street]}開始記，點選還在牌局的人：</p>
      <div className="grid grid-cols-5 gap-1.5">
        {state.live.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={picked.includes(p)}
            onClick={() => toggle(p)}
            className={`flex h-11 flex-col items-center justify-center rounded-lg leading-tight ${
              picked.includes(p) ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-200'
            }`}
          >
            <span className="text-[14px] font-semibold">{p}</span>
            {p === hero && <span className="text-[11px]">Hero</span>}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={picked.length < 2}
        onClick={() => onStart(state.order.filter((p) => picked.includes(p)))}
        className="h-12 w-full rounded-xl bg-amber-400 text-base font-bold text-zinc-950 disabled:opacity-30"
      >
        開始記{STREET_NAMES[street]}
      </button>
    </div>
  )
}

/** 從摘要點一個行動：改金額，或從這裡重記 */
function EditAction({
  action,
  hand,
  onAmount,
  onRedo,
  onCancel,
}: {
  action: PlayedAction
  hand: Hand
  onAmount: (to: number | null) => void
  onRedo: () => void
  onCancel: () => void
}) {
  const [amountOpen, setAmountOpen] = useState(false)
  const who = action.seat === hand.position ? 'Hero' : action.seat
  const title = `${who} ${action.label}${action.amount !== null ? ` ${formatBb(action.amount)}bb` : ''}`
  const hasAmount = action.type === 'bet' || action.type === 'raise' || action.type === 'allin'

  if (amountOpen) {
    // 用「這個行動之前」的狀態算要跟多少、常用尺寸
    const before = replay(seatsFor(hand.tableSize), hand.actions.slice(0, action.index), hand.bbAnte ? 1 : 0)
    return (
      <AmountEntry
        title={`${who} ${action.label}`}
        type={action.type as AmountType}
        initial={action.to}
        facing={before.facing}
        sizes={action.type === 'allin' ? [] : suggestedSizes(before)}
        onConfirm={onAmount}
        onCancel={() => setAmountOpen(false)}
      />
    )
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-base">
        修改 <span className="font-semibold text-amber-400">{title}</span>
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {hasAmount && (
          <button type="button" onClick={() => setAmountOpen(true)} className="h-12 rounded-xl bg-zinc-700 text-base font-semibold">
            改金額
          </button>
        )}
        <button
          type="button"
          onClick={onRedo}
          className={`h-12 rounded-xl bg-amber-400 text-base font-semibold text-zinc-950 ${hasAmount ? '' : 'col-span-2'}`}
        >
          從這裡重記
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-xl bg-zinc-800 text-base text-zinc-300">
          取消
        </button>
      </div>
    </div>
  )
}
