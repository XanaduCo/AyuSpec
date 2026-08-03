// Cronometer-class nutrition logs — daily macro + micro totals and meal-level
// entries, with honest adherence.
//
// Nobody logs every day for two years. This one starts strong, decays over the
// second half of 2024, effectively stops through the winter, and comes back with
// the training block in March 2025. That gap is not a flaw in the mock — it is
// the reason a "what does my diet look like?" answer has to say *how much of the
// window it can actually see*, and the reason the context builder reports
// coverage alongside the values.
//
// The load-bearing signal: seafood servings. They rise through 2025, they track
// the omega-3 index up, and they track blood mercury up. Three sources agreeing
// is what makes the heavy-metals answer possible without guessing.

import { mulberry32, seedFrom, gauss, eachDay, dow, round } from './rng.js'

export const NUTRITION_START = '2024-01-01'
export const NUTRITION_END = '2025-08-03'

// Logging adherence by era — the probability a given day gets logged at all.
const ADHERENCE = [
  { from: '2024-01-01', to: '2024-06-30', p: 0.92, era: 'initial enthusiasm' },
  { from: '2024-07-01', to: '2024-10-31', p: 0.55, era: 'drifting' },
  { from: '2024-11-01', to: '2025-02-28', p: 0.28, era: 'effectively lapsed' },
  { from: '2025-03-01', to: NUTRITION_END, p: 0.88, era: 're-engaged with the training block' },
]
const adherenceFor = d => ADHERENCE.find(a => d >= a.from && d <= a.to) || ADHERENCE[0]

// Seafood servings/week rises over 2025 — the mercury story's upstream cause.
const seafoodTarget = date =>
  date < '2024-07-01' ? 2.6 : date < '2025-01-01' ? 3.4 : date < '2025-04-01' ? 4.8 : 6.2

function buildDays() {
  const rand = mulberry32(seedFrom('cronometer-days'))
  const out = []
  for (const date of eachDay(NUTRITION_START, NUTRITION_END)) {
    const adh = adherenceFor(date)
    if (rand() > adh.p) continue
    const g = () => gauss(rand)
    const weekend = dow(date) === 0 || dow(date) === 6
    const kcal = round(2540 + (weekend ? 260 : 0) + g() * 280, 0)
    const protein = round(168 + g() * 22, 0)
    const fat = round(96 + g() * 16, 0)
    const carb = round((kcal - protein * 4 - fat * 9) / 4, 0)
    // Seafood on ~seafoodTarget days per week.
    const seafood = rand() < seafoodTarget(date) / 7 ? (rand() < 0.22 ? 2 : 1) : 0
    out.push({
      date, logged: true, era: adh.era,
      kcal, protein_g: protein, carb_g: carb, fat_g: fat,
      satfat_g: round(fat * (0.26 + g() * 0.03), 1),
      fiber_g: round(34 + g() * 7, 0),
      sugar_g: round(52 + g() * 16, 0),
      sodium_mg: round(2900 + g() * 620, 0),
      potassium_mg: round(3600 + g() * 480, 0),
      magnesium_mg: round(412 + g() * 62, 0),
      calcium_mg: round(1040 + g() * 180, 0),
      iron_mg: round(17.5 + g() * 3.4, 1),
      zinc_mg: round(14.2 + g() * 2.6, 1),
      selenium_ug: round(96 + seafood * 34 + g() * 18, 0),
      vitd_iu: round(1200 + g() * 420, 0),
      b12_ug: round(6.4 + seafood * 2.1 + g() * 1.4, 1),
      folate_ug: round(486 + g() * 78, 0),
      omega3_g: round(1.4 + seafood * 0.9 + Math.abs(g()) * 0.3, 2),
      cholesterol_mg: round(420 + g() * 90, 0),
      alcohol_g: rand() < 0.32 ? round(Math.abs(g()) * 14 + 6, 1) : 0,
      caffeine_mg: round(230 + g() * 70, 0),
      water_ml: round(2800 + g() * 500, 0),
      seafoodServings: seafood,
      meals: 3 + (rand() < 0.42 ? 1 : 0),
    })
  }
  return out
}

export const days = buildDays()

// --- coverage ---------------------------------------------------------------
// How much of each window is actually logged. Any nutrition claim has to be
// scoped to this, and the context strip shows it rather than hiding it.
export function coverage(from, to) {
  const all = eachDay(from, to)
  const logged = days.filter(d => d.date >= from && d.date <= to).length
  return { from, to, days: all.length, logged, pct: round((logged / all.length) * 100, 0) }
}

export const coverageByEra = ADHERENCE.map(a => ({ ...a, ...coverage(a.from, a.to) }))

// --- weekly seafood, the cross-source link ---------------------------------
export const seafoodWeekly = (() => {
  const map = new Map()
  for (const d of days) {
    const k = weekStart(d.date)
    if (!map.has(k)) map.set(k, { week: k, servings: 0, loggedDays: 0 })
    const w = map.get(k)
    w.servings += d.seafoodServings
    w.loggedDays++
  }
  return [...map.values()]
    // Only weeks with enough logged days to mean anything.
    .map(w => ({ ...w, perWeek: w.loggedDays >= 4 ? round((w.servings / w.loggedDays) * 7, 1) : null }))
    .sort((a, b) => a.week.localeCompare(b.week))
})()

function weekStart(date) {
  const d = new Date(date)
  const off = (d.getUTCDay() + 6) % 7
  return new Date(d.getTime() - off * 86400000).toISOString().slice(0, 10)
}

export const seafoodTrend = (() => {
  const valid = seafoodWeekly.filter(w => w.perWeek != null)
  const early = valid.filter(w => w.week < '2024-10-01')
  const late = valid.filter(w => w.week >= '2025-04-01')
  const mean = rows => round(rows.reduce((a, r) => a + r.perWeek, 0) / Math.max(1, rows.length), 1)
  return {
    id: 'nutr-seafood-trend',
    earlyMean: mean(early), lateMean: mean(late),
    earlyWeeks: early.length, lateWeeks: late.length,
    summary: `Seafood servings rose from ~${mean(early)}/week (2024 H1) to ~${mean(late)}/week (since April 2025).`,
    caveat: 'Computed only over weeks with ≥4 logged days. The winter 2024–25 stretch is too sparse to include, so this is a comparison of two well-logged periods, not a continuous trend.',
  }
})()

// --- meal-level entries -----------------------------------------------------
// Materialised only for the trailing 28 days. Older meals exist in the store as
// rows; the demo does not need 5,000 of them in browser memory to make the point
// that a retriever must not put them in a prompt.
const FOODS = [
  ['Steel-cut oats, blueberries, whey', 'breakfast', 520, 38, 62, 12, 0],
  ['Greek yogurt, walnuts, honey', 'breakfast', 410, 30, 34, 18, 0],
  ['Three-egg omelette, spinach, feta', 'breakfast', 460, 32, 8, 33, 0],
  ['Yellowfin tuna poke bowl', 'lunch', 680, 46, 74, 18, 2],
  ['Grilled salmon, quinoa, greens', 'lunch', 640, 44, 48, 26, 1],
  ['Chicken tikka, brown rice, dal', 'lunch', 720, 52, 78, 18, 0],
  ['Lentil soup, sourdough', 'lunch', 480, 24, 66, 12, 0],
  ['Swordfish steak, roasted vegetables', 'dinner', 610, 48, 26, 32, 1],
  ['Sardines on toast, tomato salad', 'dinner', 520, 34, 42, 24, 1],
  ['Paneer bhurji, roti, salad', 'dinner', 690, 34, 62, 34, 0],
  ['Ribeye, sweet potato, broccoli', 'dinner', 780, 56, 48, 38, 0],
  ['Whey shake, banana', 'snack', 280, 28, 32, 4, 0],
  ['Almonds, dark chocolate', 'snack', 240, 8, 16, 18, 0],
  ['Cottage cheese, berries', 'snack', 190, 22, 14, 4, 0],
]

function buildMeals() {
  const rand = mulberry32(seedFrom('cronometer-meals'))
  const recent = days.filter(d => d.date >= '2025-07-07')
  const out = []
  for (const d of recent) {
    for (let i = 0; i < d.meals; i++) {
      const slot = ['breakfast', 'lunch', 'dinner', 'snack'][Math.min(i, 3)]
      const pool = FOODS.filter(f => f[1] === slot)
      const f = pool[Math.floor(rand() * pool.length) % pool.length]
      out.push({
        id: `meal-${d.date}-${i}`, date: d.date, slot, name: f[0],
        kcal: round(f[2] * (0.9 + rand() * 0.2), 0), protein_g: f[3], carb_g: f[4], fat_g: f[5],
        seafoodServings: f[6],
        time: ['07:40', '12:35', '19:20', '16:10'][Math.min(i, 3)],
      })
    }
  }
  return out
}

export const meals = buildMeals()

// High-mercury species specifically — the sub-signal the heavy-metals answer
// needs, and the one no daily total can express.
export const highMercuryMeals = meals.filter(m => /tuna|swordfish|marlin|mackerel/i.test(m.name))

export const nutritionStats = {
  loggedDays: days.length,
  windowDays: eachDay(NUTRITION_START, NUTRITION_END).length,
  coveragePct: round((days.length / eachDay(NUTRITION_START, NUTRITION_END).length) * 100, 0),
  fieldsPerDay: 23,
  nutrientRows: days.length * 23,
  materialisedMeals: meals.length,
  // Meal rows the store holds but the demo does not materialise in the browser.
  declaredMeals: Math.round(days.length * 3.4),
  span: `${NUTRITION_START} → ${NUTRITION_END}`,
}
