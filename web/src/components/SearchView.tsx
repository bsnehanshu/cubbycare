import { useEffect, useState } from 'react'
import { searchProviders, getMeta, type Provider, type SearchFilters } from '../lib/api'
import { AMENITY_META, formatAge } from '../lib/labels'
import { MapPanel } from './MapPanel'
import { ProviderCard } from './ProviderCard'

const AGE_STOPS = [6, 9, 12, 18, 24, 36, 48, 60, 72, 96, 120]

export function SearchView({ onOpen }: { onOpen: (id: number) => void }) {
  const [filters, setFilters] = useState<SearchFilters>({})
  const [providers, setProviders] = useState<Provider[]>([])
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showList, setShowList] = useState(true) // mobile toggle

  useEffect(() => {
    getMeta().then((m) => setNeighborhoods(m.neighborhoods))
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    searchProviders(filters).then((r) => {
      if (!alive) return
      setProviders(r.results)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [filters])

  const set = (patch: Partial<SearchFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const toggleAmenity = (a: string) =>
    set({
      amenities: filters.amenities?.includes(a)
        ? filters.amenities.filter((x) => x !== a)
        : [...(filters.amenities ?? []), a],
    })

  return (
    <div className="flex h-full flex-col">
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/8 bg-paper/90 px-4 py-3 backdrop-blur">
        <select
          className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm font-medium"
          value={filters.near ?? ''}
          onChange={(e) => set({ near: e.target.value || undefined })}
        >
          <option value="">All of SF</option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>
              near {n.replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm">
          <span className="font-medium">Child:</span>
          <input
            type="range"
            min={0}
            max={AGE_STOPS.length - 1}
            value={filters.child_age_months ? AGE_STOPS.indexOf(filters.child_age_months) : 0}
            onChange={(e) => set({ child_age_months: AGE_STOPS[Number(e.target.value)] })}
            className="w-24 accent-marigold"
          />
          <span className="w-14 font-semibold text-marigold-deep">
            {filters.child_age_months ? formatAge(filters.child_age_months) : 'any age'}
          </span>
        </label>

        <select
          className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm font-medium"
          value={filters.day ?? ''}
          onChange={(e) => set({ day: e.target.value || undefined })}
        >
          <option value="">Any day</option>
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => (
            <option key={d} value={d}>
              {d[0].toUpperCase() + d.slice(1)}s
            </option>
          ))}
        </select>

        <button
          onClick={() => set({ verified_only: !filters.verified_only })}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            filters.verified_only
              ? 'border-sage-deep bg-sage text-white'
              : 'border-ink/15 bg-white text-ink-soft hover:border-sage'
          }`}
        >
          ✓✓ Verified only
        </button>

        <button
          onClick={() => set({ available_within_hours: filters.available_within_hours ? undefined : 3 })}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            filters.available_within_hours
              ? 'border-marigold-deep bg-marigold text-white'
              : 'border-ink/15 bg-white text-ink-soft hover:border-marigold'
          }`}
          title="Providers with open spots available in the next few hours"
        >
          🚨 Need care soon
        </button>

        <div className="ml-auto hidden gap-1 md:flex">
          {Object.entries(AMENITY_META).map(([key, m]) => (
            <button
              key={key}
              onClick={() => toggleAmenity(key)}
              title={m.label}
              className={`rounded-full border px-2 py-1 text-sm transition ${
                filters.amenities?.includes(key)
                  ? 'border-marigold bg-blush'
                  : 'border-transparent bg-white/60 opacity-60 hover:opacity-100'
              }`}
            >
              {m.icon}
            </button>
          ))}
        </div>
      </div>

      {/* map + list */}
      <div className="relative flex min-h-0 flex-1">
        <div className="h-full min-h-0 flex-1">
          <MapPanel providers={providers} onOpen={onOpen} />
        </div>

        {/* desktop list */}
        <div className="hidden w-105 shrink-0 flex-col gap-3 overflow-y-auto border-l border-ink/8 p-4 md:flex">
          <p className="text-sm font-semibold text-ink-soft">
            {loading ? 'Searching…' : `${providers.length} provider${providers.length === 1 ? '' : 's'} found`}
          </p>
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} onOpen={onOpen} />
          ))}
          {!loading && !providers.length && (
            <p className="rounded-2xl bg-cream p-6 text-center text-sm text-ink-soft">
              No matches — try widening your filters.
            </p>
          )}
        </div>

        {/* mobile bottom sheet */}
        <div
          className={`absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl border-t border-ink/10 bg-paper shadow-(--shadow-pop) transition-all md:hidden ${
            showList ? 'h-1/2' : 'h-14'
          }`}
        >
          <button
            onClick={() => setShowList((s) => !s)}
            className="flex h-14 shrink-0 items-center justify-center gap-2 font-semibold"
          >
            <span className="h-1.5 w-10 rounded-full bg-ink/20" />
            <span className="text-sm">
              {providers.length} nearby {showList ? '▾' : '▴'}
            </span>
          </button>
          {showList && (
            <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
              {providers.map((p) => (
                <ProviderCard key={p.id} provider={p} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
