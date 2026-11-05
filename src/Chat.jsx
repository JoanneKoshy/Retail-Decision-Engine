import { useEffect, useRef, useState } from 'react'
import './chat.css'

const SUGGESTIONS = [
  'Should we promote FOODS_3_090 in CA_3?',
  'Which items are most price-sensitive?',
  'Why do promotions lose money?',
  'What goes well with cilantro?',
]

// Minimal formatting: **bold**, bullet lines and line breaks. Built as React elements, never raw HTML.
function Formatted({ text }) {
  return String(text)
    .split('\n')
    .map((line, i) => {
      const bullet = /^\s*[-*•]\s+/.test(line)
      const parts = line.replace(/^\s*[-*•]\s+/, '').split(/(\*\*[^*]+\*\*)/g)
      const content = parts.map((p, j) => (p.startsWith('**') && p.endsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p))
      if (!line.trim()) return <div key={i} className="chat-gap" />
      return bullet ? <div key={i} className="chat-bullet">• {content}</div> : <div key={i}>{content}</div>
    })
}

export default function Chat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy, open])

  async function send(text) {
    const q = (text ?? input).trim()
    if (!q || busy) return
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
      setMessages([...next, { role: 'assistant', content: data.reply, sources: data.sources }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `Sorry, the assistant is unavailable: ${e.message}. Is the chat server running (npm run server)?`, error: true }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)}>
          <span className="chat-fab-icon">✦</span> Ask the engine
        </button>
      )}
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Ask the engine">
          <div className="chat-head">
            <div>
              <div className="chat-title">Ask the engine</div>
              <div className="chat-sub">Answers come from the project's result files</div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className="chat-body">
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>Ask about any item, promotion, SKU or product pair. For example:</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chat-suggest" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role} ${m.error ? 'error' : ''}`}>
                {m.role === 'assistant' ? <Formatted text={m.content} /> : m.content}
                {m.sources?.length > 0 && <div className="chat-sources">Data: {m.sources.join('; ')}</div>}
              </div>
            ))}
            {busy && <div className="chat-msg assistant typing"><span /><span /><span /></div>}
            <div ref={endRef} />
          </div>

          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send() }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" disabled={busy} />
            <button type="submit" disabled={busy || !input.trim()}>Send</button>
          </form>
          <div className="chat-foot">AI answers can be wrong. Check the numbers on the pages.</div>
        </div>
      )}
    </>
  )
}
