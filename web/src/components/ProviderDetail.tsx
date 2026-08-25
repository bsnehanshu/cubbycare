import { useEffect, useRef, useState } from 'react'
import {
  getProvider,
  getReviewSummary,
  requestBooking,
  translateProvider,
  type ProviderDetail as PD,
  type TranslatedProvider,
} from '../lib/api'
import { AMENITY_META, AGE_BAND_META, DAY_LABELS, TIER_META, formatAge } from '../lib/labels'
import { TierBadge } from './TierBadge'
import { MapPanel } from './MapPanel'

const AGE_STOPS = [6, 12, 18, 24, 36, 48, 60, 84, 120]

type SwarmSpecialist = { name: string; label: string; status: 'running' | 'done'; summary?: string; error?: boolean }

function TrustCheck({ providerId, onDone }: { providerId: number; onDone: () => void }) {
  const [specialists, setSpecialists] = useState<SwarmSpecialist[]>([])
  const [report, setReport] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setSpecialists([])
    setReport(null)
    try {
      const res = await fetch(`/api/providers/${providerId}/trust-check`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      if (!res.ok || !res.body) throw new Error(`trust check unavailable (${res.status})`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const ev = JSON.parse(line)
          if (ev.type === 'specialist_start') {
            setSpecialists((s) => [...s, { name: ev.name, label: ev.label, status: 'running' }])
          } else if (ev.type === 'specialist_done') {
            setSpecialists((s) => s.map((x) => (x.name === ev.name ? { ...x, status: 'done', summary: ev.summary, error: ev.error } : x)))
          } else if (ev.type === 'report') {
            setReport(ev.report)
          } else if (ev.type === 'error') {
            setReport(`⚠️ ${ev.message}`)
          }
        }
      }
      onDone()
    } catch (err) {
      setReport(`⚠️ ${String(err instanceof Error ? err.message : err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-sky/30 bg-sky/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">🐝 Trust check</h2>
          <p className="text-xs text-ink-soft">
            Three specialist agents verify this profile in parallel — credentials, state license, and reviews — then the
            coordinator writes a trust report.
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-40"
        >
          {busy ? 'Swarm running…' : 'Run the swarm'}
        </button>
      </div>

      {specialists.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {specialists.map((s) => (
            <div
              key={s.name}
              className={`rounded-xl border p-3 text-xs transition ${
                s.status === 'running' ? 'border-sky/50 bg-white' : s.error ? 'border-red-200 bg-red-50' : 'border-sage/40 bg-sage/10'
              }`}
            >
              <p className="flex items-center gap-1.5 font-bold">
                {s.status === 'running' ? <span className="animate-pulse">🔧</span> : s.error ? '❌' : '✅'} {s.label}
              </p>
              {s.status === 'running' && (
                <p className="mt-1 flex gap-1 text-ink-soft">
                  <span className="think-dot">●</span><span className="think-dot">●</span><span className="think-dot">●</span>
                </p>
              )}
              {s.summary && <p className="mt-1 text-ink-soft">{s.summary}</p>}
            </div>
          ))}
        </div>
      )}

      {report && (
        <p className="mt-3 rounded-xl border border-ink/10 bg-white p-3 text-sm">
          <span className="font-semibold text-sky">📋 Trust report:</span> {report}
        </p>
      )}
    </section>
  )
}

function LicenseVerify({
  providerId,
  initialNumber,
  onVerified,
}: {
  providerId: number
  initialNumber: string | null
  onVerified: () => void
}) {
  const [number, setNumber] = useState(initialNumber ?? '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const run = async () => {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch(`/api/providers/${providerId}/verify-license`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ license_number: number }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const c = data.check
      setResult({
        ok: c.found && c.match,
        text: c.found
          ? `${c.facility_name ?? 'Facility'} · ${c.status ?? ''} (${c.method === 'live' ? 'live state registry' : 'registry cache'}). ${c.notes}`
          : c.notes,
      })
      if (c.found && c.match) onVerified()
    } catch (err) {
      setResult({ ok: false, text: String(err instanceof Error ? err.message : err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gold/40 bg-gold/8 p-3">
      <p className="text-sm font-semibold">★ Unlock Licensed tier</p>
      <p className="mt-0.5 text-xs text-ink-soft">
        Enter the CA facility number — an agent checks it against the state's Community Care Licensing registry.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-sm"
          placeholder="e.g. 384001982"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <button
          onClick={run}
          disabled={busy || !number.trim()}
          className="rounded-lg bg-gold px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Checking registry…' : 'Verify'}
        </button>
      </div>
      {busy && (
        <p className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
          <span className="think-dot">●</span><span className="think-dot">●</span><span className="think-dot">●</span>
          <span className="ml-1">Agent is searching the state registry — watch the browser…</span>
        </p>
      )}
      {result && (
        <p className={`mt-2 rounded-lg p-2 text-xs font-medium ${result.ok ? 'bg-sage/15 text-sage-deep' : 'bg-red-50 text-red-700'}`}>
          {result.ok ? '★ ' : '✕ '}{result.text}
        </p>
      )}
    </div>
  )
}

export function ProviderDetailView({ id, onBack }: { id: number; onBack: () => void }) {
  const [provider, setProvider] = useState<PD | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [booking, setBooking] = useState({ parent_name: '', child_age_months: 24, date: '', slot: 'am', notes: '' })
  const [bookingResult, setBookingResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [bookingBusy, setBookingBusy] = useState(false)
  const [ja, setJa] = useState<TranslatedProvider | null>(null)
  const [jaOn, setJaOn] = useState(false)
  const [jaBusy, setJaBusy] = useState(false)
  const [jaError, setJaError] = useState<string | null>(null)
  const jaResummarised = useRef(false)

  useEffect(() => {
    getProvider(id).then(setProvider)
    setJa(null)
    setJaOn(false)
    setJaError(null)
    jaResummarised.current = false
  }, [id])

  useEffect(() => {
    if (!provider?.reviews.length) return
    setSummaryLoading(true)
    getReviewSummary(id)
      .then((r) => setSummary(r.summary))
      .finally(() => setSummaryLoading(false))
  }, [id, provider?.reviews.length])

  const loadJa = async () => {
    setJaBusy(true)
    setJaError(null)
    try {
      setJa(await translateProvider(id))
      setJaOn(true)
    } catch (err) {
      setJaError(String(err instanceof Error ? err.message : err))
    } finally {
      setJaBusy(false)
    }
  }

  // The AI review summary arrives after the first paint — if it landed after we translated,
  // re-run the agent once so the Japanese view isn't missing it. Guarded by a ref: if the
  // translation still comes back without a summary, don't keep retrying.
  useEffect(() => {
    if (!jaOn || !summary || !ja || ja.review_summary || jaResummarised.current) return
    jaResummarised.current = true
    void loadJa()
  }, [jaOn, summary, ja?.review_summary])

  const toggleJa = () => {
    if (jaOn) return setJaOn(false)
    if (ja) return setJaOn(true)
    void loadJa()
  }

  const jaCred = (credId: number) => (jaOn ? ja?.credentials.find((c) => c.id === credId) : undefined)
  const jaReview = (reviewId: number) => (jaOn ? ja?.reviews.find((r) => r.id === reviewId)?.text : undefined)

  if (!provider) return <div className="grid h-full place-items-center text-ink-soft">Loading…</div>

  const tier = TIER_META[provider.verified_tier]

  const submitBooking = async () => {
    setBookingBusy(true)
    setBookingResult(null)
    try {
      const r = await requestBooking({ provider_id: id, ...booking })
      setBookingResult({
        ok: true,
        message: `Request #${r.booking.id} sent to ${r.provider_name}!${r.age_fit_note ? ` ${r.age_fit_note}` : ''}`,
      })
    } catch (err) {
      setBookingResult({ ok: false, message: String(err instanceof Error ? err.message : err) })
    } finally {
      setBookingBusy(false)
    }
  }

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="text-sm font-semibold text-marigold-deep hover:underline">
          ← Back to search
        </button>
        <div className="flex items-center gap-2">
          {jaError && <span className="text-xs text-red-700">⚠️ {jaError}</span>}
          <button
            onClick={toggleJa}
            disabled={jaBusy}
            aria-pressed={jaOn}
            className={`rounded-full border px-3 py-1.5 text-sm font-bold transition disabled:opacity-40 ${
              jaOn ? 'border-sky/50 bg-sky/15 text-sky' : 'border-ink/15 bg-white text-ink-soft hover:text-ink'
            }`}
          >
            {jaBusy ? '翻訳中…' : jaOn ? '🇯🇵 日本語で表示中' : '🇯🇵 日本語で読む'}
          </button>
        </div>
      </div>
      {jaOn && (
        <p className="mb-3 text-xs text-ink-soft">
          このプロフィールは翻訳エージェント（Claude）が日本語にしています。施設名・番号・日付は原文のままです。
        </p>
      )}

      <div className="rise-in rounded-(--radius-cubby) border border-ink/8 bg-white p-6 shadow-(--shadow-card)">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid size-20 place-items-center rounded-3xl bg-cream text-5xl">{provider.avatar}</div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold">{provider.name}</h1>
            <p className="mt-1 text-ink-soft">
              {provider.type === 'center' ? 'Childcare centre' : 'Individual caregiver'} · {provider.neighborhood} ·{' '}
              <span className="font-semibold text-marigold-deep">{provider.price_hint}</span> · speaks{' '}
              {provider.languages.join(', ')}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TierBadge tier={provider.verified_tier} size="lg" />
              <span className="text-xs text-ink-soft">{tier?.blurb}</span>
            </div>
          </div>
          <div className="flex w-full items-baseline gap-2 sm:block sm:w-auto sm:text-right">
            <p className={`font-bold ${provider.spots_available > 0 ? 'text-sage-deep' : 'text-ink-soft/60'}`}>
              {provider.spots_available > 0 ? `${provider.spots_available} spots open` : 'Waitlist only'}
            </p>
            <p className="text-xs text-ink-soft">capacity {provider.capacity}</p>
          </div>
        </div>

        <p className="mt-4 text-ink-soft">{(jaOn && ja?.bio) || provider.bio}</p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section>
            <h2 className="font-display text-lg font-semibold">Ages & amenities</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.age_bands.map((b) => (
                <span key={b} className="rounded-full bg-blush/60 px-2.5 py-1 text-sm font-medium">
                  {AGE_BAND_META[b]?.icon} {AGE_BAND_META[b]?.label} <span className="opacity-60">({AGE_BAND_META[b]?.range})</span>
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.amenities.map((a) => (
                <span key={a} className="rounded-full bg-cream px-2.5 py-1 text-sm">
                  {AMENITY_META[a]?.icon} {AMENITY_META[a]?.label}
                </span>
              ))}
            </div>

            <h2 className="mt-5 font-display text-lg font-semibold">Weekly availability</h2>
            <div className="mt-2 flex gap-1.5">
              {DAY_LABELS.map(([key, label]) => {
                const slots = provider.weekly_availability[key] ?? []
                return (
                  <div key={key} className="flex-1 rounded-xl bg-cream/70 p-1.5 text-center">
                    <p className="text-xs font-bold">{label}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-ink-soft">
                      {slots.length ? slots.map((s) => s.toUpperCase()).join(' · ') : '—'}
                    </p>
                  </div>
                )
              })}
            </div>

            <h2 className="mt-5 font-display text-lg font-semibold">Credentials</h2>
            <ul className="mt-2 space-y-2">
              {provider.credentials.map((c) => {
                const t = jaCred(c.id)
                return (
                  <li key={c.id} className="flex items-start gap-2 rounded-xl border border-ink/8 bg-paper p-2.5 text-sm">
                    <span>{c.status === 'verified' ? '✅' : c.status === 'pending' ? '⏳' : '❌'}</span>
                    <span>
                      <span className="font-semibold">{t?.kind ?? c.kind}</span>
                      {c.issuer && <span className="text-ink-soft"> · {t?.issuer ?? c.issuer}</span>}
                      {c.expiry && (
                        <span className="text-ink-soft"> · {jaOn ? `有効期限 ${c.expiry}` : `expires ${c.expiry}`}</span>
                      )}
                      {c.details && <p className="text-xs text-ink-soft">{t?.details ?? c.details}</p>}
                    </span>
                  </li>
                )
              })}
              {!provider.credentials.length && <li className="text-sm text-ink-soft">None on file yet.</li>}
            </ul>
            {provider.type === 'center' && provider.verified_tier < 3 && (
              <LicenseVerify providerId={id} initialNumber={provider.license_number} onVerified={() => getProvider(id).then(setProvider)} />
            )}
          </section>

          <section>
            <div className="h-52 overflow-hidden rounded-2xl border border-ink/8">
              <MapPanel providers={[provider]} />
            </div>

            <h2 className="mt-5 font-display text-lg font-semibold">
              {jaOn ? '保護者の声' : 'What parents say'}
            </h2>
            {summaryLoading && (
              <p className="mt-2 flex items-center gap-1 text-sm text-ink-soft">
                <span className="think-dot">●</span>
                <span className="think-dot">●</span>
                <span className="think-dot">●</span>
                <span className="ml-1">Claude is reading the reviews…</span>
              </p>
            )}
            {summary && (
              <p className="mt-2 rounded-2xl border border-sage/30 bg-sage/10 p-3 text-sm">
                <span className="font-semibold text-sage-deep">{jaOn ? '✨ AIまとめ:' : '✨ AI summary:'}</span>{' '}
                {(jaOn && ja?.review_summary) || summary}
              </p>
            )}
            <ul className="mt-2 space-y-2">
              {provider.reviews.map((r) => (
                <li key={r.id} className="rounded-xl bg-cream/70 p-3 text-sm">
                  <p className="font-semibold text-gold">
                    {'★'.repeat(r.rating)}
                    <span className="text-ink/20">{'★'.repeat(5 - r.rating)}</span>
                    <span className="ml-2 text-xs font-normal text-ink-soft">{r.author}</span>
                  </p>
                  <p className="mt-1">{jaReview(r.id) ?? r.text}</p>
                </li>
              ))}
              {!provider.reviews.length && <li className="text-sm text-ink-soft">No reviews yet.</li>}
            </ul>
          </section>
        </div>

        {/* booking */}
        <section className="mt-6 rounded-2xl border border-marigold/30 bg-blush/30 p-4">
          <h2 className="font-display text-lg font-semibold">Request a booking</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Your name</span>
              <input
                className="rounded-xl border border-ink/15 bg-white px-3 py-2"
                value={booking.parent_name}
                onChange={(e) => setBooking({ ...booking, parent_name: e.target.value })}
                placeholder="Alex Parent"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Child's age</span>
              <select
                className="rounded-xl border border-ink/15 bg-white px-3 py-2"
                value={booking.child_age_months}
                onChange={(e) => setBooking({ ...booking, child_age_months: Number(e.target.value) })}
              >
                {AGE_STOPS.map((m) => (
                  <option key={m} value={m}>
                    {formatAge(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Date</span>
              <input
                type="date"
                className="rounded-xl border border-ink/15 bg-white px-3 py-2"
                value={booking.date}
                onChange={(e) => setBooking({ ...booking, date: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Slot</span>
              <select
                className="rounded-xl border border-ink/15 bg-white px-3 py-2"
                value={booking.slot}
                onChange={(e) => setBooking({ ...booking, slot: e.target.value })}
              >
                <option value="am">Morning</option>
                <option value="pm">Afternoon</option>
              </select>
            </label>
            <button
              onClick={submitBooking}
              disabled={!booking.parent_name || !booking.date || bookingBusy}
              className="rounded-full bg-marigold px-5 py-2.5 font-bold text-white shadow-(--shadow-card) transition hover:bg-marigold-deep disabled:opacity-40"
            >
              {bookingBusy ? 'Sending…' : 'Send request'}
            </button>
          </div>
          {bookingResult && (
            <p className={`mt-3 rounded-xl p-3 text-sm font-medium ${bookingResult.ok ? 'bg-sage/15 text-sage-deep' : 'bg-red-50 text-red-700'}`}>
              {bookingResult.ok ? '🎉 ' : '⚠️ '}
              {bookingResult.message}
            </p>
          )}
        </section>

        <TrustCheck providerId={id} onDone={() => getProvider(id).then(setProvider)} />
      </div>
    </div>
  )
}
