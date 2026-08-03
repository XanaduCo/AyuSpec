// n-of-1 experiments for Ravi Mehta. A hypothesis is a first-class object
// (evidence.md) with an evidence-strength label kept SEPARATE from the agent's
// calibrated confidence; an experiment (experimentation.md) tests it with a
// pre-registered success criterion, a measured baseline, and an honest verdict.
//
// The load-bearing honesty guardrail (experimentation.md#honesty-guardrails):
// a positive n-of-1 is still EVIDENCE: LOW, and an experiment whose effect sits
// inside baseline noise reads "inconclusive", never "it worked". The three
// seeded experiments below exist precisely to show all three verdicts.
//
// Baseline/intervention samples are hand-picked (not random) so the overlap —
// or separation — of the two distributions is deterministic and legible.

import { activeHypothesis } from './persona.js'

// A tiny summary-stats helper over a sample array.
function stats(xs) {
  const n = xs.length
  const mean = xs.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  return { n, mean, sd, min: Math.min(...xs), max: Math.max(...xs) }
}

// Cohen's d against the baseline SD — the effect in units of natural noise.
// |d| < ~0.5 with a small n is what "swamped by variability" looks like.
function cohenD(base, interv) {
  const b = stats(base), i = stats(interv)
  const pooled = Math.sqrt((b.sd ** 2 + i.sd ** 2) / 2) || 1
  return (i.mean - b.mean) / pooled
}

function build(e) {
  const base = stats(e.baseline.samples)
  const interv = e.intervention.samples ? stats(e.intervention.samples) : null
  const d = e.intervention.samples ? cohenD(e.baseline.samples, e.intervention.samples) : null
  return { ...e, baseline: { ...e.baseline, stats: base }, intervention: { ...e.intervention, stats: interv }, effectD: d }
}

export const experiments = [
  // 1 · RUNNING — the persona's active hypothesis. No verdict yet: an interim
  // read only, explicitly labelled as underpowered-so-far.
  build({
    id: activeHypothesis.id,
    goal: 'metabolic',
    hypothesis: {
      statement: activeHypothesis.statement,
      rationale: 'Post-prandial glucose excursions track with next-day HRV suppression in Ravi’s own CGM+Oura overlap; light activity after meals blunts the spike in the literature.',
      evidence: 'moderate', // strength of the EXTERNAL claim
      confidence: 0.55, // the agent's calibrated confidence — kept separate
      intervention_text: '10–15 min walk within 30 min of lunch and dinner',
    },
    status: 'running',
    design: 'pre / post',
    started: activeHypothesis.started,
    adherence: activeHypothesis.adherence, // {done, of}
    week: activeHypothesis.week,
    metrics: [
      { name: 'CGM post-prandial peak', unit: 'mg/dL', source: 'Dexcom (bridged · Terra)', quality: 'high' },
      { name: 'HRV (SDNN)', unit: 'ms', source: 'Oura (direct)', quality: 'moderate' },
    ],
    successCriterion: 'Mean post-meal CGM peak drops ≥ 15 mg/dL vs. baseline, pre-registered before day 1.',
    confounders: [{ flag: 'travel', when: 'days 12–14', note: 'work trip — meals out, sleep shifted' }],
    baseline: { window: '2025-06-15 → 2025-07-05', label: 'CGM post-meal peak, pre-walk', unit: 'mg/dL',
      samples: [142, 151, 138, 160, 147, 155, 133, 149, 158, 144, 152, 139, 146, 157] },
    intervention: { window: '2025-07-06 → now (in progress)', label: 'CGM post-meal peak, with walks', unit: 'mg/dL',
      samples: [140, 133, 129, 145, 136, 131, 138, 127, 141, 134, 130, 143] }, // trending down but n small
    interim: 'Interim only. Mean is down ~13 mg/dL, but 12 of 30 days logged and a travel window sits inside the intervention arm. No verdict until the pre-registered window closes.',
  }),

  // 2 · COMPLETE · SUPPORTED — a clean separation. Still EVIDENCE: LOW because
  // it is one subject, no blinding (the guardrail that survives a positive).
  build({
    id: 'exp-mg-sleep',
    goal: 'sleep',
    hypothesis: {
      statement: 'Magnesium glycinate 300 mg before bed reduces my sleep-onset latency.',
      rationale: 'Sleep latency had crept up over spring; mechanistic support for magnesium and GABA, and a few consistent small trials.',
      evidence: 'low',
      confidence: 0.7,
      intervention_text: 'Magnesium glycinate 300 mg, 45 min before bed',
    },
    status: 'complete',
    design: 'A–B–A reversal',
    started: '2025-04-01', ended: '2025-05-20',
    metrics: [{ name: 'Sleep-onset latency', unit: 'min', source: 'Oura (direct)', quality: 'moderate' }],
    successCriterion: 'Median sleep-onset latency drops ≥ 6 min across both B arms vs. the A arms, pre-registered.',
    confounders: [],
    verdict: 'supported',
    resultText: 'Latency fell ~9 min in both intervention arms and returned toward baseline in the washout — the A–B–A reversal is what lifts this above a single before/after. Effect exceeds baseline noise.',
    baseline: { window: 'A arms (weeks 1–2, 6)', label: 'Sleep-onset latency, no magnesium', unit: 'min',
      samples: [22, 25, 19, 28, 24, 21, 26, 23, 27, 20, 24, 25] },
    intervention: { window: 'B arms (weeks 3–5)', label: 'Sleep-onset latency, magnesium', unit: 'min',
      samples: [15, 13, 17, 12, 16, 14, 11, 15, 13, 16, 14, 12] },
  }),

  // 3 · COMPLETE · INCONCLUSIVE — the honest one. The intervention mean barely
  // moves and its distribution sits entirely inside baseline variability. This
  // MUST read "inconclusive", not "it worked" (the roadmap's done-criterion).
  build({
    id: 'exp-cold-hrv',
    goal: 'recovery',
    hypothesis: {
      statement: 'A 3-minute cold shower each morning raises my resting HRV.',
      rationale: 'Cold-exposure enthusiasm and some acute autonomic signals; weak and mixed evidence for a durable HRV effect.',
      evidence: 'none',
      confidence: 0.3,
      intervention_text: '3 min cold shower (~15 °C) on waking',
    },
    status: 'complete',
    design: 'pre / post',
    started: '2025-05-25', ended: '2025-06-14',
    metrics: [{ name: 'Morning HRV (SDNN)', unit: 'ms', source: 'Oura (direct)', quality: 'moderate' }],
    successCriterion: 'Mean morning HRV rises ≥ 5 ms vs. baseline, pre-registered before day 1.',
    confounders: [{ flag: 'illness', when: 'days 5–7', note: 'mild head cold — HRV dipped independent of the shower' }],
    verdict: 'inconclusive',
    resultText: 'Mean HRV rose ~1.5 ms — well inside the baseline’s own day-to-day swing, and below the pre-registered 5 ms threshold. With n=14 and this much natural variability the experiment is underpowered to detect an effect this small. The honest read is inconclusive, not a null and not a win.',
    underpowered: true,
    baseline: { window: '2025-05-04 → 2025-05-24', label: 'Morning HRV, no cold shower', unit: 'ms',
      samples: [44, 48, 41, 46, 43, 49, 40, 45, 47, 42, 46, 44, 48, 43] },
    intervention: { window: '2025-05-25 → 2025-06-14', label: 'Morning HRV, cold shower', unit: 'ms',
      samples: [45, 47, 43, 48, 44, 46, 42, 49, 45, 44, 47, 43, 46, 45] },
  }),
]

// Verdict → display metadata. Colour stays OUT of the privacy language: verdicts
// use ink weight + a neutral ring, not green/amber (those are reserved for
// egress). "supported" is deliberately not green.
export const VERDICTS = {
  running: { label: 'running', tone: 'run', blurb: 'collecting data' },
  supported: { label: 'supported', tone: 'sup', blurb: 'effect exceeds baseline noise' },
  'not supported': { label: 'not supported', tone: 'nul', blurb: 'no effect detected' },
  inconclusive: { label: 'inconclusive', tone: 'inc', blurb: 'underpowered / swamped by variability' },
}

export const GOALS = {
  metabolic: 'Metabolic health',
  sleep: 'Sleep',
  recovery: 'Recovery & autonomic',
}

// Group experiments by their goal, in a stable order.
export function byGoal() {
  const order = Object.keys(GOALS)
  const groups = {}
  for (const e of experiments) (groups[e.goal] ||= []).push(e)
  return order.filter(g => groups[g]).map(g => ({ goal: g, label: GOALS[g], items: groups[g] }))
}

export { stats }
