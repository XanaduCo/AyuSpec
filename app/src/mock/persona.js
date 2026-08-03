// The single deterministic persona behind the whole demo. Every view reads from
// here, so the lab drawn on a date appears in the Timeline, feeds the "what
// changed" answer, and is what a doctor packet would export. Cross-view
// coherence is what makes a mock feel real. All values are fabricated.
//
// Every record carries a stable `id` so answers (agent.js) and Timeline events
// can cite it and the source drawer (fhir.js) can resolve it to a FHIR resource.

export const persona = {
  name: 'Ravi Mehta',
  age: 45,
  sex: 'male',
  location: 'Local · self-hosted',
  since: '2025-05-05', // ~90-day window anchor
}

// The persona's "today". Fixed so the demo is deterministic regardless of the
// wall clock. The 90-day anchor window is [win90Start, anchor].
export const anchor = '2025-08-03'
export const win90Start = '2025-05-05'
// The full timeline domain reaches back to the oldest event (the CAC scan) so
// the "year" zoom has something to show beyond the 90-day window.
export const domainStart = '2024-11-01'

// Labs — current value, prior value (baseline ~90d before), reference range, unit.
export const labs = [
  { id: 'obs-apob', code: '1884-6', name: 'ApoB', value: 95, prior: 88, unit: 'mg/dL', low: null, high: 90, flag: 'high', drawn: '2025-08-01', panel: 'Lipid panel', lab: 'LabCorp' },
  { id: 'obs-hdl', code: '2085-9', name: 'HDL-C', value: 52, prior: 50, unit: 'mg/dL', low: 40, high: null, flag: 'ok', drawn: '2025-08-01', panel: 'Lipid panel', lab: 'LabCorp' },
  { id: 'obs-ldl', code: '13457-7', name: 'LDL-C (calc)', value: 128, prior: 120, unit: 'mg/dL', low: null, high: 100, flag: 'high', drawn: '2025-08-01', panel: 'Lipid panel', lab: 'LabCorp' },
  { id: 'obs-hba1c', code: '4548-4', name: 'HbA1c', value: 5.4, prior: 5.5, unit: '%', low: null, high: 5.7, flag: 'ok', drawn: '2025-08-01', panel: 'Metabolic', lab: 'LabCorp' },
  { id: 'obs-glucose', code: '2339-0', name: 'Fasting glucose', value: 96, prior: 94, unit: 'mg/dL', low: 70, high: 99, flag: 'ok', drawn: '2025-08-01', panel: 'Metabolic', lab: 'LabCorp' },
  { id: 'obs-crp', code: '1988-5', name: 'hs-CRP', value: 0.8, prior: 1.1, unit: 'mg/L', low: null, high: 1.0, flag: 'ok', drawn: '2025-08-01', panel: 'Inflammation', lab: 'LabCorp' },
  { id: 'obs-testosterone', code: '2986-8', name: 'Testosterone, total', value: 642, prior: 610, unit: 'ng/dL', low: 264, high: 916, flag: 'ok', drawn: '2025-08-01', panel: 'Hormone', lab: 'LabCorp' },
]

// The lab draws are two events on the timeline: the current panel (2025-08-01)
// and the prior baseline panel ~90d earlier (2025-05-02).
export const priorLabDate = '2025-05-02'

// --- deterministic daily-series generator ---------------------------------
// A tiny seeded PRNG (mulberry32) so the wearable series are identical on every
// load — no Math.random, no drift between the answer text and the chart.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86400000
const iso = d => new Date(d).toISOString().slice(0, 10)
export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / DAY)
}
export function addDays(d, n) {
  return iso(new Date(d).getTime() + n * DAY)
}

// Generate a daily [{date, value}] series from `start` to `anchor`, drifting
// from `baseline` toward `current` with light seeded noise and a gentle weekly
// wobble, rounded to `dp` decimals.
function makeDaily({ start, baseline, current, seed, dp = 0, noise = 1 }) {
  const rand = mulberry32(seed)
  const n = daysBetween(start, anchor)
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const trend = baseline + (current - baseline) * t
    const wobble = Math.sin(i / 6.3) * noise * 0.5
    const jitter = (rand() - 0.5) * 2 * noise
    const v = trend + wobble + jitter
    out.push({ date: addDays(start, i), value: Number(v.toFixed(dp)) })
  }
  // Pin the endpoints so the chart's last point equals the reported `current`.
  out[out.length - 1].value = current
  return out
}

// Wearable metrics — a 90-day summary, a coarse weekly sparkline (kept for the
// compact cards) and a full daily series over the timeline domain.
export const wearables = [
  { id: 'obs-hrv', code: '80404-7', name: 'HRV (SDNN)', unit: 'ms', source: 'oura', current: 42, baseline: 46, dir: 'down',
    series: [46, 47, 45, 44, 43, 44, 42, 41, 42, 43, 42, 42],
    daily: makeDaily({ start: domainStart, baseline: 47, current: 42, seed: 101, dp: 0, noise: 2.4 }) },
  { id: 'obs-vo2max', code: 'vo2max', name: 'VO₂max (est.)', unit: 'mL/kg/min', source: 'whoop', current: 52.0, baseline: 50.7, dir: 'up',
    series: [50.7, 50.9, 51.1, 51.0, 51.4, 51.6, 51.8, 51.9, 52.0, 52.1, 52.0, 52.0],
    daily: makeDaily({ start: domainStart, baseline: 50.2, current: 52.0, seed: 202, dp: 1, noise: 0.35 }) },
  { id: 'obs-rhr', code: 'rhr', name: 'Resting HR', unit: 'bpm', source: 'oura', current: 54, baseline: 55, dir: 'down',
    series: [55, 55, 56, 55, 54, 54, 55, 54, 54, 53, 54, 54],
    daily: makeDaily({ start: domainStart, baseline: 56, current: 54, seed: 303, dp: 0, noise: 1.6 }) },
  { id: 'obs-sleep', code: 'sleep', name: 'Sleep duration', unit: 'h', source: 'oura', current: 7.1, baseline: 7.0, dir: 'up',
    series: [7.0, 6.8, 7.1, 7.2, 6.9, 7.0, 7.1, 7.3, 7.0, 7.1, 7.2, 7.1],
    daily: makeDaily({ start: domainStart, baseline: 6.9, current: 7.1, seed: 404, dp: 1, noise: 0.45 }) },
]

export const conditions = [
  { id: 'cond-htn', name: 'Essential hypertension', status: 'controlled', onset: '2022-03', onsetDate: '2022-03-15', code: 'I10' },
]

export const medications = [
  { id: 'med-lisinopril', name: 'Lisinopril', dose: '10 mg', freq: 'once daily', since: '2022-04-01', for: 'hypertension', code: '29046' },
]

export const imaging = [
  { id: 'img-brain-mri', modality: 'MRI', study: 'Brain MRI', date: '2025-02-18', series: ['T1', 'T2', 'FLAIR'], instances: 180,
    aiSummary: 'Age-appropriate ventricle size, no acute white-matter changes, normal hippocampal volumes. AI-generated (MedGemma) — not a radiologist read.' },
  { id: 'img-cac', modality: 'CT', study: 'Coronary calcium (CAC)', date: '2024-11-09', series: ['Gated CT'], instances: 60,
    aiSummary: 'Agatston score 0. No detectable coronary artery calcification.' },
]

export const genomics = {
  source: '23andMe',
  variants: [
    { gene: 'APOE', genotype: 'ε3/ε3', rsid: 'rs429358/rs7412', note: 'Baseline Alzheimer risk; not an ε4 carrier.' },
  ],
  prs: [
    { trait: 'Coronary artery disease', percentile: 70, ancestry: 'South Asian', caveat: 'Effect sizes are from European-ancestry GWAS; less predictive for other ancestries.' },
  ],
}

export const familyHistory = [
  { relation: 'Father', condition: 'Coronary artery disease', age: 62 },
]

// The active n-of-1 experiment, referenced by Ask, Experiments and Explore.
export const activeHypothesis = {
  id: 'exp-postmeal-walks',
  statement: 'Post-meal walks reduce my post-prandial glucose peaks and improve HRV consistency.',
  evidence: 'high',
  week: 4, adherence: { done: 21, of: 30 },
  metric: 'CGM peak · Oura HRV',
  status: 'running',
  started: '2025-07-06',
}

// Discrete, dated point-events for the Timeline lanes. Each `ref` resolves via
// fhir.js to a full resource in the source drawer. Wearables are continuous and
// live in their own lanes (from `daily`), so they are not repeated here.
export const events = [
  { id: 'ev-labs-current', track: 'labs', date: '2025-08-01', ref: 'panel-lipid-2025-08', label: 'Lipid + metabolic panel', detail: '7 analytes · LabCorp', flag: 'high' },
  { id: 'ev-labs-prior', track: 'labs', date: priorLabDate, ref: 'panel-lipid-2025-05', label: 'Prior lipid + metabolic panel', detail: 'baseline draw · LabCorp' },
  { id: 'ev-mri', track: 'imaging', ...pick(imaging, 'img-brain-mri'), ref: 'img-brain-mri', label: 'Brain MRI', detail: 'T1/T2/FLAIR · 180 img' },
  { id: 'ev-cac', track: 'imaging', ...pick(imaging, 'img-cac'), ref: 'img-cac', label: 'Coronary calcium CT', detail: 'Agatston 0' },
  { id: 'ev-med-lisinopril', track: 'medications', date: '2022-04-01', ref: 'med-lisinopril', label: 'Lisinopril started', detail: '10 mg once daily' },
  { id: 'ev-cond-htn', track: 'conditions', date: '2022-03-15', ref: 'cond-htn', label: 'Hypertension dx', detail: 'controlled' },
  { id: 'ev-exp-start', track: 'procedures', date: '2025-07-06', ref: 'exp-postmeal-walks', label: 'Post-meal walks — n-of-1 start', detail: 'week 4 · 21/30 days' },
]

function pick(list, id) {
  const r = list.find(x => x.id === id)
  return { date: r.date }
}

// Tracks in render order for the Timeline (labels + which lane each event maps to).
export const tracks = [
  { key: 'labs', label: 'Labs', kind: 'events' },
  { key: 'wearables', label: 'Wearables', kind: 'series' },
  { key: 'conditions', label: 'Conditions', kind: 'events' },
  { key: 'procedures', label: 'Procedures & experiments', kind: 'events' },
  { key: 'medications', label: 'Medications', kind: 'events' },
  { key: 'imaging', label: 'Imaging', kind: 'events' },
]
