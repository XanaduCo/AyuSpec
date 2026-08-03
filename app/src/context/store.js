// The retrieval index: every unit of Ravi's store that a retriever could pull,
// with what it costs to send and what it is *about*.
//
// A "unit" is the granularity a retriever actually reasons at — one analyte's
// history, one metric's daily series, one document, one genomic finding. It is
// deliberately not "one row": nobody retrieves a single HRV reading, and a
// prompt that contained 1,092 of them would be a bug, not a feature.
//
// Each unit knows three things the context builder needs:
//   · what it is about   → `tags`, so relevance is computed, not asserted
//   · what it costs      → `rows`, `rawBytes`, `summaryBytes`
//   · what governs it    → `policy` ('genome' / 'pixels' / 'raw-doc'), `pii`
//
// Policy is a separate field from relevance on purpose. "This isn't about your
// question" and "this may not leave your device" are different sentences and the
// UI must never let one stand in for the other.

import {
  ANALYTES, analyteSeries, labDraws, labStats, wearables, conditions, medications,
  imaging, familyHistory, genomicUnits, dexaScans, vo2maxTests, functionalTests,
  bpReadings, clockTests, activities, weeklyLoad, notableActivities,
  nutritionDays, meals, cgmDaily, cgmTraces, cgmExcursions, cgmSummary,
  sleepNights, screenings, storeStats,
} from '../mock/persona.js'

// Bytes a row costs once serialised into a prompt. Rough, consistent, and the
// only thing the budget numbers depend on — so they are internally honest even
// though the absolute values are fabricated.
const BYTES = {
  lab: 96, daily: 34, cgm: 22, activity: 220, nutrition: 160, meal: 118,
  genomic: 320, doc: 1750, measure: 78, night: 96, bp: 62, event: 140,
}
export const BYTES_PER_TOKEN = 4
export const toTokens = bytes => Math.round(bytes / BYTES_PER_TOKEN)

// Which concepts each lab panel is about.
const PANEL_TAGS = {
  'Lipids': ['lipids', 'cardiac'],
  'Comprehensive metabolic': ['metabolic', 'kidney', 'liver'],
  'CBC w/ differential': ['cbc', 'inflammation'],
  'Heavy metals': ['metals', 'toxins'],
  'Hormones': ['hormones', 'recovery'],
  'Thyroid': ['thyroid', 'hormones'],
  'Inflammation': ['inflammation', 'cardiac', 'ageing'],
  'Micronutrients': ['micronutrients', 'nutrition'],
  'Insulin & metabolic': ['metabolic', 'glucose', 'ageing'],
  'Kidney & iron': ['kidney', 'iron', 'cardiac'],
}
// A few analytes carry extra concepts their panel doesn't imply.
const EXTRA_TAGS = {
  apob: ['guideline'], ldl: ['guideline'], hdl: ['guideline'], lpa: ['guideline', 'genetic-corroborated'],
  crp: ['ageing'], ferritin: ['iron', 'genetic-corroborated'], hba1c: ['glucose', 'ageing'],
  'omega3-index': ['metals', 'seafood'], selenium: ['metals', 'seafood'],
  mercury: ['seafood'], arsenic: ['seafood'],
  albumin: ['ageing'], 'alp': ['ageing'], mcv: ['ageing'], rdw: ['ageing'],
  'lymph-pct': ['ageing'], creatinine: ['ageing'], glucose: ['ageing'],
  testosterone: ['recovery'], 'free-testosterone': ['recovery'], cortisol_am: ['recovery'],
  'cortisol-am': ['recovery', 'training'], ck: ['training'], igf1: ['training'],
}

const u = unit => unit

function labUnits() {
  return ANALYTES.map(a => {
    const series = analyteSeries(a.key)
    const latest = series[series.length - 1]
    return u({
      id: latest.id,
      label: a.name,
      kind: 'lab',
      group: 'Labs',
      panel: a.panel,
      date: latest.drawn,
      from: series[0].drawn,
      to: latest.drawn,
      rows: series.length,
      value: `${latest.value} ${latest.unit}`,
      flag: latest.flag,
      tags: [...(PANEL_TAGS[a.panel] || []), ...(EXTRA_TAGS[a.key] || []), 'labs'],
      rawBytes: series.length * BYTES.lab,
      // The summary a retriever actually sends: name + LOINC + current value +
      // range + the last four values + the delta. Not one line, but not nine draws.
      summaryBytes: 280,
      quality: 'measured',
      pii: 1, // the performing lab's name rides along on every result
    })
  })
}

function wearableUnits() {
  return wearables.map(w => u({
    id: w.id, label: w.name, kind: 'series', group: 'Wearables',
    date: w.daily[w.daily.length - 1].date,
    from: w.daily[0].date, to: w.daily[w.daily.length - 1].date,
    rows: w.daily.length,
    value: `${w.current} ${w.unit}`,
    tags: [...tagsForMetric(w.id), 'wearables'],
    rawBytes: w.daily.length * BYTES.daily,
    summaryBytes: 940, // trend + change-points + weekly means over the window
    quality: w.id === 'obs-vo2max' ? 'modelled' : 'measured',
    pii: 0,
  }))
}
function tagsForMetric(id) {
  const map = {
    'obs-hrv': ['hrv', 'recovery', 'cardiac', 'training'],
    'obs-vo2max': ['fitness', 'training', 'cardiac'],
    'obs-rhr': ['cardiac', 'recovery', 'training'],
    'obs-sleep': ['sleep', 'recovery'],
    'obs-rem': ['sleep', 'recovery', 'ageing'],
    'obs-resp': ['sleep', 'recovery'],
    'obs-steps': ['training', 'activity'],
    'obs-strain': ['training', 'activity', 'recovery'],
  }
  return map[id] || ['wearables']
}

const derived = (id, label, group, date, tags, rows, rawBytes, summaryBytes, extra = {}) =>
  u({ id, label, kind: 'aggregate', group, date, rows, tags, rawBytes, summaryBytes, quality: 'derived', pii: 0, ...extra })

export const units = [
  ...labUnits(),
  ...wearableUnits(),

  // --- derived aggregates ---------------------------------------------------
  derived('sleep-summary', 'Sleep architecture (nightly stages)', 'Wearables', '2025-08-03',
    ['sleep', 'recovery', 'hrv'], sleepNights.length, sleepNights.length * BYTES.night, 1180),
  derived('cgm-summary', 'CGM — baseline vs. protocol summary', 'CGM', '2025-08-03',
    ['glucose', 'metabolic', 'experiment'], cgmDaily.length, cgmDaily.length * 120, 1450),
  derived('block-summary', 'Aerobic block — weekly load aggregate', 'Activity', '2025-06-15',
    ['training', 'fitness', 'activity'], weeklyLoad.length, weeklyLoad.length * 180, 1620,
    { detail: `${activities.length} activities → ${weeklyLoad.length} weeks` }),
  derived('nutr-seafood-trend', 'Seafood intake trend', 'Nutrition', '2025-08-03',
    ['nutrition', 'seafood', 'metals'], nutritionDays.length, nutritionDays.length * BYTES.nutrition, 1240),
  derived('vo2-discrepancy', 'VO₂max — measured vs. estimated', 'Fitness', '2025-06-14',
    ['fitness', 'training', 'quality'], 2, 780, 620, { quality: 'measured', unique: true }),
  derived('clock-disagreement', 'Clock disagreement + reliability', 'Ageing', '2025-06-11',
    ['ageing', 'quality'], clockTests.length * 7, 4200, 1780, { unique: true }),
  derived('store-stats', 'Store inventory', 'Meta', '2025-08-03', ['meta'], 1, 320, 260),

  // --- raw, expensive units the retriever normally refuses ------------------
  // `rows` is what the retriever could actually attach — the six trace days this
  // demo materialises. `declaredRows` is what the store holds. Sending even the
  // materialised subset costs more than the entire cloud egress budget, which is
  // the point: some data is not "expensive", it is out of reach off-device.
  u({ id: 'cgm-raw', label: 'CGM raw trace (5-minute readings)', kind: 'raw', group: 'CGM',
    date: '2025-08-03', from: '2025-06-20', to: '2025-08-03',
    rows: cgmTraces.length * 288, declaredRows: cgmSummary.declaredReadings,
    tags: ['glucose', 'metabolic', 'experiment'],
    rawBytes: cgmTraces.length * 288 * BYTES.cgm, summaryBytes: 240,
    quality: 'measured', pii: 0, expensive: true,
    detail: `${cgmTraces.length} days materialised here; ${cgmSummary.declaredReadings.toLocaleString()} readings in the store` }),
  u({ id: 'activities-raw', label: 'Garmin per-activity records', kind: 'raw', group: 'Activity',
    date: '2025-08-03', from: '2024-06-01', to: '2025-08-03', rows: activities.length,
    tags: ['training', 'activity', 'fitness'], rawBytes: activities.length * BYTES.activity,
    summaryBytes: 320, quality: 'measured', pii: 0, expensive: true }),
  u({ id: 'nutrition-raw', label: 'Nutrition day totals (23 nutrients)', kind: 'raw', group: 'Nutrition',
    date: '2025-08-03', from: '2024-01-01', to: '2025-08-03', rows: nutritionDays.length,
    tags: ['nutrition', 'micronutrients', 'seafood'], rawBytes: nutritionDays.length * BYTES.nutrition,
    summaryBytes: 380, quality: 'self-reported', pii: 0, expensive: true }),
  u({ id: 'meals-raw', label: 'Meal-level entries', kind: 'raw', group: 'Nutrition',
    date: '2025-08-03', rows: meals.length, tags: ['nutrition', 'seafood'],
    rawBytes: meals.length * BYTES.meal, summaryBytes: 620, quality: 'self-reported', pii: 0 }),
  u({ id: 'bp-raw', label: 'Home BP cuff readings', kind: 'raw', group: 'Vitals',
    date: '2025-08-03', rows: bpReadings.length, tags: ['bp', 'cardiac', 'meds'],
    rawBytes: bpReadings.length * BYTES.bp, summaryBytes: 340, quality: 'measured', pii: 0 }),

  // --- point records --------------------------------------------------------
  ...cgmExcursions.slice(0, 4).map(e => u({
    id: e.id, label: `Post-prandial peak ${e.peak} mg/dL (${e.meal}, ${e.date})`, kind: 'point',
    group: 'CGM', date: e.date, rows: 1, tags: ['glucose', 'metabolic', 'experiment'],
    rawBytes: 90, summaryBytes: 150, quality: 'measured', pii: 0,
  })),
  ...notableActivities.map(a => u({
    id: a.id, label: `${a.name} · ${a.date}`, kind: 'point', group: 'Activity', date: a.date,
    rows: 1, tags: ['training', 'activity'], rawBytes: BYTES.activity, summaryBytes: 230,
    quality: 'measured', pii: 0, why: a.why,
  })),
  ...dexaScans.map(s => u({
    id: s.id, label: `DEXA · ${s.date}`, kind: 'document', group: 'Body composition', date: s.date,
    rows: s.measures.length, tags: ['bodycomp', 'bone', 'ageing'],
    rawBytes: s.measures.length * BYTES.measure, summaryBytes: 780, quality: 'measured', pii: 2,
  })),
  ...vo2maxTests.map(t => u({
    id: t.id, label: `VO₂max lab test · ${t.date}`, kind: 'document', group: 'Fitness', date: t.date,
    rows: 8, tags: ['fitness', 'training', 'cardiac', 'quality'], rawBytes: 640, summaryBytes: 610,
    quality: 'measured', pii: 2, unique: true,
  })),
  ...functionalTests.map(t => u({
    id: t.id, label: `Functional battery · ${t.date}`, kind: 'document', group: 'Fitness', date: t.date,
    rows: t.tests.length, tags: ['fitness', 'ageing', 'bodycomp'],
    rawBytes: t.tests.length * BYTES.measure, summaryBytes: 640, quality: 'measured', pii: 1,
  })),
  ...clockTests.map(t => u({
    id: t.id, label: `Epigenetic clock panel · ${t.date}`, kind: 'document', group: 'Ageing', date: t.date,
    rows: 16, tags: ['ageing', 'inflammation'], rawBytes: 1180, summaryBytes: 890,
    quality: 'measured', pii: 2,
  })),
  ...screenings.map(s => u({
    id: s.id, label: s.name, kind: 'document', group: 'Screening', date: s.date,
    rows: 1 + (s.caveats?.length || 0), tags: ['screening', ...(s.kind === 'mced' ? ['cancer'] : []), ...(s.id === 'scr-sleep-study' ? ['sleep'] : [])],
    rawBytes: BYTES.doc, summaryBytes: 1100, quality: 'measured', pii: 2, unique: s.kind === 'mced',
  })),
  ...imaging.map(s => u({
    id: s.id, label: s.study, kind: 'imaging', group: 'Imaging', date: s.date, rows: s.instances,
    tags: s.id === 'img-cac' ? ['cardiac', 'imaging', 'lipids'] : ['neuro', 'imaging'],
    rawBytes: s.instances * 42000, summaryBytes: 430,
    quality: 'measured', pii: 3, policy: 'pixels',
    policyNote: 'Pixel data is a hard exclusion — never sent to any cloud model under any setting. The extracted MedGemma impression flows through the normal stripping path.',
  })),
  ...conditions.map(c => u({
    id: c.id, label: c.name, kind: 'point', group: 'Clinical', date: c.onsetDate, rows: 1, timeless: true,
    tags: ['conditions', 'cardiac', 'bp'], rawBytes: 220, summaryBytes: 260, quality: 'measured', pii: 2,
  })),
  ...medications.map(m => u({
    id: m.id, label: `${m.name} ${m.dose}`, kind: 'point', group: 'Clinical', date: m.since, rows: 1,
    timeless: true,
    tags: ['meds', ...(m.for.includes('hypertension') ? ['bp', 'cardiac'] : []), ...(m.for.includes('lipids') ? ['lipids'] : []), ...(m.for.includes('sleep') ? ['sleep'] : [])],
    rawBytes: 190, summaryBytes: 210, quality: 'self-reported', pii: 1,
  })),
  ...familyHistory.map(f => u({
    id: f.id, label: `${f.relation} — ${f.condition} @ ${f.age}`, kind: 'point', group: 'Clinical',
    date: '2022-03-15', rows: 1, timeless: true,
    tags: ['family', ...(f.condition.includes('Coronary') ? ['cardiac', 'lipids'] : []), ...(f.condition.includes('diabetes') ? ['metabolic', 'glucose'] : [])],
    rawBytes: 150, summaryBytes: 190, quality: 'self-reported', pii: 2,
  })),
  ...labDraws.filter(d => d.scope !== 'full').map(d => u({
    id: d.id, label: d.scope === 'missed' ? 'Panel ordered — never drawn' : 'Basic panel (travelling)',
    kind: 'point', group: 'Labs', date: d.date, rows: 1, timeless: true, tags: ['labs', 'coverage'],
    rawBytes: 260, summaryBytes: 280, quality: 'meta', pii: 1,
  })),
  u({ id: 'exp-postmeal-walks', label: 'Post-meal walks — running n-of-1', kind: 'point', group: 'Experiments',
    date: '2025-07-06', rows: 1, timeless: true, tags: ['experiment', 'glucose', 'metabolic', 'hrv', 'activity'],
    rawBytes: 620, summaryBytes: 460, quality: 'measured', pii: 0 }),
  u({ id: 'lab-vendor-switch', label: 'Lab vendor switch (Quest → LabCorp)', kind: 'point', group: 'Labs',
    date: '2025-01-11', rows: 1, timeless: true, tags: ['labs', 'coverage', 'quality', 'metals', 'lipids'],
    rawBytes: 320, summaryBytes: 380, quality: 'meta', pii: 0 }),
  // The clinical notes — the only units with real free text, hence the PII.
  u({ id: 'note-cardiology-2025-02', label: 'Cardiology consult note', kind: 'document', group: 'Clinical notes',
    date: '2025-02-20', rows: 1, tags: ['cardiac', 'lipids', 'notes'], rawBytes: BYTES.doc, summaryBytes: 1240,
    quality: 'measured', pii: 6 }),
  u({ id: 'note-primary-2025-05', label: 'Primary care visit note', kind: 'document', group: 'Clinical notes',
    date: '2025-05-06', rows: 1, tags: ['bp', 'meds', 'conditions', 'notes'], rawBytes: BYTES.doc, summaryBytes: 1080,
    quality: 'measured', pii: 5 }),

  // --- genomics: every unit default-excluded from cloud calls ---------------
  ...genomicUnits.map(g => u({
    id: g.id, label: g.label, kind: 'genomic', group: 'Genomics', date: '2025-03-22', rows: 1,
    tags: [...g.tags, 'genomics'], rawBytes: BYTES.genomic, summaryBytes: BYTES.genomic,
    timeless: true,
    quality: 'measured', pii: 0, policy: 'genome',
    policyNote: 'A genome is itself an identifier — of you and of blood relatives who never consented. Stripping a name changes nothing, so it is excluded from cloud calls by default. You can opt in, per call, and it is recorded in the ledger.',
  })),
  // One retrievable unit, not 4.7M. The called variants are a file on disk; what
  // a retriever can ever reach is the annotated findings above plus this header.
  // Counting the file's rows as candidates would make every question look like it
  // considered five million records, which would be a lie of arithmetic.
  u({ id: 'gen-wgs', label: 'Whole genome (30× · 4.7M variants)', kind: 'genomic', group: 'Genomics',
    date: '2025-03-22', rows: 1, declaredRows: 4712388, tags: ['genomics'],
    rawBytes: 4712388 * 64, summaryBytes: 220,
    timeless: true, quality: 'measured', pii: 0, policy: 'genome', expensive: true,
    policyNote: 'Raw CRAM never leaves the disk under any setting; only annotated findings are even candidates.' }),
]

export const unitById = Object.fromEntries(units.map(x => [x.id, x]))

// Rows the whole index stands for — the denominator in "considered N of M".
export const indexedRows = units.reduce((a, x) => a + x.rows, 0)
export const indexedRowsExGenome = units.reduce((a, x) => a + (x.id === 'gen-wgs' ? 0 : x.rows), 0)

/**
 * Candidate retrieval: everything in the index that is (a) about one of the
 * question's concepts and (b) inside the question's time window. This is the
 * cheap, mechanical first pass — no model involved — and it is what produces the
 * honest "considered X" number rather than a made-up one.
 */
export function candidates({ tags, from, to }) {
  const want = new Set(tags)
  return units.filter(x => {
    if (!x.tags.some(t => want.has(t))) return false
    // Standing facts — a genotype, a diagnosis, a family history — do not age out
    // of a window. Filtering them by date would make the genome look irrelevant
    // for the wrong reason, which is exactly the confusion this surface exists
    // to prevent.
    if (x.timeless) return true
    // A series overlaps the window if any part of it does; a point record has to
    // sit inside it — except that a series' start may predate the window.
    const end = x.to || x.date
    const start = x.from || x.date
    return end >= from && start <= to
  })
}

export const storeHeadline = storeStats
export const labIndexStats = labStats
