// Deterministic pseudo-randomness and date maths for the whole mock layer.
//
// Every generated value in the demo comes from here — never `Math.random`, so
// the chart, the answer text, the context trace and the record counts can never
// disagree between two page loads. Each series seeds itself from its own name,
// so adding a metric never shifts the values of an existing one.

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// FNV-1a over a string → a stable 32-bit seed. Lets a generator be seeded by
// what it *is* ("hrv") rather than by a magic number nobody can re-derive.
export function seedFrom(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const DAY = 86400000
export const iso = d => new Date(d).toISOString().slice(0, 10)

export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / DAY)
}
export function addDays(d, n) {
  return iso(new Date(d).getTime() + n * DAY)
}
export function eachDay(start, end) {
  const out = []
  for (let i = 0, n = daysBetween(start, end); i <= n; i++) out.push(addDays(start, i))
  return out
}
// 0 = Sunday … 6 = Saturday, in UTC so it never drifts with the viewer's zone.
export const dow = d => new Date(d).getUTCDay()

// Box–Muller from a uniform generator. Clipped at ±3σ so a single tail draw
// can never produce a physiologically absurd lab value.
export function gauss(rand) {
  const u = Math.max(rand(), 1e-9), v = rand()
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return Math.max(-3, Math.min(3, z))
}

// Piecewise-linear interpolation across dated knots. Knots are how a series
// gets a *shape* — a plateau, a change-point, a training block — instead of the
// single straight line a two-endpoint generator can draw.
export function knotValue(knots, date) {
  const t = new Date(date).getTime()
  if (t <= new Date(knots[0].d).getTime()) return knots[0].v
  const last = knots[knots.length - 1]
  if (t >= new Date(last.d).getTime()) return last.v
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1], b = knots[i]
    const ta = new Date(a.d).getTime(), tb = new Date(b.d).getTime()
    if (t <= tb) return a.v + (b.v - a.v) * ((t - ta) / (tb - ta || 1))
  }
  return last.v
}

/**
 * A daily series with a real shape: knot-driven trend + weekly seasonality +
 * seeded noise + optional missing stretches (a dead battery, a travel week).
 *
 * `pin` fixes named dates to exact values — the headline numbers the narrative
 * cites are pinned, never generated, so the copy can never drift off the data.
 */
export function makeSeries({
  name, start, end, knots, dp = 0, noise = 1, weekly = 0, gaps = [], pin = {}, clamp,
}) {
  const rand = mulberry32(seedFrom(name))
  const out = []
  for (const date of eachDay(start, end)) {
    if (gaps.some(g => date >= g.from && date <= g.to)) continue
    const trend = knotValue(knots, date)
    // Weekend/weekday wobble — recovery metrics really do have a 7-day shape.
    const season = weekly ? Math.cos(((dow(date) + 4) / 7) * 2 * Math.PI) * weekly : 0
    let v = trend + season + gauss(rand) * noise
    if (clamp) v = Math.max(clamp[0], Math.min(clamp[1], v))
    out.push({ date, value: Number(v.toFixed(dp)) })
  }
  for (const [date, value] of Object.entries(pin)) {
    const row = out.find(r => r.date === date)
    if (row) row.value = value
  }
  return out
}

// Weighted choice from [[item, weight], …].
export function weighted(rand, pairs) {
  const total = pairs.reduce((a, p) => a + p[1], 0)
  let r = rand() * total
  for (const [item, w] of pairs) { r -= w; if (r <= 0) return item }
  return pairs[pairs.length - 1][0]
}

export const round = (v, dp = 0) => Number(v.toFixed(dp))
