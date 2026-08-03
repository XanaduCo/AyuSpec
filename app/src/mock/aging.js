// Epigenetic / biological-age clocks — TruDiagnostic-class methylation panels,
// three timepoints, plus immune-cell deconvolution and telomere length.
//
// This module exists to carry an *epistemic* beat, not a health one. Six clocks
// run on the same blood draw disagree with each other by up to six years, and
// they disagree with the labs. The honest reading depends almost entirely on
// each clock's technical reproducibility: DunedinPACE has an intraclass
// correlation near 0.96, Horvath's first-generation clock is far noisier, and a
// 0.7-year "improvement" on a clock whose test–retest CV is 5.8% is noise.
//
// So every clock here carries its own reliability metadata, and the trend is
// only computed for the ones whose noise floor is smaller than the movement.

import { round } from './rng.js'

export const CLOCK_META = {
  dunedin: { name: 'DunedinPACE', unit: 'yrs/yr', generation: '3rd (pace-of-ageing)', icc: 0.96, cv: 2.1,
    reads: 'Rate of ageing right now — how many biological years you accrue per calendar year.',
    trustworthy: true },
  phenoage: { name: 'PhenoAge', unit: 'yrs', generation: '2nd (clinical-outcome trained)', icc: 0.90, cv: 2.4,
    reads: 'Trained on 9 clinical chemistry markers + age, then transferred to methylation.', trustworthy: true },
  grimage: { name: 'GrimAge2', unit: 'yrs', generation: '2nd (mortality-trained)', icc: 0.92, cv: 1.8,
    reads: 'Trained to predict time-to-death, via DNAm surrogates for plasma proteins and smoking pack-years.', trustworthy: true },
  omicmage: { name: 'OMICmAge', unit: 'yrs', generation: '3rd (multi-omic)', icc: 0.91, cv: 3.1,
    reads: 'Methylation surrogates for 400+ proteins/metabolites, then age-trained.', trustworthy: true },
  horvath: { name: 'Horvath (2013)', unit: 'yrs', generation: '1st (chronological-age trained)', icc: 0.76, cv: 5.8,
    reads: 'Trained to predict calendar age. By construction, being *accurate* is its goal — so deviation is mostly noise.',
    trustworthy: false },
  hannum: { name: 'Hannum (2013)', unit: 'yrs', generation: '1st (chronological-age trained)', icc: 0.80, cv: 5.1,
    reads: 'Same design as Horvath, blood-specific.', trustworthy: false },
}

export const clockTests = [
  {
    id: 'clock-2024-01-15', date: '2024-01-15', vendor: 'TruDiagnostic TruAge Complete',
    array: 'Illumina EPIC v2 (935k CpG)', sample: 'dried blood spot', chronologicalAge: 43.7,
    clocks: { dunedin: 1.04, phenoage: 41.2, grimage: 44.8, omicmage: 42.5, horvath: 45.9, hannum: 43.1 },
    telomere: 7.12,
    immune: { cd8Naive: 3.2, cd4Naive: 8.9, cd8t: 12.4, cd4t: 29.6, nk: 6.1, bcell: 6.4, mono: 7.8, neut: 27.4, cd8cd4Ratio: 0.42, immuneAge: 43.2 },
  },
  {
    id: 'clock-2024-09-08', date: '2024-09-08', vendor: 'TruDiagnostic TruAge Complete',
    array: 'Illumina EPIC v2 (935k CpG)', sample: 'dried blood spot', chronologicalAge: 44.3,
    clocks: { dunedin: 0.98, phenoage: 40.1, grimage: 44.1, omicmage: 41.9, horvath: 45.2, hannum: 42.8 },
    telomere: 7.06,
    immune: { cd8Naive: 3.4, cd4Naive: 9.2, cd8t: 12.9, cd4t: 29.1, nk: 6.6, bcell: 6.2, mono: 7.5, neut: 26.9, cd8cd4Ratio: 0.44, immuneAge: 42.4 },
  },
  {
    id: 'clock-2025-06-11', date: '2025-06-11', vendor: 'TruDiagnostic TruAge Complete',
    array: 'Illumina EPIC v2 (935k CpG)', sample: 'dried blood spot', chronologicalAge: 45.1,
    clocks: { dunedin: 0.94, phenoage: 39.4, grimage: 43.6, omicmage: 41.2, horvath: 45.6, hannum: 42.4 },
    telomere: 7.15,
    immune: { cd8Naive: 3.6, cd4Naive: 9.4, cd8t: 13.3, cd4t: 28.8, nk: 6.9, bcell: 6.1, mono: 7.3, neut: 26.4, cd8cd4Ratio: 0.46, immuneAge: 41.1 },
  },
]

export const latestClock = clockTests[clockTests.length - 1]

// Per-clock trend, with the honest verdict attached: is the movement bigger than
// the assay's own test–retest noise? This is the whole point of the module.
export const clockTrends = Object.keys(CLOCK_META).map(key => {
  const meta = CLOCK_META[key]
  const first = clockTests[0].clocks[key]
  const last = latestClock.clocks[key]
  const delta = round(last - first, 2)
  // Noise floor ≈ CV% of the mean value, doubled for a difference of two reads.
  const noiseFloor = round((meta.cv / 100) * ((first + last) / 2) * Math.SQRT2, 2)
  const readable = Math.abs(delta) > noiseFloor
  return {
    key, name: meta.name, unit: meta.unit, first, last, delta, noiseFloor, readable,
    icc: meta.icc, cv: meta.cv, generation: meta.generation, reads: meta.reads,
    verdict: readable
      ? `moved ${delta > 0 ? '+' : ''}${delta} ${meta.unit} — larger than this assay's ±${noiseFloor} test–retest band`
      : `moved ${delta > 0 ? '+' : ''}${delta} ${meta.unit}, inside its own ±${noiseFloor} noise band — not a readable change`,
  }
})

export const telomereTrend = {
  key: 'telomere', name: 'Telomere length (mTL)', unit: 'kb',
  values: clockTests.map(t => ({ date: t.date, value: t.telomere })),
  delta: round(latestClock.telomere - clockTests[0].telomere, 2),
  noiseFloor: 0.32,
  readable: false,
  verdict: 'Moved +0.03 kb across 17 months against a ±0.32 kb reproducibility band. Telomere length from methylation is the least reproducible output on this panel; treat it as unmeasured, not as stable.',
}

// The disagreement, precomputed. A retriever sends this instead of 3 × 6 raw
// values — and it is what makes the "which do I trust?" answer possible.
// Age-in-years clocks only — DunedinPACE is a rate, not an age, so averaging it
// in would be a units error, which is exactly the mistake the panel invites.
const ageClocks = Object.entries(latestClock.clocks).filter(([k]) => k !== 'dunedin')

export const clockDisagreement = {
  id: 'clock-disagreement',
  chronological: latestClock.chronologicalAge,
  spread: round(Math.max(...ageClocks.map(c => c[1])) - Math.min(...ageClocks.map(c => c[1])), 1),
  youngest: 'PhenoAge 39.4', oldest: 'Horvath 45.6',
  readableCount: 3,
  summary: 'Five age-in-years clocks on the same blood spot span 6.2 years, and only three of the six outputs moved further than their own test–retest band. The spread is mostly a property of what each clock was trained to predict, not of your biology.',
  labContrast: 'The labs moved the other way on the markers the 2nd-generation clocks weight most: ApoB up 72 → 95 over two years, while hs-CRP fell 1.2 → 0.8 and HbA1c held at 5.4. PhenoAge and GrimAge2 do not read ApoB at all — so "clocks improving while ApoB rises" is not a contradiction, it is two instruments measuring different things.',
}

export const agingStats = {
  tests: clockTests.length,
  clocksPerTest: Object.keys(CLOCK_META).length,
  immuneMeasures: Object.keys(clockTests[0].immune).length,
  rows: clockTests.length * (Object.keys(CLOCK_META).length + 1 + Object.keys(clockTests[0].immune).length),
  span: `${clockTests[0].date} → ${latestClock.date}`,
}
