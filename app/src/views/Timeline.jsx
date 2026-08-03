import { labs, wearables, imaging, conditions, medications, activeHypothesis } from '../mock/persona.js'

function Spark({ series, dir }) {
  const w = 96, h = 26, min = Math.min(...series), max = Math.max(...series)
  const span = max - min || 1
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(' ')
  const stroke = dir === 'down' ? 'var(--block)' : dir === 'up' ? 'var(--local)' : 'var(--mute)'
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function pct(cur, base) {
  const d = ((cur - base) / base) * 100
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`
}

export default function Timeline() {
  return (
    <div className="page">
      <p className="eyebrow">The record · last 90 days</p>
      <div className="lede" style={{ marginBottom: 6 }}>Ravi Mehta — a navigable record, not a dashboard.</div>
      <p className="muted" style={{ marginTop: 0, maxWidth: '64ch' }}>
        A first pass over the mock dataset. The full Timeline (zoomable axis, metric overlays, click-through
        to each FHIR resource) lands in Phase 1. Every value below is the same record the agent reasons over.
      </p>

      <div className="grid g2" style={{ marginTop: 20 }}>
        <div className="card">
          <span className="eyebrow">Labs · drawn 2025-08-01</span>
          <div style={{ marginTop: 8 }}>
            {labs.map(l => (
              <div className="stat" key={l.code}>
                <span className="lab">{l.name}
                  <span className={`flag ${l.flag}`}>{l.flag === 'high' ? 'high' : 'in range'}</span>
                </span>
                <span className="val num">{l.value}<span className="u">{l.unit}</span>
                  <span className={`delta ${l.value >= l.prior ? 'up' : 'down'}`} style={{ marginLeft: 8, fontSize: 12 }}>
                    {pct(l.value, l.prior)}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="note">Reference ranges and flags are honest — high is high. Deltas are vs the prior draw ~90d earlier.</p>
        </div>

        <div className="card">
          <span className="eyebrow">Wearables · Oura + Whoop</span>
          <div style={{ marginTop: 8 }}>
            {wearables.map(m => (
              <div className="stat" key={m.code}>
                <span className="lab">{m.name} <span className="faint mono" style={{ fontSize: 11 }}>· {m.source}</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Spark series={m.series} dir={m.dir} />
                  <span className="val num">{m.current}<span className="u">{m.unit}</span></span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card">
          <span className="eyebrow">Imaging</span>
          <div style={{ marginTop: 8 }}>
            {imaging.map(s => (
              <div className="callout brand" key={s.study} style={{ marginBottom: 8 }}>
                <span className="k">{s.modality} · {s.date}</span>
                <div style={{ color: 'var(--ink)', fontWeight: 600, margin: '2px 0 4px' }}>{s.study} <span className="faint mono" style={{ fontSize: 11, fontWeight: 400 }}>· {s.series.join('/')} · {s.instances} img</span></div>
                <div className="muted" style={{ fontSize: 13 }}>{s.aiSummary}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <span className="eyebrow">Conditions, medications & active experiment</span>
          <div style={{ marginTop: 10 }}>
            {conditions.map(c => (
              <div className="stat" key={c.name}><span className="lab">{c.name}</span>
                <span className="val" style={{ fontWeight: 500, fontSize: 13 }}>{c.status} · since {c.onset}</span></div>
            ))}
            {medications.map(m => (
              <div className="stat" key={m.name}><span className="lab">{m.name}</span>
                <span className="val num">{m.dose} <span className="u">{m.freq}</span></span></div>
            ))}
            <div className="stat"><span className="lab">Post-meal walks (n-of-1)</span>
              <span className="val num">{activeHypothesis.adherence.done}/{activeHypothesis.adherence.of} <span className="u">wk {activeHypothesis.week}</span></span></div>
          </div>
          <p className="note">{activeHypothesis.statement}</p>
        </div>
      </div>
    </div>
  )
}
