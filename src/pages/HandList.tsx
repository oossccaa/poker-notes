import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { StarIcon } from '../components/Icons'
import { Notice } from '../components/Notice'
import { MiniCards } from '../components/PlayingCard'
import { useHands } from '../db/hands'
import { dayKey, dayLabel, formatBb, formatResultBb, formatTime } from '../lib/format'
import type { Hand } from '../lib/hand'
import { newId } from '../lib/id'

function groupByDay(hands: Hand[]) {
  const groups: { key: string; label: string; hands: Hand[] }[] = []
  for (const hand of hands) {
    const key = dayKey(hand.createdAt)
    const last = groups.at(-1)
    if (last?.key === key) last.hands.push(hand)
    else groups.push({ key, label: dayLabel(hand.createdAt), hands: [hand] })
  }
  return groups
}

export default function HandList() {
  const hands = useHands()
  const navigate = useNavigate()
  const groups = useMemo(() => groupByDay(hands ?? []), [hands])

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pb-[calc(104px+env(safe-area-inset-bottom))]">
      <header className="flex items-baseline justify-between px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold">撲克速記</h1>
        {hands && hands.length > 0 && <span className="text-sm text-zinc-500">{hands.length} 手</span>}
      </header>

      <Notice />

      {hands && hands.length === 0 && (
        <div className="px-8 pt-20 text-center">
          <p className="text-lg font-semibold">還沒有手牌</p>
          <p className="mt-3 leading-relaxed text-zinc-400">
            一手結束、下一手發牌前，按下面的「記一手」。
            <br />
            位置、手牌、公牌點一點就好，每一格都可以跳過。
          </p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="sticky top-[env(safe-area-inset-top)] z-10 bg-ink/95 px-4 py-2 text-sm font-semibold text-zinc-400 backdrop-blur">
            {group.label}
          </h2>
          <ul className="divide-y divide-zinc-900">
            {group.hands.map((hand) => (
              <HandRow key={hand.id} hand={hand} />
            ))}
          </ul>
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] bg-linear-to-t from-ink from-60% to-transparent px-4 pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => navigate(`/hand/${newId()}`)}
          className="h-14 w-full rounded-2xl bg-amber-400 text-lg font-bold text-zinc-950 shadow-lg active:bg-amber-300"
        >
          記一手
        </button>
      </div>
    </div>
  )
}

function HandRow({ hand }: { hand: Hand }) {
  const note = hand.note.trim().split('\n')[0]
  const result = hand.resultBb
  const tone = result === null || result === 0 ? 'text-zinc-300' : result > 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <li>
      <Link to={`/hand/${hand.id}`} className="flex min-h-14 gap-3 px-4 py-3 active:bg-zinc-900">
        <span className="w-11 shrink-0 pt-0.5 text-sm text-zinc-500 tabular-nums">{formatTime(hand.createdAt)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {hand.position && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-semibold text-zinc-200">{hand.position}</span>
            )}
            <MiniCards slots={hand.hero} />
            <MiniCards slots={hand.board.slice(0, 3)} />
            <MiniCards slots={hand.board.slice(3, 4)} />
            <MiniCards slots={hand.board.slice(4, 5)} />
            {hand.stackBb !== null && <span className="text-xs text-zinc-500">{formatBb(hand.stackBb)}bb</span>}
          </div>
          {note && <p className="mt-1 truncate text-sm text-zinc-400">{note}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          {result !== null && <span className={`text-[15px] font-semibold tabular-nums ${tone}`}>{formatResultBb(result)}</span>}
          {hand.starred && <StarIcon filled className="size-4 text-amber-400" />}
        </div>
      </Link>
    </li>
  )
}
