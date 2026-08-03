import { useState } from 'react'
import { streamGroups, files, TIERS, STATUS } from '../mock/connectors.js'

// Data sources — connector status for every source, with its tier made explicit.
// The load-bearing rule (tiers.md law 6): a bridged source is never shown without
// the free, zero-transit path it degrades to. Colour is the same law as the
// posture header — green = the data didn't transit anyone, amber = it did,
// PII-stripped and disclosed. Nothing here is ever silent.

export default function DataSources() {
  const groups = streamGroups()
  const directCount = [...streamGroups().flatMap(g => g.items), ...files].filter(s => s.tier !== 'bridged').length

  return (
    <div className="page ds-page">
      <p className="eyebrow">Data sources · Ravi Mehta</p>
      <div className="lede">Every source, and exactly how its data got here.</div>
      <p className="muted" style={{ marginTop: 8, maxWidth: '70ch' }}>
        <span className="tier-badge local" style={{ verticalAlign: 'middle' }}><span className="led" />direct</span> means
        the data went source → your store with nothing in between. <span className="tier-badge egress" style={{ verticalAlign: 'middle' }}><span className="led" />bridged</span> means
        a paid vendor retrieved it first — always disclosed, always with the free direct path it falls
        back to. {directCount} of {directCount + 1} sources are zero-transit.
      </p>

      {groups.map(g => (
        <section key={g.group} className="ds-group">
          <h3 className="ds-group-h">{g.group}</h3>
          <div className="ds-cards">
            {g.items.map(s => <StreamCard key={s.id} s={s} />)}
          </div>
        </section>
      ))}

      <section className="ds-group">
        <h3 className="ds-group-h">Files · local upload, no network</h3>
        <p className="note" style={{ marginTop: 0, marginBottom: 14, maxWidth: '70ch' }}>
          Drop a file and it is parsed on-device — the parse never makes a network call, in any tier.
          Re-importing is safe: everything is deduped by content hash (ingestion/index.md).
        </p>
        <div className="ds-cards ds-files">
          {files.map(f => <FileCard key={f.id} f={f} />)}
        </div>
      </section>

      <p className="note" style={{ marginTop: 26 }}>
        Adapters, never interfaces — Epic, the Apple Health parser and the bridges are implementations
        behind one ingestion interface, so any one going away costs coverage, never the store. The
        direct lesson of Fasten Onprem being archived mid-project (ADR-0001).
      </p>
    </div>
  )
}

function StreamCard({ s }) {
  const tier = TIERS[s.tier]
  const [status, setStatus] = useState(s.status)
  const [lastSync, setLastSync] = useState(s.lastSync)
  const [syncing, setSyncing] = useState(false)
  const st = STATUS[status]

  // Mock "sync now": flip to a transient syncing state, then stamp a fresh time.
  const syncNow = () => {
    if (syncing || s.status === 'available') return
    setSyncing(true)
    setStatus('active')
    setTimeout(() => {
      setSyncing(false)
      setLastSync('just now')
      setStatus(s.status)
    }, 1100)
  }

  return (
    <div className={`card ds-card ${s.tier === 'bridged' ? 'bridged' : ''}`}>
      <div className="ds-head">
        <div className="ds-title">
          <b>{s.name}</b>
          <span className="ds-method mono">{s.method}</span>
        </div>
        <span className={`tier-badge ${tier.tone}`}><span className="led" />{tier.label}</span>
      </div>

      <div className="ds-status">
        <span className={`ds-dot ds-${st.tone} ${syncing ? 'pulsing' : ''}`} />
        <span className="ds-status-t">{syncing ? 'syncing…' : st.label}</span>
        {s.metrics && <span className="faint ds-metrics">· {s.metrics}</span>}
      </div>

      {s.status !== 'available' ? (
        <div className="ds-stats">
          <span><span className="fl">last sync</span><span className="mono">{lastSync}</span></span>
          <span><span className="fl">next run</span><span className="mono">{s.nextRun}</span></span>
          <span><span className="fl">records</span><span className="mono num">{s.records.toLocaleString()}</span></span>
        </div>
      ) : (
        <p className="note" style={{ marginTop: 4 }}>Not enrolled — nothing has been retrieved.</p>
      )}

      {s.note && <p className="ds-note">{s.note}</p>}

      {/* Bridged sources: the disclosure + the free fallback, never omitted. */}
      {s.disclosure && (
        <div className="callout egress ds-disclosure">
          <span className="k">transits {s.name.includes('Fasten') ? 'Fasten' : 'a vendor'} · disclosed</span>
          <div>{s.disclosure}</div>
        </div>
      )}
      {s.fallback && (
        <div className="ds-fallback">
          <span className="fb-arrow">↳ falls back to</span>
          <span className="pill local" style={{ fontSize: 11 }}><span className="led" />{s.fallback.to}</span>
          <span className="faint">— costs {s.fallback.costs}; keeps {s.fallback.keeps}.</span>
        </div>
      )}

      <div className="ds-actions">
        {s.status === 'available'
          ? <button className="btn warn sm">Enrol provider →</button>
          : <button className="btn ghost sm" onClick={syncNow} disabled={syncing}>
              {syncing ? 'syncing…' : '↻ Sync now'}
            </button>}
      </div>
    </div>
  )
}

function FileCard({ f }) {
  const [result, setResult] = useState(null)
  const [parsing, setParsing] = useState(false)

  // Mock "upload": a brief parse, then reveal the fake parse/confidence result.
  const upload = () => {
    if (parsing) return
    setParsing(true)
    setTimeout(() => { setParsing(false); setResult(f.parse) }, 900)
  }

  const conf = f.parse.confidence
  const confTone = conf >= 0.9 ? 'high' : conf >= 0.8 ? 'moderate' : conf >= 0.6 ? 'low' : 'none'

  return (
    <div className="card ds-card ds-file-card">
      <div className="ds-head">
        <div className="ds-title">
          <b>{f.name}</b>
          <span className="ds-method mono">{f.accept}</span>
        </div>
        <span className="tier-badge local"><span className="led" />{TIERS.file.label}</span>
      </div>

      <div className="ds-stats">
        <span><span className="fl">last import</span><span className="mono">{f.lastImport}</span></span>
        <span><span className="fl">stored</span><span className="mono num">{f.records.toLocaleString()}</span></span>
      </div>
      <p className="ds-note">{f.hint}</p>

      <button type="button" className={`dropzone ${parsing ? 'parsing' : ''} ${result ? 'done' : ''}`}
        onClick={upload} disabled={parsing}>
        {parsing
          ? <span className="dz-inner">parsing locally…</span>
          : result
            ? <span className="dz-inner">✓ parsed — drop another to re-import</span>
            : <span className="dz-inner">⇪ drop {f.accept} or click to simulate an import</span>}
      </button>

      {result && (
        <div className="parse-result">
          <div className="pr-head">
            <span className="mono">{result.found.toLocaleString()} {result.kind}</span>
            <span className="pr-conf">
              parse confidence
              <span className="ev" style={{ marginLeft: 6 }}>
                <span className="dots">{confDots(confTone)}</span> {Math.round(conf * 100)}%
              </span>
            </span>
            <span className="faint mono" style={{ fontSize: 11 }}>{result.took}</span>
          </div>
          <p className="pr-note">{result.note}</p>
        </div>
      )}
    </div>
  )
}

// The same hue-free confidence ramp the evidence labels use — filled/hollow dots,
// never colour, so it can't be read as the privacy law.
function confDots(tone) {
  const map = { high: '●●●●', moderate: '●●●○', low: '●●○○', none: '●○○○' }
  return (map[tone] || '○○○○').split('').map((d, i) =>
    d === '●' ? <span key={i}>●</span> : <i key={i} style={{ fontStyle: 'normal', color: 'var(--faint)' }}>○</i>)
}
