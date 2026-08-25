import { useEffect, useState } from 'react'
import { SearchView } from './components/SearchView'
import { ProviderDetailView } from './components/ProviderDetail'
import { RegisterWizard } from './components/RegisterWizard'
import { ConciergeDrawer } from './components/ConciergeDrawer'

type Route = { view: 'search' } | { view: 'provider'; id: number } | { view: 'register' }

function parseHash(): Route {
  const h = window.location.hash
  const providerMatch = h.match(/^#\/p\/(\d+)/)
  if (providerMatch) return { view: 'provider', id: Number(providerMatch[1]) }
  if (h.startsWith('#/register')) return { view: 'register' }
  return { view: 'search' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (hash: string) => {
    window.location.hash = hash
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-ink/8 bg-paper px-5 py-3">
        <button onClick={() => go('/')} className="flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-black tracking-tight">cubby</span>
          <span className="text-xl">🧸</span>
          <span className="font-display text-2xl font-black tracking-tight text-marigold-deep">care</span>
        </button>
        <p className="hidden text-sm text-ink-soft md:block">childcare you can trust, all over San Francisco</p>
        <button
          onClick={() => go('/register')}
          className="rounded-full border-2 border-ink px-4 py-1.5 text-sm font-bold transition hover:bg-ink hover:text-paper"
        >
          I'm a provider
        </button>
      </header>

      <main className="min-h-0 flex-1">
        {route.view === 'search' && <SearchView onOpen={(id) => go(`/p/${id}`)} />}
        {route.view === 'provider' && <ProviderDetailView id={route.id} onBack={() => go('/')} />}
        {route.view === 'register' && <RegisterWizard onDone={(id) => go(`/p/${id}`)} />}
      </main>

      <ConciergeDrawer onOpenProvider={(id) => go(`/p/${id}`)} />
    </div>
  )
}
