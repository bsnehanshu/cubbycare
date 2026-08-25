import { TIER_META } from '../lib/labels'

export function TierBadge({ tier, size = 'sm' }: { tier: number; size?: 'sm' | 'lg' }) {
  const meta = TIER_META[tier] ?? TIER_META[0]
  return (
    <span
      title={meta.blurb}
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${
        size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
      style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.color}33` }}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  )
}
