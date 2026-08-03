// Session fixtures — the canned material the *interactive* half of the demo
// consumes: what an import parses out of a file, what a capture path produces,
// what is genuinely waiting on the user, what the record openly does not know.
//
// Everything here is grounded in the real base record in `src/mock/**`. That is
// the whole point: an import that adds a marker Ravi already has nine draws of,
// or a "screening overdue" prompt for a colonoscopy he had in 2023, would be
// theatre. Each fixture below answers a question the stored data actually leaves
// open — the un-speciated arsenic, the rising mercury, the array-vs-sequence
// disagreement — so confirming an import visibly closes something.
//
// Nothing here mutates the mocks. Deterministic: no `Math.random()`, no clock.

import * as P from '../mock/persona.js'

export const anchor = P.anchor || '2025-08-03'
export const domainStart = P.domainStart || '2022-08-08'

const DAY = 86400000
const iso = d => new Date(d).toISOString().slice(0, 10)
export const addDays = P.addDays || ((d, n) => iso(new Date(d).getTime() + n * DAY))
export const daysBetween = P.daysBetween || ((a, b) => Math.round((new Date(b) - new Date(a)) / DAY))

// Same seeded PRNG shape the persona uses, so a series generated here sits
// beside one generated there without looking like it came from a different world.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeDaily({ start, baseline, current, seed, dp = 0, noise = 1 }) {
  const rand = mulberry32(seed)
  const n = Math.max(1, daysBetween(start, anchor))
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const trend = baseline + (current - baseline) * t
    const wobble = Math.sin(i / 6.3) * noise * 0.5
    const v = trend + wobble + (rand() - 0.5) * 2 * noise
    out.push({ date: addDays(start, i), value: Number(v.toFixed(dp)) })
  }
  out[out.length - 1].value = current
  return out
}

// Read a headline number out of the base record where one exists, so the copy
// below cannot drift away from the data it describes.
const analyte = key => {
  try { return P.analyteByKey?.[key] || null } catch { return null }
}
export const MERCURY = (() => {
  const res = (P.currentResults || []).find?.(r => r.key === 'mercury' || r.analyte === 'mercury')
  const a = analyte('mercury')
  return {
    value: res?.value ?? 14.2,
    unit: res?.unit ?? a?.unit ?? 'µg/L',
    high: a?.high ?? 10,
  }
})()

const row = (o) => ({ include: true, ...o })

// ---------------------------------------------------------------------------
// Imports — what each dropped file parses into, and what it closes downstream.
// ---------------------------------------------------------------------------

export const NEW_PANEL_DATE = '2025-08-02'

export const IMPORTS = {
  labs: {
    key: 'labs',
    file: 'Quicksilver_Speciated_2025-08-02.pdf',
    title: 'Speciated metals + urine iodine',
    path: 'born-digital PDF · text layer',
    took: '6s',
    model: 'MedGemma 4B (local)',
    scannedNote:
      'A deterministic text extract first, then the local medical extractor structures it. Every value is grounded back into the raw text before it is offered — a number that will not string-match is never shown as high confidence. This panel is the one you ordered after the last draw came back with blood mercury above the limit and total arsenic that nobody had speciated.',
    rows: [
      row({
        id: 'obs-as-inorg', name: 'Arsenic, inorganic + methylated (urine)', code: '5586-3',
        value: 4.8, unit: 'µg/L', low: null, high: 35, flag: 'ok', conf: 0.54, first: true,
        ask: {
          field: 'unit', options: ['µg/L', 'µg/g creatinine'], chosen: null,
          why: 'The number grounded cleanly; the unit did not. Urine metals are reported either per litre or normalised to creatinine, and the two are not interchangeable — a dilute sample reads low in one and normal in the other. The parser will not pick for you.',
        },
      }),
      row({ id: 'obs-as-abet', name: 'Arsenobetaine (urine)', code: '5585-5', value: 96, unit: 'µg/L', low: null, high: null, flag: 'ok', conf: 0.94, first: true }),
      row({ id: 'obs-mehg', name: 'Methylmercury, blood', code: '5684-6', value: 11.4, unit: 'µg/L', low: null, high: null, flag: 'ok', conf: 0.91, first: true }),
      row({ id: 'obs-iodine-u', name: 'Iodine, urine', code: '5767-1', value: 412, unit: 'µg/L', low: 100, high: 199, flag: 'high', conf: 0.95, first: true }),
      row({ id: 'obs-se-plasma', name: 'Selenium, plasma', code: '5767-9', value: 168, unit: 'µg/L', low: 63, high: 160, flag: 'high', conf: 0.96, first: false }),
    ],
    panel: { id: 'panel-speciated-2025-08-02', label: 'Speciated metals + urine iodine', lab: 'Quicksilver Scientific', drawn: NEW_PANEL_DATE },
  },

  'apple-health': {
    key: 'apple-health',
    file: 'export.zip',
    title: 'Apple Health export',
    path: 'SAX-streamed export.xml + clinical-records/',
    took: '41s',
    model: 'no model — deterministic parse',
    scannedNote:
      'A cumulative full dump, so re-importing is safe: 5,419 of the 5,606 resources matched a content hash already in the store and were recognised rather than duplicated. The new watch is the interesting part — it reports steps, and so does the Garmin.',
    counts: { scanned: 5606, deduped: 5419, added: 187 },
    rows: [
      row({ id: 'stream-steps-apple', name: 'Step count — Apple Watch', kind: 'series', detail: '276 days · overlaps the Garmin series', conf: 0.99 }),
      row({ id: 'imm-tdap', name: 'Tdap immunisation', kind: 'record', detail: 'administered 2023-06-14 · Sutter Health', conf: 0.95 }),
      row({ id: 'overlap-steps', name: 'Garmin/Apple step overlap', kind: 'note', detail: '276 days both devices reported', conf: 0.99 }),
    ],
  },

  dicom: {
    key: 'dicom',
    file: 'MR_KNEE_RIGHT_20250722/ (240 files)',
    title: 'Knee MRI · right',
    path: 'pydicom metadata parse · pixels to local disk',
    took: '1m 04s',
    model: 'MedGemma vision (local) — on request',
    scannedNote:
      'Metadata became an ImagingStudy; the pixel data was written to local disk and indexed, never into the database and never to a model outside this machine. Nothing has been read yet — the vision model runs only when you ask.',
    rows: [
      row({ id: 'img-knee-mri', name: 'MR · right knee', kind: 'record', detail: '3 series (PD-FS sag, T1 cor, T2 ax) · 240 instances · 2025-07-22', conf: 0.97 }),
    ],
    study: {
      id: 'img-knee-mri', modality: 'MRI', study: 'Knee MRI (right)', date: '2025-07-22',
      series: ['PD-FS sagittal', 'T1 coronal', 'T2 axial'], instances: 240,
    },
    impression:
      'Intact cruciate and collateral ligaments. Mild intrasubstance signal change at the posterior horn of the medial meniscus without a discrete tear line. Small joint effusion. No marrow oedema. AI-generated (MedGemma, on-device) — not a radiologist read, and not a diagnosis.',
  },

  genome: {
    key: 'genome',
    file: '23andMe_v5_2019.txt',
    title: '23andMe array (2019)',
    path: '638,214 SNPs · compared against your 30× genome',
    took: '19s',
    model: 'no model — bundled ClinVar/dbSNP snapshot',
    scannedNote:
      'You already have a 30× whole genome, so a 650k-SNP array adds no new sites: it is a sparse subset of what is already stored. What it can do is disagree — and where an array call and a sequence call disagree, the honest thing is to keep both and say which one wins, not to silently overwrite the older file.',
    rows: [
      row({ id: 'arr-apoe', name: 'APOE · rs429358/rs7412', kind: 'variant', detail: 'ε3/ε3 — agrees with the 30× sequence', conf: 0.93 }),
      row({ id: 'arr-lpa', name: 'LPA · rs3798220', kind: 'variant', detail: 'C/T carrier — agrees with the 30× sequence', conf: 0.9 }),
      row({ id: 'arr-mthfr', name: 'MTHFR · C677T', kind: 'variant', detail: 'array calls C/C · the sequence calls C/T — a disagreement', conf: 0.48, conflict: true }),
    ],
  },
}

// The wearable lane the Apple Health import lands. Deliberately NOT the same id
// as the persona's Garmin step series — the point of the import is that two
// devices now report the same thing and neither is thrown away.
export function stepsSeries() {
  return {
    id: 'obs-steps-apple', code: '55423-8', name: 'Steps (Apple Watch)', unit: 'steps/day', source: 'apple watch',
    current: 10850, baseline: 9200, dir: 'up',
    daily: makeDaily({ start: addDays(anchor, -276), baseline: 9200, current: 10850, seed: 707, dp: 0, noise: 2000 }),
  }
}

// ---------------------------------------------------------------------------
// Capture — the sub-ten-second paths (journey 12).
// ---------------------------------------------------------------------------

export const BOTTLES = [
  {
    key: 'creatine',
    product: 'Creatine Monohydrate (micronised)',
    brand: 'Thorne',
    fields: [
      { k: 'ingredient', v: 'Creatine monohydrate', conf: 0.97 },
      { k: 'strength', v: '5 g', conf: 0.58, uncertain: true, note: 'The label prints both a 5 g scoop and a 2.5 g half-scoop serving. Confirm which one you actually take.' },
      { k: 'form', v: 'powder', conf: 0.95 },
      { k: 'timing', v: 'morning', conf: 0.7 },
    ],
    interaction: {
      severity: 'none',
      with: 'Lisinopril 10 mg · Vitamin D3 · Omega-3 · Magnesium glycinate',
      text: 'Checked against all four of your active medications and supplements. No clinically significant interaction. One thing worth knowing rather than a warning: creatine raises serum creatinine by roughly 0.1–0.2 mg/dL without any change in kidney function, so your next eGFR will read a little lower for a reason that is not your kidneys. That is now attached to the record, so the next panel does not read as a decline.',
    },
    med: { id: 'med-creatine', name: 'Creatine monohydrate', dose: '5 g', freq: 'daily', for: 'strength / cognition', code: 'sup-creatine' },
  },
  {
    key: 'kcl',
    product: 'Potassium Chloride 99 mg',
    brand: 'NOW Foods',
    fields: [
      { k: 'ingredient', v: 'Potassium chloride', conf: 0.96 },
      { k: 'strength', v: '99 mg', conf: 0.94 },
      { k: 'form', v: 'tablet', conf: 0.93 },
      { k: 'timing', v: 'morning', conf: 0.68 },
    ],
    interaction: {
      severity: 'high',
      with: 'Lisinopril 10 mg (active since 2022)',
      text: 'ACE inhibitors reduce how much potassium your kidneys excrete. A potassium supplement on top of lisinopril can push serum potassium into a dangerous range, and your last potassium was already 4.3 mmol/L. This is a clinical decision, not one ayuOS will make for you — the log is held rather than stored, and routed to your clinician.',
    },
    med: { id: 'med-kcl', name: 'Potassium chloride', dose: '99 mg', freq: 'daily', for: 'supplement', code: 'sup-kcl' },
  },
]

// Deliberately a substance that lands *inside* the running glucose experiment —
// so the log does not just store a fact, it changes how a study must be read.
export const VOICE_LOG = {
  transcript: 'Started taking berberine five hundred milligrams before dinner',
  parsed: { substance: 'Berberine', dose: '500 mg', timing: 'before dinner', start: anchor },
  uncertain: 'berberine',
  med: { id: 'med-berberine', name: 'Berberine', dose: '500 mg', freq: 'before dinner', for: 'post-prandial glucose', code: 'sup-berberine' },
  confounder: {
    flag: 'new glucose-lowering supplement',
    when: `from ${anchor}`,
    note: 'Berberine lowers post-prandial glucose on its own. Started mid-way through a post-meal-walk experiment whose outcome metric is the post-meal CGM peak — from today, the two are confounded and the walk effect cannot be separated from the supplement.',
  },
}

export const DETECTED_ACTIVITY = {
  id: 'obs-run-0803',
  label: 'Run · 6.2 km',
  detail: '07:10 · 34 min · avg HR 148 bpm · Garmin',
  date: anchor,
}

export const WALK_LOG_QUEUE = [128, 135, 126, 132, 124, 137, 129, 131, 125, 133, 127, 130, 122, 128, 134, 126, 129, 131]

// The pre-registered bar for the seeded running experiment. Kept out of the
// view so closing a window can only ever be scored against the number that was
// fixed before day one.
export const CRITERIA = {
  'exp-postmeal-walks': {
    metric: 'mean post-meal CGM peak', direction: 'down', threshold: 15, unit: 'mg/dL', minDays: 18, protocolDays: 30,
  },
}

// Candidate hypotheses the design flow starts from. Each carries the marker
// property that makes the power warning real: how long the marker actually
// needs to move, and how noisy it is.
export const HYPOTHESIS_CANDIDATES = [
  {
    key: 'fibre', goal: 'metabolic',
    statement: 'Adding 15 g/day of soluble fibre lowers my ApoB.',
    rationale: 'Soluble fibre binds bile acids and modestly lowers apoB-containing particles. Consistent across trials; the effect is real and small. Your ApoB has risen at every draw for two years, so this is a live question.',
    evidence: 'moderate', confidence: 0.5,
    metric: { name: 'ApoB', unit: 'mg/dL', source: 'LabCorp (quarterly draw)', quality: 'high', minInterval: 90, noise: 'low' },
    threshold: 8,
  },
  {
    key: 'seafood', goal: 'metabolic',
    statement: 'Cutting seafood to twice a week brings my blood mercury back under the limit.',
    rationale: 'Blood mercury reflects intake over weeks, not a lifetime burden, and your logged seafood servings roughly doubled over the same period the number did. This is the rare marker where the input is known and the half-life is short enough to test.',
    evidence: 'moderate', confidence: 0.65,
    metric: { name: 'Mercury, blood', unit: 'µg/L', source: 'LabCorp (quarterly draw)', quality: 'high', minInterval: 60, noise: 'low' },
    threshold: 4,
  },
  {
    key: 'caffeine', goal: 'sleep',
    statement: 'No caffeine after midday shortens my sleep-onset latency.',
    rationale: 'Caffeine’s half-life is 5–6 hours and adenosine clearance is the dominant lever on sleep onset. Well-supported mechanism, highly variable by person.',
    evidence: 'moderate', confidence: 0.6,
    metric: { name: 'Sleep-onset latency', unit: 'min', source: 'Oura (direct)', quality: 'moderate', minInterval: 14, noise: 'moderate' },
    threshold: 6,
  },
]

// ---------------------------------------------------------------------------
// Attention — what the Now view opens on. Each item is derived from something
// actually sitting in the record, and most are resolvable from elsewhere in the
// app rather than by dismissing them.
// ---------------------------------------------------------------------------

export const SEED_ATTENTION = [
  {
    id: 'att-mercury',
    kind: 'decision',
    title: `Blood mercury ${MERCURY.value} ${MERCURY.unit} — above the ${MERCURY.high} ${MERCURY.unit} limit, and it has roughly doubled in two years`,
    body: 'Your logged seafood servings roughly doubled over the same window, which is the obvious explanation and also the testable one. What the record cannot tell you yet is which *kind* of mercury and arsenic: the panel measured totals, and total arsenic is dominated by harmless arsenobetaine from the same seafood. Speciation is the test that separates them, and it was never ordered.',
    when: 'last draw · 2025-08-01',
    action: { label: 'Import the speciated panel', to: '/data' },
    state: 'open',
  },
  {
    id: 'att-ferritin',
    kind: 'decision',
    title: 'Ferritin has risen at every draw for two years, and you are an HFE compound heterozygote',
    body: 'Each individual value is inside the reference range, so nothing was ever flagged. The pattern is the finding, not any single number — and it is the one thing in this record where the genotype and the trend point the same way. This is a repeat-and-discuss, not an alarm.',
    when: 'across 8 draws',
    action: { label: 'Add it to a doctor packet', to: '/share' },
    snoozable: true,
    state: 'open',
  },
  {
    id: 'att-whoop',
    kind: 'error',
    title: 'Whoop stopped syncing two days ago',
    body: 'Whoop changed its OAuth token endpoint and the refresh failed. The adapter logged the error and skipped — every other source kept syncing and the agent keeps answering over what is already stored. Recovery data is stale as of 2025-08-01.',
    when: '2 days ago',
    action: { label: 'Re-sync Whoop', act: 'resync-whoop' },
    to: '/data',
    state: 'open',
  },
  {
    id: 'att-exp-log',
    kind: 'decision',
    title: 'Post-meal walks — 3 days unlogged this week',
    body: 'Your running n-of-1 is at week 4 of a 30-day protocol. Missed days do not invalidate it; they cost statistical power, and the shortfall is shown against the pre-registered bar rather than hidden.',
    when: 'today',
    action: { label: 'Log today’s walks', to: '/experiments' },
    state: 'open',
  },
  {
    id: 'att-galleri',
    kind: 'due',
    title: 'Your Galleri result reads as more reassuring than it is',
    body: 'No cancer signal detected — at 16.8% stage-I sensitivity, which means it misses roughly five of every six earliest-stage cancers, the ones where finding them would matter. It replaces none of the screening you are actually due for, and no trial has yet shown MCED screening reduces mortality. The result is worth keeping; the conclusion people draw from it is not.',
    when: '2025-04-28',
    action: { label: 'Open the result', record: 'scr-galleri' },
    snoozable: true,
    state: 'open',
  },
]

// What the system openly does not know. A first-class section, not an absence
// the user has to notice. Each entry is a real hole in the base record.
export const RECORD_GAPS = [
  {
    id: 'gap-arsenic', label: 'Inorganic vs organic arsenic',
    why: 'Your panels measure total arsenic, which is mostly harmless arsenobetaine from seafood. The fraction that matters was never separated out, so the number cannot be interpreted either way.',
    fill: { label: 'Import the speciated panel', to: '/data' }, weight: 'high',
  },
  {
    id: 'gap-missed-draw', label: 'Q4 2024 blood work',
    why: 'Ordered 2024-11-16 and never drawn. There is a hole in the quarterly cadence, so any "every quarter for two years" claim has to survive it — and that quarter cannot be recovered.',
    fill: null, weight: 'moderate',
  },
  {
    id: 'gap-family-paternal', label: 'Paternal family history',
    why: 'Your father’s coronary disease is recorded; his parents’ are not. Given an early-CAD father and an LPA risk allele, the paternal line is the half of the pedigree that would change the picture.',
    fill: { label: 'Add family history', capture: 'family' }, weight: 'moderate',
  },
  {
    id: 'gap-dental', label: 'Dental & periodontal health',
    why: 'Nothing on record. Periodontal disease is an independent cardiovascular risk input and a common blind spot in otherwise dense quantified-self records.',
    fill: null, weight: 'low',
  },
  {
    id: 'gap-cognitive', label: 'Cognitive baseline',
    why: 'Never measured. APOE ε3/ε3 is reassuring, but there is nothing to compare a future test against — and a baseline is only useful if you take it while nothing is wrong.',
    fill: null, weight: 'low',
  },
]
