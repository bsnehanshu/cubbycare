import { useEffect, useRef, useState } from 'react'
import { streamChat, type ChatMessage } from '../lib/api'

type Entry =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'tool'; name: string; detail: string }

const SUGGESTIONS = [
  'Find a Saturday sitter near the Mission for my 2-year-old',
  'I need backup care in the next 2 hours for my 18-month-old',
  'Licensed centres with outdoor play for a 4-year-old',
]

export function ConciergeDrawer({ onOpenProvider }: { onOpenProvider: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [entries])

  const send = async (text: string) => {
    if (!text.trim() || busy) return
    setBusy(true)
    setInput('')
    const newHistory: ChatMessage[] = [...history, { role: 'user', content: text }]
    setHistory(newHistory)
    setEntries((e) => [...e, { kind: 'user', text }])

    let assistantText = ''
    let hasAssistantEntry = false
    try {
      for await (const ev of streamChat(newHistory)) {
        if (ev.type === 'text') {
          assistantText += ev.delta
          setEntries((e) => {
            const copy = [...e]
            if (hasAssistantEntry && copy[copy.length - 1]?.kind === 'assistant') {
              copy[copy.length - 1] = { kind: 'assistant', text: assistantText }
            } else {
              copy.push({ kind: 'assistant', text: assistantText })
              hasAssistantEntry = true
            }
            return copy
          })
        } else if (ev.type === 'tool') {
          hasAssistantEntry = false
          assistantText = ''
          setEntries((e) => [...e, { kind: 'tool', name: ev.name, detail: JSON.stringify(ev.input) }])
        } else if (ev.type === 'error') {
          setEntries((e) => [...e, { kind: 'assistant', text: `⚠️ ${ev.message}` }])
        }
      }
      if (assistantText) setHistory((h) => [...h, { role: 'assistant', content: assistantText }])
    } finally {
      setBusy(false)
    }
  }

  // Turn "provider #12" / "[provider:12]" mentions into deep links; drop stray markdown bold
  const renderText = (rawText: string) => {
    const text = rawText.replace(/\*\*/g, '')
    const parts = text.split(/\[provider:(\d+)\]/g)
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <button key={i} onClick={() => onOpenProvider(Number(part))} className="font-bold text-marigold-deep underline">
          view profile →
        </button>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 font-bold text-paper shadow-(--shadow-pop) transition hover:scale-105"
        >
          <span className="text-xl">🧸</span> Ask the concierge
        </button>
      )}

      {open && (
        <div className="drawer-up fixed right-0 bottom-0 z-40 flex h-[85vh] w-full flex-col rounded-t-3xl border border-ink/10 bg-paper shadow-(--shadow-pop) sm:right-5 sm:bottom-5 sm:h-[600px] sm:w-105 sm:rounded-3xl">
          <div className="flex items-center justify-between rounded-t-3xl bg-ink px-4 py-3 text-paper">
            <p className="font-display font-bold">🧸 CubbyCare Concierge</p>
            <button onClick={() => setOpen(false)} className="rounded-full px-2 text-xl hover:bg-white/10">×</button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {!entries.length && (
              <div className="space-y-2">
                <p className="text-sm text-ink-soft">
                  G'day! Tell me what you need — age, neighborhood, timing — and I'll search the registry for you.
                </p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="block w-full rounded-2xl border border-ink/10 bg-white p-3 text-left text-sm transition hover:border-marigold hover:bg-blush/20">
                    💬 {s}
                  </button>
                ))}
              </div>
            )}

            {entries.map((entry, i) =>
              entry.kind === 'user' ? (
                <p key={i} className="ml-8 rounded-2xl rounded-br-md bg-marigold px-3.5 py-2.5 text-sm font-medium text-white">
                  {entry.text}
                </p>
              ) : entry.kind === 'tool' ? (
                <p key={i} className="flex items-center gap-2 rounded-xl border border-sky/25 bg-sky/8 px-3 py-2 font-mono text-xs text-sky">
                  <span className="animate-pulse">🔧</span>
                  <span className="font-bold">{entry.name}</span>
                  <span className="truncate opacity-70">{entry.detail}</span>
                </p>
              ) : (
                <p key={i} className="mr-8 rounded-2xl rounded-bl-md border border-ink/8 bg-white px-3.5 py-2.5 text-sm whitespace-pre-wrap">
                  {renderText(entry.text)}
                </p>
              ),
            )}

            {busy && (
              <p className="flex gap-1 px-2 text-ink-soft">
                <span className="think-dot">●</span><span className="think-dot">●</span><span className="think-dot">●</span>
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input) }}
            className="flex gap-2 border-t border-ink/10 p-3"
          >
            <input
              className="flex-1 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm"
              placeholder="What kind of care do you need?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={busy || !input.trim()}
              className="rounded-full bg-marigold px-4 py-2 font-bold text-white disabled:opacity-40">
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}
