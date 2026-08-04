import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DIMENSIONS, CAPTURE_METHODS, CONFIDENCE,
  profileFor, signalsByDimension, captureMix, unvoiced,
} from '../mock/profile.js'
import { patients, patientList } from '../mock/patients.js'
import '../styles/profile.css'

// Profile — who the person is, not just what their labs say. Worries, the way
// they show up, what they'll let leave the machine. The point of the view is not
// the attributes; it is that every attribute is shown WITH ITS PROVENANCE — how it
// was captured, how sure we are, and what the agent does with it. That mirrors the
// preference model's `elicited` line and the literacy profile: transparency about
// the soft signal is the same discipline as transparency about the cloud calls.
//
// Two people are held side by side because they are opposites on the axis that
// matters most for capture — Ravi gives the system a lot and audits it; Maya gives
// it little on purpose. The contrast is the argument.

const METHOD_ICON = {
  stated: '“”', 'inferred:query': '⁘', 'affect:wearable': '♥', behavior: '↻',
  ema: '⊙', posture: '⚿', onboarding: '✦',
}

export default function Profile() {
  const [params, setParams] = useSearchParams()
  const who = patients[params.get('p')] ? params.get('p') : 'ravi'
  const setWho = (id) => { params.set('p', id); setParams(params, { replace: true }) }

  const p = profileFor(who)
  const person = patients[who]
  const groups = signalsByDimension(who)
  const mix = captureMix(who)
  const buried = unvoiced(who)

  return (
    <div className="page profile-page">
      <p className="eyebrow">Profile · psychographic layer</p>

      {/* Who — the toggle IS the two-patient story. */}
      <div className="pf-switch" role="tablist" aria-label="sample patient">
        {patientList.map(pt => (
          <button
            key={pt.id}
            role="tab"
            aria-selected={who === pt.id}
            className={`pf-tab ${who === pt.id ? 'on' : ''}`}
            onClick={() => setWho(pt.id)}
          >
            <b>{pt.name}</b>
            <span className="faint">{pt.age} · {pt.pronouns} · {pt.archetype}</span>
          </button>
        ))}
      </div>

      <div className="pf-lede">
        <p className="serif pf-summary">{p.summary}</p>
        <div className="pf-posture">
          <PostureChip person={person} />
          <span className="note" style={{ margin: 0 }}>
            {person.store === 'full'
              ? 'A dense record — the profile is read from a lot of behaviour.'
              : 'A deliberately small record — the profile is read from a little, on purpose.'}
          </span>
        </div>
      </div>

      {/* The headline the whole data-capture story turns on: how much of this was
          earned passively vs. asked for. Passive-before-manual, made countable. */}
      <CaptureMix mix={mix} />

      {/* What the data implies that the person has NOT said — the most distinctive
          thing the profile holds, so it leads. */}
      {buried.length > 0 && (
        <section className="pf-unvoiced card">
          <div className="pf-unvoiced-head">
            <span className="pf-flag">unvoiced</span>
            <h3>What the data implies that {person.name.split(' ')[0]} hasn’t said</h3>
          </div>
          <p className="note" style={{ marginTop: 0 }}>
            Held as a hypothesis, never asserted. This is the ayuOS analogue of a buried concern:
            the record points at it, the person hasn’t, and the agent’s job is to raise it as a
            question at the right moment — not to announce it.
          </p>
          {buried.map((s, i) => <SignalCard key={i} s={s} person={person} unvoiced />)}
        </section>
      )}

      {/* The profile proper, by dimension. */}
      {groups.map(g => (
        <section key={g.key} className="pf-dim">
          <div className="pf-dim-head">
            <h3>{g.label}</h3>
            <span className="note" style={{ margin: 0 }}>{g.blurb}</span>
          </div>
          {g.signals.filter(s => !s.unvoiced).map((s, i) => <SignalCard key={i} s={s} person={person} />)}
        </section>
      ))}

      {/* How we'd weave more in. */}
      <Roadmap p={p} person={person} />

      <p className="note" style={{ marginTop: 26 }}>
        The psychographic profile is a user-visible, editable object in the <span className="mono">ayuos</span>{' '}
        schema — never an inferred shadow profile. Every attribute above carries how it was captured and
        how sure we are, and can be corrected or deleted; nothing here left the device
        (see <span className="mono">docs/data-capture.md</span> · <span className="mono">docs/epistemics.md</span>).
      </p>
    </div>
  )
}

function PostureChip({ person }) {
  const t = person.posture.tone // 'local' | 'egress'
  return (
    <span className={`pf-posture-chip tone-${t}`} title="egress posture — itself a trust signal">
      <span className="dot" />
      {person.posture.deployment} · {person.posture.inference}
    </span>
  )
}

function CaptureMix({ mix }) {
  return (
    <div className="pf-mix card">
      <div className="pf-mix-bar" aria-hidden>
        <span className="seg passive" style={{ width: `${mix.passivePct}%` }} />
        <span className="seg active" style={{ width: `${100 - mix.passivePct}%` }} />
      </div>
      <div className="pf-mix-legend">
        <span><i className="sw passive" /> {mix.passive} captured passively</span>
        <span><i className="sw active" /> {mix.active} asked for</span>
        <span className="faint">
          {mix.passivePct}% inferred without a form — passive before manual is the governing principle.
        </span>
      </div>
    </div>
  )
}

// One captured attribute, shown with the whole provenance chain visible.
function SignalCard({ s, person, unvoiced: isUnvoiced }) {
  const [open, setOpen] = useState(false)
  const method = CAPTURE_METHODS[s.capturedVia] || {}
  const conf = CONFIDENCE[s.confidence] || {}
  return (
    <div className={`pf-signal card ${isUnvoiced ? 'is-unvoiced' : ''}`}>
      <div className="pf-signal-top">
        <span className="pf-signal-label">{s.label}</span>
        <span className={`pf-conf c-${s.confidence}`} title={conf.note}>{conf.label}</span>
      </div>
      <p className="pf-signal-detail">{s.detail}</p>

      {/* Provenance line — the point of the whole surface. */}
      <div className="pf-prov">
        <span className={`pf-method ${method.passive ? 'passive' : 'active'}`} title={method.note}>
          <span className="mi" aria-hidden>{METHOD_ICON[s.capturedVia] || '·'}</span>
          {method.label}
          <span className="faint"> · {method.passive ? 'passive' : 'asked'}</span>
        </span>
        <span className="pf-first faint mono">first seen {s.firstObserved}</span>
        {s.evidence?.length > 0 && (
          <button className="pf-ev-toggle chip-link" onClick={() => setOpen(o => !o)}>
            {s.evidence.length} evidence {open ? '▾' : '▸'}
          </button>
        )}
      </div>

      {open && (
        <ul className="pf-ev-list">
          {s.evidence.map((e, i) => <li key={i} className={`pf-ev kind-${e.kind}`}><span className="pf-ev-kind">{e.kind}</span> {e.ref}</li>)}
        </ul>
      )}

      {s.usedFor && (
        <div className="pf-usedfor">
          <span className="fl">used for</span>
          <span>{s.usedFor}</span>
        </div>
      )}
    </div>
  )
}

function Roadmap({ p, person }) {
  return (
    <section className="pf-roadmap">
      <div className="pf-dim-head">
        <h3>How we’d weave more in</h3>
        <span className="note" style={{ margin: 0 }}>
          For each soft signal: what we have today, the next increment, and — because this is sensitive —
          the consent it’s bound to.
        </span>
      </div>
      <div className="pf-road-grid">
        {p.captureRoadmap.map((r, i) => (
          <div key={i} className="pf-road card">
            <div className="pf-road-head">
              <span className="pf-road-signal">{r.signal}</span>
              <span className={`pf-method-mini ${CAPTURE_METHODS[r.haveMethod]?.passive ? 'passive' : 'active'}`}>
                {CAPTURE_METHODS[r.haveMethod]?.label || r.haveMethod}
              </span>
            </div>
            <div className="pf-road-row">
              <span className="fl">today</span>
              <span>{r.have}</span>
            </div>
            <div className="pf-road-row next">
              <span className="fl">next</span>
              <span>{r.next} <span className="pf-next-method">via {CAPTURE_METHODS[r.nextMethod]?.label || r.nextMethod}</span></span>
            </div>
            <div className="pf-road-row">
              <span className="fl">consent</span>
              <span className="faint">{r.consent}</span>
            </div>
            <p className="pf-road-note">{r.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
