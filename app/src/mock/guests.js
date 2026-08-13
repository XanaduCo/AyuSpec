// Guest personas — seeded threads from OTHER patients' ayuOS instances.
//
// The demo's record, store, and settings all belong to Ravi. But the
// behavioural-flows spec is about the same rules producing *different*
// conversations for different people, and that cannot be shown on one persona.
// So two threads in the Ask history are seeded from other instances — Maya's
// and Dev's — each carrying its own miniature store (for the context strip's
// candidate sweep), its own records (so citations resolve), and its own
// framing register (visible in the answers themselves).
//
// Ground rules that keep this honest:
//   · A guest thread is READ-ONLY. Ravi's ask bar cannot append to another
//     person's instance, and the demo says so instead of pretending.
//   · A guest instance is LOCAL by construction here — both of these users run
//     everything on-device — so the thread ignores Ravi's header posture.
//   · The candidate sweep, budget, and policy math run against the guest's own
//     units below, never against Ravi's store. Small numbers, honestly small.
//
// Maya also exists in the psychographic layer (mock/profile.js) — same person,
// same register: meaning first, effort capped, natural-leaning priors.

const subjectOf = name => ({ reference: `Patient/${name.toLowerCase()}`, display: name })

const u = unit => unit

// --- Maya --------------------------------------------------------------------

const mayaSubject = subjectOf('Maya')

const mayaUnits = [
  u({ id: 'maya-tsh-series', label: 'TSH — three draws on the same 75 µg dose', kind: 'lab', group: 'Labs',
    from: '2023-11-14', to: '2025-06-20', rows: 3, tags: ['thyroid', 'hormones', 'labs'],
    rawBytes: 288, summaryBytes: 288, quality: 'measured', pii: 1 }),
  u({ id: 'maya-ft4', label: 'Free T4 (latest draw)', kind: 'lab', group: 'Labs',
    date: '2025-06-20', rows: 1, tags: ['thyroid', 'hormones', 'labs'],
    rawBytes: 96, summaryBytes: 96, quality: 'measured', pii: 0 }),
  u({ id: 'maya-tpo', label: 'TPO antibodies — three measurements', kind: 'lab', group: 'Labs',
    from: '2019-09-02', to: '2025-06-20', rows: 3, tags: ['thyroid', 'labs'],
    rawBytes: 288, summaryBytes: 288, quality: 'measured', pii: 0 }),
  u({ id: 'maya-ferritin', label: 'Ferritin 22 µg/L (2025-06-20)', kind: 'lab', group: 'Labs',
    date: '2025-06-20', rows: 1, tags: ['iron', 'energy', 'labs'],
    rawBytes: 96, summaryBytes: 96, quality: 'measured', pii: 0 }),
  u({ id: 'maya-vitd', label: 'Vitamin D 24 ng/mL (2025-06-20)', kind: 'lab', group: 'Labs',
    date: '2025-06-20', rows: 1, tags: ['micronutrients', 'labs'],
    rawBytes: 96, summaryBytes: 96, quality: 'measured', pii: 0 }),
  u({ id: 'maya-panels-rest', label: 'CBC, metabolic panel — unremarkable', kind: 'lab', group: 'Labs',
    date: '2025-06-20', rows: 38, tags: ['cbc', 'metabolic', 'labs'], flag: 'ok',
    rawBytes: 38 * 96, summaryBytes: 620, quality: 'measured', pii: 0 }),
  u({ id: 'maya-cond-hashimotos', label: 'Hashimoto’s thyroiditis (2019)', kind: 'condition', group: 'Conditions',
    date: '2019-09-02', rows: 1, tags: ['thyroid', 'conditions'], timeless: true,
    rawBytes: 180, summaryBytes: 180, quality: 'measured', pii: 1 }),
  u({ id: 'maya-med-levo', label: 'Levothyroxine 75 µg — daily since 2020', kind: 'med', group: 'Medications',
    date: '2020-03-10', rows: 1, tags: ['meds', 'thyroid'], timeless: true,
    rawBytes: 160, summaryBytes: 160, quality: 'measured', pii: 1 }),
  u({ id: 'maya-intake-log', label: 'Intake captures — pill + coffee co-log (34 mornings)', kind: 'aggregate', group: 'Capture',
    from: '2025-06-28', to: '2025-08-02', rows: 34, tags: ['meds', 'thyroid', 'nutrition'],
    rawBytes: 34 * 62, summaryBytes: 540, quality: 'derived', pii: 0 }),
  u({ id: 'maya-sleep-summary', label: 'Sleep — nightly summary (Oura, 92 nights)', kind: 'aggregate', group: 'Wearables',
    from: '2025-05-03', to: '2025-08-02', rows: 92, tags: ['sleep', 'recovery'],
    rawBytes: 92 * 96, summaryBytes: 920, quality: 'derived', pii: 0 }),
  u({ id: 'maya-energy-logs', label: 'Energy logs — 7 one-tap captures, 3 weeks', kind: 'aggregate', group: 'Capture',
    from: '2025-07-12', to: '2025-08-02', rows: 7, tags: ['energy', 'recovery'],
    rawBytes: 7 * 34, summaryBytes: 250, quality: 'derived', pii: 0 }),
  u({ id: 'maya-exp-ashwagandha', label: 'Experiment — ashwagandha for energy (day 12 of 21)', kind: 'experiment', group: 'Experiments',
    from: '2025-07-22', to: '2025-08-02', rows: 12, tags: ['experiment', 'energy', 'meds'],
    rawBytes: 640, summaryBytes: 480, quality: 'derived', pii: 0 }),
  u({ id: 'maya-cycle', label: 'Cycle log (coarse)', kind: 'aggregate', group: 'Capture',
    from: '2025-05-03', to: '2025-08-02', rows: 3, tags: ['hormones'], flag: 'ok',
    rawBytes: 120, summaryBytes: 120, quality: 'derived', pii: 0 }),
]

const mayaRecords = {
  'maya-tsh-series': {
    title: 'TSH — treated series', subtitle: 'Observation × 3 · 2023-11 → 2025-06 · same 75 µg dose',
    fhir: {
      resourceType: 'Bundle', id: 'maya-tsh-series', type: 'collection', subject: mayaSubject, total: 3,
      entry: [
        { resource: { resourceType: 'Observation', code: { text: 'TSH' }, effectiveDateTime: '2023-11-14', valueQuantity: { value: 1.6, unit: 'mIU/L' }, referenceRange: [{ text: '0.4–4.0' }], interpretation: [{ text: 'normal' }] } },
        { resource: { resourceType: 'Observation', code: { text: 'TSH' }, effectiveDateTime: '2024-09-06', valueQuantity: { value: 2.1, unit: 'mIU/L' }, referenceRange: [{ text: '0.4–4.0' }], interpretation: [{ text: 'normal' }] } },
        { resource: { resourceType: 'Observation', code: { text: 'TSH' }, effectiveDateTime: '2025-06-20', valueQuantity: { value: 3.8, unit: 'mIU/L' }, referenceRange: [{ text: '0.4–4.0' }], interpretation: [{ text: 'normal' }] } },
      ],
      _whyItMatters: 'Every value is inside the population range, and the series still more than doubles from her own treated baseline. The range says "normal"; the baseline says "drifting". For a treated patient the baseline is the instrument that matters.',
    },
  },
  'maya-tpo': {
    title: 'TPO antibodies', subtitle: 'Observation × 3 · roughly stable since diagnosis',
    fhir: {
      resourceType: 'Bundle', id: 'maya-tpo', type: 'collection', subject: mayaSubject, total: 3,
      entry: [
        { resource: { resourceType: 'Observation', code: { text: 'TPO antibodies' }, effectiveDateTime: '2019-09-02', valueQuantity: { value: 312, unit: 'IU/mL' } } },
        { resource: { resourceType: 'Observation', code: { text: 'TPO antibodies' }, effectiveDateTime: '2023-11-14', valueQuantity: { value: 355, unit: 'IU/mL' } } },
        { resource: { resourceType: 'Observation', code: { text: 'TPO antibodies' }, effectiveDateTime: '2025-06-20', valueQuantity: { value: 340, unit: 'IU/mL' } } },
      ],
      _whyItMatters: 'The marker that tracks the autoimmune attack itself. Elevated — that is the diagnosis — but roughly stable across six years, which argues against acceleration.',
    },
  },
  'maya-ferritin': {
    title: 'Ferritin', subtitle: 'Observation · drawn 2025-06-20',
    fhir: {
      resourceType: 'Observation', id: 'maya-ferritin', subject: mayaSubject, effectiveDateTime: '2025-06-20',
      code: { text: 'Ferritin' }, valueQuantity: { value: 22, unit: 'µg/L' }, referenceRange: [{ text: '15–150' }],
      interpretation: [{ text: 'normal (low)' }],
      note: [{ text: 'In range, low. Ferritin below ~30 is associated with fatigue; trial evidence that repletion improves fatigue in low-ferritin women is moderate.' }],
    },
  },
  'maya-vitd': {
    title: 'Vitamin D, 25-OH', subtitle: 'Observation · drawn 2025-06-20',
    fhir: {
      resourceType: 'Observation', id: 'maya-vitd', subject: mayaSubject, effectiveDateTime: '2025-06-20',
      code: { text: 'Vitamin D, 25-hydroxy' }, valueQuantity: { value: 24, unit: 'ng/mL' }, referenceRange: [{ text: '30–100' }],
      note: [{ text: 'Borderline. Evidence linking supplementation to fatigue improvement is weak — carried as context, not as a candidate explanation.' }],
    },
  },
  'maya-med-levo': {
    title: 'Levothyroxine 75 µg', subtitle: 'MedicationStatement · daily since 2020-03',
    fhir: {
      resourceType: 'MedicationStatement', id: 'maya-med-levo', status: 'active', subject: mayaSubject,
      effectiveDateTime: '2020-03-10', dosage: [{ text: '75 µg once daily, morning', reason: 'Hashimoto’s hypothyroidism' }],
      note: [{ text: 'Absorption is measurably reduced by coffee, calcium, or iron taken close to the dose; guidance is water only, food and coffee 30–60 minutes later. Dose changes are the endocrinologist’s call.' }],
    },
  },
  'maya-intake-log': {
    title: 'Intake captures — morning co-log', subtitle: 'ayuos.capture · 34 mornings · one-tap',
    fhir: {
      resourceType: 'Basic', id: 'maya-intake-log', subject: mayaSubject, code: { text: 'medication intake pattern' },
      _pattern: 'Levothyroxine logged with breakfast; coffee within ~15 minutes on 29 of 34 captured mornings.',
      _whyItMatters: 'A drifting TSH on an unchanged dose is exactly what impaired absorption can look like. This pattern was captured passively — no form was ever filled in.',
    },
  },
  'maya-sleep-summary': {
    title: 'Sleep — nightly summary', subtitle: 'Observation · Oura · 92 nights',
    fhir: {
      resourceType: 'Observation', id: 'maya-sleep-summary', subject: mayaSubject,
      code: { text: 'Sleep summary, 92 nights' },
      component: [
        { code: { text: 'average duration' }, valueQuantity: { value: 7.33, unit: 'h' } },
        { code: { text: 'efficiency' }, valueQuantity: { value: 88, unit: '%' } },
        { code: { text: 'trend' }, valueString: 'stable across the window' },
      ],
      note: [{ text: 'Sleep as an explanation for the afternoon crashes is largely ruled out by her own data.' }],
    },
  },
  'maya-energy-logs': {
    title: 'Energy logs', subtitle: 'ayuos.capture · 7 one-tap entries · 3 weeks',
    fhir: {
      resourceType: 'Basic', id: 'maya-energy-logs', subject: mayaSubject, code: { text: 'energy self-report' },
      _pattern: 'All seven crash reports land between 13:40 and 15:10.',
      _whyItMatters: 'A tight time-of-day cluster is a pattern, not a mood — and it is the shape a physiological cause tends to have.',
    },
  },
  'maya-exp-ashwagandha': {
    title: 'Experiment — ashwagandha for energy', subtitle: 'ayuos.experiment · day 12 of 21',
    fhir: {
      resourceType: 'Basic', id: 'maya-exp-ashwagandha', subject: mayaSubject, code: { text: 'n-of-1, single change' },
      _design: 'Ashwagandha each morning; outcome is her own one-tap energy score; verdict at day 21.',
      _interaction: 'Ashwagandha can modestly raise thyroid hormone levels — flagged against levothyroxine, and disclosed to the clinician path alongside any TSH result read during the run.',
      _status: 'No visible shift in the energy logs so far. The run finishes cleanly rather than being judged early.',
    },
  },
}

// --- Dev -----------------------------------------------------------------------

const devSubject = subjectOf('Dev')

const devUnits = [
  u({ id: 'dev-lipids', label: 'Lipid panel (2025-07-08)', kind: 'lab', group: 'Labs',
    date: '2025-07-08', rows: 11, tags: ['lipids', 'cardiac', 'labs'], flag: 'ok',
    rawBytes: 11 * 96, summaryBytes: 480, quality: 'measured', pii: 0 }),
  u({ id: 'dev-metabolic', label: 'HbA1c, hs-CRP, metabolic panel', kind: 'lab', group: 'Labs',
    date: '2025-07-08', rows: 24, tags: ['metabolic', 'inflammation', 'labs'], flag: 'ok',
    rawBytes: 24 * 96, summaryBytes: 560, quality: 'measured', pii: 0 }),
  u({ id: 'dev-b12-levels', label: 'B12, ferritin (latest draw)', kind: 'lab', group: 'Labs',
    date: '2025-07-08', rows: 3, tags: ['micronutrients', 'labs'], flag: 'ok',
    rawBytes: 288, summaryBytes: 288, quality: 'measured', pii: 0 }),
  u({ id: 'dev-diet-log', label: 'Diet log — flax & walnut trend (126 logged days)', kind: 'aggregate', group: 'Nutrition',
    from: '2025-02-04', to: '2025-08-02', rows: 126, tags: ['nutrition'],
    rawBytes: 126 * 160, summaryBytes: 1080, quality: 'derived', pii: 0 }),
  u({ id: 'dev-supplements', label: 'Supplement log — B12, vitamin D (3+ years)', kind: 'med', group: 'Medications',
    date: '2022-05-01', rows: 2, tags: ['meds', 'micronutrients'], timeless: true,
    rawBytes: 240, summaryBytes: 240, quality: 'measured', pii: 0 }),
  u({ id: 'dev-genome-fads', label: 'FADS1/FADS2 haplotype (rs174546)', kind: 'genomic', group: 'Genomics',
    date: '2024-10-12', rows: 1, tags: ['genomics'], timeless: true, policy: 'genome',
    rawBytes: 320, summaryBytes: 320, quality: 'measured', pii: 2 }),
  u({ id: 'dev-garmin', label: 'Running — weekly load (Garmin, 26 weeks)', kind: 'aggregate', group: 'Activity',
    from: '2025-02-04', to: '2025-08-02', rows: 26, tags: ['training', 'fitness', 'activity'],
    rawBytes: 26 * 180, summaryBytes: 760, quality: 'derived', pii: 0 }),
  u({ id: 'dev-fh', label: 'Family history — nothing premature', kind: 'history', group: 'History',
    date: '2024-10-12', rows: 2, tags: ['family'], timeless: true, flag: 'ok',
    rawBytes: 200, summaryBytes: 200, quality: 'measured', pii: 1 }),
]

const devRecords = {
  'dev-lipids': {
    title: 'Lipid panel', subtitle: 'Bundle · 11 results · drawn 2025-07-08',
    fhir: {
      resourceType: 'Bundle', id: 'dev-lipids', type: 'collection', subject: devSubject, total: 11,
      entry: [
        { resource: { resourceType: 'Observation', code: { text: 'ApoB' }, valueQuantity: { value: 78, unit: 'mg/dL' }, interpretation: [{ text: 'normal' }] } },
        { resource: { resourceType: 'Observation', code: { text: 'LDL-C' }, valueQuantity: { value: 102, unit: 'mg/dL' } } },
        { resource: { resourceType: 'Observation', code: { text: 'HDL-C' }, valueQuantity: { value: 58, unit: 'mg/dL' } } },
        { resource: { resourceType: 'Observation', code: { text: 'Triglycerides' }, valueQuantity: { value: 66, unit: 'mg/dL' } } },
      ],
      _whyItMatters: 'Unremarkable across the panel. A low-baseline-risk person buys little absolute benefit from any cardiovascular intervention — which is context the omega-3 question needs.',
    },
  },
  'dev-diet-log': {
    title: 'Diet log — plant omega-3 intake', subtitle: 'ayuos.capture · 126 logged days · ~70% coverage',
    fhir: {
      resourceType: 'Basic', id: 'dev-diet-log', subject: devSubject, code: { text: 'dietary pattern, ALA sources' },
      _pattern: 'Ground flaxseed ~5 mornings/week (≈2.4 g ALA); walnuts ~4×/week (≈2.6 g ALA); eggs most days (~75 mg DHA each). Logged-day ALA average ≈4–5 g — about 3× the 1.6 g adequate-intake figure.',
      _coverage: '~70% of days logged. The unlogged days are not represented.',
    },
  },
  'dev-supplements': {
    title: 'Supplement log', subtitle: 'MedicationStatement × 2 · consistent 3+ years',
    fhir: {
      resourceType: 'Bundle', id: 'dev-supplements', type: 'collection', subject: devSubject, total: 2,
      entry: [
        { resource: { resourceType: 'MedicationStatement', medication: { text: 'Vitamin B12 500 µg daily' }, effectiveDateTime: '2022-05-01' } },
        { resource: { resourceType: 'MedicationStatement', medication: { text: 'Vitamin D 2000 IU daily' }, effectiveDateTime: '2022-05-01' } },
      ],
      _whyItMatters: 'Both adopted on evidence he read himself — the precedent that he supplements where the chain reaches an outcome, without it threatening the diet.',
    },
  },
  'dev-genome-fads': {
    title: 'FADS1/FADS2 haplotype', subtitle: 'MolecularSequence · 30× WGS',
    fhir: {
      resourceType: 'MolecularSequence', id: 'dev-genome-fads', subject: devSubject, type: 'dna',
      variant: [{ gene: 'FADS1/FADS2', rsid: 'rs174546', haplotype: 'derived (linked cluster)' }],
      note: [
        { text: 'Common in South Asian ancestry; associated with MORE efficient ALA→EPA/DHA conversion. Direction favourable for a plant-based pattern; effect size modest; evidence quality low-to-moderate. It nudges a prior — it does not replace measuring.' },
        { text: 'Genomic data never leaves this instance: all model roles run locally.' },
      ],
    },
  },
  'dev-garmin': {
    title: 'Running — weekly load', subtitle: 'Observation · Garmin · 26 weeks',
    fhir: {
      resourceType: 'Observation', id: 'dev-garmin', subject: devSubject,
      code: { text: 'Weekly running volume' },
      component: [
        { code: { text: 'average volume' }, valueQuantity: { value: 28, unit: 'km/wk' } },
        { code: { text: 'resting HR' }, valueQuantity: { value: 58, unit: 'bpm' } },
      ],
    },
  },
  'dev-fh': {
    title: 'Family history', subtitle: 'FamilyMemberHistory · 2 entries',
    fhir: {
      resourceType: 'Bundle', id: 'dev-fh', type: 'collection', subject: devSubject, total: 2,
      entry: [
        { resource: { resourceType: 'FamilyMemberHistory', relationship: { text: 'Father' }, note: [{ text: 'No cardiovascular disease before 75.' }] } },
        { resource: { resourceType: 'FamilyMemberHistory', relationship: { text: 'Mother' }, note: [{ text: 'No cognitive disease.' }] } },
      ],
    },
  },
}

// --- registry ------------------------------------------------------------------

export const GUESTS = {
  maya: {
    id: 'maya',
    name: 'Maya',
    tagline: 'Maya · 39 · Hashimoto’s · everything local',
    banner:
      'This thread is seeded from a different patient’s instance. Maya, 39, runs every model role ' +
      'on-device and abandons anything that needs babysitting — so her answers lead with meaning, stay ' +
      'short, and never propose more than two steps. Same spec as every other thread; different register. ' +
      'Her profile also appears in the psychographic layer.',
    storeLine: 'Her instance answers from a smaller store: 47 lab results across 4 draws, 92 nights, one live experiment, and passively captured intake logs.',
    units: mayaUnits,
    records: mayaRecords,
  },
  dev: {
    id: 'dev',
    name: 'Dev',
    tagline: 'Dev · 37 · vegetarian · measure first',
    banner:
      'This thread is seeded from a different patient’s instance. Dev, 37, is a lifelong vegetarian ' +
      'with an engineer’s instinct to measure before acting — his answers run on mechanism-versus-outcome ' +
      'distinctions and end with thresholds he wrote himself. Same spec as every other thread; different register.',
    storeLine: 'His instance answers from a smaller store: 38 lab results, 126 logged diet days, 26 training weeks, and an annotated genome — with one deliberate gap the conversation turns on.',
    units: devUnits,
    records: devRecords,
  },
}

for (const g of Object.values(GUESTS)) {
  g.unitById = Object.fromEntries(g.units.map(x => [x.id, x]))
  g.indexUnits = g.units.length
  g.indexRows = g.units.reduce((a, x) => a + x.rows, 0)
}

export function guestStore(key) {
  return GUESTS[key] || null
}

// id → { id, title, subtitle, fhir } for the source drawer, across all guests.
export function guestRecord(id) {
  for (const g of Object.values(GUESTS)) {
    const r = g.records[id]
    if (r) return { id, ...r }
  }
  return null
}
