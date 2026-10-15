import { STEP_LABELS, STEPS, type StepId, type StepStatus } from '../lib/steps'

const MARK: Record<StepStatus, string> = { done: '✓', partial: '•', todo: '○', skipped: '–' }

/** 上方的步驟列：位置 手牌 翻前 翻牌 轉牌 河牌 結果 備註，隨時點 */
export function StepBar({
  step,
  status,
  onSelect,
}: {
  step: StepId
  status: Record<StepId, StepStatus>
  onSelect: (step: StepId) => void
}) {
  return (
    <nav aria-label="步驟" className="grid shrink-0 grid-cols-8 border-b border-zinc-800">
      {STEPS.map((id) => {
        const st = status[id]
        const active = id === step
        const tone = active
          ? 'text-amber-400'
          : st === 'skipped'
            ? 'text-zinc-700'
            : st === 'todo'
              ? 'text-zinc-500'
              : 'text-zinc-200'
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? 'step' : undefined}
            onClick={() => onSelect(id)}
            className={`relative flex h-12 flex-col items-center justify-center leading-tight ${tone}`}
          >
            <span className="text-[14px] font-semibold">{STEP_LABELS[id]}</span>
            <span className={`text-[11px] ${st === 'done' && !active ? 'text-emerald-400' : ''}`}>{MARK[st]}</span>
            {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-amber-400" />}
          </button>
        )
      })}
    </nav>
  )
}
