// The always-present, collapsed summary of what the retriever did — one line at
// the top of every answer. Expands into the full trace (ContextPanel).
//
// It lives inside the answer rather than on its own rail destination for the
// same reason the posture header lives in the shell: a fact the user has to go
// looking for is a fact the product does not really stand behind.

import { useState } from 'react'
import ContextPanel from './ContextPanel.jsx'
import '../styles/context.css'

const n = v => v.toLocaleString()

export default function ContextStrip({ ctx, onToggle, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const withheld = ctx.policy.reduce((a, p) => a + p.count, 0)
  const pct = ctx.budget.over ? 100 : ctx.budget.pct

  return (
    <div className="ctx">
      <button className="ctx-bar" onClick={() => setOpen(o => !o)}
        aria-expanded={open} aria-label="Context assembly for this answer">
        <span className="k">context</span>
        <span>
          <span className="n">{n(ctx.considered.rows)}</span> rows considered
          <span className="sep"> → </span>
          <span className="n">{ctx.selected.length}</span> selected
        </span>
        <span className="ctx-meter" title={`${n(ctx.budget.used)} / ${n(ctx.budget.cap)} tokens`}>
          <i className={ctx.budget.over ? 'over' : ''} style={{ width: `${pct}%` }} />
        </span>
        <span className="n">{n(ctx.budget.used)}</span>
        <span className="sep">/ {n(ctx.budget.cap)} tok</span>
        {withheld > 0 && <span className="withheld">⊘ {withheld} withheld by policy</span>}
        {!!ctx.evicted.length && <span className="withheld">⚑ {ctx.evicted.length} did not fit</span>}
        <span className="grow" />
        <span className="caret">{open ? 'collapse ▴' : 'show the trace ▾'}</span>
      </button>
      {open && <ContextPanel ctx={ctx} onToggle={onToggle} />}
    </div>
  )
}

// The caveat line that hangs under the answer. It is generated from what the
// context actually omitted, so it changes when the toggles do — an answer whose
// blind spots are stated is a different artefact from one that isn't.
export function ContextCaveats({ ctx }) {
  if (!ctx.caveats.length) return null
  return (
    <div className="ctx-caveats">
      {ctx.caveats.map(c => (
        <div key={c.key} className={`ctx-caveat ${c.tone}`}>
          <span className="dot" />
          <span>{c.text}</span>
        </div>
      ))}
    </div>
  )
}
