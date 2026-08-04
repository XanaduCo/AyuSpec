import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession, useAttention, useExperiments } from '../state/store.js'
import { useDrawer } from '../components/Drawer.jsx'
import { useCapture } from '../components/Capture.jsx'
import { anchor, daysBetween, CRITERIA } from '../state/fixtures.js'
import { usePins, pin, unpin, PIN_CAP, PINNABLE, pinnableById, markerData } from '../state/pins.js'
import '../styles/pins.css'

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
//
// One section sits ABOVE those lists and is different in kind: pins. Everything
// else on this page is the system's idea of what needs you; a pin is the user's
// own declaration — "I am actively watching this." Explicit, finite (soft cap),
// editable, and held to the same anti-dashboard contract: the card shows the
// underlying signal and its trend vs. the relevant baseline, never a derived
// score or a streak, and pins never reorder themselves. See docs/frontend.md
// §"Pinned: user-declared attention"; state lives in ../state/pins.js.

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

      <PinnedSection />

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

// ---------------------------------------------------------------------------
// Pinned — user-declared attention. Cards keep the order they were pinned in;
// the number shown is the number in the record, in mono, with its baseline.
// ---------------------------------------------------------------------------

const fmt = v => (Number.isInteger(v) ? String(v) : v.toFixed(1))

function PinnedSection() {
  const pinned = usePins()
  const experiments = useExperiments()
  const navigate = useNavigate()
  const [picking, setPicking] = useState(false)
  const [capTried, setCapTried] = useState(false)

  const candidates = PINNABLE.filter(p => !pinned.includes(p.id))
  const atCap = pinned.length >= PIN_CAP

  const tryPin = id => {
    if (pin(id)) setCapTried(false)
    else setCapTried(true)
  }

  return (
    <Section
      title={`Pinned · ${pinned.length} of ${PIN_CAP}`}
      sub="The one part of this page you put here yourself. A pin says “I am actively watching this” — no score on it, no streak, just the signal against its baseline. Pins keep the order you pinned them in, and pinning changes nothing but what renders here.">
      {pinned.length === 0 && (
        <p className="note" style={{ margin: '0 0 4px' }}>
          Nothing pinned — a fine state. Pins are for things you are actively watching,
          and there is no obligation to watch anything.
        </p>
      )}
      <div className="pin-grid">
        {pinned.map(id => {
          const desc = pinnableById[id]
          if (!desc) return null
          return desc.type === 'experiment'
            ? <ExperimentPin key={id} desc={desc} exp={experiments.find(e => e.id === id)} onGo={() => navigate('/experiments')} />
            : <MarkerPin key={id} desc={desc} onGo={() => navigate('/explore')} />
        })}
      </div>
      <div className="pin-add">
        <button className="btn ghost sm" onClick={() => { setPicking(v => !v); setCapTried(false) }}>
          {picking ? 'Close' : 'Pin something'}
        </button>
        {picking && (
          <div className="pin-picker">
            {capTried && atCap && (
              <p className="pin-cap-note">
                {PIN_CAP} pins is the cap. This section is a queue, not a wall — if everything
                is pinned, nothing is being watched. Let one go first.
              </p>
            )}
            {candidates.map(c => (
              <div key={c.id} className="pin-cand">
                <b>{c.pickLabel}</b>
                <span className="why">{c.pickDetail}</span>
                <button className="chip-link" onClick={() => tryPin(c.id)}>pin</button>
              </div>
            ))}
            {candidates.length === 0 && (
              <p className="note" style={{ margin: 0 }}>Everything pinnable in the demo is already pinned.</p>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

function ExperimentPin({ desc, exp, onGo }) {
  if (!exp) return null
  const title = desc.pickLabel.replace(/\s*\(.*\)$/, '')
  const of = exp.adherence?.of ?? 30
  const day = Math.min(daysBetween(exp.started, anchor) + 1, of)
  const base = exp.baseline?.stats
  const interv = exp.intervention?.stats
  const crit = CRITERIA[exp.id]
  const delta = base && interv ? interv.mean - base.mean : null
  const closed = exp.status === 'complete'
  const unit = exp.baseline?.unit || ''
  return (
    <div className="pin-card">
      <div className="pin-head">
        <span className="pin-type">experiment</span>
        <span className="pin-name">{title}</span>
        <button className="pin-unpin" onClick={() => unpin(desc.id)}>unpin</button>
      </div>
      {!closed && base && interv && (
        <div className="pin-exp-rows">
          <div className="pin-exp-row"><span className="k">Protocol</span><span className="v">day {day} of {of}</span></div>
          {exp.adherence && (
            <div className="pin-exp-row"><span className="k">Adherence</span><span className="v">{exp.adherence.done}/{of} days logged</span></div>
          )}
          <div className="pin-exp-row">
            <span className="k">{exp.metrics?.[0]?.name || 'Primary metric'} · mean</span>
            <span className="v">{fmt(base.mean)} → {fmt(interv.mean)} {unit} ({delta >= 0 ? '+' : '−'}{fmt(Math.abs(delta))})</span>
          </div>
          {crit && (
            <div className="pin-exp-row"><span className="k">Pre-registered bar</span><span className="v">−{crit.threshold} {crit.unit}</span></div>
          )}
        </div>
      )}
      {closed && (
        <div className="pin-done">
          This experiment has closed — verdict: <b>{exp.verdict}</b>. The result now lives in
          Experiments and in the record; a pin is for something still being watched. Let it go?
          {' '}<button className="chip-link" onClick={() => unpin(desc.id)}>unpin it</button>
        </div>
      )}
      <div className="pin-foot">
        <button className="chip-link" onClick={onGo}>open in Experiments →</button>
        {!closed && exp.confounders?.length > 0 && (
          <span className="faint mono" style={{ fontSize: 11 }}>
            {exp.confounders.length} confounder{exp.confounders.length > 1 ? 's' : ''} flagged
          </span>
        )}
      </div>
    </div>
  )
}

function MarkerPin({ desc, onGo }) {
  const d = markerData(desc)
  const compare = d.kind === 'lab' ? d.prior : d.baseline
  const delta = compare != null ? d.latest - compare : null
  const rangeText = d.low != null && d.high != null ? `ref ${d.low}–${d.high} ${d.unit}`
    : d.high != null ? `ref ≤ ${d.high} ${d.unit}`
      : d.low != null ? `ref ≥ ${d.low} ${d.unit}` : null
  return (
    <div className="pin-card">
      <div className="pin-head">
        <span className="pin-type">marker</span>
        <span className="pin-name">{d.name}</span>
        <button className="pin-unpin" onClick={() => unpin(desc.id)}>unpin</button>
      </div>
      <div className="pin-val num">
        {fmt(d.latest)}<span className="u">{d.unit}</span>
        {delta != null && (
          <span className="delta">{delta >= 0 ? '+' : '−'}{fmt(Math.abs(delta))} {desc.baselineNote}</span>
        )}
        {d.flag !== 'ok' && <span className="pin-flag">{d.flag === 'high' ? 'above range' : 'below range'}</span>}
      </div>
      <Spark values={d.values} refHigh={d.high} />
      <p className="pin-meta">
        {d.spanLabel}
        {rangeText ? <> · <span className="mono">{rangeText}</span></> : d.source ? <> · <span className="mono">{d.source}</span></> : null}
      </p>
      <div className="pin-foot">
        <button className="chip-link" onClick={onGo}>open in Explore →</button>
      </div>
    </div>
  )
}

// Hand-rolled sparkline, same visual language as the Timeline's: an ink line,
// no fill, no axis. The dashed line is the as-reported reference limit — the
// only annotation a pin card is allowed.
function Spark({ values, refHigh }) {
  if (!values || values.length < 2) return null
  let min = Math.min(...values), max = Math.max(...values)
  if (refHigh != null) { min = Math.min(min, refHigh); max = Math.max(max, refHigh) }
  const rng = max - min || 1
  const X = i => (i / (values.length - 1)) * 100
  const Y = v => 27 - ((v - min) / rng) * 24
  const dPath = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(2)},${Y(v).toFixed(2)}`).join(' ')
  return (
    <svg className="pin-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      {refHigh != null && (
        <line className="ref" x1="0" x2="100" y1={Y(refHigh).toFixed(2)} y2={Y(refHigh).toFixed(2)}
          strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      )}
      <path className="line" d={dPath} fill="none" strokeWidth="1.4"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
