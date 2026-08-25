import { useState } from 'react'
import {
  getMeta,
  registerProvider,
  submitCredentialImage,
  submitCredentialManual,
  type ProviderDetail,
} from '../lib/api'
import { AMENITY_META, AGE_BAND_META, DAY_LABELS } from '../lib/labels'
import { MapPanel } from './MapPanel'
import { TierBadge } from './TierBadge'
import { useEffect } from 'react'

type Basics = {
  type: 'individual' | 'center'
  name: string
  bio: string
  neighborhood: string
  address: string
  price_hint: string
  capacity: number
  spots_available: number
  license_number: string
}

const STEPS = ['Who you are', 'The basics', 'Your location', 'Care details', 'Credibility', 'Done'] as const

export function RegisterWizard({ onDone }: { onDone: (id: number) => void }) {
  const [step, setStep] = useState(0)
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])
  const [basics, setBasics] = useState<Basics>({
    type: 'individual', name: '', bio: '', neighborhood: 'mission', address: '',
    price_hint: '$$', capacity: 2, spots_available: 1, license_number: '',
  })
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)
  const [ageBands, setAgeBands] = useState<string[]>([])
  const [amenities, setAmenities] = useState<string[]>([])
  const [availability, setAvailability] = useState<Record<string, string[]>>({})
  const [created, setCreated] = useState<ProviderDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [manualCred, setManualCred] = useState({ kind: '', issuer: '', details: '' })

  useEffect(() => {
    getMeta().then((m) => setNeighborhoods(m.neighborhoods))
  }, [])

  const toggle = (list: string[], setList: (v: string[]) => void, key: string) =>
    setList(list.includes(key) ? list.filter((x) => x !== key) : [...list, key])

  const toggleSlot = (day: string, slot: string) =>
    setAvailability((av) => {
      const cur = av[day] ?? []
      return { ...av, [day]: cur.includes(slot) ? cur.filter((s) => s !== slot) : [...cur, slot] }
    })

  const createProvider = async () => {
    setBusy(true)
    setError(null)
    try {
      const p = await registerProvider({
        ...basics,
        license_number: basics.license_number || undefined,
        lat: pin?.lat, lng: pin?.lng,
        age_bands: ageBands, amenities, weekly_availability: availability,
      })
      setCreated(p)
      setStep(4)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setBusy(false)
    }
  }

  const uploadCert = async (file: File) => {
    if (!created) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const r = await submitCredentialImage(created.id, base64, file.type)
      setCreated(r.provider)
      const e = r.extraction
      setVerifyResult({
        ok: r.credential.status === 'verified',
        text: `Claude read your document: ${e.kind ?? 'credential'}${e.holder ? ` for ${e.holder}` : ''}${e.issuer ? `, issued by ${e.issuer}` : ''}${e.expiry ? `, expires ${e.expiry}` : ''}. Verdict: ${e.verdict}.`,
      })
    } catch (err) {
      setVerifyResult({ ok: false, text: String(err instanceof Error ? err.message : err) })
    } finally {
      setVerifying(false)
    }
  }

  const addManualCred = async () => {
    if (!created || !manualCred.kind) return
    setBusy(true)
    try {
      const r = await submitCredentialManual(created.id, manualCred)
      setCreated(r.provider)
      setManualCred({ kind: '', issuer: '', details: '' })
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2'
  const label = 'block text-sm font-semibold mb-1 mt-3'

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6">
      {/* progress */}
      <div className="mb-6 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-marigold' : 'bg-ink/10'}`}
            />
            <span className={`hidden text-[10px] font-semibold sm:block ${i === step ? 'text-marigold-deep' : 'text-ink-soft/60'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="rise-in rounded-(--radius-cubby) border border-ink/8 bg-white p-6 shadow-(--shadow-card)">
        {step === 0 && (
          <>
            <h1 className="font-display text-2xl font-bold">Join CubbyCare as a provider</h1>
            <p className="mt-1 text-ink-soft">Are you caring for kids yourself, or registering a centre?</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['individual', '🧑‍🍼', 'An individual', 'Nanny, sitter, family friend with credentials'],
                  ['center', '🏫', 'A centre', 'Daycare, preschool, family child care home'],
                ] as const
              ).map(([t, icon, title, blurb]) => (
                <button
                  key={t}
                  onClick={() => {
                    setBasics({ ...basics, type: t })
                    setStep(1)
                  }}
                  className={`rounded-2xl border-2 p-6 text-left transition hover:-translate-y-0.5 hover:shadow-(--shadow-pop) ${
                    basics.type === t ? 'border-marigold bg-blush/30' : 'border-ink/10'
                  }`}
                >
                  <span className="text-4xl">{icon}</span>
                  <p className="mt-2 font-display text-lg font-bold">{title}</p>
                  <p className="text-sm text-ink-soft">{blurb}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-display text-2xl font-bold">The basics</h1>
            <label className={label}>Name</label>
            <input className={input} value={basics.name} onChange={(e) => setBasics({ ...basics, name: e.target.value })} placeholder={basics.type === 'center' ? 'Sunny Days Preschool' : 'Sam Caregiver'} />
            <label className={label}>Short bio</label>
            <textarea className={input} rows={3} value={basics.bio} onChange={(e) => setBasics({ ...basics, bio: e.target.value })} placeholder="What makes your care special?" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Neighborhood</label>
                <select className={input} value={basics.neighborhood} onChange={(e) => setBasics({ ...basics, neighborhood: e.target.value })}>
                  {neighborhoods.map((n) => (
                    <option key={n} value={n}>{n.replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Street / area</label>
                <input className={input} value={basics.address} onChange={(e) => setBasics({ ...basics, address: e.target.value })} placeholder="Valencia St" />
              </div>
              <div>
                <label className={label}>Price range</label>
                <select className={input} value={basics.price_hint} onChange={(e) => setBasics({ ...basics, price_hint: e.target.value })}>
                  {['$', '$$', '$$$', '$$$$'].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Open spots right now</label>
                <input type="number" min={0} className={input} value={basics.spots_available} onChange={(e) => setBasics({ ...basics, spots_available: Number(e.target.value) })} />
              </div>
              {basics.type === 'center' && (
                <div className="sm:col-span-2">
                  <label className={label}>CA license number (optional — unlocks ★ Licensed tier)</label>
                  <input className={input} value={basics.license_number} onChange={(e) => setBasics({ ...basics, license_number: e.target.value })} placeholder="384001234" />
                </div>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-2xl font-bold">Drop a pin on your location</h1>
            <p className="mt-1 text-sm text-ink-soft">Tap the map where parents should find you. Skip to use your neighborhood's centre.</p>
            <div className="mt-4 h-80 overflow-hidden rounded-2xl border border-ink/10">
              <MapPanel providers={[]} pickMode picked={pin} onPick={(lat, lng) => setPin({ lat, lng })} />
            </div>
            {pin && <p className="mt-2 text-sm font-medium text-sage-deep">📍 Pinned at {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-display text-2xl font-bold">Care details</h1>
            <label className={label}>Ages you care for</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(AGE_BAND_META).map(([key, m]) => (
                <button key={key} onClick={() => toggle(ageBands, setAgeBands, key)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${ageBands.includes(key) ? 'border-marigold bg-blush' : 'border-ink/15 bg-white'}`}>
                  {m.icon} {m.label} <span className="opacity-60">({m.range})</span>
                </button>
              ))}
            </div>
            <label className={label}>Amenities</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(AMENITY_META).map(([key, m]) => (
                <button key={key} onClick={() => toggle(amenities, setAmenities, key)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${amenities.includes(key) ? 'border-sage-deep bg-sage/20' : 'border-ink/15 bg-white'}`}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            <label className={label}>Weekly availability</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map(([key, dayLabel]) => (
                <div key={key} className="flex-1 rounded-xl bg-cream/70 p-1.5 text-center">
                  <p className="text-xs font-bold">{dayLabel}</p>
                  {['am', 'pm'].map((slot) => (
                    <button key={slot} onClick={() => toggleSlot(key, slot)}
                      className={`mt-1 block w-full rounded-md py-0.5 text-[10px] font-bold transition ${availability[key]?.includes(slot) ? 'bg-marigold text-white' : 'bg-white text-ink-soft'}`}>
                      {slot.toUpperCase()}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {error}</p>}
          </>
        )}

        {step === 4 && created && (
          <>
            <h1 className="font-display text-2xl font-bold">Prove your credibility</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Upload a credential — CPR card, ECE degree, teaching certificate — and Claude will read and verify it on
              the spot. You can add more later.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-ink-soft">Current status:</span>
              <TierBadge tier={created.verified_tier} size="lg" />
            </div>

            <label className="mt-5 block cursor-pointer rounded-2xl border-2 border-dashed border-marigold/50 bg-blush/20 p-8 text-center transition hover:bg-blush/40">
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadCert(e.target.files[0])} />
              <span className="text-3xl">📄</span>
              <p className="mt-2 font-semibold">Drop your certificate here or click to upload</p>
              <p className="text-xs text-ink-soft">PNG, JPEG or WebP — verified by Claude in seconds</p>
            </label>

            {verifying && (
              <p className="mt-3 flex items-center gap-1 text-sm text-ink-soft">
                <span className="think-dot">●</span><span className="think-dot">●</span><span className="think-dot">●</span>
                <span className="ml-1">Claude is reading your document…</span>
              </p>
            )}
            {verifyResult && (
              <p className={`mt-3 rounded-xl p-3 text-sm font-medium ${verifyResult.ok ? 'bg-sage/15 text-sage-deep' : 'bg-red-50 text-red-700'}`}>
                {verifyResult.ok ? '✅ ' : '❌ '}{verifyResult.text}
              </p>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink-soft">Or enter one manually (stays “pending” until reviewed)</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input className={input} placeholder="Kind (e.g. CPR & First Aid)" value={manualCred.kind} onChange={(e) => setManualCred({ ...manualCred, kind: e.target.value })} />
                <input className={input} placeholder="Issuer" value={manualCred.issuer} onChange={(e) => setManualCred({ ...manualCred, issuer: e.target.value })} />
                <button onClick={addManualCred} disabled={busy || !manualCred.kind} className="rounded-xl bg-ink px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Add</button>
              </div>
            </details>

            <ul className="mt-4 space-y-1.5">
              {created.credentials.map((c) => (
                <li key={c.id} className="rounded-xl bg-paper p-2 text-sm">
                  {c.status === 'verified' ? '✅' : c.status === 'pending' ? '⏳' : '❌'} <b>{c.kind}</b>
                  {c.issuer && <span className="text-ink-soft"> · {c.issuer}</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 5 && created && (
          <div className="text-center">
            <span className="text-6xl">🎉</span>
            <h1 className="mt-3 font-display text-2xl font-bold">You're on the map, {created.name}!</h1>
            <div className="mt-3 flex justify-center"><TierBadge tier={created.verified_tier} size="lg" /></div>
            <p className="mt-3 text-ink-soft">Parents in {created.neighborhood} can now find you.</p>
            <button onClick={() => onDone(created.id)} className="mt-5 rounded-full bg-marigold px-6 py-3 font-bold text-white shadow-(--shadow-card) hover:bg-marigold-deep">
              See your public profile →
            </button>
          </div>
        )}

        {/* nav */}
        {step < 5 && step > 0 && (
          <div className="mt-6 flex justify-between border-t border-ink/8 pt-4">
            <button onClick={() => setStep(step - 1)} className="rounded-full px-4 py-2 font-semibold text-ink-soft hover:bg-cream">← Back</button>
            {step < 3 && (
              <button onClick={() => setStep(step + 1)} disabled={step === 1 && !basics.name}
                className="rounded-full bg-marigold px-5 py-2 font-bold text-white disabled:opacity-40">
                Continue →
              </button>
            )}
            {step === 3 && (
              <button onClick={createProvider} disabled={busy || !ageBands.length}
                className="rounded-full bg-marigold px-5 py-2 font-bold text-white disabled:opacity-40">
                {busy ? 'Creating…' : 'Create profile →'}
              </button>
            )}
            {step === 4 && (
              <button onClick={() => setStep(5)} className="rounded-full bg-marigold px-5 py-2 font-bold text-white">
                Finish →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
