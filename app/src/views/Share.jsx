import { useState, useMemo } from 'react'
import Modal from '../components/Modal.jsx'
import { useDrawer } from '../components/Drawer.jsx'
import {
  DOMAINS, SOURCES, RTYPES, WINDOWS, FORMATS,
  selectScope, buildPacket, seedConsentLog,
} from '../mock/shares.js'

// Share — compose a "sliver": a scoped, purpose-built view of the record. Two
// laws carry the screen. (1) Minimal disclosure by default: you pick exactly
// what's in, and see it before anything is produced. (2) The default sliver is a
// FILE, not a network call — only the hosted link transits the cloud, so it alone
// is amber and it alone is revocable. A file you've handed over can't be
// un-shared, and the consent log says so out loud (sharing.md).

const useSet = init => {
  const [set, setSet] = useState(new Set(init))
  const toggle = k => setSet(s => {
    const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n
  })
  return [set, toggle, setSet]
}

export default function Share() {
  const [domains, toggleDomain, setDomains] = useSet(['cardiac'])
  const [sources, toggleSource, setSources] = useSet([])
  const [types, toggleType] = useSet([])
  const [timeWindow, setTimeWindow] = useState('12m')
  const [format, setFormat] = useState('packet')
  const [purpose, setPurpose] = useState('')
  const [recipient, setRecipient] = useState('')
  const [log, setLog] = useState(seedConsentLog)
  const [packet, setPacket] = useState(null)

  const scope = { domains, sources, types, window: timeWindow }
  const included = useMemo(() => selectScope(scope), [domains, sources, types, timeWindow])
  const fmt = FORMATS.find(f => f.key === format)
  const canGenerate = included.length > 0 && purpose.trim() && recipient.trim()

  // The agent proposes a scope from a natural-language ask, then shows exactly
  // what's in/out before producing anything (sharing.md composition model).
  const proposePCP = () => {
    setDomains(new Set(['cardiac', 'metabolic']))
    setSources(new Set(['labs', 'wearables', 'notes']))
    setTimeWindow('12m')
    setPurpose('New PCP — establishing care')
    setRecipient('')
  }

  const scopeText = () => {
    const d = domains.size ? [...domains].join(', ') : 'all domains'
    const s = sources.size ? [...sources].join(', ') : 'all sources'
    return `${d} · ${s} · ${WINDOWS.find(w => w.key === timeWindow).label.toLowerCase()}`
  }

  const generate = () => {
    if (!canGenerate) return
    const entry = {
      id: `shr-${log.length + 1}`,
      created: 'just now',
      purpose: purpose.trim(),
      recipient: recipient.trim(),
      scope: scopeText(),
      count: included.length,
      format,
      egress: fmt.egress,
      expiry: fmt.egress ? '30 days' : null,
      revoked: false,
    }
    setLog(l => [entry, ...l])
    if (format === 'packet') setPacket(buildPacket(included))
  }

  const revoke = id => setLog(l => l.map(e => e.id === id ? { ...e, revoked: true } : e))

  return (
    <div className="page share-page">
      <p className="eyebrow">Share · Ravi Mehta</p>
      <div className="lede">Send a slice, not the whole record.</div>
      <p className="muted" style={{ marginTop: 8, maxWidth: '70ch' }}>
        A sliver is scoped, purpose-built, and — by default — a <b>file you transmit yourself</b>, with
        no outbound call from ayuOS. You see exactly what's in it before it's produced. Only the hosted
        link transits the cloud, so it's the only amber format and the only revocable one.
      </p>

      <div className="share-layout">
        {/* composer */}
        <div className="composer">
          <div className="card comp-card">
            <div className="comp-head">
              <span className="eyebrow">Scope</span>
              <button className="btn ghost sm" onClick={proposePCP} title="Let the agent propose a scope">
                ✧ What my new PCP needs
              </button>
            </div>

            <Picker label="Domain" opts={DOMAINS} sel={domains} onToggle={toggleDomain} />
            <Picker label="Source" opts={SOURCES} sel={sources} onToggle={toggleSource} />
            <Picker label="Resource type" opts={RTYPES} sel={types} onToggle={toggleType} />

            <div className="comp-field">
              <span className="fl">Time window</span>
              <div className="pick-row">
                {WINDOWS.map(w => (
                  <button key={w.key} className={`pick ${timeWindow === w.key ? 'on' : ''}`}
                    onClick={() => setTimeWindow(w.key)}>{w.label}</button>
                ))}
              </div>
            </div>
            <p className="note" style={{ margin: '4px 0 0' }}>
              Empty = everything in that dimension. Narrow to share less. Active conditions and
              medications stay in scope regardless of the window — they describe your current state.
            </p>
          </div>

          <div className="card comp-card">
            <span className="eyebrow">Purpose &amp; recipient</span>
            <label className="field" style={{ marginTop: 10 }}>
              <span className="fl">purpose <span className="faint">· recorded, required</span></span>
              <input className="txt" value={purpose} placeholder="e.g. cardiology consult 2025-08"
                onChange={e => setPurpose(e.target.value)} />
            </label>
            <label className="field">
              <span className="fl">recipient</span>
              <input className="txt" value={recipient} placeholder="a named provider, or “user-held”"
                onChange={e => setRecipient(e.target.value)} />
            </label>
          </div>

          <div className="card comp-card">
            <span className="eyebrow">Format</span>
            <div className="fmt-list">
              {FORMATS.map(f => (
                <label key={f.key} className={`fmt-opt ${format === f.key ? 'on' : ''} ${f.egress ? 'egress' : ''}`}>
                  <input type="radio" name="fmt" value={f.key} checked={format === f.key}
                    onChange={() => setFormat(f.key)} />
                  <span className="fmt-main">
                    <b>{f.label}</b>
                    <span className="fmt-sub mono">{f.sub}</span>
                  </span>
                  {f.egress
                    ? <span className="tier-badge egress"><span className="led" />leaves device</span>
                    : <span className="tier-badge local"><span className="led" />no egress</span>}
                </label>
              ))}
            </div>
            <div className={`callout ${fmt.egress ? 'egress' : 'local'}`} style={{ marginTop: 10 }}>
              <span className="k">{fmt.egress ? 'transits ayuOS Cloud · disclosed' : 'stays on device'}</span>
              <div>{fmt.note}</div>
            </div>
          </div>
        </div>

        {/* live preview — exactly what's included */}
        <aside className="preview">
          <div className="card preview-card">
            <div className="preview-head">
              <span className="eyebrow">Preview · exactly what's included</span>
              <span className="pv-count num">{included.length}</span>
            </div>
            {included.length === 0
              ? <p className="note">Nothing matches this scope — widen it to include something.</p>
              : <PreviewList items={included} />}
            <button className="btn pri" style={{ width: '100%', marginTop: 14 }}
              disabled={!canGenerate} onClick={generate}>
              {fmt.egress ? 'Review & generate link →' : `Generate ${fmt.label.toLowerCase()}`}
            </button>
            {!canGenerate && included.length > 0 &&
              <p className="note" style={{ textAlign: 'center', marginTop: 8 }}>
                Add a purpose and recipient to generate.
              </p>}
          </div>
        </aside>
      </div>

      {/* consent log */}
      <h3 style={{ margin: '34px 0 6px' }}>Consent log <span className="faint" style={{ fontWeight: 400, fontSize: 14 }}>· append-only</span></h3>
      <p className="note" style={{ marginTop: 0, marginBottom: 14, maxWidth: '70ch' }}>
        Every sliver you generate lands here permanently. A file-based share can't be un-shared —
        revocation is only meaningful for a hosted link, and the log is honest about the difference.
      </p>
      <div className="consent-log">
        {log.map(e => <ConsentRow key={e.id} e={e} onRevoke={revoke} />)}
      </div>

      {packet && (
        <Modal title="Doctor packet · preview" wide onClose={() => setPacket(null)}
          footer={<>
            <span className="note" style={{ marginRight: 'auto' }}>Rendered locally — no network call. Save as PDF and send it yourself.</span>
            <button className="btn ghost" onClick={() => setPacket(null)}>Close</button>
            <button className="btn pri" onClick={() => setPacket(null)}>⇩ Save PDF</button>
          </>}>
          <DoctorPacket p={packet} />
        </Modal>
      )}
    </div>
  )
}

function Picker({ label, opts, sel, onToggle }) {
  return (
    <div className="comp-field">
      <span className="fl">{label}</span>
      <div className="pick-row">
        {opts.map(o => (
          <button key={o.key} className={`pick ${sel.has(o.key) ? 'on' : ''}`}
            onClick={() => onToggle(o.key)}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

function PreviewList({ items }) {
  const drawer = useDrawer()
  return (
    <ul className="pv-list">
      {items.map(i => (
        <li key={i.id} className="pv-item">
          <button className="pv-open" onClick={() => drawer?.openRecord(i.id)} title="Open the record">
            <span className="pv-label">{i.label}</span>
            <span className="pv-meta mono">{i.type} · {i.date}</span>
          </button>
          <span className="pv-detail faint">{i.detail}</span>
        </li>
      ))}
    </ul>
  )
}

function DoctorPacket({ p }) {
  return (
    <div className="packet">
      <div className="packet-top">
        <div>
          <div className="packet-name serif">{p.patient}</div>
          <div className="mono faint" style={{ fontSize: 12 }}>Generated {p.generated} · self-tracked record via ayuOS</div>
        </div>
        <div className="packet-counts mono">
          {p.counts.labs} labs · {p.counts.conds} cond · {p.counts.meds} meds · {p.counts.imaging} imaging
        </div>
      </div>

      <PacketSection title="Summary & notable changes">
        <p className="packet-summary">{p.summary}</p>
        {p.notable.length > 0 && (
          <ul className="packet-notable">
            {p.notable.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        )}
      </PacketSection>

      {p.labs.length > 0 && (
        <PacketSection title="Labs">
          <table className="packet-labs num">
            <thead><tr><th>Analyte</th><th>Value</th><th>Range</th><th>Flag</th></tr></thead>
            <tbody>
              {p.labs.map(l => (
                <tr key={l.name} className={l.flag === 'high' ? 'abn' : ''}>
                  <td className="lab-name">{l.name}</td>
                  <td className="mono">{l.value} {l.unit}</td>
                  <td className="mono faint">{l.range}</td>
                  <td>{l.flag === 'high'
                    ? <span className="flag high">high</span>
                    : <span className="flag ok">ok</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PacketSection>
      )}

      {(p.conds.length > 0 || p.meds.length > 0) && (
        <PacketSection title="Conditions & medications">
          {p.conds.length > 0 && <ul className="packet-plain">{p.conds.map((c, i) => <li key={i}>{c}</li>)}</ul>}
          {p.meds.length > 0 && <ul className="packet-plain">{p.meds.map((m, i) => <li key={i}>{m}</li>)}</ul>}
          {p.family.length > 0 && <p className="note" style={{ marginTop: 6 }}>Family history — {p.family.join('; ')}.</p>}
        </PacketSection>
      )}

      {p.imaging.length > 0 && (
        <PacketSection title="Imaging">
          <ul className="packet-plain">{p.imaging.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </PacketSection>
      )}

      <PacketSection title="Questions to raise">
        <ol className="packet-q">{p.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
      </PacketSection>
    </div>
  )
}

function PacketSection({ title, children }) {
  return (
    <div className="packet-sec">
      <div className="packet-sec-h">{title}</div>
      {children}
    </div>
  )
}

function ConsentRow({ e, onRevoke }) {
  const fmt = FORMATS.find(f => f.key === e.format)
  return (
    <div className={`consent-row ${e.revoked ? 'revoked' : ''}`}>
      <div className="cr-main">
        <div className="cr-purpose">
          <b>{e.purpose}</b>
          {e.egress
            ? <span className="tier-badge egress" style={{ marginLeft: 8 }}><span className="led" />hosted link</span>
            : <span className="tier-badge local" style={{ marginLeft: 8 }}><span className="led" />file</span>}
          {e.revoked && <span className="revoked-tag">revoked</span>}
        </div>
        <div className="cr-meta">
          <span>→ {e.recipient}</span>
          <span className="faint mono">{e.scope} · {e.count} resources · {fmt.label}</span>
        </div>
      </div>
      <div className="cr-side">
        <span className="cr-time mono">{e.created}</span>
        {e.egress
          ? (e.revoked
              ? <span className="note" style={{ margin: 0 }}>expired</span>
              : <button className="btn ghost sm" onClick={() => onRevoke(e.id)}>Revoke link</button>)
          : <span className="cant-revoke" title="A file you've already handed over cannot be un-shared.">
              can't un-share a file
            </span>}
      </div>
    </div>
  )
}
