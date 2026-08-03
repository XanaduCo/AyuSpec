// The high-frequency streams: CGM at 5-minute resolution and nightly sleep
// architecture. These are the rows that make the store big and the rows that
// must never reach a prompt raw.
//
// A 45-day CGM wear is 12,960 readings ≈ 320 KB of JSON ≈ 80,000 tokens. The
// entire point of the context builder is that this becomes one 40-token summary
// plus three post-prandial excursions worth citing — and that the user can click
// "send it raw" and *watch the budget break*. So the demo materialises real
// 5-minute traces for six representative days (enough to blow the budget for
// real) and declares the rest by row count.

import { mulberry32, seedFrom, gauss, makeSeries, eachDay, addDays, daysBetween, round } from './rng.js'

// --- CGM --------------------------------------------------------------------
export const cgmWears = [
  { id: 'cgm-wear-1', from: '2024-09-01', to: '2024-10-14', device: 'Dexcom G7', reason: 'First 6-week look at post-prandial response.' },
  { id: 'cgm-wear-2', from: '2025-06-20', to: '2025-08-03', device: 'Dexcom G7', reason: 'Instrumenting the post-meal-walk n-of-1.' },
]

const READINGS_PER_DAY = 288 // one every 5 minutes
export const cgmDeclaredReadings = cgmWears.reduce(
  (a, w) => a + (daysBetween(w.from, w.to) + 1) * READINGS_PER_DAY, 0)

// Daily CGM summary — the aggregate a question about glucose actually needs.
function buildCgmDaily() {
  const out = []
  for (const wear of cgmWears) {
    const rand = mulberry32(seedFrom('cgm-' + wear.id))
    for (const date of eachDay(wear.from, wear.to)) {
      const g = () => gauss(rand)
      // The intervention arm: post-meal walks from 2025-07-06 flatten the peaks.
      const walking = date >= '2025-07-06'
      const mean = round(94 + g() * 4 - (walking ? 2 : 0), 0)
      const peak = round((walking ? 128 : 143) + g() * 11, 0)
      const sd = round(15.5 + g() * 2.6 - (walking ? 1.8 : 0), 1)
      out.push({
        date, wearId: wear.id, meanGlucose: mean, peakGlucose: peak, sd,
        cv: round((sd / mean) * 100, 1),
        timeInRange: round(Math.min(100, 93 + g() * 3 + (walking ? 2 : 0)), 1),
        excursions: Math.max(0, Math.round(2.4 + g() * 1.2 - (walking ? 0.9 : 0))),
        auc2h: round((walking ? 168 : 194) + g() * 18, 0),
      })
    }
  }
  return out
}

export const cgmDaily = buildCgmDaily()

// Six days of genuine 5-minute trace — three pre-protocol, three on-protocol.
// This is what "include the full CGM trace" actually attaches.
export const cgmTraceDays = ['2025-06-28', '2025-06-30', '2025-07-03', '2025-07-14', '2025-07-21', '2025-07-29']

function buildTrace(date) {
  const rand = mulberry32(seedFrom('cgm-trace-' + date))
  const walking = date >= '2025-07-06'
  const meals = [{ at: 7.7, carb: 62 }, { at: 12.6, carb: 74 }, { at: 19.3, carb: 58 }]
  const out = []
  for (let i = 0; i < READINGS_PER_DAY; i++) {
    const hour = (i * 5) / 60
    let v = 88 + Math.sin((hour - 3) / 24 * 2 * Math.PI) * 3
    for (const m of meals) {
      const dt = hour - m.at
      if (dt > 0 && dt < 4) {
        // Rise-then-fall excursion; the walk clips the peak and shortens the tail.
        const amp = m.carb * (walking ? 0.52 : 0.78)
        v += amp * Math.exp(-((dt - (walking ? 0.62 : 0.78)) ** 2) / (walking ? 0.34 : 0.62))
      }
    }
    v += gauss(rand) * 3.1
    out.push({ t: `${String(Math.floor(hour)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`, v: round(v, 0) })
  }
  return out
}

export const cgmTraces = cgmTraceDays.map(date => ({
  id: `cgm-trace-${date}`, date, arm: date >= '2025-07-06' ? 'intervention' : 'baseline',
  readings: buildTrace(date),
}))

// Post-prandial excursions worth citing individually — the "outlier" reason in
// the selection trace. Computed, not hand-listed.
export const cgmExcursions = (() => {
  const out = []
  for (const trace of cgmTraces) {
    const peak = trace.readings.reduce((a, r) => (r.v > a.v ? r : a), trace.readings[0])
    out.push({
      id: `cgm-peak-${trace.date}`, date: trace.date, arm: trace.arm,
      peak: peak.v, at: peak.t,
      meal: peak.t < '10:00' ? 'breakfast' : peak.t < '16:00' ? 'lunch' : 'dinner',
    })
  }
  return out.sort((a, b) => b.peak - a.peak)
})()

export const cgmSummary = (() => {
  const base = cgmDaily.filter(d => d.date >= '2025-06-20' && d.date < '2025-07-06')
  const interv = cgmDaily.filter(d => d.date >= '2025-07-06')
  const mean = (rows, f) => round(rows.reduce((a, r) => a + f(r), 0) / Math.max(1, rows.length), 1)
  return {
    id: 'cgm-summary',
    baselineDays: base.length, interventionDays: interv.length,
    baselinePeak: mean(base, r => r.peakGlucose), interventionPeak: mean(interv, r => r.peakGlucose),
    baselineMean: mean(base, r => r.meanGlucose), interventionMean: mean(interv, r => r.meanGlucose),
    baselineCv: mean(base, r => r.cv), interventionCv: mean(interv, r => r.cv),
    declaredReadings: cgmDeclaredReadings,
  }
})()

// --- sleep architecture -----------------------------------------------------
// Nightly stage minutes from the Oura ring. One row per night over the whole
// wearable domain; the stage split is what a "why is my HRV down" question wants
// and a sleep-duration scalar cannot supply.
export const SLEEP_START = '2022-08-08'
export const SLEEP_END = '2025-08-03'

function buildSleep() {
  const rand = mulberry32(seedFrom('oura-sleep-architecture'))
  const total = makeSeries({
    name: 'sleep-total', start: SLEEP_START, end: SLEEP_END, dp: 0, noise: 32, weekly: 14,
    knots: [{ d: SLEEP_START, v: 418 }, { d: '2024-06-01', v: 412 }, { d: '2025-05-05', v: 420 }, { d: SLEEP_END, v: 426 }],
  })
  return total.map(t => {
    const g = () => gauss(rand)
    // Deep sleep declines slightly with age and with late training; REM is the
    // stage that drops first when HRV drops, which is the point of having it.
    const deep = round(Math.max(30, 74 + g() * 12 - (t.date > '2025-05-05' ? 5 : 0)), 0)
    const rem = round(Math.max(40, 96 + g() * 16 - (t.date > '2025-05-05' ? 7 : 0)), 0)
    const awake = round(Math.max(4, 22 + Math.abs(g()) * 9), 0)
    const light = Math.max(60, t.value - deep - rem - awake)
    return {
      date: t.date, totalMin: t.value, deepMin: deep, remMin: rem, lightMin: light, awakeMin: awake,
      latencyMin: round(Math.max(2, 13 + g() * 6), 0),
      efficiency: round(Math.min(99, ((t.value - awake) / t.value) * 100), 1),
      source: 'oura',
    }
  })
}

export const sleepNights = buildSleep()

export const sleepSummary = (() => {
  const win = sleepNights.filter(n => n.date >= '2025-05-05')
  const prev = sleepNights.filter(n => n.date >= '2025-02-04' && n.date < '2025-05-05')
  const mean = (rows, f) => round(rows.reduce((a, r) => a + f(r), 0) / Math.max(1, rows.length), 0)
  return {
    id: 'sleep-summary', nights: sleepNights.length, window: win.length,
    remNow: mean(win, n => n.remMin), remPrev: mean(prev, n => n.remMin),
    deepNow: mean(win, n => n.deepMin), deepPrev: mean(prev, n => n.deepMin),
    totalNow: mean(win, n => n.totalMin), totalPrev: mean(prev, n => n.totalMin),
    efficiencyNow: round(win.reduce((a, n) => a + n.efficiency, 0) / win.length, 1),
    note: 'Total sleep barely moved; the stage split did. A duration-only answer would have missed it.',
  }
})()

export const streamStats = {
  cgmDeclaredReadings,
  cgmMaterialisedReadings: cgmTraces.length * READINGS_PER_DAY,
  cgmDays: cgmDaily.length,
  sleepNights: sleepNights.length,
  sleepFields: 9,
}
