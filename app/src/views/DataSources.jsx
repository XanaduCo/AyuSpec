import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TIERS, STATUS } from '../mock/connectors.js'
import { useSession, useConnectors } from '../state/store.js'
import { IMPORTS } from '../state/fixtures.js'
import { ConfDots } from '../components/Capture.jsx'

// Data sources — where files become record, and where a broken connector proves
// the fallback guarantee instead of asserting it.
//
// The rule this view exists to break: an import that says "parsed ✓" and changes
// nothing. Every drop here opens a *reviewable* parse, and confirming it moves
// the Timeline, the Now list, the share inventory and the counts on this page.
// The parser also stops and asks rather than guessing — the Lp(a) unit is the
// worked example.

export default function DataSources() {
  const { state } = useSession()
  const { streams, files } = useConnectors()
  const navigate = useNavigate()

  const groups = []
  for (const s of streams) {
    const g = groups.find(x => x.group === s.group)
    if (g) g.items.push(s); else groups.push({ group: s.group, items: [s] })
  }
  const all = [...streams, ...files]
  const directCount = all.filter(s => s.tier !== 'bridged').length

  return (
    <div className="page ds-page">
      <p className="eyebrow">Data sources · Ravi Mehta</p>
      <div className="lede">Every source, and exactly how its data got here.</div>
      <p className="muted" style={{ marginTop: 8, maxWidth: '70ch' }}>
        <span className="tier-badge local" style={{ verticalAlign: 'middle' }}><span className="led" />direct</span> means
        the data went source → your store with nothing in between. <span className="tier-badge egress" style={{ verticalAlign: 'middle' }}><span className="led" />bridged</span> means
        a paid vendor retrieved it first — always disclosed, always with the free direct path it falls
        back to. {directCount} of {all.length} sources are zero-transit.
      </p>

      {state.imports.length > 0 && (
        <div className="card import-log">
          <span className="eyebrow">Imported this session</span>
          <ul className="import-list">
            {state.imports.map((im, i) => (
              <li key={i}>
                <b>{im.title}</b>
                <span className="faint"> — {im.note}</span>
                <button className="chip-link" onClick={() => navigate('/timeline')}>on the Timeline →</button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          Nothing enters the record until you have seen what was extracted and said yes.
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

// ---------------------------------------------------------------------------

function StreamCard({ s }) {
  const { actions } = useSession()
  const [lastSync, setLastSync] = useState(s.lastSync)
  const [syncing, setSyncing] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { setLastSync(s.lastSync) }, [s.lastSync])

  const isError = s.status === 'error'
  const st = STATUS[s.status] || STATUS.connected
  const tier = TIERS[s.tier]

  const syncNow = () => {
    if (syncing || s.status === 'available') return
    setSyncing(true)
    timer.current = setTimeout(() => {
      setSyncing(false)
      if (isError) actions.resyncConnector(s.id)
      else setLastSync('just now')
    }, 1200)
  }

  return (
    <div className={`card ds-card ${s.tier === 'bridged' ? 'bridged' : ''} ${isError ? 'errored' : ''}`}>
      <div className="ds-head">
        <div className="ds-title">
          <b>{s.name}</b>
          <span className="ds-method mono">{s.method}</span>
        </div>
        <span className={`tier-badge ${tier.tone}`}><span className="led" />{tier.label}</span>
      </div>

      {/* An error is an operational state, not a privacy one — so the dot stays
          neutral rather than borrowing the reserved red (journey 08). */}
      <div className="ds-status">
        <span className={`ds-dot ds-${isError ? 'idle' : st.tone} ${syncing ? 'pulsing' : ''}`} />
        <span className="ds-status-t">{syncing ? 'syncing…' : isError ? 'sync failing' : st.label}</span>
        {s.metrics && <span className="faint ds-metrics">· {s.metrics}</span>}
      </div>

      {/* A broken connector fails loudly and scopes its own damage. The badge is
          neutral, never the reserved red: an outage is a degradation, not a stop. */}
      {isError && (
        <div className="conn-error">
          <div className="ce-head"><span className="mono">sync failed</span></div>
          <div className="ce-reason mono">{s.error}</div>
          <div className="ce-keep">
            <b>What you lose:</b> fresh Whoop data until this is fixed — recovery and strain are stale
            as of the last good sync. <b>What you keep:</b> every Whoop record already stored, every
            other connector still syncing, and an agent that keeps answering and flags the stale
            stream rather than hiding it.
          </div>
        </div>
      )}

      {s.status !== 'available' ? (
        <div className="ds-stats">
          <span><span className="fl">last sync</span><span className="mono">{lastSync}</span></span>
          <span><span className="fl">next run</span><span className="mono">{isError ? 'paused' : s.nextRun}</span></span>
          <span><span className="fl">records</span><span className="mono num">{s.records.toLocaleString()}</span>
            {s.backfilled && <span className="new-tag">+{s.backfilled} backfilled</span>}</span>
        </div>
      ) : (
        <p className="note" style={{ marginTop: 4 }}>Not enrolled — nothing has been retrieved.</p>
      )}

      {s.note && !isError && <p className="ds-note">{s.note}</p>}

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
          : <button className={`btn ${isError ? 'pri' : 'ghost'} sm`} onClick={syncNow} disabled={syncing}>
              {syncing ? 'syncing…' : isError ? '↻ Re-sync now' : '↻ Sync now'}
            </button>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The import flow: drop → parse → review → confirm → the app changes.
// ---------------------------------------------------------------------------

function FileCard({ f }) {
  const { actions } = useSession()
  const navigate = useNavigate()
  const spec = IMPORTS[f.id]
  const [phase, setPhase] = useState('idle') // idle → parsing → staged → done
  const [rows, setRows] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const drop = () => {
    if (phase === 'parsing' || !spec) return
    setPhase('parsing')
    timer.current = setTimeout(() => {
      setRows(spec.rows.map(r => ({ ...r, ask: r.ask ? { ...r.ask } : undefined })))
      setPhase('staged')
    }, 1100)
  }

  const unresolved = rows?.filter(r => r.include && r.ask && !r.ask.chosen).length || 0
  const selected = rows?.filter(r => r.include).length || 0

  const commit = () => {
    actions.commitImport(f.id, { rows })
    setPhase('done')
  }

  const toggle = i => setRows(rs => rs.map((r, j) => (j === i ? { ...r, include: !r.include } : r)))
  const choose = (i, v) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, ask: { ...r.ask, chosen: v } } : r)))

  return (
    <div className={`card ds-card ds-file-card ${phase === 'staged' ? 'staging' : ''}`}>
      <div className="ds-head">
        <div className="ds-title">
          <b>{f.name}</b>
          <span className="ds-method mono">{f.accept}</span>
        </div>
        <span className="tier-badge local"><span className="led" />{TIERS.file.label}</span>
      </div>

      <div className="ds-stats">
        <span><span className="fl">last import</span><span className="mono">{f.importedThisSession ? 'just now' : f.lastImport}</span></span>
        <span><span className="fl">stored</span><span className="mono num">{f.records.toLocaleString()}</span>
          {f.importedThisSession && <span className="new-tag">updated</span>}</span>
      </div>
      <p className="ds-note">{f.hint}</p>

      {phase === 'idle' && (
        spec
          ? <button type="button" className="dropzone" onClick={drop}>
              <span className="dz-inner">⇪ drop {f.accept} — or click to use the sample file</span>
            </button>
          : <p className="note" style={{ margin: 0 }}>No sample file wired for this source in the demo.</p>
      )}

      {phase === 'parsing' && (
        <div className="dropzone parsing">
          <span className="dz-inner">
            parsing <span className="mono">{spec.file}</span> locally…
            <span className="dz-sub">{spec.path} · {spec.model}</span>
          </span>
        </div>
      )}

      {phase === 'staged' && (
        <div className="stage">
          <div className="stage-head">
            <span className="eyebrow">Extracted · nothing is in your record yet</span>
            <span className="mono faint">{spec.took}</span>
          </div>
          <p className="stage-note">{spec.scannedNote}</p>

          <div className="stage-rows">
            {rows.map((r, i) => <StageRow key={r.id} r={r} onToggle={() => toggle(i)} onChoose={v => choose(i, v)} />)}
          </div>

          {unresolved > 0 && (
            <p className="stage-block">
              {unresolved} row{unresolved > 1 ? 's' : ''} need an answer before it can be added. The
              parser will not guess a unit — a fabricated result is worse than a missing one.
            </p>
          )}

          <div className="stage-actions">
            <button className="btn ghost sm" onClick={() => { setPhase('idle'); setRows(null) }}>Discard</button>
            <button className="btn pri sm" disabled={!selected || unresolved > 0} onClick={commit}>
              Add {selected} to record →
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="parse-result">
          <div className="pr-head">
            <span className="mono">✓ added to your record</span>
            <span className="faint mono" style={{ fontSize: 11, marginLeft: 'auto' }}>{spec.took} · on-device</span>
          </div>
          <p className="pr-note">Here is what changed elsewhere:</p>
          <div className="pr-links">
            <button className="chip-link" onClick={() => navigate('/timeline')}>Timeline</button>
            <button className="chip-link" onClick={() => navigate('/now')}>Now</button>
            <button className="chip-link" onClick={() => navigate('/share')}>Share inventory</button>
          </div>
          <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => { setPhase('idle'); setRows(null) }}>
            Import another
          </button>
        </div>
      )}
    </div>
  )
}

function StageRow({ r, onToggle, onChoose }) {
  const isLab = r.value != null && !r.kind
  const range = r.low != null && r.high != null ? `${r.low}–${r.high}`
    : r.high != null ? `< ${r.high}`
      : r.low != null ? `> ${r.low}` : '—'
  return (
    <div className={`stage-row ${r.include ? '' : 'off'} ${r.ask && !r.ask.chosen ? 'asking' : ''}`}>
      <label className="stage-check">
        <input type="checkbox" checked={r.include} onChange={onToggle} />
      </label>
      <div className="stage-body">
        <div className="stage-line">
          <span className="stage-name">{r.name}</span>
          {isLab ? (
            <>
              <span className="stage-val mono num">
                {r.value}
                <span className="u">{r.ask && !r.ask.chosen ? ' ?' : ` ${r.ask?.chosen || r.unit}`}</span>
              </span>
              <span className="stage-range mono faint">ref {range}</span>
              {r.flag !== 'ok' && (
                <span className="range-flag mono">{r.flag === 'low' ? '↓ below range' : '↑ above range'}</span>
              )}
              {r.first && <span className="new-tag">first ever</span>}
            </>
          ) : (
            <span className="stage-detail faint">{r.detail}</span>
          )}
          <ConfDots c={r.conf} />
        </div>

        {r.ask && (
          <div className={`stage-ask ${r.ask.chosen ? 'answered' : ''}`}>
            <div className="ask-why">{r.ask.why}</div>
            <div className="ask-opts">
              <span className="fl">which unit does the report print?</span>
              {r.ask.options.map(o => (
                <button key={o} className={`pick ${r.ask.chosen === o ? 'on' : ''}`} onClick={() => onChoose(o)}>{o}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
