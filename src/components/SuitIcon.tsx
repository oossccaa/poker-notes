import type { Suit } from '../lib/cards'

export const SUIT_COLOR: Record<Suit, string> = {
  s: 'text-spade',
  h: 'text-heart',
  d: 'text-diamond',
  c: 'text-club',
}

const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

/** 四色花色，填色跟著 currentColor */
export function SuitIcon({ suit, className = '' }: { suit: Suit; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {suit === 'h' && <path d={HEART} />}
      {suit === 'd' && <path d="M12 1.5 20 12 12 22.5 4 12z" />}
      {suit === 's' && (
        <>
          {/* 倒過來的愛心 + 柄 */}
          <path d={HEART} transform="translate(12 19.54) scale(0.9 -0.845) translate(-12 0)" />
          <path d="M12 12.5c.3 4 1.6 7.2 4 9.5H8c2.4-2.3 3.7-5.5 4-9.5z" />
        </>
      )}
      {suit === 'c' && (
        <>
          <circle cx="12" cy="6.8" r="4.3" />
          <circle cx="6.9" cy="13.2" r="4.3" />
          <circle cx="17.1" cy="13.2" r="4.3" />
          <circle cx="12" cy="11.5" r="2.6" />
          <path d="M12 11.5c.3 4.2 1.6 7.6 4 10.5H8c2.4-2.9 3.7-6.3 4-10.5z" />
        </>
      )}
    </svg>
  )
}
