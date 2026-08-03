// The single deterministic persona behind the whole demo, and the barrel every
// view imports from. Every record carries a stable `id` so answers (agent.js)
// and Timeline events can cite it and the source drawer (fhir.js) can resolve it
// to a FHIR resource. All values are fabricated.
//
// This file used to hold the entire dataset. It no longer can: Ravi's store is
// now ~40,000 records across labs, wearables, activities, nutrition, genomics,
// imaging, ageing clocks and screening. The data lives in focused modules —
//
//   rng.js        seeded generators + date maths (never Math.random)
//   labs.js       ~110 analytes × 9 draws over 27 months, with a vendor switch
//   bodycomp.js   DEXA ×2, VO₂max lab tests, functional battery, BP cuff
//   genomics.js   30× WGS — variants, PRS, pharmacogenomics, carrier status
//   aging.js      epigenetic clocks ×3 timepoints, with reliability metadata
//   activity.js   Garmin per-activity records + weekly load + the training block
//   nutrition.js  Cronometer daily logs with honest adherence gaps
//   streams.js    CGM 5-min traces + nightly sleep architecture
//   screening.js  Galleri MCED, colonoscopy, and what a negative is worth
//
// — and this file re-exports them, so every existing import keeps working. That
// scale is the premise of the context-assembly surface: you cannot put this in a
// prompt, so something has to decide what goes in, and show its work.

import {
  makeSeries, daysBetween, addDays, eachDay, round,
} from './rng.js'

import * as Labs from './labs.js'
import * as BodyComp from './bodycomp.js'
import * as Genomics from './genomics.js'
import * as Aging from './aging.js'
import * as Activity from './activity.js'
import * as Nutrition from './nutrition.js'
import * as Streams from './streams.js'
import * as Screening from './screening.js'

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
// The wearable domain now reaches back three years — long enough that "widen the
// window to two years" is a real retrieval decision with real extra data behind
// it, not a label on a diagram.
export const domainStart = '2022-08-08'
// The oldest thing in the record at all (the hypertension diagnosis).
export const recordStart = '2022-03-15'

export { daysBetween, addDays, eachDay, round }

// --- labs -------------------------------------------------------------------
// `labs` stays the seven headline analytes with a `prior` value — the shape
// Share, the doctor packet and fhir.js already read. The full set is `results`.
export const labs = Labs.labs
export const priorLabDate = Labs.priorDrawDate
export const currentLabDate = Labs.currentDrawDate
export {
  ANALYTES, PANELS, draws as labDraws, results as labResults, currentPanel,
  currentResults, priorResults, currentAbnormal, analyteSeries, drawResults,
  analyteByKey, analyteByCode, vendorSwitch, labStats,
} from './labs.js'

// --- wearables --------------------------------------------------------------
// Eight continuously-sampled metrics over the full domain. Each carries a
// 90-day summary, a coarse weekly sparkline (for the compact cards) and the full
// daily series. Knots give each series a shape — a plateau, a training block, a
// change-point — instead of one straight line.
const D = domainStart
const W = (id, code, name, unit, source, current, baseline, dir, series, knots, opts = {}) => ({
  id, code, name, unit, source, current, baseline, dir, series,
  daily: makeSeries({ name: id, start: D, end: anchor, knots, ...opts }),
})

export const wearables = [
  W('obs-hrv', '80404-7', 'HRV (SDNN)', 'ms', 'oura', 42, 46, 'down',
    [46, 47, 45, 44, 43, 44, 42, 41, 42, 43, 42, 42],
    [{ d: D, v: 44 }, { d: '2023-06-01', v: 48 }, { d: '2024-05-01', v: 47 }, { d: '2025-03-01', v: 46.5 },
     { d: win90Start, v: 46 }, { d: anchor, v: 42 }],
    { dp: 0, noise: 2.4, weekly: 0.9, pin: { [anchor]: 42, [win90Start]: 46 } }),

  W('obs-vo2max', 'vo2max', 'VO₂max (est.)', 'mL/kg/min', 'whoop', 52.0, 50.7, 'up',
    [50.7, 50.9, 51.1, 51.0, 51.4, 51.6, 51.8, 51.9, 52.0, 52.1, 52.0, 52.0],
    [{ d: D, v: 46.8 }, { d: '2024-03-09', v: 48.6 }, { d: '2025-03-01', v: 49.9 },
     { d: win90Start, v: 50.7 }, { d: '2025-06-14', v: 51.6 }, { d: anchor, v: 52.0 }],
    { dp: 1, noise: 0.35, pin: { [anchor]: 52.0, [win90Start]: 50.7 } }),

  W('obs-rhr', 'rhr', 'Resting HR', 'bpm', 'oura', 54, 55, 'down',
    [55, 55, 56, 55, 54, 54, 55, 54, 54, 53, 54, 54],
    [{ d: D, v: 58 }, { d: '2024-06-01', v: 57 }, { d: '2025-03-01', v: 56 },
     { d: win90Start, v: 55 }, { d: anchor, v: 54 }],
    { dp: 0, noise: 1.6, weekly: 0.5, pin: { [anchor]: 54, [win90Start]: 55 } }),

  W('obs-sleep', 'sleep', 'Sleep duration', 'h', 'oura', 7.1, 7.0, 'up',
    [7.0, 6.8, 7.1, 7.2, 6.9, 7.0, 7.1, 7.3, 7.0, 7.1, 7.2, 7.1],
    [{ d: D, v: 6.95 }, { d: '2024-06-01', v: 6.85 }, { d: win90Start, v: 7.0 }, { d: anchor, v: 7.1 }],
    { dp: 1, noise: 0.45, weekly: 0.22, pin: { [anchor]: 7.1, [win90Start]: 7.0 } }),

  W('obs-rem', 'rem', 'REM sleep', 'min', 'oura', 89, 96, 'down',
    [96, 95, 97, 94, 93, 92, 91, 90, 89, 90, 89, 89],
    [{ d: D, v: 98 }, { d: '2024-06-01', v: 97 }, { d: win90Start, v: 96 }, { d: anchor, v: 89 }],
    { dp: 0, noise: 12, pin: { [anchor]: 89, [win90Start]: 96 } }),

  W('obs-resp', 'resp', 'Respiratory rate', 'br/min', 'oura', 14.2, 14.1, 'flat',
    [14.1, 14.0, 14.2, 14.1, 14.3, 14.2, 14.1, 14.2, 14.2, 14.1, 14.2, 14.2],
    [{ d: D, v: 14.0 }, { d: anchor, v: 14.2 }],
    { dp: 1, noise: 0.28, pin: { [anchor]: 14.2 } }),

  W('obs-steps', 'steps', 'Steps', 'steps/day', 'garmin', 11400, 9800, 'up',
    [9800, 9900, 10200, 10100, 10600, 11000, 11200, 11400, 11300, 11500, 11400, 11400],
    [{ d: D, v: 8900 }, { d: '2024-06-01', v: 9400 }, { d: '2025-03-01', v: 10600 },
     { d: win90Start, v: 9800 }, { d: anchor, v: 11400 }],
    { dp: 0, noise: 2100, weekly: 900, gaps: Activity.dataGaps.map(g => ({ from: g.from, to: g.to })),
      pin: { [anchor]: 11400 }, clamp: [1200, 26000] }),

  W('obs-strain', 'strain', 'Training load (7d)', 'au', 'garmin', 412, 268, 'up',
    [268, 274, 290, 305, 322, 351, 378, 396, 404, 418, 415, 412],
    [{ d: D, v: 210 }, { d: '2024-06-01', v: 246 }, { d: trainingBlockStart(), v: 268 },
     { d: '2025-06-15', v: 430 }, { d: anchor, v: 412 }],
    { dp: 0, noise: 46, gaps: Activity.dataGaps.map(g => ({ from: g.from, to: g.to })),
      pin: { [anchor]: 412 }, clamp: [60, 620] }),
]

function trainingBlockStart() { return '2025-03-01' }

export const wearableById = Object.fromEntries(wearables.map(w => [w.id, w]))

// --- clinical ---------------------------------------------------------------
export const conditions = [
  { id: 'cond-htn', name: 'Essential hypertension', status: 'controlled', onset: '2022-03', onsetDate: '2022-03-15', code: 'I10' },
]

export const medications = [
  { id: 'med-lisinopril', name: 'Lisinopril', dose: '10 mg', freq: 'once daily', since: '2022-04-01', for: 'hypertension', code: '29046' },
  { id: 'med-vitd', name: 'Vitamin D3', dose: '4000 IU', freq: 'once daily', since: '2023-11-01', for: 'insufficiency', code: '316897', otc: true },
  { id: 'med-omega3', name: 'Omega-3 (EPA/DHA)', dose: '2 g', freq: 'once daily', since: '2024-02-01', for: 'lipids', code: '215261', otc: true },
  { id: 'med-mag', name: 'Magnesium glycinate', dose: '400 mg', freq: 'nightly', since: '2025-01-20', for: 'sleep latency (n-of-1 supported)', code: '6582', otc: true },
]

export const imaging = [
  { id: 'img-brain-mri', modality: 'MRI', study: 'Brain MRI', date: '2025-02-18', series: ['T1', 'T2', 'FLAIR'], instances: 180,
    aiSummary: 'Age-appropriate ventricle size, no acute white-matter changes, normal hippocampal volumes. AI-generated (MedGemma) — not a radiologist read.' },
  { id: 'img-cac', modality: 'CT', study: 'Coronary calcium (CAC)', date: '2024-11-09', series: ['Gated CT'], instances: 60,
    aiSummary: 'Agatston score 0. No detectable coronary artery calcification.' },
]

export const familyHistory = [
  { id: 'fh-father-cad', relation: 'Father', condition: 'Coronary artery disease', age: 62 },
  { id: 'fh-mother-t2d', relation: 'Mother', condition: 'Type 2 diabetes', age: 58 },
  { id: 'fh-gm-stroke', relation: 'Maternal grandmother', condition: 'Stroke', age: 74 },
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

// --- re-exports from the specialised modules --------------------------------
export const genomics = Genomics.genomics
export {
  wgs, variants as genomicVariants, prs as genomicPrs, pharmacogenomics,
  carrierStatus, genomicUnits, genomicStats,
} from './genomics.js'
export {
  dexaScans, dexaDelta, vo2maxTests, vo2Discrepancy, functionalTests,
  functionalDelta, bpReadings, bpSummary, bodyCompStats,
} from './bodycomp.js'
export {
  clockTests, latestClock, clockTrends, telomereTrend, clockDisagreement,
  CLOCK_META, agingStats,
} from './aging.js'
export {
  activities, weeklyLoad, acwr, trainingBlock, blockSummary, notableActivities,
  dataGaps, activityStats,
} from './activity.js'
export {
  days as nutritionDays, meals, highMercuryMeals, seafoodWeekly, seafoodTrend,
  coverage as nutritionCoverage, coverageByEra, nutritionStats,
} from './nutrition.js'
export {
  cgmWears, cgmDaily, cgmTraces, cgmExcursions, cgmSummary, sleepNights,
  sleepSummary, streamStats,
} from './streams.js'
export { screenings, galleri, screeningDue, screeningStats } from './screening.js'

// --- Timeline events --------------------------------------------------------
// Discrete, dated point-events for the Timeline lanes. Each `ref` resolves via
// fhir.js to a full resource in the source drawer. Wearables are continuous and
// live in their own lanes (from `daily`), so they are not repeated here.
const labEvents = Labs.draws.map(d => ({
  id: `ev-${d.id}`, track: 'labs', date: d.date, ref: d.id,
  label: d.scope === 'missed' ? 'Panel ordered — never drawn'
    : d.scope === 'basic' ? 'Basic panel (travelling)'
      : d.date === Labs.currentDrawDate ? 'Full panel' : 'Full panel',
  detail: d.scope === 'missed' ? 'gap in the quarterly cadence'
    : `${Labs.drawResults(d.id).length} analytes · ${d.lab}`,
  flag: d.date === Labs.currentDrawDate ? 'high' : undefined,
}))

export const events = [
  ...labEvents,
  { id: 'ev-mri', track: 'imaging', date: '2025-02-18', ref: 'img-brain-mri', label: 'Brain MRI', detail: 'T1/T2/FLAIR · 180 img' },
  { id: 'ev-cac', track: 'imaging', date: '2024-11-09', ref: 'img-cac', label: 'Coronary calcium CT', detail: 'Agatston 0' },
  { id: 'ev-dexa-1', track: 'imaging', date: '2024-08-24', ref: 'dexa-2024-08-24', label: 'DEXA', detail: '19.4% fat · VAT 0.72 kg' },
  { id: 'ev-dexa-2', track: 'imaging', date: '2025-07-19', ref: 'dexa-2025-07-19', label: 'DEXA', detail: '17.8% fat · VAT 0.58 kg' },
  { id: 'ev-med-lisinopril', track: 'medications', date: '2022-04-01', ref: 'med-lisinopril', label: 'Lisinopril started', detail: '10 mg once daily' },
  { id: 'ev-med-mag', track: 'medications', date: '2025-01-20', ref: 'med-mag', label: 'Magnesium started', detail: '400 mg nightly' },
  { id: 'ev-cond-htn', track: 'conditions', date: '2022-03-15', ref: 'cond-htn', label: 'Hypertension dx', detail: 'controlled' },
  { id: 'ev-exp-start', track: 'procedures', date: '2025-07-06', ref: 'exp-postmeal-walks', label: 'Post-meal walks — n-of-1 start', detail: 'week 4 · 21/30 days' },
  { id: 'ev-vo2-1', track: 'procedures', date: '2024-03-09', ref: 'vo2-2024-03-09', label: 'VO₂max lab test', detail: 'metabolic cart · 44.9' },
  { id: 'ev-vo2-2', track: 'procedures', date: '2025-06-14', ref: 'vo2-2025-06-14', label: 'VO₂max lab test', detail: 'metabolic cart · 47.8' },
  { id: 'ev-func-1', track: 'procedures', date: '2024-07-10', ref: 'func-2024-07-10', label: 'Functional battery', detail: 'grip 48.5 kg · FMS 15' },
  { id: 'ev-func-2', track: 'procedures', date: '2025-07-02', ref: 'func-2025-07-02', label: 'Functional battery', detail: 'grip 51.2 kg · FMS 17' },
  { id: 'ev-block', track: 'procedures', date: '2025-03-01', ref: 'block-aerobic-2025', label: 'Aerobic block start', detail: '15 weeks · 80/20' },
  { id: 'ev-colonoscopy', track: 'procedures', date: '2023-09-14', ref: 'scr-colonoscopy', label: 'Colonoscopy', detail: 'normal · next 2033' },
  { id: 'ev-sleepstudy', track: 'procedures', date: '2024-10-02', ref: 'scr-sleep-study', label: 'Home sleep study', detail: 'AHI 3.1 · no OSA' },
  { id: 'ev-galleri', track: 'procedures', date: '2025-04-28', ref: 'scr-galleri', label: 'Galleri MCED', detail: 'no signal detected' },
  { id: 'ev-clock-1', track: 'labs', date: '2024-01-15', ref: 'clock-2024-01-15', label: 'Epigenetic clocks', detail: 'DunedinPACE 1.04' },
  { id: 'ev-clock-2', track: 'labs', date: '2024-09-08', ref: 'clock-2024-09-08', label: 'Epigenetic clocks', detail: 'DunedinPACE 0.98' },
  { id: 'ev-clock-3', track: 'labs', date: '2025-06-11', ref: 'clock-2025-06-11', label: 'Epigenetic clocks', detail: 'DunedinPACE 0.94' },
  { id: 'ev-wgs', track: 'labs', date: '2025-03-22', ref: 'gen-wgs', label: 'Whole genome (30×)', detail: '4.7M variants · 40 reported' },
]

// Tracks in render order for the Timeline (labels + which lane each event maps to).
export const tracks = [
  { key: 'labs', label: 'Labs', kind: 'events' },
  { key: 'wearables', label: 'Wearables', kind: 'series' },
  { key: 'conditions', label: 'Conditions', kind: 'events' },
  { key: 'procedures', label: 'Procedures & experiments', kind: 'events' },
  { key: 'medications', label: 'Medications', kind: 'events' },
  { key: 'imaging', label: 'Imaging', kind: 'events' },
]

// --- how big is this store, honestly ----------------------------------------
// Counted from the materialised data wherever it exists; declared where the demo
// deliberately does not hold millions of rows in browser memory (CGM readings,
// meal rows, called variants). The distinction is stated, not smoothed over,
// because "how many records do you have?" is the question that motivates the
// whole context-assembly surface.
const wearableRows = wearables.reduce((a, w) => a + w.daily.length, 0)

export const storeStats = (() => {
  const groups = [
    { key: 'labs', label: 'Lab results', rows: Labs.results.length, materialised: true,
      detail: `${Labs.labStats.analytes} analytes × ${Labs.labStats.draws} draws over ${Labs.labStats.months} months` },
    { key: 'wearables', label: 'Wearable daily metrics', rows: wearableRows, materialised: true,
      detail: `${wearables.length} metrics × up to ${wearables[0].daily.length} days` },
    { key: 'sleep', label: 'Sleep architecture (nightly)', rows: Streams.sleepNights.length * 9, materialised: true,
      detail: `${Streams.sleepNights.length} nights × 9 fields` },
    { key: 'cgm', label: 'CGM readings', rows: Streams.cgmDeclaredReadings, materialised: false,
      detail: `2 wears at 5-minute resolution; ${Streams.streamStats.cgmMaterialisedReadings.toLocaleString()} materialised in this demo` },
    { key: 'activity', label: 'Garmin activities', rows: Activity.activities.length, materialised: true,
      detail: `${Activity.activityStats.totalKm.toLocaleString()} km across ${Activity.activityStats.weeks} weeks` },
    { key: 'nutrition', label: 'Nutrition day-totals', rows: Nutrition.nutritionStats.nutrientRows, materialised: true,
      detail: `${Nutrition.days.length} logged days × 23 nutrients · ${Nutrition.nutritionStats.coveragePct}% coverage` },
    { key: 'meals', label: 'Meal entries', rows: Nutrition.nutritionStats.declaredMeals, materialised: false,
      detail: `${Nutrition.meals.length} materialised (trailing 28 days)` },
    { key: 'bp', label: 'Blood-pressure readings', rows: BodyComp.bpReadings.length, materialised: true },
    { key: 'ehr', label: 'EHR resources (Epic + Apple Health)', rows: 5606, materialised: false,
      detail: 'encounters, notes, historic labs, immunisations, deduped by content hash' },
    { key: 'genomics', label: 'Genomic variants called', rows: Genomics.wgs.variantsCalled, materialised: false,
      detail: `${Genomics.genomicStats.reported} annotated and reported; raw CRAM stays on disk` },
    { key: 'imaging', label: 'Imaging instances', rows: 240, materialised: false, detail: '2 studies · pixels never leave the disk' },
    { key: 'bodycomp', label: 'Body-composition & performance', rows: BodyComp.bodyCompStats.dexaMeasures + BodyComp.bodyCompStats.functionalMeasures + BodyComp.bodyCompStats.vo2Tests, materialised: true },
    { key: 'aging', label: 'Epigenetic clock outputs', rows: Aging.agingStats.rows, materialised: true },
    { key: 'screening', label: 'Screening results', rows: Screening.screeningStats.rows, materialised: true },
  ]
  const total = groups.reduce((a, g) => a + g.rows, 0)
  const withoutGenome = total - Genomics.wgs.variantsCalled
  return {
    groups,
    total,
    withoutGenome,
    analytes: Labs.labStats.analytes,
    activities: Activity.activities.length,
    span: `${recordStart} → ${anchor}`,
    years: round(daysBetween(recordStart, anchor) / 365.25, 1),
    // The headline the UI shows. Genome variants are excluded from the headline
    // count because 4.7M called variants would swamp every other number and
    // imply a density the rest of the record doesn't have.
    headline: `${withoutGenome.toLocaleString()} records · ${Labs.labStats.analytes} analytes · ${Activity.activities.length} activities · 4.7M genotyped variants`,
  }
})()
