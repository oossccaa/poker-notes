import { useEffect, useRef, type ReactNode } from 'react'
import type { PlayedAction, Replay, Street } from '../lib/actions'
import { formatBb, formatResultBb } from '../lib/format'
import { STREET_SLOTS, type Hand } from '../lib/hand'
import type { Position } from '../lib/positions'
import { STEP_LABELS, stepOfStreet, type StepId, type StepStatus } from '../lib/steps'
import { StarIcon } from './Icons'
import { MiniCards } from './PlayingCard'

/**
 * 整手的流程摘要，一行一步。點一行就跳到那一步，點一個行動可以修改它。
 * 只列有內容的步驟和目前這一步。
 */
export function HandSummary({
  hand,
  state,
  step,
  status,
  editing,
  onSelectStep,
  onEditAction,
}: {
  hand: Hand
  state: Replay
  step: StepId
  status: Record<StepId, StepStatus>
  editing: number | null
  onSelectStep: (step: StepId) => void
  onEditAction: (index: number) => void
}) {
  const currentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [step])

  const who = (seat: Position) => (seat === hand.position ? 'Hero' : seat)
  const chip = (a: PlayedAction) => (
    <button
      key={a.index}
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onEditAction(a.index)
      }}
      className={`rounded-md px-1.5 py-0.5 text-[14px] ${
        editing === a.index ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100 active:bg-zinc-700'
      }`}
    >
      {who(a.seat)} {a.label}
      {a.amount !== null && ` ${formatBb(a.amount)}`}
    </button>
  )

  const rows: { id: StepId; content: ReactNode }[] = []

  if (hand.position || hand.stackBb !== null)
    rows.push({
      id: 'pos',
      content: (
        <>
          {hand.position && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[13px] font-semibold">{hand.position}</span>}
          <span className="text-zinc-400">
            {hand.tableSize} 人桌{hand.bbAnte ? ' · BBA' : ''}
            {hand.stackBb !== null && ` · 籌碼 ${formatBb(hand.stackBb)}bb`}
          </span>
        </>
      ),
    })

  if (hand.hero.some(Boolean)) rows.push({ id: 'hero', content: <MiniCards slots={hand.hero} /> })

  for (const street of [0, 1, 2, 3] as Street[]) {
    const id = stepOfStreet(street)
    const log = state.streets.find((s) => s.street === street)
    const shown = log?.actions.filter((a) => a.shown) ?? []
    const cards = street === 0 ? [] : hand.board.slice(STREET_SLOTS[street][0] - 2, STREET_SLOTS[street][1] - 1)
    const hasCards = cards.some(Boolean)
    if (!hasCards && shown.length === 0 && !(street > 0 && log)) continue
    rows.push({
      id,
      content: (
        <>
          <MiniCards slots={cards} />
          {street > 0 && log && log.potStart !== null && <span className="text-zinc-500">底池 {formatBb(log.potStart)}</span>}
          {shown.map(chip)}
        </>
      ),
    })
  }

  if (hand.resultBb !== null)
    rows.push({
      id: 'result',
      content: (
        <span
          className={`font-semibold ${hand.resultBb > 0 ? 'text-emerald-400' : hand.resultBb < 0 ? 'text-red-400' : ''}`}
        >
          {formatResultBb(hand.resultBb)}
        </span>
      ),
    })

  const noteLine = hand.note.trim().split('\n')[0]
  if (noteLine || hand.starred)
    rows.push({
      id: 'note',
      content: (
        <>
          {hand.starred && <StarIcon filled className="size-4 text-amber-400" />}
          <span className="truncate text-zinc-300">{noteLine}</span>
        </>
      ),
    })

  // 目前這一步就算沒內容也列出來，讓人知道正在記哪裡
  if (!rows.some((r) => r.id === step) && status[step] !== 'skipped') {
    rows.push({ id: step, content: <span className="text-zinc-600">還沒記</span> })
  }
  const order = ['pos', 'hero', 'pre', 'flop', 'turn', 'river', 'result', 'note']
  rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))

  return (
    <div className="space-y-0.5 px-2 py-2">
      {rows.map((row) => {
        const active = row.id === step
        return (
          <div
            key={row.id}
            ref={active ? currentRef : undefined}
            onClick={() => onSelectStep(row.id)}
            className={`flex min-h-10 cursor-pointer gap-2 rounded-lg px-2 py-1.5 ${active ? 'bg-zinc-900 ring-1 ring-amber-400/40' : 'active:bg-zinc-900'}`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectStep(row.id)
              }}
              className={`w-9 shrink-0 pt-0.5 text-left text-[14px] ${active ? 'text-amber-400' : 'text-zinc-500'}`}
            >
              {STEP_LABELS[row.id]}
            </button>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[15px]">{row.content}</div>
          </div>
        )
      })}
    </div>
  )
}
