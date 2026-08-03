import { useMemo, useState } from 'react'
import { GRAPH, N, E, byType, nodesOf, title, AXES, PRESETS } from '../explore/graph.js'
import { resolve } from '../explore/resolver.js'
import '../styles/explore.css'

const factNodes = [...nodesOf('Modifier'), ...nodesOf('RiskFactor')]
const humanize = k => k.replace(/_/g, ' ')

function Axes({ support }) {
  return (
    <div className="axes">
      {AXES.map(k => {
        const v = support.attrs?.[k]
        return v == null ? (
          <span key={k} className="ax hole" title="Missing cell — a hole in the content, shown rather than hidden">{humanize(k)}: —</span>
        ) : (
          <span key={k} className="ax">{humanize(k)} <b>{String(v)}</b></span>
        )
      })}
    </div>
  )
}

function Trail({ trail }) {
  if (!trail.length) return null
  return (
    <details>
      <summary>Why this changed — {trail.length} modification{trail.length > 1 ? 's' : ''}, with sources</summary>
      <ul className="trail">
        {trail.map((t, i) => (
          <li key={i}>
            <span className={`who ${t.type}`}>{t.type}</span>
            &nbsp;·&nbsp;<b>{title(t.modifier)}</b>{t.dimension ? <i> ({t.dimension})</i> : null}
            <div>{t.text}</div>
            {t.escalates && <div className="note">Escalates to {t.escalates} when {JSON.stringify(t.when)}</div>}
            {t.citations.length > 0 && <div className="cite">{t.citations.join(' · ')}</div>}
          </li>
        ))}
      </ul>
    </details>
  )
}

function Attia({ support }) {
  const a = support.attrs ?? {}
  if (!a.attia_position && !a.consensus_note) return null
  return (
    <div className="attia">
      {a.attia_position && <><b>Attia's position:</b> {a.attia_position}<br /></>}
      {a.consensus_note && <><b>Where the evidence sits:</b> {a.consensus_note}</>}
    </div>
  )
}

function InterventionCard({ r }) {
  const prereqs = [...r.prereqs.entries()]
  const adjustments = [...r.adjustments.entries()]
  return (
    <div className={`icard ${r.state}`}>
      <h4>
        {r.node.title}
        <span className={`state ${r.state}`}>{r.state}</span>
        {r.promoted && <span className="moved">↑ moved up because of {title(r.promotion.by)}</span>}
      </h4>
      <p className="summary">{r.node.summary}</p>
      <Axes support={r.support} />
      {r.support.attrs?.dose && <div className="note"><b>Dose:</b> {r.support.attrs.dose}</div>}
      {prereqs.length > 0 && (
        <div className="subs"><b>Sequence before starting:</b>
          <ul>{prereqs.map(([p, by]) => <li key={p}>First: <b>{title(p)}</b> — required by {title(by)}</li>)}</ul>
        </div>
      )}
      {adjustments.length > 0 && (
        <div className="subs"><b>Adjustments:</b>
          <ul>{adjustments.map(([dim, list]) => (
            <li key={dim}><b>{dim}</b>{list.length > 1 && <i> (two modifiers — both shown, prose is never merged)</i>}
              <ul>{list.map((x, i) => <li key={i}>{x.text} <span className="cite">— {title(x.by)}</span></li>)}</ul>
            </li>
          ))}</ul>
        </div>
      )}
      <Attia support={r.support} />
      <Trail trail={r.trail} />
    </div>
  )
}

function BlockedCard({ r }) {
  const subs = r.substitutes ?? []
  return (
    <div className="icard blocked">
      <h4>{r.node.title}<span className="state blocked">blocked</span></h4>
      <p className="summary">{r.node.summary}</p>
      <Trail trail={r.trail} />
      {subs.length > 0 ? (
        <div className="subs"><b>Serves the same function:</b>
          <ul>{subs.map((s, i) => <li key={i}><b>{title(s.to)}</b> — {s.delta ?? 'comparable'} effect. {s.reason ?? ''}</li>)}</ul>
        </div>
      ) : r.suppress ? (
        <div className="subs">No alternatives offered — this needs clinical evaluation first.</div>
      ) : null}
    </div>
  )
}

function Markers({ fnId, facts }) {
  const ms = byType('MEASURED_BY').filter(e => e.from === fnId)
  if (!ms.length) return null
  const elevated = new Set(E.filter(e => e.type === 'ELEVATES' && facts.includes(e.from)).map(e => e.to))
  const rows = ms.map(e => ({ e, m: N.get(e.to) })).filter(x => x.m)
    .sort((a, b) => String(a.e.attrs?.quality_tier ?? 'D').localeCompare(String(b.e.attrs?.quality_tier ?? 'D')))
  return (
    <div className="markers">
      <h3>How you'd measure this</h3>
      <p className="note">Tier A is a reference method. Tier C is a consumer estimate — useful for your own
        trend, unreliable in absolute terms. Tier D is self-report. Noise decides how long an n-of-1
        experiment must run before it can detect anything at all.</p>
      <table>
        <thead><tr><th>Tier</th><th>Marker</th><th>Noise</th><th>Cost</th><th>Get it via</th></tr></thead>
        <tbody>
          {rows.map(({ e, m }) => {
            const a = m.attrs ?? {}
            const tier = e.attrs?.quality_tier ?? 'D'
            return (
              <tr key={m.id}>
                <td><span className={`tierbadge ${tier}`}>{e.attrs?.quality_tier ?? '?'}</span></td>
                <td><b>{m.title}</b>{elevated.has(m.id) && <span className="moved"> ↑ prioritised by your facts</span>}
                  <div className="note">{a.what_it_estimates ?? m.summary ?? ''}</div></td>
                <td>{e.attrs?.noise ?? a.noise ?? '—'}</td>
                <td>{a.cost ?? '—'}</td>
                <td>{[].concat(a.ingestible_via ?? []).join(', ') || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Explore() {
  const [facts, setFacts] = useState([])
  const [sysId, setSysId] = useState('sys-cardiovascular')
  const [fnId, setFnId] = useState(null)
  const [query, setQuery] = useState('')

  const systems = nodesOf('System')
  const functions = useMemo(
    () => byType('PART_OF').filter(e => e.to === sysId).map(e => N.get(e.from)).filter(n => n && n.type === 'Function'),
    [sysId]
  )
  const activeFn = (fnId && functions.some(f => f.id === fnId)) ? fnId : (functions[0]?.id ?? null)

  const flags = facts.map(f => N.get(f)).filter(n => n?.attrs?.category === 'red_flag')

  const suggestions = useMemo(() => {
    const v = query.trim().toLowerCase()
    if (!v) return null
    const words = v.split(/\s+/).filter(w => w.length > 2)
    return factNodes.filter(n => {
      if (facts.includes(n.id)) return false
      const hay = `${n.title} ${n.summary ?? ''} ${n.attrs?.category ?? ''} ${n.id}`.toLowerCase()
      return hay.includes(v) || (words.length > 0 && words.some(w => hay.includes(w)))
    }).slice(0, 24)
  }, [query, facts])

  const addFact = id => { if (N.has(id) && !facts.includes(id)) setFacts([...facts, id]); setQuery('') }
  const removeFact = id => setFacts(facts.filter(f => f !== id))
  const applyPreset = ids => setFacts(ids.filter(id => N.has(id)))

  const resolved = activeFn && !flags.length ? resolve(activeFn, facts) : null
  const fn = activeFn ? N.get(activeFn) : null
  const protects = activeFn ? byType('PROTECTS').filter(e => e.from === activeFn).map(e => title(e.to)) : []

  return (
    <div className="explore">
      <aside>
        <p className="lbl">Facts about me</p>
        <div className="chips">
          {facts.length === 0 && <span className="note">Nothing stated yet — showing the unmodified baseline.</span>}
          {facts.map(id => {
            const n = N.get(id)
            return (
              <span key={id} className={`chip ${n?.attrs?.category === 'red_flag' ? 'redflag' : ''}`}>
                {n?.title ?? id}<button title="remove" onClick={() => removeFact(id)}>×</button>
              </span>
            )
          })}
        </div>
        <input type="search" value={query} placeholder="Say something about yourself…"
          autoComplete="off" onChange={e => setQuery(e.target.value)} style={{ marginTop: 10 }} />
        {suggestions && (
          <div className="suggest">
            {suggestions.length ? suggestions.map(n => (
              <div key={n.id} className="sug" onClick={() => addFact(n.id)}>
                <div className="cat">{n.attrs?.category ?? n.type}</div>{n.title}
              </div>
            )) : <div className="sug">Nothing in the graph matches that yet.</div>}
          </div>
        )}

        <p className="lbl" style={{ marginTop: 20 }}>Try a scenario</p>
        {PRESETS.map((p, i) => (
          <button key={i} className="preset" onClick={() => applyPreset(p[1])}>{p[0]}</button>
        ))}

        <p className="lbl" style={{ marginTop: 20 }}>Legend</p>
        <div className="note">
          <b>Tiers</b> are Pareto layers over effect × evidence. Items within a tier are <i>incomparable</i>,
          not equal — every axis stays visible. Nothing here is scored, ranked for you, or recommended.
        </div>
        <div className="note" style={{ marginTop: 10 }}>
          {GRAPH.nodes.length} nodes · {GRAPH.edges.length} edges · {facts.length} fact{facts.length === 1 ? '' : 's'} active
        </div>
      </aside>

      <main>
        {flags.length > 0 && (
          <div className="banner">
            <h3>Stop — this needs a clinician, not a plan</h3>
            {flags.map(f => {
              const b = E.find(e => e.type === 'BLOCKS' && e.from === f.id)
              return <p key={f.id}><b>{f.title}</b>: {b?.attrs?.reason ?? b?.attrs?.resolution_text ?? f.summary}</p>
            })}
            <p className="note">Plan generation is halted across every intervention and no alternatives are
              offered. This is the one place the system is deliberately directive — and the direction is
              toward a doctor.</p>
          </div>
        )}

        <nav className="systems">
          {systems.map(s => (
            <button key={s.id} aria-pressed={s.id === sysId} onClick={() => { setSysId(s.id); setFnId(null) }}>{s.title}</button>
          ))}
        </nav>
        <div className="fns">
          {functions.map(f => (
            <button key={f.id} className="fn-tab" aria-pressed={f.id === activeFn} onClick={() => setFnId(f.id)}>{f.title}</button>
          ))}
        </div>

        {!flags.length && resolved && fn && (
          <>
            <h2>{fn.title}</h2>
            <p className="summary">{fn.summary}</p>
            {protects.length > 0 && <p className="note"><b>Protects:</b> {protects.join(' · ')}</p>}
            {resolved.grouped.map((t, i) => (
              <div key={i}>
                <div className="tier-h"><h3>Tier {i + 1}</h3>
                  <span>{t.length} option{t.length > 1 ? 's' : ''} — incomparable to one another, not ranked within</span></div>
                {t.map(r => <InterventionCard key={r.id} r={r} />)}
              </div>
            ))}
            {resolved.blocked.length > 0 && (
              <div>
                <div className="tier-h"><h3>Ruled out by your facts</h3><span>shown, never silently removed</span></div>
                {resolved.blocked.map(r => <BlockedCard key={r.id} r={r} />)}
              </div>
            )}
            <Markers fnId={activeFn} facts={facts} />
          </>
        )}
        {!flags.length && !fn && <p className="empty">No function selected.</p>}
      </main>
    </div>
  )
}
