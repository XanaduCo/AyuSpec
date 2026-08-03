// Garmin exercise data — per-activity records, not a daily scalar.
//
// This is the shape of data that breaks naive retrieval. Three hundred-odd
// activities, each with a dozen fields, is ~90 KB of JSON. No question needs all
// of it; almost every training question needs a *weekly aggregate* plus the two
// or three sessions that are actually unusual. The context builder leans on
// `weeklyLoad` and `notableActivities` for exactly that reason.
//
// Structure of the record: a base period, a deliberate 15-week aerobic block
// (2025-03-01 → 2025-06-15) ending in a lab VO₂max retest, and a one-week hole
// where he travelled without the watch.

import { mulberry32, seedFrom, gauss, weighted, addDays, daysBetween, eachDay, dow, round } from './rng.js'

export const ACTIVITY_START = '2024-06-01'
export const ACTIVITY_END = '2025-08-03'

// The training block the "did it work?" question is about.
export const trainingBlock = {
  id: 'block-aerobic-2025',
  name: 'Polarised aerobic base block',
  start: '2025-03-01', end: '2025-06-15',
  design: '80/20 — Z2 volume up, one weekly threshold session, strength held at 2×/week.',
  intent: 'Raise VO₂max and lower resting HR before the June lab retest.',
  preTest: 'vo2-2024-03-09', postTest: 'vo2-2025-06-14',
}

// The week the watch stayed home. Referenced by the HRV answer's "work travel
// week" — the gap in the data IS the confounder, so it has to be in the data.
export const dataGaps = [
  { from: '2025-04-12', to: '2025-04-20', source: 'garmin',
    reason: 'Travel — watch left at home. Nine days with no activity, HR or sleep data from Garmin. Oura continued (ring travelled), so the two devices disagree about whether this week existed.' },
]

const TYPES = {
  run: { label: 'Run', paceBase: 5.35, hrBase: 148 },
  ride: { label: 'Ride', hrBase: 132 },
  strength: { label: 'Strength', hrBase: 112 },
  hike: { label: 'Hike', hrBase: 118 },
  swim: { label: 'Swim', hrBase: 136 },
  walk: { label: 'Walk', hrBase: 96 },
}

const RUN_NAMES = ['Easy aerobic', 'Long run', 'Threshold intervals', 'Hill repeats', 'Recovery jog', 'Tempo run']
const RIDE_NAMES = ['Zone 2 endurance', 'Commute', 'Weekend loop', 'Sweet-spot intervals']
const LIFT_NAMES = ['Lower body — squat focus', 'Upper push', 'Upper pull', 'Full body', 'Posterior chain']
const HIKE_NAMES = ['Marin Headlands', 'Mt Tam loop', 'Purisima Creek', 'Rancho San Antonio']

const inBlock = d => d >= trainingBlock.start && d <= trainingBlock.end
const inGap = d => dataGaps.some(g => d >= g.from && d <= g.to)

function buildActivities() {
  const rand = mulberry32(seedFrom('garmin-activities'))
  const out = []
  let n = 0
  for (const date of eachDay(ACTIVITY_START, ACTIVITY_END)) {
    if (inGap(date)) continue
    const wd = dow(date)
    const block = inBlock(date)

    // Session probability by weekday. The block adds volume, mostly easy Z2.
    const base = [0.55, 0.75, 0.55, 0.8, 0.5, 0.7, 0.85][wd]
    const p = block ? Math.min(0.96, base + 0.18) : base
    if (rand() > p) continue

    const type = weighted(rand, [
      ['run', wd === 6 ? 3.2 : 2.4], ['strength', 2.0], ['ride', wd === 0 || wd === 6 ? 1.8 : 0.9],
      ['hike', wd === 0 ? 1.2 : 0.15], ['swim', 0.35], ['walk', 0.5],
    ])

    n++
    const id = `act-${date}-${n}`
    const t = TYPES[type]
    const g = () => gauss(rand)

    let a = { id, date, type, label: t.label }

    if (type === 'run') {
      const long = wd === 6 && rand() < 0.7
      const hard = !long && rand() < (block ? 0.22 : 0.3)
      const km = round(long ? 15 + g() * 3.5 : hard ? 9 + g() * 1.6 : (block ? 9.5 : 8) + g() * 2.2, 1)
      const pace = round(t.paceBase + (long ? 0.35 : hard ? -0.55 : 0.1) + g() * 0.18, 2)
      a.name = long ? 'Long run' : hard ? RUN_NAMES[2 + (n % 2)] : RUN_NAMES[n % 2 === 0 ? 0 : 4]
      a.distanceKm = Math.max(3, km)
      a.durationMin = round(a.distanceKm * pace, 0)
      a.avgPaceMinKm = pace
      a.avgHr = round(t.hrBase + (hard ? 14 : long ? -4 : 0) + g() * 5, 0)
      a.maxHr = round(a.avgHr + (hard ? 24 : 14) + g() * 4, 0)
      a.elevGainM = round(Math.abs(g()) * 90 + (long ? 180 : 40), 0)
    } else if (type === 'ride') {
      const km = round(28 + Math.abs(g()) * 22, 1)
      a.name = RIDE_NAMES[n % RIDE_NAMES.length]
      a.distanceKm = km
      a.durationMin = round(km / (0.42 + g() * 0.03), 0)
      a.avgPowerW = round(198 + g() * 22, 0)
      a.avgHr = round(t.hrBase + g() * 8, 0)
      a.maxHr = round(a.avgHr + 28 + g() * 6, 0)
      a.elevGainM = round(Math.abs(g()) * 260 + 120, 0)
    } else if (type === 'strength') {
      a.name = LIFT_NAMES[n % LIFT_NAMES.length]
      a.durationMin = round(48 + g() * 9, 0)
      a.avgHr = round(t.hrBase + g() * 7, 0)
      a.maxHr = round(a.avgHr + 34 + g() * 8, 0)
      a.volumeKg = round(7200 + g() * 1400, 0)
      a.sets = round(18 + Math.abs(g()) * 4, 0)
    } else if (type === 'hike') {
      a.name = HIKE_NAMES[n % HIKE_NAMES.length]
      a.distanceKm = round(11 + Math.abs(g()) * 5, 1)
      a.durationMin = round(a.distanceKm * 11.5 + g() * 15, 0)
      a.avgHr = round(t.hrBase + g() * 8, 0)
      a.maxHr = round(a.avgHr + 30 + g() * 7, 0)
      a.elevGainM = round(420 + Math.abs(g()) * 320, 0)
    } else if (type === 'swim') {
      a.name = 'Pool swim'
      a.distanceKm = round(1.6 + Math.abs(g()) * 0.7, 2)
      a.durationMin = round(a.distanceKm * 24 + g() * 4, 0)
      a.avgHr = round(t.hrBase + g() * 7, 0)
      a.maxHr = round(a.avgHr + 22 + g() * 5, 0)
    } else {
      // Post-meal walks — the n-of-1 protocol, logged from the experiment start.
      const protocol = date >= '2025-07-06'
      a.name = protocol ? 'Post-meal walk (protocol)' : 'Walk'
      a.distanceKm = round(protocol ? 1.6 + Math.abs(g()) * 0.3 : 3 + Math.abs(g()) * 1.6, 2)
      a.durationMin = round(protocol ? 17 + Math.abs(g()) * 3 : a.distanceKm * 12, 0)
      a.avgHr = round(t.hrBase + g() * 6, 0)
      a.maxHr = round(a.avgHr + 16 + g() * 4, 0)
      a.protocol = protocol || undefined
    }

    // Heart-rate zone minutes — five buckets summing to the duration.
    a.zones = zoneSplit(a.type, a.durationMin, a.avgHr, rand)
    // Garmin-style derived scores.
    a.trainingLoad = round(a.durationMin * (a.avgHr / 100) ** 1.92 * (type === 'strength' ? 0.55 : 1), 0)
    a.aerobicEffect = round(Math.min(5, (a.zones.z2 * 0.028 + a.zones.z3 * 0.05 + a.zones.z4 * 0.06)), 1)
    a.anaerobicEffect = round(Math.min(5, a.zones.z5 * 0.16 + a.zones.z4 * 0.02), 1)
    a.calories = round(a.durationMin * (a.avgHr / 100) * 8.2, 0)
    a.device = 'Garmin Forerunner 965'
    out.push(a)
  }
  return out
}

// Split a session's minutes across the five HR zones according to its character.
function zoneSplit(type, min, avgHr, rand) {
  const shapes = {
    run: [0.10, 0.42, 0.30, 0.14, 0.04],
    ride: [0.16, 0.50, 0.24, 0.09, 0.01],
    strength: [0.44, 0.38, 0.14, 0.04, 0.00],
    hike: [0.30, 0.54, 0.14, 0.02, 0.00],
    swim: [0.14, 0.46, 0.30, 0.09, 0.01],
    walk: [0.72, 0.26, 0.02, 0.00, 0.00],
  }
  const s = shapes[type]
  const jitter = s.map(v => Math.max(0, v + (rand() - 0.5) * 0.06))
  const sum = jitter.reduce((a, b) => a + b, 0)
  const mins = jitter.map(v => Math.round((v / sum) * min))
  // Force the buckets to sum exactly to the duration — a report that doesn't
  // reconcile is the first thing a sceptical user notices.
  const diff = min - mins.reduce((a, b) => a + b, 0)
  mins[1] += diff
  return { z1: mins[0], z2: mins[1], z3: mins[2], z4: mins[3], z5: mins[4] }
}

export const activities = buildActivities()

// --- weekly aggregation -----------------------------------------------------
// The unit a training question actually wants. 300 activities → 62 weeks.
const weekKey = date => addDays(date, -((dow(date) + 6) % 7))

export const weeklyLoad = (() => {
  const map = new Map()
  for (const a of activities) {
    const k = weekKey(a.date)
    if (!map.has(k)) map.set(k, { week: k, sessions: 0, minutes: 0, load: 0, km: 0, z2: 0, z45: 0, block: inBlock(k) })
    const w = map.get(k)
    w.sessions++; w.minutes += a.durationMin; w.load += a.trainingLoad
    w.km += a.distanceKm || 0
    w.z2 += a.zones.z2; w.z45 += a.zones.z4 + a.zones.z5
  }
  return [...map.values()].map(w => ({
    ...w, km: round(w.km, 1), load: round(w.load, 0),
    polarisation: round(w.z2 / Math.max(1, w.z2 + w.z45), 2),
  })).sort((a, b) => a.week.localeCompare(b.week))
})()

// Acute:chronic workload ratio — 7-day load over the trailing 28-day average.
// The one derived number that says "you ramped too fast", computed once here so
// no prompt has to carry 300 rows to get at it.
export const acwr = (() => {
  const byDay = new Map()
  for (const a of activities) byDay.set(a.date, (byDay.get(a.date) || 0) + a.trainingLoad)
  const out = []
  for (const date of eachDay(addDays(ACTIVITY_START, 28), ACTIVITY_END)) {
    let acute = 0, chronic = 0
    for (let i = 0; i < 28; i++) {
      const v = byDay.get(addDays(date, -i)) || 0
      chronic += v
      if (i < 7) acute += v
    }
    const ratio = chronic ? round(acute / (chronic / 4), 2) : 0
    out.push({ date, value: ratio })
  }
  return out
})()

// --- the block, evaluated ---------------------------------------------------
const inWindow = (rows, from, to) => rows.filter(r => r.week >= from && r.week <= to)

export const blockSummary = (() => {
  const pre = inWindow(weeklyLoad, '2024-11-01', '2025-02-28')
  const during = inWindow(weeklyLoad, trainingBlock.start, trainingBlock.end)
  const mean = (rows, f) => round(rows.reduce((a, r) => a + f(r), 0) / Math.max(1, rows.length), 1)
  return {
    id: 'block-summary',
    preWeeks: pre.length, blockWeeks: during.length,
    preMinutes: mean(pre, r => r.minutes), blockMinutes: mean(during, r => r.minutes),
    preLoad: mean(pre, r => r.load), blockLoad: mean(during, r => r.load),
    preSessions: mean(pre, r => r.sessions), blockSessions: mean(during, r => r.sessions),
    prePolarisation: mean(pre, r => r.polarisation * 100), blockPolarisation: mean(during, r => r.polarisation * 100),
    adherence: round((during.filter(w => w.sessions >= 4).length / Math.max(1, during.length)) * 100, 0),
    missedWeek: dataGaps[0],
  }
})()

// Sessions worth citing individually: the biggest load, the block's key
// threshold sessions, the first session back after the travel gap.
export const notableActivities = (() => {
  const sorted = [...activities].sort((a, b) => b.trainingLoad - a.trainingLoad)
  const hardest = sorted[0]
  const longest = [...activities].sort((a, b) => (b.distanceKm || 0) - (a.distanceKm || 0))[0]
  const backFromGap = activities.find(a => a.date > dataGaps[0].to)
  const lastBlock = [...activities].filter(a => a.date <= trainingBlock.end).pop()
  return [
    { ...hardest, why: 'highest training load in the record' },
    { ...longest, why: 'longest single session in the record' },
    { ...backFromGap, why: 'first session after the 9-day travel gap' },
    { ...lastBlock, why: 'final session of the aerobic block, 1 day before the lab retest' },
  ].filter(a => a.id)
})()

export const activityStats = {
  activities: activities.length,
  span: `${ACTIVITY_START} → ${ACTIVITY_END}`,
  weeks: weeklyLoad.length,
  totalMinutes: activities.reduce((a, x) => a + x.durationMin, 0),
  totalKm: round(activities.reduce((a, x) => a + (x.distanceKm || 0), 0), 0),
  fieldsPerActivity: 16,
  gapDays: daysBetween(dataGaps[0].from, dataGaps[0].to) + 1,
  byType: Object.keys(TYPES).map(t => ({ type: t, n: activities.filter(a => a.type === t).length })),
}
