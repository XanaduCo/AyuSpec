// Sharing — a "sliver" is a scoped, purpose-built, consent-controlled view of
// the record (sharing.md). The default posture is minimal disclosure and, in the
// self-hosted default, a sliver is a FILE the user transmits themselves — no
// outbound network call. Only the hosted share-link transits ayuOS Cloud, so it
// alone is amber, opt-in, and cloud-tier. Both paths produce the same content;
// the link buys delivery + revocability, never a richer export (tiers.md).
//
// The inventory below is derived from the persona so the preview never disagrees
// with what the packet renders — the same coherence rule as the rest of the demo.

import {
  currentPanel, conditions, medications, imaging, wearables, genomics,
  familyHistory, persona, anchor, addDays, daysBetween,
} from './persona.js'

// --- the shareable inventory, tagged on four axes the composer filters by -----
// domain · source · FHIR resource type · date. Every item points back at a
// stored record id so "preview exactly what's included" is literal.
function inv(id, label, domain, source, type, date, detail) {
  return { id, label, domain, source, type, date, detail }
}

export const inventory = [
  // labs
  inv('obs-apob', 'ApoB', 'cardiac', 'labs', 'Observation', '2025-08-01', '95 mg/dL · above target'),
  inv('obs-ldl', 'LDL-C (calc)', 'cardiac', 'labs', 'Observation', '2025-08-01', '128 mg/dL · above target'),
  inv('obs-hdl', 'HDL-C', 'cardiac', 'labs', 'Observation', '2025-08-01', '52 mg/dL'),
  inv('obs-hba1c', 'HbA1c', 'metabolic', 'labs', 'Observation', '2025-08-01', '5.4%'),
  inv('obs-glucose', 'Fasting glucose', 'metabolic', 'labs', 'Observation', '2025-08-01', '96 mg/dL'),
  inv('obs-crp', 'hs-CRP', 'cardiac', 'labs', 'Observation', '2025-08-01', '0.8 mg/L'),
  inv('obs-testosterone', 'Testosterone', 'hormone', 'labs', 'Observation', '2025-08-01', '642 ng/dL'),
  // wearables
  inv('obs-hrv', 'HRV (SDNN)', 'cardiac', 'wearables', 'Observation', anchor, '42 ms · 90-day trend'),
  inv('obs-rhr', 'Resting HR', 'cardiac', 'wearables', 'Observation', anchor, '54 bpm'),
  inv('obs-vo2max', 'VO₂max (est.)', 'cardiac', 'wearables', 'Observation', anchor, '52 mL/kg/min'),
  inv('obs-sleep', 'Sleep duration', 'sleep', 'wearables', 'Observation', anchor, '7.1 h'),
  // conditions + meds
  inv('cond-htn', 'Essential hypertension', 'cardiac', 'notes', 'Condition', '2022-03-15', 'controlled'),
  inv('med-lisinopril', 'Lisinopril 10 mg', 'cardiac', 'notes', 'MedicationStatement', '2022-04-01', 'once daily'),
  // imaging
  inv('img-cac', 'Coronary calcium CT', 'cardiac', 'imaging', 'ImagingStudy', '2024-11-09', 'Agatston 0'),
  inv('img-brain-mri', 'Brain MRI', 'neuro', 'imaging', 'ImagingStudy', '2025-02-18', 'unremarkable'),
  // genomics
  inv('gen-apoe', 'APOE ε3/ε3', 'neuro', 'genomics', 'MolecularSequence', '2025-03-22', 'not an ε4 carrier'),
  inv('gen-prs', 'CVD polygenic score', 'cardiac', 'genomics', 'MolecularSequence', '2025-03-22', '70th pct'),

  // --- everything the deeper store added --------------------------------------
  // The inventory is what a sliver can contain, so it has to keep pace with the
  // record. A composer that cannot offer the mercury result is a composer that
  // silently narrows what a clinician gets to see.
  inv('obs-mercury', 'Mercury, blood', 'toxicology', 'labs', 'Observation', '2025-08-01', '14.2 µg/L · above reference'),
  inv('obs-arsenic', 'Arsenic, blood total', 'toxicology', 'labs', 'Observation', '2025-08-01', '9.4 µg/L · speciation not ordered'),
  inv('obs-lead', 'Lead, blood', 'toxicology', 'labs', 'Observation', '2025-08-01', '1.8 µg/dL · in range'),
  inv('obs-cadmium', 'Cadmium, blood', 'toxicology', 'labs', 'Observation', '2025-08-01', '0.38 µg/L · in range'),
  inv('obs-lpa', 'Lp(a)', 'cardiac', 'labs', 'Observation', '2025-08-01', '76 nmol/L · above target'),
  inv('obs-ferritin', 'Ferritin', 'metabolic', 'labs', 'Observation', '2025-08-01', '291 ng/mL · rising, in range'),
  inv('obs-tsat', 'Transferrin saturation', 'metabolic', 'labs', 'Observation', '2025-08-01', '46%'),
  inv('obs-tsh', 'TSH', 'hormone', 'labs', 'Observation', '2025-08-01', 'in range'),
  inv('obs-vit-d', 'Vitamin D, 25-OH', 'metabolic', 'labs', 'Observation', '2025-08-01', '44 ng/mL'),
  inv('obs-omega3-index', 'Omega-3 index', 'nutrition', 'labs', 'Observation', '2025-08-01', '9.6%'),
  inv('lab-vendor-switch', 'Lab vendor switch note', 'metabolic', 'labs', 'Basic', '2025-01-11', 'Quest → LabCorp · units changed'),
  inv('draw-2024-11-16', 'Panel ordered, never drawn', 'metabolic', 'labs', 'Basic', '2024-11-16', 'gap in the quarterly cadence'),

  inv('dexa-2025-07-19', 'DEXA body composition', 'fitness', 'tests', 'DiagnosticReport', '2025-07-19', '17.8% fat · VAT 0.58 kg'),
  inv('vo2-2025-06-14', 'VO₂max — metabolic cart', 'fitness', 'tests', 'DiagnosticReport', '2025-06-14', '47.8 mL/kg/min · measured'),
  inv('vo2-discrepancy', 'VO₂max measured vs. estimated', 'fitness', 'tests', 'Basic', '2025-06-14', '47.8 cart vs 52.0 wearable'),
  inv('func-2025-07-02', 'Functional capacity battery', 'fitness', 'tests', 'DiagnosticReport', '2025-07-02', 'grip 51.2 kg · FMS 17'),
  inv('clock-2025-06-11', 'Epigenetic age panel', 'ageing', 'tests', 'DiagnosticReport', '2025-06-11', 'DunedinPACE 0.94'),
  inv('clock-disagreement', 'Clock reliability analysis', 'ageing', 'tests', 'Basic', '2025-06-11', '3 of 6 movements readable'),

  inv('scr-galleri', 'Galleri MCED', 'screening', 'screening', 'DiagnosticReport', '2025-04-28', 'no signal · caveats attached'),
  inv('scr-colonoscopy', 'Screening colonoscopy', 'screening', 'screening', 'DiagnosticReport', '2023-09-14', 'normal · next 2033'),
  inv('scr-sleep-study', 'Home sleep apnoea test', 'sleep', 'screening', 'DiagnosticReport', '2024-10-02', 'AHI 3.1 · no OSA'),

  inv('block-summary', 'Aerobic block — weekly load', 'fitness', 'activity', 'Basic', '2025-06-15', '290 activities aggregated'),
  inv('cgm-summary', 'CGM baseline vs. protocol', 'metabolic', 'wearables', 'Basic', anchor, 'peak 144 → 128 mg/dL'),
  inv('sleep-summary', 'Sleep architecture summary', 'sleep', 'wearables', 'Basic', anchor, 'REM 96 → 89 min'),
  inv('nutr-seafood-trend', 'Seafood intake trend', 'nutrition', 'nutrition', 'Basic', anchor, '3.2 → 7.8 servings/week'),

  inv('gen-lpa', 'LPA rs3798220 carrier', 'cardiac', 'genomics', 'MolecularSequence', '2025-03-22', 'explains the elevated Lp(a)'),
  inv('gen-hfe', 'HFE C282Y/H63D', 'metabolic', 'genomics', 'MolecularSequence', '2025-03-22', 'compound heterozygote'),
  inv('pgx-slco1b1', 'SLCO1B1 *1/*5', 'cardiac', 'genomics', 'MolecularSequence', '2025-03-22', 'statin myopathy risk · CPIC'),
  inv('gen-ldlr', 'FH panel — negative', 'cardiac', 'genomics', 'MolecularSequence', '2025-03-22', 'not monogenic'),

  inv('fh-mother-t2d', 'Mother — type 2 diabetes @ 58', 'metabolic', 'notes', 'FamilyMemberHistory', '2022-03-15', 'family history'),
  inv('fh-father-cad', 'Father — CAD @ 62', 'cardiac', 'notes', 'FamilyMemberHistory', '2022-03-15', 'family history'),
]

export const DOMAINS = [
  { key: 'cardiac', label: 'Cardiac' },
  { key: 'metabolic', label: 'Metabolic' },
  { key: 'toxicology', label: 'Toxicology' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'ageing', label: 'Ageing' },
  { key: 'screening', label: 'Screening' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'neuro', label: 'Neuro' },
  { key: 'hormone', label: 'Hormone' },
]
export const SOURCES = [
  { key: 'labs', label: 'Labs' },
  { key: 'wearables', label: 'Wearables' },
  { key: 'activity', label: 'Activity' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'tests', label: 'Third-party tests' },
  { key: 'screening', label: 'Screening' },
  { key: 'notes', label: 'Clinical notes' },
  { key: 'imaging', label: 'Imaging' },
  { key: 'genomics', label: 'Genomics' },
]
export const RTYPES = [
  { key: 'Observation', label: 'Observation' },
  { key: 'DiagnosticReport', label: 'DiagnosticReport' },
  { key: 'Condition', label: 'Condition' },
  { key: 'MedicationStatement', label: 'Medication' },
  { key: 'ImagingStudy', label: 'ImagingStudy' },
  { key: 'MolecularSequence', label: 'MolecularSequence' },
  { key: 'FamilyMemberHistory', label: 'FamilyMemberHistory' },
  { key: 'Basic', label: 'ayuOS object' },
]
export const WINDOWS = [
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: '12m', label: 'Last 12 months', days: 365 },
  { key: 'all', label: 'All time', days: null },
]

export const FORMATS = [
  { key: 'packet', label: 'Doctor packet', sub: 'PDF · rendered brief', egress: false,
    note: 'Generated locally as a PDF. ayuOS makes no network call — you transmit the file yourself.' },
  { key: 'bundle', label: 'FHIR bundle', sub: 'JSON · importable', egress: false,
    note: 'A FHIR R4 Bundle another system can import. A local file — no egress.' },
  { key: 'summary', label: 'Structured summary', sub: 'Markdown brief', egress: false,
    note: 'A human-readable Markdown/PDF summary. A local file — no egress.' },
  { key: 'link', label: 'Hosted share link', sub: 'cloud tier · revocable', egress: true,
    note: 'A recipient fetches the sliver from an ayuOS-operated endpoint. This necessarily transits ayuOS Cloud — opt-in, disclosed, cloud-tier only. It is the only revocable format.' },
]

// Resource types that describe an ONGOING state rather than a point-in-time
// event. Their `date` is an onset/start, but they remain current — so a time
// window must not filter them out (a cardiologist needs the active hypertension
// and its medication even if they started years before the window). This mirrors
// FHIR: a Condition/MedicationStatement with an active status is current
// regardless of onset date.
const ONGOING = new Set(['Condition', 'MedicationStatement'])

// Filter the inventory by the composer's scope. Each dimension is a Set; an empty
// Set means "all" (the user has narrowed nothing). The window is measured from the
// persona's fixed `anchor` and applies only to point-in-time resources.
export function selectScope({ domains, sources, types, window }) {
  const w = WINDOWS.find(x => x.key === window)
  const start = w.days == null ? null : addDays(anchor, -w.days)
  return inventory.filter(i =>
    (!domains.size || domains.has(i.domain)) &&
    (!sources.size || sources.has(i.source)) &&
    (!types.size || types.has(i.type)) &&
    (start == null || ONGOING.has(i.type) || daysBetween(start, i.date) >= 0),
  )
}

// Build the doctor-packet sections from a selected set (sharing.md / frontend
// doctor-packet). Everything is derived from the persona so it matches the record.
export function buildPacket(items) {
  const ids = new Set(items.map(i => i.id))
  // The full current panel, so a sliver that scopes in mercury or Lp(a)
  // actually renders it. Selecting from a deeper store and then printing the
  // seven original analytes would be a silent narrowing.
  const inLabs = currentPanel.filter(l => ids.has(l.id))
  const inMeds = medications.filter(m => ids.has(m.id))
  const inConds = conditions.filter(c => ids.has(c.id))
  const inImaging = imaging.filter(s => ids.has(s.id))

  // Notable changes: flagged abnormals + the clearest wearable move in scope.
  const notable = []
  for (const l of inLabs) {
    if (l.flag === 'high') notable.push(`${l.name} ${l.value} ${l.unit} — above target${l.prior != null ? ` (was ${l.prior})` : ''}.`)
  }
  if (ids.has('obs-hrv')) notable.push('HRV down ~4 ms over 90 days (46 → 42) — worth watching alongside the lipid picture.')
  if (ids.has('img-cac')) notable.push('Coronary calcium score 0 (2024) — no detectable calcification despite the ApoB/PRS risk.')

  const questions = []
  if (ids.has('obs-apob')) questions.push('ApoB is above target with a strong family history (father, CAD at 62) and a 70th-pct CVD PRS — does the CAC-0 change how aggressively we treat?')
  if (ids.has('obs-ldl') && ids.has('obs-apob')) questions.push('LDL-C and ApoB disagree slightly on risk — which should we track to target?')
  if (inMeds.length) questions.push('Blood pressure has been controlled on lisinopril 10 mg — stay the course or re-check?')
  if (!questions.length) questions.push('Is anything in this scope worth a follow-up test or referral?')

  return {
    patient: `${persona.name}, ${persona.age}`,
    generated: anchor,
    counts: { labs: inLabs.length, meds: inMeds.length, conds: inConds.length, imaging: inImaging.length },
    summary: `${persona.name}, ${persona.age}, self-tracked record. In-scope highlights: ${notable.length ? notable.length + ' notable finding(s)' : 'no flagged abnormals'}, ${inLabs.length} lab value(s), ${inConds.length} condition(s), ${inMeds.length} medication(s).`,
    notable,
    labs: inLabs.map(l => ({ name: l.name, value: l.value, unit: l.unit, range: rangeText(l), flag: l.flag })),
    meds: inMeds.map(m => `${m.name} ${m.dose} ${m.freq} — for ${m.for}`),
    conds: inConds.map(c => `${c.name} (${c.status}, since ${c.onset})`),
    family: familyHistory.map(f => `${f.relation}: ${f.condition} at ${f.age}`),
    imaging: inImaging.map(s => `${s.study} (${s.date}) — ${s.aiSummary.split('.')[0]}.`),
    questions,
  }
}

function rangeText(l) {
  if (l.low != null && l.high != null) return `${l.low}–${l.high}`
  if (l.high != null) return `< ${l.high}`
  if (l.low != null) return `> ${l.low}`
  return '—'
}

// Seed consent log — one past share. Append-only; file-based shares carry an
// honest note that they cannot be un-shared. Newest first.
export const seedConsentLog = [
  {
    id: 'shr-cardio-2025-05',
    created: '2025-05-06 14:20',
    purpose: 'Cardiology consult — lipid management',
    recipient: 'Dr. A. Rao, Marin Cardiology',
    scope: 'Cardiac domain · labs + wearables + imaging · last 12 months',
    count: 9,
    format: 'packet',
    egress: false,
    expiry: null,
    revoked: false,
  },
]

export { addDays }
