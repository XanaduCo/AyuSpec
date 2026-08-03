// Ravi Mehta's blood work — the largest single body of data in the store.
//
// A serious quantified-self person draws a full panel roughly every quarter and
// keeps years of it. That is what this is: ~110 analytes × 9 real draws over 27
// months, generated deterministically from a per-analyte trend + biological CV,
// with the *headline* values the narrative cites pinned rather than generated.
//
// Real-world messiness is deliberate and load-bearing for the retrieval story:
//   · one draw missed entirely (2024-11-16 — never rescheduled)
//   · one cheap partial panel drawn while travelling (2024-05-25)
//   · a lab vendor switch (Quest → LabCorp, 2025-01-11) that changed units on
//     Lp(a) and free testosterone and reference ranges on ferritin — so a naive
//     "what changed?" would report a 138% Lp(a) jump that is pure unit artefact
//
// LOINC codes are the real ones where they exist; derived indices carry an
// `ayuos:` code because they are computed here, not reported by a lab.

import { mulberry32, seedFrom, gauss, daysBetween, round } from './rng.js'

// --- the draws -------------------------------------------------------------
// `scope`: 'full' = everything · 'basic' = lipids + CMP + CBC only · 'missed' =
// ordered, never drawn (kept in the store as a hole, because the hole is a fact).
export const draws = [
  { id: 'draw-2023-05-06', date: '2023-05-06', lab: 'Quest',    scope: 'full',   fasting: true },
  { id: 'draw-2023-08-12', date: '2023-08-12', lab: 'Quest',    scope: 'full',   fasting: true },
  { id: 'draw-2023-11-18', date: '2023-11-18', lab: 'Quest',    scope: 'full',   fasting: true },
  { id: 'draw-2024-02-24', date: '2024-02-24', lab: 'Quest',    scope: 'full',   fasting: true },
  { id: 'draw-2024-05-25', date: '2024-05-25', lab: 'Quest',    scope: 'basic',  fasting: false,
    note: 'Drawn at a walk-in while travelling — basic panel only. No hormones, metals, micronutrients or inflammation markers.' },
  { id: 'draw-2024-08-31', date: '2024-08-31', lab: 'Quest',    scope: 'full',   fasting: true },
  { id: 'draw-2024-11-16', date: '2024-11-16', lab: 'Quest',    scope: 'missed', fasting: null,
    note: 'Ordered and never drawn. The quarterly cadence has a hole here — any "every quarter for two years" claim has to survive it.' },
  { id: 'draw-2025-01-11', date: '2025-01-11', lab: 'LabCorp',  scope: 'full',   fasting: true,
    note: 'First draw after switching vendor from Quest. Lp(a) and free testosterone changed units; ferritin changed reference range.' },
  { id: 'draw-2025-05-02', date: '2025-05-02', lab: 'LabCorp',  scope: 'full',   fasting: true },
  { id: 'draw-2025-08-01', date: '2025-08-01', lab: 'LabCorp',  scope: 'full',   fasting: true },
]

export const currentDrawDate = '2025-08-01'
export const priorDrawDate = '2025-05-02'
export const vendorSwitchDate = '2025-01-11'

export const vendorSwitch = {
  date: vendorSwitchDate,
  from: 'Quest Diagnostics', to: 'LabCorp',
  affected: ['lpa', 'free-testosterone', 'ferritin'],
  summary: 'Lp(a) went from mass units (mg/dL) to molar units (nmol/L); free testosterone went from equilibrium dialysis (pg/mL) to a calculated value (ng/dL); ferritin kept its unit but changed reference range.',
  trap: 'Read naively, Lp(a) "rose" 32 → 76 (+138%) across the switch. It did not move at all.',
}

// --- the analyte catalogue -------------------------------------------------
// base  = value at the first draw (2023-05-06), in CURRENT (LabCorp) units
// drift = change per year, linear
// cv    = within-person biological coefficient of variation (fraction)
// legacy = how the OLD vendor reported it: divide the current-unit value by
//          `factor` and use the old unit/range. This is what makes the vendor
//          switch a real discontinuity in the data rather than a note in prose.
const A = (key, code, name, unit, low, high, panel, base, drift, cv, dp, extra) =>
  ({ key, code, name, unit, low, high, panel, base, drift, cv, dp, ...extra })

export const ANALYTES = [
  // --- Lipids ---------------------------------------------------------------
  A('total-chol',    '2093-3',  'Total cholesterol',     'mg/dL', null, 200, 'Lipids', 181, 8.5, 0.05, 0),
  A('ldl',           '13457-7', 'LDL-C (calc)',          'mg/dL', null, 100, 'Lipids', 104, 10.5, 0.06, 0),
  A('hdl',           '2085-9',  'HDL-C',                 'mg/dL', 40, null, 'Lipids', 48, 1.8, 0.05, 0),
  A('trig',          '2571-8',  'Triglycerides',         'mg/dL', null, 150, 'Lipids', 92, -3.0, 0.16, 0),
  A('non-hdl',       '43396-1', 'Non-HDL cholesterol',   'mg/dL', null, 130, 'Lipids', 133, 7.0, 0.06, 0),
  A('apob',          '1884-6',  'ApoB',                  'mg/dL', null, 90,  'Lipids', 72, 10.3, 0.05, 0),
  A('apoa1',         '1869-7',  'ApoA-1',                'mg/dL', 120, null, 'Lipids', 148, 1.2, 0.05, 0),
  A('lpa',           '43583-4', 'Lp(a)',                 'nmol/L', null, 75, 'Lipids', 76, 0.4, 0.04, 0,
    { legacy: { unit: 'mg/dL', low: null, high: 30, factor: 2.4, dp: 0 },
      note: 'Genetically set; it does not meaningfully move. Any apparent change is an assay or unit change.' }),
  A('ldl-p',         '54434-9', 'LDL particle number',   'nmol/L', null, 1000, 'Lipids', 1080, 96, 0.07, 0),
  A('sdldl',         '90364-8', 'Small dense LDL-C',     'mg/dL', null, 30, 'Lipids', 24, 1.4, 0.10, 0),
  A('lppla2',        '43584-2', 'Lp-PLA2 activity',      'nmol/min/mL', null, 123, 'Lipids', 108, 3.4, 0.08, 0),

  // --- Comprehensive metabolic ---------------------------------------------
  A('glucose',       '2339-0',  'Fasting glucose',       'mg/dL', 70, 99, 'Comprehensive metabolic', 92, 1.6, 0.05, 0),
  A('bun',           '3094-0',  'BUN',                   'mg/dL', 7, 20, 'Comprehensive metabolic', 15, 0.3, 0.13, 0),
  A('creatinine',    '2160-0',  'Creatinine',            'mg/dL', 0.7, 1.3, 'Comprehensive metabolic', 1.01, 0.005, 0.06, 2),
  A('egfr',          '98979-8', 'eGFR (CKD-EPI 2021)',   'mL/min/1.73m²', 60, null, 'Comprehensive metabolic', 98, -0.9, 0.04, 0),
  A('sodium',        '2951-2',  'Sodium',                'mmol/L', 135, 145, 'Comprehensive metabolic', 140, 0, 0.01, 0),
  A('potassium',     '2823-3',  'Potassium',             'mmol/L', 3.5, 5.2, 'Comprehensive metabolic', 4.3, 0, 0.05, 1),
  A('chloride',      '2075-0',  'Chloride',              'mmol/L', 98, 107, 'Comprehensive metabolic', 102, 0, 0.02, 0),
  A('co2',           '2028-9',  'CO₂ (bicarbonate)',     'mmol/L', 20, 29, 'Comprehensive metabolic', 25, 0, 0.05, 0),
  A('calcium',       '17861-6', 'Calcium',               'mg/dL', 8.6, 10.3, 'Comprehensive metabolic', 9.5, 0, 0.02, 1),
  A('protein',       '2885-2',  'Total protein',         'g/dL', 6.0, 8.5, 'Comprehensive metabolic', 7.0, 0, 0.03, 1),
  A('albumin',       '1751-7',  'Albumin',               'g/dL', 3.8, 5.0, 'Comprehensive metabolic', 4.5, 0, 0.03, 1),
  A('bilirubin',     '1975-2',  'Bilirubin, total',      'mg/dL', 0.2, 1.2, 'Comprehensive metabolic', 0.7, 0.02, 0.22, 1),
  A('alp',           '6768-6',  'Alkaline phosphatase',  'U/L', 44, 121, 'Comprehensive metabolic', 68, -0.8, 0.08, 0),
  A('ast',           '1920-8',  'AST',                   'U/L', 10, 40, 'Comprehensive metabolic', 26, 0.4, 0.15, 0),
  A('alt',           '1742-6',  'ALT',                   'U/L', 9, 46, 'Comprehensive metabolic', 29, -1.1, 0.17, 0),
  A('ggt',           '2324-2',  'GGT',                   'U/L', 3, 60, 'Comprehensive metabolic', 24, -1.6, 0.14, 0),
  A('ldh',           '14804-9', 'LDH',                   'U/L', 122, 222, 'Comprehensive metabolic', 168, 1.0, 0.08, 0),
  A('ck',            '2157-6',  'Creatine kinase',       'U/L', 39, 308, 'Comprehensive metabolic', 148, 18, 0.35, 0,
    { note: 'Rises with training load — reads high after a hard block without meaning anything pathological.' }),

  // --- CBC with differential ------------------------------------------------
  A('wbc',           '6690-2',  'WBC',                   'K/µL', 3.4, 10.8, 'CBC w/ differential', 5.6, -0.1, 0.12, 1),
  A('rbc',           '789-8',   'RBC',                   'M/µL', 4.14, 5.80, 'CBC w/ differential', 5.02, 0.01, 0.03, 2),
  A('hgb',           '718-7',   'Hemoglobin',            'g/dL', 13.0, 17.7, 'CBC w/ differential', 15.2, 0.05, 0.03, 1),
  A('hct',           '4544-3',  'Hematocrit',            '%', 37.5, 51.0, 'CBC w/ differential', 45.1, 0.15, 0.03, 1),
  A('mcv',           '787-2',   'MCV',                   'fL', 79, 97, 'CBC w/ differential', 89, 0.2, 0.02, 0),
  A('mch',           '785-6',   'MCH',                   'pg', 26.6, 33.0, 'CBC w/ differential', 30.2, 0.05, 0.02, 1),
  A('mchc',          '786-4',   'MCHC',                  'g/dL', 31.5, 35.7, 'CBC w/ differential', 33.8, 0, 0.02, 1),
  A('rdw',           '788-0',   'RDW',                   '%', 11.6, 15.4, 'CBC w/ differential', 12.6, 0.05, 0.03, 1),
  A('platelets',     '777-3',   'Platelets',             'K/µL', 150, 450, 'CBC w/ differential', 232, -2, 0.08, 0),
  A('mpv',           '32623-1', 'Mean platelet volume',  'fL', 7.5, 12.5, 'CBC w/ differential', 9.8, 0, 0.05, 1),
  A('neut-pct',      '770-8',   'Neutrophils',           '%', 40, 75, 'CBC w/ differential', 54, -0.4, 0.10, 0),
  A('lymph-pct',     '736-9',   'Lymphocytes',           '%', 14, 46, 'CBC w/ differential', 33, 0.4, 0.11, 0),
  A('mono-pct',      '5905-5',  'Monocytes',             '%', 4, 13, 'CBC w/ differential', 8, 0, 0.13, 0),
  A('eos-pct',       '713-8',   'Eosinophils',           '%', 0, 7, 'CBC w/ differential', 3, 0, 0.28, 0),
  A('baso-pct',      '706-2',   'Basophils',             '%', 0, 3, 'CBC w/ differential', 1, 0, 0.30, 0),
  A('anc',           '751-8',   'Absolute neutrophils',  'K/µL', 1.4, 7.0, 'CBC w/ differential', 3.0, -0.05, 0.13, 1),
  A('alc',           '731-0',   'Absolute lymphocytes',  'K/µL', 0.7, 3.1, 'CBC w/ differential', 1.85, 0.02, 0.12, 2),

  // --- Heavy metals ---------------------------------------------------------
  A('mercury',       '5683-8',  'Mercury, blood',        'µg/L', null, 10, 'Heavy metals', 5.8, 3.75, 0.12, 1,
    { note: 'Blood mercury reflects recent intake (weeks), not lifetime body burden. Dominated by seafood.' }),
  A('lead',          '5671-3',  'Lead, blood',           'µg/dL', null, 3.5, 'Heavy metals', 1.6, 0.05, 0.14, 1),
  A('arsenic',       '5583-0',  'Arsenic, blood total',  'µg/L', null, 13, 'Heavy metals', 4.2, 1.1, 0.20, 1,
    { note: 'TOTAL arsenic — mostly non-toxic arsenobetaine from seafood. Speciation is the test that separates it from inorganic arsenic; it was not ordered.' }),
  A('cadmium',       '5609-3',  'Cadmium, blood',        'µg/L', null, 1.0, 'Heavy metals', 0.32, 0.02, 0.16, 2),
  A('aluminum',      '5575-6',  'Aluminum',              'µg/L', null, 10, 'Heavy metals', 3.1, 0.1, 0.22, 1),

  // --- Hormones -------------------------------------------------------------
  A('testosterone',  '2986-8',  'Testosterone, total',   'ng/dL', 264, 916, 'Hormones', 560, 36, 0.09, 0),
  A('free-testosterone', '2991-8', 'Testosterone, free', 'ng/dL', 6.6, 18.1, 'Hormones', 10.9, 0.7, 0.10, 1,
    { legacy: { unit: 'pg/mL', low: 46, high: 224, factor: 0.1, dp: 0 },
      note: 'Quest ran equilibrium dialysis (pg/mL); LabCorp reports a calculated free value (ng/dL). Different measurand, not just different units.' }),
  A('shbg',          '13967-5', 'SHBG',                  'nmol/L', 16.5, 55.9, 'Hormones', 38, 1.4, 0.09, 0),
  A('estradiol',     '2243-4',  'Estradiol',             'pg/mL', 8, 35, 'Hormones', 24, 0.5, 0.16, 0),
  A('dheas',         '2191-5',  'DHEA-S',                'µg/dL', 71, 375, 'Hormones', 218, -6, 0.10, 0),
  A('cortisol-am',   '2143-6',  'Cortisol, AM',          'µg/dL', 6.2, 19.4, 'Hormones', 14.1, 0.6, 0.20, 1),
  A('lh',            '10501-5', 'LH',                    'mIU/mL', 1.7, 8.6, 'Hormones', 4.2, 0.05, 0.16, 1),
  A('fsh',           '15067-2', 'FSH',                   'mIU/mL', 1.5, 12.4, 'Hormones', 4.6, 0.1, 0.14, 1),
  A('igf1',          '2484-4',  'IGF-1',                 'ng/mL', 63, 223, 'Hormones', 148, -2, 0.11, 0),
  A('prolactin',     '2842-3',  'Prolactin',             'ng/mL', 4.0, 15.2, 'Hormones', 8.4, 0, 0.18, 1),
  A('psa',           '2857-1',  'PSA, total',            'ng/mL', null, 4.0, 'Hormones', 0.82, 0.06, 0.14, 2),

  // --- Thyroid --------------------------------------------------------------
  A('tsh',           '3016-3',  'TSH',                   'µIU/mL', 0.45, 4.5, 'Thyroid', 2.0, 0.05, 0.19, 2),
  A('ft4',           '3024-7',  'Free T4',               'ng/dL', 0.82, 1.77, 'Thyroid', 1.19, 0.01, 0.07, 2),
  A('ft3',           '3051-0',  'Free T3',               'pg/mL', 2.0, 4.4, 'Thyroid', 3.14, -0.03, 0.09, 2),
  A('rt3',           '34090-8', 'Reverse T3',            'ng/dL', 9.2, 24.1, 'Thyroid', 17.2, 0.5, 0.13, 1),
  A('tpo-ab',        '8098-6',  'TPO antibodies',        'IU/mL', null, 9, 'Thyroid', 4, 0.4, 0.25, 0),
  A('tg-ab',         '8099-4',  'Thyroglobulin Ab',      'IU/mL', null, 1, 'Thyroid', 0.6, 0.02, 0.25, 1),

  // --- Inflammation ---------------------------------------------------------
  A('crp',           '1988-5',  'hs-CRP',                'mg/L', null, 1.0, 'Inflammation', 1.24, -0.18, 0.32, 1),
  A('il6',           '26881-3', 'IL-6',                  'pg/mL', null, 1.8, 'Inflammation', 1.32, -0.06, 0.28, 2),
  A('homocysteine',  '13965-9', 'Homocysteine',          'µmol/L', null, 10.4, 'Inflammation', 10.8, -0.5, 0.11, 1),
  A('fibrinogen',    '3255-7',  'Fibrinogen',            'mg/dL', 193, 507, 'Inflammation', 288, -4, 0.10, 0),
  A('ferritin',      '2276-4',  'Ferritin',              'ng/mL', 30, 400, 'Inflammation', 142, 12, 0.14, 0,
    { legacy: { unit: 'ng/mL', low: 20, high: 345, factor: 1, dp: 0 },
      note: 'Rising ferritin with an HFE compound heterozygote genotype is the one pattern here worth a repeat rather than a shrug.' }),
  A('esr',           '4537-7',  'ESR',                   'mm/h', null, 20, 'Inflammation', 7, -0.3, 0.30, 0),
  A('mpo',           '49541-6', 'Myeloperoxidase',       'pmol/L', null, 470, 'Inflammation', 214, 6, 0.18, 0),
  A('galectin3',     '82485-7', 'Galectin-3',            'ng/mL', null, 17.8, 'Inflammation', 11.2, 0.2, 0.12, 1),

  // --- Micronutrients -------------------------------------------------------
  A('vit-d',         '1989-3',  'Vitamin D, 25-OH',      'ng/mL', 30, 100, 'Micronutrients', 34, 2.4, 0.13, 0),
  A('b12',           '2132-9',  'Vitamin B12',           'pg/mL', 232, 1245, 'Micronutrients', 612, 24, 0.16, 0),
  A('folate-rbc',    '2286-3',  'Folate, RBC',           'ng/mL', 280, null, 'Micronutrients', 486, 12, 0.14, 0),
  A('mag-rbc',       '2593-2',  'Magnesium, RBC',        'mg/dL', 4.2, 6.8, 'Micronutrients', 5.1, 0.14, 0.07, 1),
  A('zinc',          '5763-8',  'Zinc',                  'µg/dL', 60, 130, 'Micronutrients', 88, 2, 0.10, 0),
  A('copper',        '2532-9',  'Copper',                'µg/dL', 70, 175, 'Micronutrients', 102, -1, 0.10, 0),
  A('selenium',      '5767-9',  'Selenium',              'µg/L', 63, 160, 'Micronutrients', 128, 6, 0.09, 0,
    { note: 'Tracks seafood intake alongside mercury — the two rise together.' }),
  A('omega3-index',  '91027-0', 'Omega-3 index',         '%', 8, null, 'Micronutrients', 6.4, 0.9, 0.07, 1),
  A('vit-a',         '2923-1',  'Vitamin A (retinol)',   'µg/dL', 32.5, 78.0, 'Micronutrients', 54, 0.5, 0.11, 1),
  A('vit-e',         '1823-4',  'Vitamin E (α-tocoph.)', 'mg/L', 5.5, 17.0, 'Micronutrients', 12.4, 0.2, 0.12, 1),
  A('vit-b6',        '2683-1',  'Vitamin B6',            'µg/L', 3.4, 65.2, 'Micronutrients', 18.2, 1.4, 0.22, 1),
  A('coq10',         '43138-7', 'Coenzyme Q10',          'µg/mL', 0.44, 1.64, 'Micronutrients', 0.92, 0.03, 0.15, 2),

  // --- Insulin & metabolic --------------------------------------------------
  A('hba1c',         '4548-4',  'HbA1c',                 '%', null, 5.7, 'Insulin & metabolic', 5.5, -0.03, 0.03, 1),
  A('insulin',       '20448-7', 'Insulin, fasting',      'µIU/mL', 2.6, 24.9, 'Insulin & metabolic', 6.4, -0.5, 0.19, 1),
  A('homa-ir',       'ayuos:homa-ir', 'HOMA-IR',         'index', null, 2.0, 'Insulin & metabolic', 1.45, -0.11, 0.20, 2,
    { derived: 'glucose × insulin / 405 — computed here, not reported by the lab.' }),
  A('uric-acid',     '3084-1',  'Uric acid',             'mg/dL', 3.7, 8.6, 'Insulin & metabolic', 6.0, 0.05, 0.08, 1),
  A('leptin',        '15066-4', 'Leptin',                'ng/mL', 0.5, 12.5, 'Insulin & metabolic', 4.8, -0.5, 0.22, 1),
  A('adiponectin',   '33952-0', 'Adiponectin',           'µg/mL', 4.0, 26.0, 'Insulin & metabolic', 9.4, 0.5, 0.15, 1),
  A('fructosamine',  '1558-6',  'Fructosamine',          'µmol/L', 205, 285, 'Insulin & metabolic', 232, -1.5, 0.06, 0),

  // --- Kidney, iron & cardiac ----------------------------------------------
  A('cystatin-c',    '33863-2', 'Cystatin C',            'mg/L', 0.53, 0.95, 'Kidney & iron', 0.82, 0.01, 0.06, 2),
  A('urine-acr',     '9318-7',  'Urine albumin/creat.',  'mg/g', null, 30, 'Kidney & iron', 7, 0.4, 0.32, 0),
  A('iron',          '2498-4',  'Iron, serum',           'µg/dL', 38, 169, 'Kidney & iron', 98, 2, 0.20, 0),
  A('tibc',          '2500-7',  'TIBC',                  'µg/dL', 250, 450, 'Kidney & iron', 318, -3, 0.08, 0),
  A('tsat',          '2502-3',  'Transferrin saturation','%', 15, 50, 'Kidney & iron', 30, 1.2, 0.18, 0),
  A('nt-probnp',     '33762-6', 'NT-proBNP',             'pg/mL', null, 125, 'Kidney & iron', 28, 1, 0.24, 0),
  A('hs-troponin',   '89579-7', 'hs-Troponin I',         'ng/L', null, 12, 'Kidney & iron', 2.4, 0.1, 0.26, 1),
]

export const analyteByKey = Object.fromEntries(ANALYTES.map(a => [a.key, a]))
export const analyteByCode = Object.fromEntries(ANALYTES.map(a => [a.code, a]))
export const PANELS = [...new Set(ANALYTES.map(a => a.panel))]

// The panels a 'basic' draw covers.
const BASIC_PANELS = ['Lipids', 'Comprehensive metabolic', 'CBC w/ differential']

// --- pinned headline values ------------------------------------------------
// Anything the copy quotes is fixed here. Generated values fill in around them,
// never over them, so a tweak to the noise model can't silently falsify a claim.
const PINS = {
  // Pinned at every draw: "ApoB has risen at every single draw for two years"
  // is a claim the answer makes, so the data must actually support it.
  'apob':          { '2025-08-01': 95, '2025-05-02': 88, '2025-01-11': 84, '2024-08-31': 83, '2024-05-25': 80, '2024-02-24': 78, '2023-11-18': 77, '2023-08-12': 74, '2023-05-06': 72 },
  'ldl':           { '2025-08-01': 128, '2025-05-02': 120 },
  'hdl':           { '2025-08-01': 52, '2025-05-02': 50 },
  'hba1c':         { '2025-08-01': 5.4, '2025-05-02': 5.5 },
  'glucose':       { '2025-08-01': 96, '2025-05-02': 94 },
  'crp':           { '2025-08-01': 0.8, '2025-05-02': 1.1 },
  'testosterone':  { '2025-08-01': 642, '2025-05-02': 610 },
  // Mercury crosses its 10 µg/L flag for the first time at the 2025-05 draw —
  // so "newly elevated, and still rising" is literally true of the series.
  'mercury':       { '2025-08-01': 14.2, '2025-05-02': 11.6, '2025-01-11': 9.8, '2024-08-31': 8.1, '2024-02-24': 7.2, '2023-11-18': 6.4, '2023-08-12': 6.1, '2023-05-06': 5.8 },
  'arsenic':       { '2025-08-01': 9.4, '2025-05-02': 8.1, '2025-01-11': 7.2, '2024-08-31': 6.0, '2023-05-06': 4.2 },
  'lead':          { '2025-08-01': 1.8 },
  'cadmium':       { '2025-08-01': 0.38 },
  // Lp(a) is pinned FLAT on purpose: the "+138%" a naive reader sees across the
  // vendor switch is entirely the mg/dL → nmol/L conversion, not biology.
  'lpa':           { '2025-08-01': 76, '2025-05-02': 78, '2025-01-11': 76, '2024-08-31': 77, '2023-05-06': 76 },
  'ferritin':      { '2025-08-01': 291, '2025-05-02': 268, '2025-01-11': 244, '2024-08-31': 206, '2023-05-06': 142 },
  'omega3-index':  { '2025-08-01': 9.6, '2025-05-02': 9.1 },
  'selenium':      { '2025-08-01': 168, '2025-05-02': 158 },
  'vit-d':         { '2025-08-01': 44 },
  'tsat':          { '2025-08-01': 46, '2025-05-02': 43 },
  'homocysteine':  { '2025-08-01': 9.6 },
  'insulin':       { '2025-08-01': 5.2 },
  'homa-ir':       { '2025-08-01': 1.23 },
  'uric-acid':     { '2025-08-01': 6.1 },
  'egfr':          { '2025-08-01': 96 },
  'creatinine':    { '2025-08-01': 1.02 },
  'ck':            { '2025-08-01': 284, '2025-05-02': 246 },
}

const YEAR = 365.25
const flagOf = (v, low, high) => (high != null && v > high ? 'high' : low != null && v < low ? 'low' : 'ok')

// Build every result row. Deterministic: the seed is (analyte key + draw date).
function buildResults() {
  const rows = []
  for (const draw of draws) {
    if (draw.scope === 'missed') continue
    const legacyEra = draw.date < vendorSwitchDate
    for (const a of ANALYTES) {
      if (draw.scope === 'basic' && !BASIC_PANELS.includes(a.panel)) continue
      const yrs = daysBetween(draws[0].date, draw.date) / YEAR
      const rand = mulberry32(seedFrom(a.key + draw.date))
      const trend = a.base + a.drift * yrs
      let value = round(trend * (1 + gauss(rand) * a.cv), a.dp)
      const pin = PINS[a.key]?.[draw.date]
      if (pin != null) value = pin

      // Vendor era: report in the old assay's units/ranges.
      const leg = legacyEra ? a.legacy : null
      const unit = leg ? leg.unit : a.unit
      const low = leg ? leg.low : a.low
      const high = leg ? leg.high : a.high
      const reported = leg ? round(value / leg.factor, leg.dp ?? a.dp) : value

      rows.push({
        // The most recent draw owns the canonical id, so every existing citation
        // (obs-apob, obs-hrv, …) keeps resolving to "the current value".
        id: draw.date === currentDrawDate ? `obs-${a.key}` : `obs-${a.key}-${draw.date}`,
        drawId: draw.id, key: a.key, code: a.code, name: a.name, panel: a.panel,
        value: reported, unit, low, high, flag: flagOf(reported, low, high),
        drawn: draw.date, lab: draw.lab,
        assayChanged: !!(a.legacy && draw.date === vendorSwitchDate) || undefined,
      })
    }
  }
  return rows
}

export const results = buildResults()

// Every value for one analyte, oldest → newest, with the unit it was reported in.
export function analyteSeries(key) {
  return results.filter(r => r.key === key).sort((a, b) => a.drawn.localeCompare(b.drawn))
}

// The results belonging to one draw.
export function drawResults(drawId) {
  return results.filter(r => r.drawId === drawId)
}

export const currentResults = results.filter(r => r.drawn === currentDrawDate)
export const priorResults = results.filter(r => r.drawn === priorDrawDate)

// Everything flagged out of range on the current draw — the shortlist any
// "what changed" retrieval starts from.
export const currentAbnormal = currentResults.filter(r => r.flag !== 'ok')

// --- back-compat: the seven headline analytes ------------------------------
// The original `labs` export. Every view that already reads it (Share, the
// doctor packet, fhir.js) keeps working unchanged; it is now a *view* onto the
// full set rather than the whole dataset.
const HEADLINE = ['apob', 'hdl', 'ldl', 'hba1c', 'glucose', 'crp', 'testosterone']
const PANEL_LABEL = {
  Lipids: 'Lipid panel', 'Comprehensive metabolic': 'Metabolic',
  'Insulin & metabolic': 'Metabolic', Inflammation: 'Inflammation', Hormones: 'Hormone',
}

export const labs = HEADLINE.map(key => {
  const cur = currentResults.find(r => r.key === key)
  const prev = priorResults.find(r => r.key === key)
  return { ...cur, prior: prev?.value ?? null, panel: PANEL_LABEL[cur.panel] || cur.panel }
})

// The full current panel, in the same shape, for anything that wants all of it.
export const currentPanel = currentResults.map(r => ({
  ...r, prior: priorResults.find(p => p.key === r.key)?.value ?? null,
}))

// --- summary stats used by the store counter and the context builder --------
export const labStats = {
  draws: draws.filter(d => d.scope !== 'missed').length,
  missedDraws: draws.filter(d => d.scope === 'missed').length,
  analytes: ANALYTES.length,
  results: results.length,
  span: `${draws[0].date} → ${currentDrawDate}`,
  months: Math.round(daysBetween(draws[0].date, currentDrawDate) / 30.44),
  abnormalNow: currentAbnormal.length,
}
