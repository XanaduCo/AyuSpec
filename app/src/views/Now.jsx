import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession, useAttention } from '../state/store.js'
import { useDrawer } from '../components/Drawer.jsx'
import { useCapture } from '../components/Capture.jsx'
import { anchor } from '../state/fixtures.js'

// Now — the re-entry point the app did not have.
//
// Every other view answers a question you came in with. This one answers the
// question you arrive with when you have been away for a month and don't know
// what to ask: *what, if anything, needs me?* It is deliberately not a
// dashboard — no scores, no rings, no streaks. Five honest lists:
//
//   1. things holding for a decision (including anything the system refuses to
//      decide on your behalf),
//   2. findings that appeared since you last looked,
//   3. re-tests and screenings that are actually due,
//   4. what the record is missing — stated out loud rather than left as an
//      absence you have to notice,
//   5. what you did this session, and what it changed.
//
// Nothing here nags. Every item can be snoozed, snoozing leaves a trace instead
// of deleting the item, and no functionality is gated behind clearing it.

const KIND = {
  block: { glyph: '⨯', label: 'held', tone: 'block' },
  error: { glyph: '⚠', label: 'source error', tone: 'warn' },
  decision: { glyph: '◐', label: 'needs you', tone: 'brand' },
  finding: { glyph: '✦', label: 'new', tone: 'brand' },
  due: { glyph: '◷', label: 'due', tone: 'neutral' },
}

export default function Now() {
  const { state, actions } = useSession()
  const { open, gaps, filled, all } = useAttention()
  const navigate = useNavigate()
  const drawer = useDrawer()
  const capture = useCapture()
  const [showHandled, setShowHandled] = useState(false)

  const run = a => {
    const act = a.action || {}
    if (act.act === 'resync-whoop') { actions.resyncConnector('whoop'); navigate('/data'); return }
    if (act.act === 'summarize-mri') { actions.summarizeMRI(); return }
    if (act.capture) { capture?.open(act.capture); return }
    if (act.record) { drawer?.openRecord(act.record); return }
    if (act.to) navigate(act.to)
    else if (a.to) navigate(a.to)
  }

  const decisions = open.filter(a => a.kind === 'block' || a.kind === 'decision' || a.kind === 'error')
  const findings = open.filter(a => a.kind === 'finding')
  const due = open.filter(a => a.kind === 'due')
  const handled = all.filter(a => a.state !== 'open')

  return (
    <div className="page now-page">
      <p className="eyebrow">Now · Ravi Mehta · {anchor}</p>
      <div className="lede">
        {open.length === 0
          ? 'Nothing needs you.'
          : `${open.length} thing${open.length > 1 ? 's' : ''} worth a minute.`}
      </div>
      <p className="muted" style={{ marginTop: 8, maxWidth: '66ch' }}>
        There is no score here and nothing to keep a streak on. This is the list
        of things that changed, are due, or are waiting on a decision only you can make.
        Snoozing is a first-class answer.
      </p>

      {decisions.length > 0 && (
        <Section title="Waiting on you" sub="Nothing below is blocked — the app works fine if you ignore all of it.">
          {decisions.map(a => <Item key={a.id} a={a} onRun={run} onSnooze={actions.snoozeAttention} onDismiss={actions.resolveAttention} />)}
        </Section>
      )}

      {findings.length > 0 && (
        <Section title="New since you last looked" sub="Produced by things that landed in the record — not by a model volunteering opinions.">
          {findings.map(a => <Item key={a.id} a={a} onRun={run} onSnooze={actions.snoozeAttention} onDismiss={actions.resolveAttention} />)}
        </Section>
      )}

      {due.length > 0 && (
        <Section title="Due" sub="Computed against guidelines and the dates already in your record. Cheap, recurring, and the easiest thing in the product to ignore safely.">
          {due.map(a => <Item key={a.id} a={a} onRun={run} onSnooze={actions.snoozeAttention} onDismiss={actions.resolveAttention} />)}
        </Section>
      )}

      <Section
        title="What ayuOS does not know about you"
        sub="Stated out loud, because a gap you cannot see is one you will never fill — and because an answer built over a hole should say so.">
        <div className="gap-grid">
          {gaps.map(g => (
            <div key={g.id} className={`gap-card w-${g.weight}`}>
              <div className="gap-head">
                <b>{g.label}</b>
                <span className="gap-weight mono">{g.weight === 'high' ? 'matters most' : g.weight === 'moderate' ? 'worth filling' : 'nice to have'}</span>
              </div>
              <p className="gap-why">{g.why}</p>
              {g.fill
                ? <button className="btn ghost sm" onClick={() => (g.fill.capture ? capture?.open(g.fill.capture) : navigate(g.fill.to))}>{g.fill.label} →</button>
                : <span className="note" style={{ margin: 0 }}>No good path to fill this from here — it needs a clinic.</span>}
            </div>
          ))}
          {gaps.length === 0 && <p className="note">Every gap the demo tracks has been filled this session.</p>}
        </div>
        {filled.length > 0 && (
          <p className="note" style={{ marginTop: 12 }}>
            Filled this session: {filled.map(g => `${g.label} — ${g.how}`).join(' · ')}
          </p>
        )}
      </Section>

      {state.trace.length > 0 && (
        <Section title="What you did this session" sub="Every one of these changed something else in the app — follow a line to see where it landed.">
          <ol className="trace-list">
            {state.trace.map(t => (
              <li key={t.id}>
                <span className="trace-dot" />
                <span className="trace-t">{t.text}</span>
                {t.to && <button className="chip-link" onClick={() => navigate(t.to)}>see it →</button>}
              </li>
            ))}
          </ol>
          <p className="note" style={{ marginTop: 12 }}>
            This session lives in memory and resets when you reload the page — it is a demo, and
            pretending otherwise would be the one dishonest thing in it.
          </p>
        </Section>
      )}

      {handled.length > 0 && (
        <div className="handled">
          <button className="btn ghost sm" onClick={() => setShowHandled(v => !v)}>
            {showHandled ? 'Hide' : 'Show'} handled &amp; snoozed · {handled.length}
          </button>
          {showHandled && (
            <div className="handled-list">
              {handled.map(a => (
                <div key={a.id} className={`handled-row ${a.state}`}>
                  <span className="mono handled-state">{a.state === 'snoozed' ? 'snoozed' : 'done'}</span>
                  <span className="handled-title">{a.title}</span>
                  <span className="faint handled-note">{a.resolvedNote}</span>
                  {a.state === 'snoozed' && (
                    <button className="chip-link" onClick={() => actions.reopenAttention(a.id)}>bring back</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, sub, children }) {
  return (
    <section className="now-sec">
      <h3 className="now-sec-h">{title}</h3>
      {sub && <p className="now-sec-sub">{sub}</p>}
      {children}
    </section>
  )
}

function Item({ a, onRun, onSnooze, onDismiss }) {
  const k = KIND[a.kind] || KIND.finding
  return (
    <div className={`att-card tone-${k.tone}`}>
      <div className="att-side">
        <span className="att-glyph">{k.glyph}</span>
        <span className="att-kind mono">{k.label}</span>
      </div>
      <div className="att-main">
        <div className="att-head">
          <b className="att-title">{a.title}</b>
          <span className="att-when mono">{a.when}</span>
        </div>
        <p className="att-body">{a.body}</p>
        <div className="att-actions">
          {a.action && (
            <button className={`btn ${k.tone === 'block' ? 'block' : 'pri'} sm`} onClick={() => onRun(a)}>
              {a.action.label} →
            </button>
          )}
          {a.snoozable && <button className="btn ghost sm" onClick={() => onSnooze(a.id)}>Snooze 30 days</button>}
          {a.kind !== 'block' && <button className="btn ghost sm" onClick={() => onDismiss(a.id, 'Dismissed by you.')}>Dismiss</button>}
        </div>
      </div>
    </div>
  )
}
