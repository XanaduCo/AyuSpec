import { useState } from 'react'
import EvidenceLabel from '../components/EvidenceLabel.jsx'
import { useDrawer } from '../components/Drawer.jsx'
import { byGoal, VERDICTS, experiments } from '../mock/experiments.js'

// Experiments — where a hunch becomes an n-of-1 with the honesty guardrails that
// make a self-test mean something (experimentation.md). Two ideas the UI must
// carry: evidence strength is a SEPARATE axis from the agent's confidence, and a
// result whose effect sits inside baseline noise reads "inconclusive", never a
// win. The distribution overlay is what makes that judgement visible, not asserted.

export default function Experiments() {
  const groups = byGoal()
  const running = experiments.filter(e => e.status === 'running').length
  const done = experiments.filter(e => e.status === 'complete').length

  return (
    <div className="page exp-page">
      <p className="eyebrow">Experiments · n-of-1 · Ravi Mehta</p>
      <div className="lede">Test the hunch. Then read the result honestly.</div>
      <p className="muted" style={{ marginTop: 8, maxWidth: '68ch' }}>
        A single subject with no blinding is genuinely weak evidence — so a positive n-of-1 is still
        labelled <b>EVIDENCE: LOW</b>, and when natural day-to-day variability swamps the effect, the
        answer is <b>inconclusive</b>, not a manufactured finding. {running} running · {done} complete.
      </p>

      {groups.map(g => (
        <section key={g.goal} className="exp-group">
          <h3 className="exp-goal">{g.label}</h3>
          {g.items.map(e => <ExperimentCard key={e.id} e={e} />)}
        </section>
      ))}

      <p className="note" style={{ marginTop: 26 }}>
        Experiments and their time-boxed metric windows live in the <span className="mono">ayuos</span>{' '}
        schema; outcome metrics flow from the same ingestion the rest of the app reads
        (experimentation.md). Nothing here left the device.
      </p>
    </div>
  )
}

function ExperimentCard({ e }) {
  const drawer = useDrawer()
  const v = VERDICTS[e.status === 'running' ? 'running' : e.verdict]
  const h = e.hypothesis

  return (
    <div className="card exp-card">
      <div className="exp-head">
        <div>
          <span className={`verdict v-${v.tone}`}>{v.label}</span>
          <span className="exp-design mono">{e.design}</span>
        </div>
        <button className="chip-link" onClick={() => drawer?.openRecord(e.id)} title="Open the stored object">
          record →
        </button>
      </div>

      <p className="exp-statement serif">{h.statement}</p>
      <p className="exp-rationale">{h.rationale}</p>

      {/* Two SEPARATE axes: evidence strength (of the external claim) and the
          agent's calibrated confidence. Conflating them is the failure mode. */}
      <div className="exp-axes">
        <div className="exp-axis">
          <span className="fl">evidence</span>
          <EvidenceLabel kind={h.evidence} claim={h.statement} />
          <span className="faint" style={{ fontSize: 11.5 }}>strength of the outside evidence</span>
        </div>
        <div className="exp-axis">
          <span className="fl">confidence</span>
          <span className="conf" title="the agent's calibrated confidence — deliberately not the same thing as evidence strength">
            <span className="conf-bar" aria-hidden><span style={{ width: `${Math.round(h.confidence * 100)}%` }} /></span>
            <span className="num" style={{ fontSize: 12 }}>{Math.round(h.confidence * 100)}%</span>
          </span>
          <span className="faint" style={{ fontSize: 11.5 }}>kept separate from evidence</span>
        </div>
      </div>

      <div className="exp-setup">
        <Field label="intervention">{h.intervention_text}</Field>
        <Field label="metrics">
          <div className="exp-metrics">
            {e.metrics.map(m => (
              <span key={m.name} className="metric-tag">
                {m.name} <span className="faint mono">· {m.source}</span>
              </span>
            ))}
          </div>
        </Field>
        <Field label="success criterion" pre>
          <span className="crit">◈ pre-registered</span> {e.successCriterion}
        </Field>
        {e.confounders.length > 0 && (
          <Field label="confounders">
            <div className="exp-conf">
              {e.confounders.map((c, i) => (
                <span key={i} className="conf-flag" title={c.note}>⚑ {c.flag} <span className="faint">· {c.when}</span></span>
              ))}
            </div>
          </Field>
        )}
      </div>

      {/* The distribution overlay — baseline noise made visible so overlap (or
          separation) is read, not asserted. */}
      <DistPlot e={e} />

      {e.status === 'running'
        ? <div className="exp-result running">
            <div className="exp-result-head">
              <span className="verdict v-run">running · week {e.week}</span>
              <span className="adherence mono">{e.adherence.done}/{e.adherence.of} days logged</span>
            </div>
            <p className="exp-interim">{e.interim}</p>
          </div>
        : <div className={`exp-result ${e.verdict === 'inconclusive' ? 'inc' : ''}`}>
            <div className="exp-result-head">
              <span className={`verdict v-${v.tone}`}>{v.label}</span>
              <span className="faint" style={{ fontSize: 12 }}>{v.blurb}</span>
            </div>
            <p className="exp-interim">{e.resultText}</p>
            {e.underpowered && (
              <p className="underpowered">⚠ Underpowered: n={e.baseline.stats.n} with this variability can’t
                resolve an effect this small. Re-run longer, or accept the null is unproven either way.</p>
            )}
          </div>}
    </div>
  )
}

function Field({ label, children, pre }) {
  return (
    <div className="exp-field">
      <span className="fl">{label}</span>
      <div className={pre ? 'exp-field-v pre' : 'exp-field-v'}>{children}</div>
    </div>
  )
}

// Baseline vs. intervention on one shared axis. Each arm is a strip of its
// individual samples (deterministic jitter) with a ±1 SD band and a mean line.
// When the bands overlap heavily, the eye reaches "inconclusive" before the label.
function DistPlot({ e }) {
  const base = e.baseline, interv = e.intervention
  if (!interv.stats) return null
  const all = [...base.samples, ...interv.samples]
  const lo = Math.min(...all), hi = Math.max(...all)
  const pad = (hi - lo) * 0.12 || 1
  const dom = [lo - pad, hi + pad]
  const x = v => ((v - dom[0]) / (dom[1] - dom[0])) * 100

  const arms = [
    { key: 'base', label: base.label, s: base.stats, samples: base.samples, cls: 'base' },
    { key: 'interv', label: interv.label, s: interv.stats, samples: interv.samples, cls: 'interv' },
  ]

  return (
    <div className="distplot">
      <div className="distplot-head">
        <span className="eyebrow">baseline vs. intervention · {base.unit}</span>
        <span className="note" style={{ margin: 0 }}>each mark is one day · box = ±1 SD · line = mean</span>
      </div>
      <div className="dist-rows">
        {arms.map(a => (
          <div key={a.key} className="dist-row">
            <span className="dist-label">{a.key === 'base' ? 'baseline' : 'with change'}</span>
            <div className="dist-track">
              {/* ±1 SD band */}
              <span className={`dist-band ${a.cls}`}
                style={{ left: `${x(a.s.mean - a.s.sd)}%`, width: `${x(a.s.mean + a.s.sd) - x(a.s.mean - a.s.sd)}%` }} />
              {/* individual samples, jittered vertically by index parity */}
              {a.samples.map((v, i) => (
                <span key={i} className={`dist-dot ${a.cls}`}
                  style={{ left: `${x(v)}%`, top: `${34 + (i % 3 - 1) * 16}%` }} title={`${v} ${base.unit}`} />
              ))}
              {/* mean */}
              <span className={`dist-mean ${a.cls}`} style={{ left: `${x(a.s.mean)}%` }} />
            </div>
            <span className="dist-stat num">{a.s.mean.toFixed(1)}<span className="faint"> ±{a.s.sd.toFixed(1)}</span></span>
          </div>
        ))}
      </div>
      <div className="dist-foot">
        <span className="dist-effect">
          effect size <b className="num">d = {e.effectD >= 0 ? '+' : ''}{e.effectD.toFixed(2)}</b>
          <span className="faint"> · {Math.abs(e.effectD) < 0.5 ? 'small relative to noise' : Math.abs(e.effectD) < 0.8 ? 'moderate' : 'large'}</span>
        </span>
        <span className="note" style={{ margin: 0 }}>
          Δ mean {(interv.stats.mean - base.stats.mean >= 0 ? '+' : '')}{(interv.stats.mean - base.stats.mean).toFixed(1)} {base.unit}
        </span>
      </div>
    </div>
  )
}
