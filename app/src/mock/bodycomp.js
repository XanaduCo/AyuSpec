// Body composition, cardiorespiratory fitness and functional capacity — the
// measurements a wearable *estimates* and a lab actually *measures*.
//
// The interesting object here is the disagreement: Whoop models VO₂max at 52.0
// from heart-rate kinetics; a metabolic cart measured 47.8 six weeks earlier.
// Both are in the store, both are true statements about their own method, and
// any honest answer has to say which one it is quoting. That gap is a feature —
// it is the cleanest example in the dataset of measurement quality mattering
// more than measurement quantity.

import { makeSeries, seedFrom, mulberry32, gauss, round, dow } from './rng.js'

// --- DEXA ------------------------------------------------------------------
// Two scans, ~11 months apart, so every number has a delta. Regional breakdown
// included because that is what a DEXA report actually contains — and because a
// retriever that dumps all 22 rows into a prompt is doing it wrong.
export const dexaScans = [
  {
    id: 'dexa-2024-08-24', date: '2024-08-24', facility: 'BodySpec · mobile DEXA',
    device: 'Hologic Horizon W', operator: 'technician-read, no physician interpretation',
    measures: [
      { key: 'bodyfat', name: 'Body fat', value: 19.4, unit: '%', ref: '10–20 (athletic, M 40–49)' },
      { key: 'fatmass', name: 'Fat mass', value: 15.1, unit: 'kg' },
      { key: 'leanmass', name: 'Lean mass (total)', value: 61.2, unit: 'kg' },
      { key: 'almi', name: 'ALMI (appendicular lean mass index)', value: 8.41, unit: 'kg/m²', ref: '≥ 7.26 (low-risk, M)' },
      { key: 'vat-mass', name: 'Visceral adipose tissue', value: 0.72, unit: 'kg', ref: '< 1.0' },
      { key: 'vat-area', name: 'VAT area', value: 96, unit: 'cm²', ref: '< 100' },
      { key: 'android-gynoid', name: 'Android/gynoid ratio', value: 1.08, unit: 'ratio' },
      { key: 'bmd-total', name: 'BMD, total body', value: 1.184, unit: 'g/cm²' },
      { key: 'bmd-total-z', name: 'BMD Z-score, total', value: 0.4, unit: 'SD' },
      { key: 'bmd-spine-t', name: 'BMD T-score, L1–L4', value: 0.1, unit: 'SD', ref: '> −1.0 normal' },
      { key: 'bmd-femneck-t', name: 'BMD T-score, femoral neck', value: -0.3, unit: 'SD' },
      { key: 'lean-arms', name: 'Lean mass, arms', value: 7.42, unit: 'kg' },
      { key: 'lean-legs', name: 'Lean mass, legs', value: 20.18, unit: 'kg' },
      { key: 'lean-trunk', name: 'Lean mass, trunk', value: 29.9, unit: 'kg' },
      { key: 'fat-arms', name: 'Fat mass, arms', value: 1.52, unit: 'kg' },
      { key: 'fat-legs', name: 'Fat mass, legs', value: 4.61, unit: 'kg' },
      { key: 'fat-trunk', name: 'Fat mass, trunk', value: 8.34, unit: 'kg' },
      { key: 'asymmetry-legs', name: 'Leg lean asymmetry (L vs R)', value: 3.1, unit: '%', ref: '< 5' },
      { key: 'rmr-est', name: 'Estimated RMR', value: 1742, unit: 'kcal/day' },
      { key: 'weight', name: 'Total mass', value: 78.4, unit: 'kg' },
      { key: 'bone-mineral', name: 'Bone mineral content', value: 3.12, unit: 'kg' },
      { key: 'ffmi', name: 'Fat-free mass index', value: 21.0, unit: 'kg/m²' },
    ],
  },
  {
    id: 'dexa-2025-07-19', date: '2025-07-19', facility: 'BodySpec · mobile DEXA',
    device: 'Hologic Horizon W', operator: 'technician-read, no physician interpretation',
    note: 'Same device and same operator protocol as the 2024 scan — the one condition under which a DEXA delta this small is readable at all.',
    measures: [
      { key: 'bodyfat', name: 'Body fat', value: 17.8, unit: '%', ref: '10–20 (athletic, M 40–49)' },
      { key: 'fatmass', name: 'Fat mass', value: 13.7, unit: 'kg' },
      { key: 'leanmass', name: 'Lean mass (total)', value: 62.4, unit: 'kg' },
      { key: 'almi', name: 'ALMI (appendicular lean mass index)', value: 8.63, unit: 'kg/m²', ref: '≥ 7.26 (low-risk, M)' },
      { key: 'vat-mass', name: 'Visceral adipose tissue', value: 0.58, unit: 'kg', ref: '< 1.0' },
      { key: 'vat-area', name: 'VAT area', value: 78, unit: 'cm²', ref: '< 100' },
      { key: 'android-gynoid', name: 'Android/gynoid ratio', value: 0.98, unit: 'ratio' },
      { key: 'bmd-total', name: 'BMD, total body', value: 1.191, unit: 'g/cm²' },
      { key: 'bmd-total-z', name: 'BMD Z-score, total', value: 0.5, unit: 'SD' },
      { key: 'bmd-spine-t', name: 'BMD T-score, L1–L4', value: 0.2, unit: 'SD', ref: '> −1.0 normal' },
      { key: 'bmd-femneck-t', name: 'BMD T-score, femoral neck', value: -0.2, unit: 'SD' },
      { key: 'lean-arms', name: 'Lean mass, arms', value: 7.61, unit: 'kg' },
      { key: 'lean-legs', name: 'Lean mass, legs', value: 20.74, unit: 'kg' },
      { key: 'lean-trunk', name: 'Lean mass, trunk', value: 30.2, unit: 'kg' },
      { key: 'fat-arms', name: 'Fat mass, arms', value: 1.38, unit: 'kg' },
      { key: 'fat-legs', name: 'Fat mass, legs', value: 4.24, unit: 'kg' },
      { key: 'fat-trunk', name: 'Fat mass, trunk', value: 7.42, unit: 'kg' },
      { key: 'asymmetry-legs', name: 'Leg lean asymmetry (L vs R)', value: 2.4, unit: '%', ref: '< 5' },
      { key: 'rmr-est', name: 'Estimated RMR', value: 1768, unit: 'kcal/day' },
      { key: 'weight', name: 'Total mass', value: 77.5, unit: 'kg' },
      { key: 'bone-mineral', name: 'Bone mineral content', value: 3.15, unit: 'kg' },
      { key: 'ffmi', name: 'Fat-free mass index', value: 21.4, unit: 'kg/m²' },
    ],
  },
]

// The delta between the two scans, per measure — precomputed so a retriever can
// send 22 deltas instead of 44 raw rows.
export const dexaDelta = dexaScans[1].measures.map(m => {
  const prev = dexaScans[0].measures.find(p => p.key === m.key)
  return { key: m.key, name: m.name, unit: m.unit, from: prev.value, to: m.value, delta: round(m.value - prev.value, 3) }
})

// --- VO₂max: metabolic cart vs. wearable estimate ---------------------------
export const vo2maxTests = [
  {
    id: 'vo2-2024-03-09', date: '2024-03-09', method: 'Metabolic cart · graded treadmill to volitional exhaustion',
    facility: 'Bay Area Human Performance Lab',
    vo2max: 44.9, unit: 'mL/kg/min', percentile: 72, hrMax: 179, rerMax: 1.14,
    vt1Hr: 138, vt2Hr: 164, vt1Pct: 62, vt2Pct: 79,
    valid: 'RER > 1.10 and HR within 5 bpm of age-predicted max — criteria for a true maximal test met.',
    wearableEstimateSameWeek: 48.6,
  },
  {
    id: 'vo2-2025-06-14', date: '2025-06-14', method: 'Metabolic cart · graded treadmill to volitional exhaustion',
    facility: 'Bay Area Human Performance Lab',
    vo2max: 47.8, unit: 'mL/kg/min', percentile: 84, hrMax: 178, rerMax: 1.16,
    vt1Hr: 142, vt2Hr: 168, vt1Pct: 64, vt2Pct: 81,
    valid: 'Same lab, same protocol, same technician as 2024 — the only configuration in which a 2.9 mL/kg/min delta is interpretable.',
    wearableEstimateSameWeek: 51.6,
  },
]

// The disagreement, stated as data rather than prose. Both numbers are real
// outputs of their own method; neither is "wrong", and the answer has to say
// which one it is quoting.
export const vo2Discrepancy = {
  id: 'vo2-discrepancy',
  measured: 47.8, measuredOn: '2025-06-14', measuredBy: 'metabolic cart (direct gas exchange)',
  estimated: 52.0, estimatedOn: '2025-08-03', estimatedBy: 'Whoop model (HR/pace kinetics)',
  gap: 4.2, gapPct: 8.8,
  note: 'Wrist VO₂max models are trained against lab tests and carry a typical error of ±10–15%. A 4.2 gap is inside that band — the estimate is not broken, it is just an estimate. Trend agreement matters more than level agreement: both methods moved up.',
  qualityTier: { measured: 'gold-standard', estimated: 'modelled surrogate' },
}

// --- Functional / performance battery ---------------------------------------
// The measures that actually predict how the next 30 years go, and which no
// wearable produces. Two sessions → a real delta.
export const functionalTests = [
  {
    id: 'func-2024-07-10', date: '2024-07-10', setting: 'Coached session, same equipment both times',
    tests: [
      { key: 'grip-dom', name: 'Grip strength, dominant', value: 48.5, unit: 'kg', ref: '≥ 40 (M 45–49, low-risk)' },
      { key: 'grip-nondom', name: 'Grip strength, non-dominant', value: 45.9, unit: 'kg' },
      { key: 'sts30', name: '30-second sit-to-stand', value: 26, unit: 'reps', ref: '≥ 18 (M 45–49)' },
      { key: 'balance-ec', name: 'Single-leg balance, eyes closed', value: 18.4, unit: 's', ref: '≥ 15 (M 45–49)' },
      { key: 'gait', name: 'Usual gait speed', value: 1.44, unit: 'm/s', ref: '≥ 1.0' },
      { key: 'fms', name: 'FMS composite', value: 15, unit: '/21', ref: '≥ 14 (lower injury risk)' },
      { key: 'vertical', name: 'Countermovement jump', value: 42, unit: 'cm' },
      { key: 'deadhang', name: 'Dead hang', value: 68, unit: 's' },
    ],
  },
  {
    id: 'func-2025-07-02', date: '2025-07-02', setting: 'Coached session, same equipment both times',
    tests: [
      { key: 'grip-dom', name: 'Grip strength, dominant', value: 51.2, unit: 'kg', ref: '≥ 40 (M 45–49, low-risk)' },
      { key: 'grip-nondom', name: 'Grip strength, non-dominant', value: 48.1, unit: 'kg' },
      { key: 'sts30', name: '30-second sit-to-stand', value: 29, unit: 'reps', ref: '≥ 18 (M 45–49)' },
      { key: 'balance-ec', name: 'Single-leg balance, eyes closed', value: 22.1, unit: 's', ref: '≥ 15 (M 45–49)' },
      { key: 'gait', name: 'Usual gait speed', value: 1.49, unit: 'm/s', ref: '≥ 1.0' },
      { key: 'fms', name: 'FMS composite', value: 17, unit: '/21', ref: '≥ 14 (lower injury risk)' },
      { key: 'vertical', name: 'Countermovement jump', value: 45, unit: 'cm' },
      { key: 'deadhang', name: 'Dead hang', value: 84, unit: 's' },
    ],
  },
]

export const functionalDelta = functionalTests[1].tests.map(t => {
  const prev = functionalTests[0].tests.find(p => p.key === t.key)
  return { key: t.key, name: t.name, unit: t.unit, from: prev.value, to: t.value, delta: round(t.value - prev.value, 2) }
})

// --- Home blood-pressure cuff -----------------------------------------------
// Omron cuff, roughly three mornings a week since the hypertension diagnosis was
// last reviewed. Individually noisy, collectively the only evidence that the
// lisinopril is doing its job.
const BP_START = '2023-06-01'
const BP_END = '2025-08-03'

function buildBp() {
  const rand = mulberry32(seedFrom('bp-cuff'))
  const sysKnots = [{ d: BP_START, v: 128 }, { d: '2024-06-01', v: 126 }, { d: '2025-03-01', v: 124 }, { d: BP_END, v: 121 }]
  const diaKnots = [{ d: BP_START, v: 81 }, { d: '2024-06-01', v: 80 }, { d: '2025-03-01', v: 78 }, { d: BP_END, v: 76 }]
  const sys = makeSeries({ name: 'bp-sys', start: BP_START, end: BP_END, knots: sysKnots, dp: 0, noise: 6.2 })
  const dia = makeSeries({ name: 'bp-dia', start: BP_START, end: BP_END, knots: diaKnots, dp: 0, noise: 4.4 })
  const out = []
  for (let i = 0; i < sys.length; i++) {
    const d = sys[i].date
    // ~3 mornings a week, and never on the days he travelled.
    if (![1, 3, 6].includes(dow(d))) continue
    if (rand() < 0.12) continue
    out.push({ date: d, systolic: sys[i].value, diastolic: dia[i].value, pulse: round(58 + gauss(rand) * 5, 0), arm: 'left', position: 'seated, 5 min rest' })
  }
  return out
}

export const bpReadings = buildBp()

export const bpSummary = (() => {
  const last90 = bpReadings.slice(-39)
  const mean = arr => round(arr.reduce((a, b) => a + b, 0) / arr.length, 0)
  return {
    n: bpReadings.length,
    n90: last90.length,
    meanSystolic90: mean(last90.map(r => r.systolic)),
    meanDiastolic90: mean(last90.map(r => r.diastolic)),
    meanSystolicAll: mean(bpReadings.map(r => r.systolic)),
    meanDiastolicAll: mean(bpReadings.map(r => r.diastolic)),
    pctAtGoal90: round((last90.filter(r => r.systolic < 130 && r.diastolic < 80).length / last90.length) * 100, 0),
    span: `${BP_START} → ${BP_END}`,
  }
})()

export const bodyCompStats = {
  dexaScans: dexaScans.length,
  dexaMeasures: dexaScans.reduce((a, s) => a + s.measures.length, 0),
  vo2Tests: vo2maxTests.length,
  functionalSessions: functionalTests.length,
  functionalMeasures: functionalTests.reduce((a, s) => a + s.tests.length, 0),
  bpReadings: bpReadings.length,
}
