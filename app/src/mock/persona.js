// The single deterministic persona behind the whole demo. Every view reads from
// here, so the lab drawn on a date appears in the Timeline, feeds the "what
// changed" answer, and is what a doctor packet would export. Cross-view
// coherence is what makes a mock feel real. All values are fabricated.

export const persona = {
  name: 'Ravi Mehta',
  age: 45,
  sex: 'male',
  location: 'Local · self-hosted',
  since: '2025-05-05', // ~90-day window anchor
}

// Labs — current value, prior value (baseline ~90d before), reference range, unit.
export const labs = [
  { code: '1884-6', name: 'ApoB', value: 95, prior: 88, unit: 'mg/dL', low: null, high: 90, flag: 'high', drawn: '2025-08-01', panel: 'Lipid panel', lab: 'LabCorp' },
  { code: '2085-9', name: 'HDL-C', value: 52, prior: 50, unit: 'mg/dL', low: 40, high: null, flag: 'ok', drawn: '2025-08-01', panel: 'Lipid panel', lab: 'LabCorp' },
  { code: '13457-7', name: 'LDL-C (calc)', value: 128, prior: 120, unit: 'mg/dL', low: null, high: 100, flag: 'high', drawn: '2025-08-01', panel: 'Lipid panel', lab: 'LabCorp' },
  { code: '4548-4', name: 'HbA1c', value: 5.4, prior: 5.5, unit: '%', low: null, high: 5.7, flag: 'ok', drawn: '2025-08-01', panel: 'Metabolic', lab: 'LabCorp' },
  { code: '2339-0', name: 'Fasting glucose', value: 96, prior: 94, unit: 'mg/dL', low: 70, high: 99, flag: 'ok', drawn: '2025-08-01', panel: 'Metabolic', lab: 'LabCorp' },
  { code: '1988-5', name: 'hs-CRP', value: 0.8, prior: 1.1, unit: 'mg/L', low: null, high: 1.0, flag: 'ok', drawn: '2025-08-01', panel: 'Inflammation', lab: 'LabCorp' },
  { code: '2986-8', name: 'Testosterone, total', value: 642, prior: 610, unit: 'ng/dL', low: 264, high: 916, flag: 'ok', drawn: '2025-08-01', panel: 'Hormone', lab: 'LabCorp' },
]

// Wearable metrics — a 90-day summary plus a coarse sparkline series (weekly).
export const wearables = [
  { code: '80404-7', name: 'HRV (SDNN)', unit: 'ms', source: 'oura', current: 42, baseline: 46, dir: 'down',
    series: [46, 47, 45, 44, 43, 44, 42, 41, 42, 43, 42, 42] },
  { code: 'vo2max', name: 'VO₂max (est.)', unit: 'mL/kg/min', source: 'whoop', current: 52.0, baseline: 50.7, dir: 'up',
    series: [50.7, 50.9, 51.1, 51.0, 51.4, 51.6, 51.8, 51.9, 52.0, 52.1, 52.0, 52.0] },
  { code: 'rhr', name: 'Resting HR', unit: 'bpm', source: 'oura', current: 54, baseline: 55, dir: 'down',
    series: [55, 55, 56, 55, 54, 54, 55, 54, 54, 53, 54, 54] },
  { code: 'sleep', name: 'Sleep duration', unit: 'h', source: 'oura', current: 7.1, baseline: 7.0, dir: 'up',
    series: [7.0, 6.8, 7.1, 7.2, 6.9, 7.0, 7.1, 7.3, 7.0, 7.1, 7.2, 7.1] },
]

export const conditions = [
  { name: 'Essential hypertension', status: 'controlled', onset: '2022-03', code: 'I10' },
]

export const medications = [
  { name: 'Lisinopril', dose: '10 mg', freq: 'once daily', since: '2022-04-01', for: 'hypertension' },
]

export const imaging = [
  { modality: 'MRI', study: 'Brain MRI', date: '2025-02-18', series: ['T1', 'T2', 'FLAIR'], instances: 180,
    aiSummary: 'Age-appropriate ventricle size, no acute white-matter changes, normal hippocampal volumes. AI-generated (MedGemma) — not a radiologist read.' },
  { modality: 'CT', study: 'Coronary calcium (CAC)', date: '2024-11-09', series: ['Gated CT'], instances: 60,
    aiSummary: 'Agatston score 0. No detectable coronary artery calcification.' },
]

export const genomics = {
  source: '23andMe',
  variants: [
    { gene: 'APOE', genotype: 'ε3/ε3', rsid: 'rs429358/rs7412', note: 'Baseline Alzheimer risk; not an ε4 carrier.' },
  ],
  prs: [
    { trait: 'Coronary artery disease', percentile: 70, ancestry: 'South Asian', caveat: 'Effect sizes are from European-ancestry GWAS; less predictive for other ancestries.' },
  ],
}

export const familyHistory = [
  { relation: 'Father', condition: 'Coronary artery disease', age: 62 },
]

// The active n-of-1 experiment, referenced by Ask, Experiments and Explore.
export const activeHypothesis = {
  statement: 'Post-meal walks reduce my post-prandial glucose peaks and improve HRV consistency.',
  evidence: 'high',
  week: 4, adherence: { done: 21, of: 30 },
  metric: 'CGM peak · Oura HRV',
  status: 'running',
}
