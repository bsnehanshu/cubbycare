import type { Provider } from '../lib/api'
import { AMENITY_META, AGE_BAND_META } from '../lib/labels'
import { TierBadge } from './TierBadge'

export function ProviderCard({ provider, onOpen }: { provider: Provider; onOpen: (id: number) => void }) {
  return (
    <button
      onClick={() => onOpen(provider.id)}
      className="rise-in w-full rounded-(--radius-cubby) border border-ink/8 bg-white p-4 text-left shadow-(--shadow-card) transition hover:-translate-y-0.5 hover:shadow-(--shadow-pop)"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cream text-2xl">{provider.avatar}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-lg font-semibold">{provider.name}</h3>
            <TierBadge tier={provider.verified_tier} />
          </div>
          <p className="text-sm text-ink-soft">
            {provider.type === 'center' ? 'Centre' : 'Individual'} · {provider.neighborhood}
            {provider.distance_km != null && <> · {provider.distance_km} km away</>}
            {' · '}
            <span className="font-semibold text-marigold-deep">{provider.price_hint}</span>
          </p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{provider.bio}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {provider.age_bands.map((b) => (
          <span key={b} className="rounded-full bg-blush/60 px-2 py-0.5 text-xs font-medium">
            {AGE_BAND_META[b]?.icon} {AGE_BAND_META[b]?.label}
          </span>
        ))}
        {provider.amenities.slice(0, 4).map((a) => (
          <span key={a} className="rounded-full bg-cream px-2 py-0.5 text-xs">
            {AMENITY_META[a]?.icon} {AMENITY_META[a]?.label}
          </span>
        ))}
        {provider.amenities.length > 4 && (
          <span className="text-xs text-ink-soft">+{provider.amenities.length - 4} more</span>
        )}
      </div>
      <p className="mt-2 text-xs font-semibold">
        {provider.spots_available > 0 ? (
          <span className="text-sage-deep">● {provider.spots_available} spot{provider.spots_available > 1 ? 's' : ''} open</span>
        ) : (
          <span className="text-ink-soft/60">○ waitlist only</span>
        )}
      </p>
    </button>
  )
}
