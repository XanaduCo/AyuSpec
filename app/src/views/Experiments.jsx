import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import EvidenceLabel from '../components/EvidenceLabel.jsx'
import Modal from '../components/Modal.jsx'
import { useDrawer } from '../components/Drawer.jsx'
import { useCapture } from '../components/Capture.jsx'
import { VERDICTS, GOALS } from '../mock/experiments.js'
import { useSession, useExperiments, stats } from '../state/store.js'
import { CRITERIA, HYPOTHESIS_CANDIDATES, anchor } from '../state/fixtures.js'

// Experiments — where a hunch becomes an n-of-1 with the honesty guardrails that
// make a self-test mean something (experimentation.md).
//
// This view used to be a museum: three finished exhibits you could read and not
// touch. It now runs the loop. You can log a day and watch the distribution
// redraw, flag a confounder so it is down-weighted *visibly*, close the window
// and get scored against the bar you fixed before day one, and pre-register a
// new one with an honest power warning before you invest the days.

export default function Experiments() {
  const experiments = useExperiments()
  const [params, setParams] = useSearchParams()
  // Arriving from an Ask answer's "test this": open the pre-registration flow on
  // the proposed hypothesis rather than making the user re-find it. The param is
  // consumed on arrival so a refresh doesn't reopen the sheet.
  const proposed = params.get('propose')
  const [designing, setDesigning] = useState(!!proposed)
  useEffect(() => {
    if (proposed) { params.delete('propose'); setParams(params, { replace: true }) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const running = experiments.filter(e => e.status === 'running').length
  const done = experiments.filter(e => e.status === 'complete').length

  const groups = []
  for (const e of experiments) {
    const g = groups.find(x => x.goal === e.goal)
    if (g) g.items.push(e)
    else groups.push({ goal: e.goal, label: GOALS[e.goal] || e.goal, items: [e] })
  }

  return (
    <div className="page exp-page">
      <p className="eyebrow">Experiments · n-of-1 · Ravi Mehta</p>
      <div className="exp-top">
        <div className="lede">Test the hunch. Then read the result honestly.</div>
        <button className="btn pri" onClick={() => setDesigning(true)}>＋ Design an experiment</button>
      </div>
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

      {designing && <DesignFlow proposed={proposed} onClose={() => setDesigning(false)} />}
    </div>
  )
}

// Score a closed window against the pre-registered criterion — and only that.
function evaluate(e) {
  const c = e.criterion || CRITERIA[e.id]
  const b = e.baseline.stats, i = e.intervention.stats
  const delta = i.mean - b.mean
  const moved = c.direction === 'down' ? -delta : delta
  const n = i.n
  const under = n < c.minDays
  if (under) {
    return {
      verdict: 'inconclusive', underpowered: true,
      resultText: `Closed at ${n} of ${c.protocolDays || c.minDays} days. The mean moved ${Math.abs(delta).toFixed(1)} ${c.unit} ${delta < 0 ? 'down' : 'up'}, but with this much day-to-day variability and only ${n} days, the window cannot resolve the pre-registered ${c.threshold} ${c.unit} bar either way. Inconclusive is the honest read — it is a statement about the design, not about the intervention.`,
    }
  }
  if (moved >= c.threshold) {
    return {
      verdict: 'supported', underpowered: false,
      resultText: `The ${c.metric} moved ${Math.abs(delta).toFixed(1)} ${c.unit}, clearing the ${c.threshold} ${c.unit} bar fixed before day one, over ${n} days. This is still EVIDENCE: LOW — one subject, no blinding, no washout. An A–B–A reversal is what would lift it, and it is the obvious next window.`,
    }
  }
  if (moved > c.threshold * 0.4) {
    return {
      verdict: 'inconclusive', underpowered: false,
      resultText: `The ${c.metric} moved ${Math.abs(delta).toFixed(1)} ${c.unit} in the expected direction over ${n} days, but short of the ${c.threshold} ${c.unit} bar you set. That is not a win and it is not a null: the effect is smaller than this design was built to call. A longer window or a less noisy sensor is the next move.`,
    }
  }
  return {
    verdict: 'not supported', underpowered: false,
    resultText: `Over ${n} days the ${c.metric} did not move meaningfully (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} ${c.unit}) against a pre-registered bar of ${c.threshold} ${c.unit}. Reported as not supported, against the criterion as written.`,
  }
}

function ExperimentCard({ e }) {
  const drawer = useDrawer()
  const capture = useCapture()
  const { actions } = useSession()
  const [confounding, setConfounding] = useState(false)
  const [closing, setClosing] = useState(false)
  const v = VERDICTS[e.status === 'running' ? 'running' : e.verdict] || VERDICTS.running
  const h = e.hypothesis
  const criterion = e.criterion || CRITERIA[e.id]
  // A freshly pre-registered experiment is in its baseline window — there is
  // nothing to log into the intervention arm yet, and pretending otherwise
  // would let a user "run" a study that has not started.
  const inBaseline = e.status === 'running' && !e.intervention.samples.length
  const canRun = e.status === 'running' && !!criterion && !inBaseline

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
          <span className="crit">◈ pre-registered{e.status === 'running' ? ' · locked' : ''}</span> {e.successCriterion}
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

      <DistPlot e={e} />

      {e.status === 'running'
        ? <div className="exp-result running">
            <div className="exp-result-head">
              <span className="verdict v-run">running · week {e.week}</span>
              <span className="adherence mono">{e.adherence.done}/{e.adherence.of} days logged</span>
            </div>
            <p className="exp-interim">
              {e.loggedThisSession > 0
                ? `Interim only. ${e.intervention.stats.n} days of outcome data are in the intervention arm; the mean is ${Math.abs(e.intervention.stats.mean - e.baseline.stats.mean).toFixed(1)} ${e.baseline.unit} ${e.intervention.stats.mean < e.baseline.stats.mean ? 'below' : 'above'} baseline. ${e.intervention.stats.n < (criterion?.minDays || 18) ? `Below ${criterion?.minDays || 18} days the window cannot call the pre-registered bar — keep logging or close it and accept an inconclusive read.` : 'The window now has enough days to be scored against the bar.'}`
                : e.interim}
            </p>
            {e.recalledDays > 0 && (
              <p className="recalled-note">
                {e.recalledDays} of these days were backfilled from memory rather than measured at the
                time. Recalled adherence is weaker than logged adherence and is counted separately —
                the verdict does not pretend otherwise.
              </p>
            )}
            {inBaseline && (
              <p className="recalled-note">
                Baseline window is open — {criterion?.protocolDays ?? '—'} days of the intervention start
                after it closes. Nothing can be logged into the intervention arm yet, and the success
                bar above is already locked. That order is the whole mechanism: the threshold was set
                while you were still ignorant of the outcome.
              </p>
            )}
            {canRun && (
              <div className="exp-run-actions">
                <button className="btn pri sm" onClick={() => capture?.open('walk')}>Log today →</button>
                <button className="btn ghost sm" onClick={() => actions.logExperimentDay(e.id, { count: 5, recalled: true })}>
                  Backfill 5 recalled days
                </button>
                <button className="btn ghost sm" onClick={() => setConfounding(true)}>⚑ Flag a confounder</button>
                <button className="btn ghost sm" onClick={() => setClosing(true)}>Close the window</button>
              </div>
            )}
          </div>
        : <div className={`exp-result ${e.verdict === 'inconclusive' ? 'inc' : ''}`}>
            <div className="exp-result-head">
              <span className={`verdict v-${v.tone}`}>{v.label}</span>
              <span className="faint" style={{ fontSize: 12 }}>{v.blurb}</span>
            </div>
            <p className="exp-interim">{e.resultText}</p>
            {e.underpowered && (
              <p className="underpowered">⚠ Underpowered: n={e.intervention.stats.n} with this variability can’t
                resolve an effect this small. Re-run longer, or accept the null is unproven either way.</p>
            )}
          </div>}

      {confounding && (
        <Modal title="Flag a confounder" onClose={() => setConfounding(false)}>
          <ConfounderForm onSave={c => { actions.flagConfounder(e.id, c); setConfounding(false) }} onCancel={() => setConfounding(false)} />
        </Modal>
      )}

      {closing && (
        <Modal title="Close the window" onClose={() => setClosing(false)}
          footer={<>
            <button className="btn ghost" onClick={() => setClosing(false)}>Keep it running</button>
            <button className="btn pri" onClick={() => { actions.closeExperiment(e.id, evaluate(e)); setClosing(false) }}>
              Close &amp; score it
            </button>
          </>}>
          <p className="note" style={{ marginTop: 0 }}>
            The window will be scored against the criterion you fixed before day one, and nothing
            else. You cannot move the bar now — that is the entire mechanism.
          </p>
          <div className="close-preview">
            <div className="cp-row"><span className="fl">the bar</span><span>{e.successCriterion}</span></div>
            <div className="cp-row"><span className="fl">days in the arm</span><span className="mono num">{e.intervention.stats.n} of {criterion?.protocolDays || '—'}</span></div>
            <div className="cp-row"><span className="fl">mean shift</span>
              <span className="mono num">{(e.intervention.stats.mean - e.baseline.stats.mean >= 0 ? '+' : '')}{(e.intervention.stats.mean - e.baseline.stats.mean).toFixed(1)} {e.baseline.unit}</span></div>
            {e.intervention.stats.n < (criterion?.minDays || 18) && (
              <p className="stage-block" style={{ marginTop: 10 }}>
                Closing now will return <b>inconclusive</b> on power alone, regardless of what the
                numbers look like. That is not the app being unhelpful — it is the difference between
                a result and a story.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function ConfounderForm({ onSave, onCancel }) {
  const [flag, setFlag] = useState('poor sleep')
  const [when, setWhen] = useState('yesterday')
  const [note, setNote] = useState('')
  return (
    <div>
      <p className="note" style={{ marginTop: 0 }}>
        A flagged day is annotated and down-weighted at analysis — visibly, with its reason. It is
        never silently dropped, because a dataset you quietly pruned is not a dataset.
      </p>
      <div className="comp-field">
        <span className="fl">what happened</span>
        <div className="pick-row">
          {['poor sleep', 'illness', 'travel', 'alcohol', 'missed dose'].map(f => (
            <button key={f} className={`pick ${flag === f ? 'on' : ''}`} onClick={() => setFlag(f)}>{f}</button>
          ))}
        </div>
      </div>
      <label className="field"><span className="fl">when</span>
        <input className="txt" value={when} onChange={e => setWhen(e.target.value)} /></label>
      <label className="field"><span className="fl">note <span className="faint">· optional</span></span>
        <input className="txt" value={note} placeholder="e.g. 4 h sleep, red-eye flight" onChange={e => setNote(e.target.value)} /></label>
      <div className="cap-actions">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn pri" onClick={() => onSave({ flag, when, note: note.trim() || flag })}>Flag it</button>
      </div>
    </div>
  )
}

// --- pre-registration -------------------------------------------------------
// The honesty mechanism: the bar is set, and the power warning delivered, while
// the user is still ignorant of the outcome.
function DesignFlow({ onClose, proposed }) {
  const { actions } = useSession()
  const from = HYPOTHESIS_CANDIDATES.find(c => c.key === proposed) || HYPOTHESIS_CANDIDATES[0]
  const [cand, setCand] = useState(from)
  const [baseline, setBaseline] = useState(14)
  const [duration, setDuration] = useState(30)
  const [threshold, setThreshold] = useState(String(from.threshold))
  const [step, setStep] = useState(1)

  const pick = c => { setCand(c); setThreshold(String(c.threshold)) }
  const tooShort = duration < cand.metric.minInterval
  const noisy = cand.metric.noise === 'high'

  const create = () => {
    const id = `exp-${cand.key}-${duration}`
    const samples = [] // no data yet — that is the point
    actions.addExperiment({
      id, goal: cand.goal,
      hypothesis: {
        statement: cand.statement, rationale: cand.rationale,
        evidence: cand.evidence, confidence: cand.confidence,
        intervention_text: cand.statement.replace(/^Adding |^Three |^No /, ''),
      },
      status: 'running', design: 'pre / post', started: anchor,
      adherence: { done: 0, of: duration }, week: 1,
      metrics: [{ name: cand.metric.name, unit: cand.metric.unit, source: cand.metric.source, quality: cand.metric.quality }],
      successCriterion: `${cand.metric.name} moves ≥ ${threshold} ${cand.metric.unit} vs. a ${baseline}-day baseline, pre-registered before day 1.`,
      criterion: { metric: cand.metric.name, direction: 'down', threshold: Number(threshold), unit: cand.metric.unit, minDays: Math.round(duration * 0.6), protocolDays: duration },
      confounders: [],
      baseline: { window: `${baseline} days before start`, label: `${cand.metric.name}, baseline`, unit: cand.metric.unit, samples: [], stats: stats([]) },
      intervention: { window: `${duration} days from ${anchor}`, label: `${cand.metric.name}, with change`, unit: cand.metric.unit, samples, stats: stats(samples) },
      interim: 'No outcome data yet. The baseline window opens today; the success bar above is locked and greyed out for the rest of the run.',
      effectD: 0,
    })
    onClose()
  }

  return (
    <Modal title="Pre-register an experiment" wide onClose={onClose}
      footer={step === 1
        ? <button className="btn pri" onClick={() => setStep(2)}>Next — the design →</button>
        : <>
            <button className="btn ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn pri" onClick={create}>Lock the bar &amp; start</button>
          </>}>
      {step === 1 ? (
        <div>
          <p className="note" style={{ marginTop: 0 }}>
            Start from a claim precise enough to be wrong. Each of these is graded on the strength of
            the outside evidence — separately from how confident the agent is about you specifically.
          </p>
          <div className="cap-list">
            {HYPOTHESIS_CANDIDATES.map(c => (
              <button key={c.key} className={`cap-opt ${cand.key === c.key ? 'on' : ''}`} onClick={() => pick(c)}>
                <span className="cap-main">
                  <b>{c.statement}</b>
                  <span className="cap-d">{c.rationale}</span>
                </span>
                {/* static label here — a nested tappable control inside a
                    selectable row would fight the row for the click */}
                <span className="ev" title="strength of the outside evidence">
                  <span className="dots">●●●<i>○</i></span> MODERATE
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="prereg">
            <div className="pr-row"><span className="fl">hypothesis</span><span className="serif" style={{ fontSize: 15 }}>{cand.statement}</span></div>
            <div className="pr-row"><span className="fl">metric</span>
              <span>{cand.metric.name} <span className="faint mono">· {cand.metric.source} · noise {cand.metric.noise}</span></span></div>
            <div className="pr-row"><span className="fl">baseline</span>
              <div className="pick-row">
                {[7, 14, 21].map(d => <button key={d} className={`pick ${baseline === d ? 'on' : ''}`} onClick={() => setBaseline(d)}>{d} days</button>)}
              </div>
            </div>
            <div className="pr-row"><span className="fl">duration</span>
              <div className="pick-row">
                {[14, 30, 60, 120].map(d => <button key={d} className={`pick ${duration === d ? 'on' : ''}`} onClick={() => setDuration(d)}>{d} days</button>)}
              </div>
            </div>
            <div className="pr-row"><span className="fl">success bar</span>
              <span className="pr-bar">
                <input className="txt mono num" style={{ width: 80 }} value={threshold} onChange={e => setThreshold(e.target.value)} inputMode="decimal" />
                <span className="faint">{cand.metric.unit} change vs. baseline — <b>fixed before day one</b></span>
              </span>
            </div>
          </div>

          <div className={`power ${tooShort ? 'bad' : ''}`}>
            <span className="k mono">power &amp; duration check</span>
            {tooShort ? (
              <div>
                <b>{cand.metric.name} cannot move detectably in {duration} days.</b> Its useful
                re-measurement interval is about {cand.metric.minInterval} days — a shorter window
                measures noise, then hands you a number that looks like a result. Choose{' '}
                {cand.metric.minInterval <= 60 ? '60' : '120'} days, or pick a faster-moving marker.
              </div>
            ) : (
              <div>
                {duration} days against a {baseline}-day baseline can detect a {threshold}{' '}
                {cand.metric.unit} shift in {cand.metric.name}
                {noisy ? ', but only just — this is a high-noise consumer sensor, so a smaller effect will be invisible and the honest answer will be inconclusive.' : '. A smaller effect than that will not be resolvable, and the verdict will say so rather than guess.'}
              </div>
            )}
            <div className="faint" style={{ marginTop: 8, fontSize: 12.5 }}>
              You are being told this <b>before</b> you invest {duration} days — which is the only
              time the warning is worth anything.
            </div>
          </div>
        </div>
      )}
    </Modal>
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
// individual samples with a ±1 SD band and a mean line. When the bands overlap
// heavily, the eye reaches "inconclusive" before the label does.
function DistPlot({ e }) {
  const base = e.baseline, interv = e.intervention
  if (!interv.stats || !interv.stats.n || !base.stats?.n) {
    return (
      <div className="distplot empty">
        <span className="eyebrow">baseline vs. intervention</span>
        <p className="note" style={{ margin: '8px 0 0' }}>
          No outcome data yet. The plot fills in as days land — and the pre-registered bar above is
          already locked, so nothing you see later can change what counts as success.
        </p>
      </div>
    )
  }
  const all = [...base.samples, ...interv.samples]
  const lo = Math.min(...all), hi = Math.max(...all)
  const pad = (hi - lo) * 0.12 || 1
  const dom = [lo - pad, hi + pad]
  const x = v => ((v - dom[0]) / (dom[1] - dom[0])) * 100

  const arms = [
    { key: 'base', label: base.label, s: base.stats, samples: base.samples, cls: 'base' },
    { key: 'interv', label: interv.label, s: interv.stats, samples: interv.samples, cls: 'interv' },
  ]
  const fresh = e.loggedThisSession || 0

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
              <span className={`dist-band ${a.cls}`}
                style={{ left: `${x(a.s.mean - a.s.sd)}%`, width: `${x(a.s.mean + a.s.sd) - x(a.s.mean - a.s.sd)}%` }} />
              {a.samples.map((v, i) => {
                const isFresh = a.key === 'interv' && i >= a.samples.length - fresh
                return (
                  <span key={i} className={`dist-dot ${a.cls} ${isFresh ? 'fresh' : ''}`}
                    style={{ left: `${x(v)}%`, top: `${34 + (i % 3 - 1) * 16}%` }} title={`${v} ${base.unit}${isFresh ? ' · logged this session' : ''}`} />
                )
              })}
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
          {fresh > 0 && <span className="new-tag" style={{ marginLeft: 8 }}>{fresh} logged now</span>}
        </span>
      </div>
    </div>
  )
}
