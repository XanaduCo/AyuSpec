// Pinned tracking — the one user-declared section on Now.
//
// Everything else on the Now page is *system-computed* attention: the app puts
// an item there and states its reason. A pin is the opposite direction — the
// user saying "I am actively watching this." Explicit, finite, editable. The
// card contract that keeps a pin from decaying into a dashboard tile: only the
// underlying signal and its trend vs. the relevant baseline. No derived scores,
// no streaks, no reordering by the system.
//
// State model: a module-level singleton read through useSyncExternalStore, like
// the rest of the session overlay it lives beside — in memory, deterministic
// seed, resets on reload. Pin order is pin order: seeded first, then whatever
// the user pins, appended. Nothing here ever re-sorts it.

import { useSyncExternalStore } from 'react'
import { analyteSeries, analyteByKey, wearableById } from '../mock/persona.js'

// Soft cap. Pins are attention; unbounded pins are a dashboard. The spec says
// 5–7 — this implementation uses 6, and going past it asks you to let one go.
export const PIN_CAP = 6

// ---------------------------------------------------------------------------
// The pinnable catalogue — every object a pin can point at, with enough
// metadata for the picker row. Card data is resolved live (markerData below,
// or useExperiments() for experiment pins) so the pin always shows the same
// numbers as the view it links to.
// ---------------------------------------------------------------------------

export const PINNABLE = [
  { id: 'exp-postmeal-walks', type: 'experiment',
    pickLabel: 'Post-meal walks (running n-of-1)',
    pickDetail: 'day-by-day · CGM peak vs. pre-registered baseline' },
  { id: 'met-apob', type: 'marker', analyte: 'apob',
    pickLabel: 'ApoB',
    pickDetail: 'risen at every draw for two years',
    baselineNote: 'vs. prior draw' },
  { id: 'met-hrv', type: 'marker', wearable: 'obs-hrv',
    pickLabel: 'HRV (SDNN)',
    pickDetail: 'down 4 ms across the 90-day window',
    baselineNote: 'vs. 90-day baseline' },
  { id: 'met-mercury', type: 'marker', analyte: 'mercury',
    pickLabel: 'Blood mercury',
    pickDetail: 'above the limit since May; tracking seafood intake',
    baselineNote: 'vs. prior draw' },
  { id: 'met-ferritin', type: 'marker', analyte: 'ferritin',
    pickLabel: 'Ferritin',
    pickDetail: 'in range, but rising — HFE compound heterozygote',
    baselineNote: 'vs. prior draw' },
  { id: 'met-vo2max', type: 'marker', wearable: 'obs-vo2max',
    pickLabel: 'VO₂max (est.)',
    pickDetail: 'the aerobic block’s primary outcome',
    baselineNote: 'vs. 90-day baseline' },
  { id: 'exp-mg-sleep', type: 'experiment',
    pickLabel: 'Magnesium → sleep latency (complete)',
    pickDetail: 'closed · supported — probably not worth a pin' },
]

export const pinnableById = Object.fromEntries(PINNABLE.map(p => [p.id, p]))

// ---------------------------------------------------------------------------
// Marker card data, resolved from the base record. Labs give a per-draw series
// with the as-reported reference range; wearables give the coarse 12-week
// sparkline plus the 90-day baseline the persona already carries.
// ---------------------------------------------------------------------------

export function markerData(desc) {
  if (desc.analyte) {
    const a = analyteByKey[desc.analyte]
    const series = analyteSeries(desc.analyte)
    const latest = series[series.length - 1]
    const prior = series.length > 1 ? series[series.length - 2] : null
    return {
      kind: 'lab',
      name: a.name,
      unit: latest.unit,
      values: series.map(r => r.value),
      latest: latest.value,
      latestDate: latest.drawn,
      prior: prior?.value ?? null,
      priorDate: prior?.drawn ?? null,
      low: latest.low, high: latest.high,
      flag: latest.flag,
      spanLabel: `${series.length} draws · ${series[0].drawn.slice(0, 7)} → ${latest.drawn.slice(0, 7)}`,
    }
  }
  const w = wearableById[desc.wearable]
  return {
    kind: 'wearable',
    name: w.name,
    unit: w.unit,
    values: w.series,
    latest: w.current,
    baseline: w.baseline,
    source: w.source,
    low: null, high: null,
    flag: 'ok',
    spanLabel: '12-week trend · daily wear',
  }
}

// ---------------------------------------------------------------------------
// The store. Seeded with the persona's honest watchlist: the running
// experiment and the two markers the record's open questions hang on, plus the
// HRV drift the experiment is partly about.
// ---------------------------------------------------------------------------

let pins = ['exp-postmeal-walks', 'met-apob', 'met-hrv', 'met-mercury']
const listeners = new Set()

function notify() { for (const l of listeners) l() }
const subscribe = l => { listeners.add(l); return () => listeners.delete(l) }
const getSnapshot = () => pins

export function usePins() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

// Returns false when the cap would be exceeded — the caller shows the
// let-one-go prompt instead. Deliberately not a hard error and not a queue
// that silently evicts: the user chooses what to let go.
export function pin(id) {
  if (pins.includes(id)) return true
  if (pins.length >= PIN_CAP) return false
  pins = [...pins, id]
  notify()
  return true
}

export function unpin(id) {
  if (!pins.includes(id)) return
  pins = pins.filter(p => p !== id)
  notify()
}

export const isPinned = id => pins.includes(id)
