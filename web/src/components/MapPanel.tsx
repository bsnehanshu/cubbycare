import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Provider } from '../lib/api'
import { TIER_PIN_COLOR, TIER_META } from '../lib/labels'

function pinIcon(provider: Provider) {
  const color = TIER_PIN_COLOR[provider.verified_tier] ?? TIER_PIN_COLOR[0]
  return L.divIcon({
    className: '',
    html: `<div class="cubby-pin" style="background:${color}"><span>${provider.avatar}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 34],
    popupAnchor: [8, -28],
  })
}

function FitToResults({ providers }: { providers: Provider[] }) {
  const map = useMap()
  useEffect(() => {
    if (!providers.length) return
    const bounds = L.latLngBounds(providers.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(bounds.pad(0.2), { maxZoom: 15 })
  }, [providers, map])
  return null
}

export function MapPanel({
  providers,
  onOpen,
  pickMode,
  picked,
  onPick,
}: {
  providers: Provider[]
  onOpen?: (id: number) => void
  pickMode?: boolean
  picked?: { lat: number; lng: number } | null
  onPick?: (lat: number, lng: number) => void
}) {
  return (
    <MapContainer center={[37.7699, -122.4369]} zoom={12} className="z-0 h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {pickMode && onPick && <ClickPicker onPick={onPick} />}
      {picked && (
        <Marker
          position={[picked.lat, picked.lng]}
          icon={L.divIcon({
            className: '',
            html: `<div class="cubby-pin" style="background:#e8843c"><span>📍</span></div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 34],
          })}
        />
      )}
      {!pickMode && <FitToResults providers={providers} />}
      {providers.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p)}>
          <Popup>
            <div className="min-w-40">
              <p className="m-0 font-semibold">
                {p.avatar} {p.name}
              </p>
              <p className="m-0 text-xs" style={{ color: TIER_META[p.verified_tier]?.color }}>
                {TIER_META[p.verified_tier]?.icon} {TIER_META[p.verified_tier]?.label}
              </p>
              {onOpen && (
                <button
                  onClick={() => onOpen(p.id)}
                  className="mt-1.5 cursor-pointer rounded-full bg-marigold px-3 py-1 text-xs font-bold text-white"
                >
                  View details
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng)
    map.on('click', handler)
    return () => {
      map.off('click', handler)
    }
  }, [map, onPick])
  return null
}
