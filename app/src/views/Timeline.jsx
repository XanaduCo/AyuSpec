import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as P from '../mock/persona.js'
import { useDrawer } from '../components/Drawer.jsx'
import { useSession, useEvents, useWearables } from '../state/store.js'
import { anchor, domainStart, daysBetween, addDays } from '../state/fixtures.js'

// The mock layer is being expanded in parallel; read its track list defensively
// and fall back to the six lanes the design system specifies.
const tracks = P.tracks || [
  { key: 'labs', label: 'Labs', kind: 'events' },
  { key: 'wearables', label: 'Wearables', kind: 'series' },
  { key: 'conditions', label: 'Conditions', kind: 'events' },
  { key: 'procedures', label: 'Procedures & experiments', kind: 'events' },
  { key: 'medications', label: 'Medications', kind: 'events' },
  { key: 'imaging', label: 'Imaging', kind: 'events' },
]

// A navigable record, not a dashboard. A shared date axis; horizontal tracks for
// labs / wearables / conditions / procedures / meds / imaging; a zoomable window;
// overlay two metrics to see co-movement; click any event → its FHIR resource.
//
// Anything that landed this session is badged `new` and the window widens to
// reach it — an import that you cannot see the effect of is not an import.

const WINDOWS = [
  { key: '1W', label: 'week', days: 14 },
  { key: '1M', label: 'month', days: 30 },
  { key: '3M', label: '90 days', days: 90 },
  { key: '1Y', label: 'year', days: 365 },
  { key: 'ALL', label: 'all', days: null },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmt(dateStr, withDay) {
  const d = new Date(dateStr)
  return withDay ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}` : `${MONTHS[d.getUTCMonth()]} ’${String(d.getUTCFullYear()).slice(2)}`
}

export default function Timeline() {
  const drawer = useDrawer()
  const navigate = useNavigate()
  const { state } = useSession()
  const events = useEvents()
  const wearables = useWearables()

  const [winKey, setWinKey] = useState('3M')
  const [overlay, setOverlay] = useState(['obs-hrv', 'obs-vo2max'])

  // The domain reaches back to the oldest thing in the record — including
  // anything an import just added behind the original horizon.
  const dataStart = useMemo(() => {
    const dates = events.map(e => e.date).filter(Boolean)
    return dates.reduce((a, d) => (new Date(d) < new Date(a) ? d : a), domainStart)
  }, [events])

  const win = WINDOWS.find(w => w.key === winKey)
  const rawStart = win.days == null ? dataStart : addDays(anchor, -win.days)
  const start = new Date(rawStart) < new Date(dataStart) ? dataStart : rawStart
  const span = daysBetween(start, anchor) || 1

  const pct = dateStr => (daysBetween(start, dateStr) / span) * 100
  const inWindow = dateStr => {
    const p = pct(dateStr)
    return p >= -0.01 && p <= 100.01
  }

  const fresh = events.filter(e => e.isNew)
  // Widen automatically when something new lands outside the current view —
  // otherwise the payoff of the import is off-screen.
  useEffect(() => {
    if (!fresh.length) return
    const outside = fresh.some(e => !inWindow(e.date))
    if (outside) setWinKey('ALL')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh.length])

  const nTicks = 6
  const ticks = Array.from({ length: nTicks + 1 }, (_, i) => {
    const date = addDays(start, Math.round((span * i) / nTicks))
    return { date, x: (i / nTicks) * 100 }
  })
  const withDay = span <= 40

  const toggleOverlay = id =>
    setOverlay(cur =>
      cur.includes(id) ? cur.filter(x => x !== id)
        : cur.length >= 2 ? [cur[1], id] : [...cur, id])

  const eventsFor = key => events.filter(e => e.track === key && inWindow(e.date))
  const newWearables = state.wearables.length

  return (
    <div className="page tl-page">
      <p className="eyebrow">The record · Ravi Mehta</p>
      <div className="tl-top">
        <div className="lede">A navigable record, not a dashboard.</div>
        <div className="tl-zoom" role="tablist" aria-label="Zoom">
          {WINDOWS.map(w => (
            <button key={w.key} role="tab" aria-selected={w.key === winKey}
              className={`zoom-btn ${w.key === winKey ? 'on' : ''}`}
              onClick={() => setWinKey(w.key)}>{w.label}</button>
          ))}
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0, maxWidth: '64ch' }}>
        {fmt(start, true)} → {fmt(anchor, true)}. Every mark is the same record the agent reasons over —
        click any to open its underlying FHIR resource. Colour never encodes trend here; direction is
        shown by the arrow, so green/amber stay reserved for privacy.
      </p>

      {(fresh.length > 0 || newWearables > 0) && (
        <div className="card tl-changed">
          <div className="tl-changed-h">
            <span className="eyebrow">What changed on this page</span>
            <button className="chip-link" onClick={() => navigate('/now')}>why it matters →</button>
          </div>
          <p className="tl-changed-t">
            {fresh.length > 0 && <>{fresh.length} new event{fresh.length > 1 ? 's' : ''} landed</>}
            {fresh.length > 0 && newWearables > 0 && ' · '}
            {newWearables > 0 && <>{newWearables} new metric lane{newWearables > 1 ? 's' : ''}</>}
            {' '}this session.
          </p>
          <div className="tl-changed-chips">
            {fresh.map(e => (
              <button key={e.id} className="chip-link" onClick={() => drawer?.openRecord(e.ref)}>
                {e.label} · {e.date}
              </button>
            ))}
            {state.wearables.map(w => (
              <button key={w.id} className="chip-link" onClick={() => drawer?.openRecord(w.id)}>
                {w.name} · {w.source}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* overlay chart */}
      <div className="card tl-overlay-card">
        <div className="tl-overlay-head">
          <span className="eyebrow">Overlay — co-movement of two metrics</span>
          <div className="tl-metric-pick">
            {wearables.map(m => (
              <button key={m.id}
                className={`metric-chip ${overlay.includes(m.id) ? `on s${overlay.indexOf(m.id)}` : ''}`}
                onClick={() => toggleOverlay(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
        {overlay.length === 2
          ? <Overlay ids={overlay} wearables={wearables} start={start} anchor={anchor} />
          : <p className="note">Pick two metrics to overlay them on one axis.</p>}
      </div>

      {/* axis + tracks */}
      <div className="tl">
        <div className="tl-axis">
          <div className="tl-label" />
          <div className="tl-lane tl-ticks">
            {ticks.map((t, i) => (
              <span key={i} className="tl-tick" style={{ left: `${t.x}%` }}>{fmt(t.date, withDay)}</span>
            ))}
            <span className="tl-now" style={{ left: '100%' }} title={`today · ${anchor}`}>today</span>
          </div>
        </div>

        {tracks.map(track => (
          <div className="tl-row" key={track.key}>
            <div className="tl-label">{track.label}</div>
            <div className="tl-lane">
              {ticks.map((t, i) => <span key={i} className="tl-grid" style={{ left: `${t.x}%` }} />)}
              {track.kind === 'series'
                ? <SeriesLane wearables={wearables} start={start} anchor={anchor} onOpen={drawer?.openRecord} />
                : eventsFor(track.key).map(e => (
                  <button key={e.id} className={`tl-ev ${e.flag ? 'flag-out' : ''} ${e.isNew ? 'is-new' : ''}`}
                    style={{ left: `${pct(e.date)}%` }}
                    onClick={() => drawer?.openRecord(e.ref)}
                    title={`${e.label} · ${e.date}${e.detail ? ` · ${e.detail}` : ''}`}>
                    <span className="tl-dot" />
                    <span className="tl-ev-label">{e.label}</span>
                    {e.isNew && <span className="tl-new">new</span>}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <p className="note" style={{ marginTop: 14 }}>
        Wearable series are stored in the <span className="mono">timeseries</span> schema at daily
        resolution — not as individual FHIR Observations, which would cost 20–40× the storage (ADR-0002).
      </p>
    </div>
  )
}

// A stacked set of mini sparklines, one per wearable metric, inside one lane.
function SeriesLane({ wearables, start, anchor, onOpen }) {
  return (
    <div className="tl-series">
      {wearables.map(m => {
        const pts = m.daily.filter(d => new Date(d.date) >= new Date(start) && new Date(d.date) <= new Date(anchor))
        const delta = m.current - m.baseline
        const dp = Math.abs(delta) < 10 && !Number.isInteger(delta) ? 1 : 0
        return (
          <button key={m.id} className="tl-metric" onClick={() => onOpen?.(m.id)} title={`${m.name} — open record`}>
            <span className="tl-metric-name">{m.name} <span className="faint mono">· {m.source}</span></span>
            <Sparkline pts={pts} />
            <span className="tl-metric-val num">
              {m.current}<span className="u">{m.unit === 'steps' ? '' : m.unit}</span>
              <span className={`tl-arrow ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(dp)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Sparkline({ pts }) {
  if (pts.length < 2) return <svg className="tl-spark" viewBox="0 0 100 24" preserveAspectRatio="none" />
  const vals = pts.map(p => p.value)
  const min = Math.min(...vals), max = Math.max(...vals), rng = max - min || 1
  const d = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * 100
    const y = 22 - ((p.value - min) / rng) * 20
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
  return (
    <svg className="tl-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" style={{ stroke: 'var(--ink)', strokeOpacity: 0.55 }} strokeWidth="1.3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// Two normalized series on one axis, to read co-movement. Lines use the brand
// indigo + the Explore blue accent — neither carries privacy meaning.
function Overlay({ ids, wearables, start, anchor }) {
  const series = ids.map(id => wearables.find(m => m.id === id)).filter(Boolean)
  if (series.length < 2) return <p className="note">Pick two metrics to overlay them on one axis.</p>
  const H = 150, W = 1000, padY = 14
  const winPts = m => m.daily.filter(d => new Date(d.date) >= new Date(start) && new Date(d.date) <= new Date(anchor))

  const paths = series.map(m => {
    const pts = winPts(m)
    if (pts.length < 2) return { d: '', m, range: [0, 0] }
    const vals = pts.map(p => p.value)
    const min = Math.min(...vals), max = Math.max(...vals), rng = max - min || 1
    const d = pts.map((p, i) => {
      const x = (i / (pts.length - 1)) * W
      const y = padY + (1 - (p.value - min) / rng) * (H - 2 * padY)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    return { d, m, range: [min, max] }
  })
  const strokes = ['var(--brand)', 'var(--adjusts)']

  return (
    <div>
      <svg className="tl-overlay" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`Overlay of ${series.map(s => s.name).join(' and ')}`}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" style={{ stroke: strokes[i] }} strokeWidth="2.2"
            vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </svg>
      <div className="tl-legend">
        {paths.map((p, i) => (
          <span key={i} className="legend-item">
            <span className="swatch" style={{ background: strokes[i] }} />
            {p.m.name} <span className="faint mono">{p.range[0]}–{p.range[1]} {p.m.unit}</span>
          </span>
        ))}
        <span className="note" style={{ margin: 0, marginLeft: 'auto' }}>each scaled to its own range</span>
      </div>
    </div>
  )
}
