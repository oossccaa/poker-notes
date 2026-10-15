/** bb 數字：整數不帶小數，否則一位小數 */
export function formatBb(value: number): string {
  const rounded = Math.round(Math.abs(value) * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return value < 0 && text !== '0' ? `-${text}` : text
}

/** 結果：`+27.5bb`、`-3bb`、`0bb` */
export function formatResultBb(value: number): string {
  const text = formatBb(Math.abs(value))
  if (text === '0') return '0bb'
  return `${value > 0 ? '+' : '-'}${text}bb`
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDate(ms: number, now = Date.now()): string {
  const d = new Date(ms)
  const md = `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
  return d.getFullYear() === new Date(now).getFullYear() ? md : `${d.getFullYear()}/${md}`
}

/** 本地日期 `YYYY-MM-DD`，給分組用 */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function dayLabel(ms: number, now = Date.now()): string {
  const key = dayKey(ms)
  if (key === dayKey(now)) return '今天'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === dayKey(yesterday.getTime())) return '昨天'
  return formatDate(ms, now)
}
