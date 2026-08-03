// Resolve a stored-record id to a FHIR-shaped resource for the source drawer.
// FHIR is ayuOS's boundary format (ADR-0002: the store is Postgres, not a FHIR
// server), so these are the shapes a record *would* export as — enough to make
// "click a citation → see the underlying record" feel real. Built from persona
// data so the drawer never disagrees with the chart.

import {
  labs, wearables, conditions, medications, imaging, persona,
  activeHypothesis, priorLabDate, genomics,
} from './persona.js'
import { experiments } from './experiments.js'

const subject = { reference: 'Patient/ravi-mehta', display: persona.name }

function labObservation(l) {
  const interp = l.flag === 'high'
    ? [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'H', display: 'High' }] }]
    : [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'N', display: 'Normal' }] }]
  const ref = []
  if (l.low != null) ref.push({ low: { value: l.low, unit: l.unit } })
  if (l.high != null) ref.push({ high: { value: l.high, unit: l.unit } })
  return {
    resourceType: 'Observation',
    id: l.id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: l.code, display: l.name }], text: l.name },
    subject,
    effectiveDateTime: l.drawn,
    performer: [{ display: l.lab }],
    valueQuantity: { value: l.value, unit: l.unit, system: 'http://unitsofmeasure.org' },
    interpretation: interp,
    referenceRange: ref.length ? ref : undefined,
  }
}

function priorLabObservation(l) {
  return {
    resourceType: 'Observation',
    id: `${l.id}-prior`,
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: l.code, display: l.name }], text: l.name },
    subject,
    effectiveDateTime: priorLabDate,
    performer: [{ display: l.lab }],
    valueQuantity: { value: l.prior, unit: l.unit, system: 'http://unitsofmeasure.org' },
  }
}

function wearableObservation(m) {
  return {
    resourceType: 'Observation',
    id: m.id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'activity' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: m.code, display: m.name }], text: m.name },
    subject,
    device: { display: `${m.source} (Open Wearables · zero-transit)` },
    effectivePeriod: { start: m.daily[0].date, end: m.daily[m.daily.length - 1].date },
    valueQuantity: { value: m.current, unit: m.unit },
    note: [{ text: `90-day summary. Baseline ${m.baseline} ${m.unit} → current ${m.current} ${m.unit}. Full daily series held in the timeseries schema (${m.daily.length} points), not as individual FHIR Observations.` }],
  }
}

function conditionResource(c) {
  return {
    resourceType: 'Condition',
    id: c.id,
    clinicalStatus: { coding: [{ code: c.status === 'controlled' ? 'active' : c.status }] },
    verificationStatus: { coding: [{ code: 'confirmed' }] },
    code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: c.code, display: c.name }], text: c.name },
    subject,
    onsetDateTime: c.onsetDate,
    note: [{ text: `Status: ${c.status}.` }],
  }
}

function medicationResource(m) {
  return {
    resourceType: 'MedicationStatement',
    id: m.id,
    status: 'active',
    medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: m.code, display: m.name }], text: m.name },
    subject,
    effectiveDateTime: m.since,
    dosage: [{ text: `${m.dose} ${m.freq}`, reason: m.for }],
  }
}

function imagingResource(s) {
  return {
    resourceType: 'ImagingStudy',
    id: s.id,
    status: 'available',
    subject,
    started: s.date,
    modality: [{ code: s.modality }],
    numberOfSeries: s.series.length,
    numberOfInstances: s.instances,
    series: s.series.map((name, i) => ({ uid: `1.2.840.${s.id}.${i}`, description: name })),
    // The AI impression is a DocumentReference in the store; surfaced inline here.
    _impression: { by: 'MedGemma 4B (local)', text: s.aiSummary },
  }
}

// Panels bundle several observations drawn on the same day.
function panelBundle(id, title, drawn, obs) {
  return {
    resourceType: 'Bundle',
    id,
    type: 'collection',
    timestamp: drawn,
    entry: obs.map(o => ({ resource: o })),
  }
}

// id -> { title, subtitle, tier, fhir }
export function resolveRecord(id) {
  if (!id) return null

  const lab = labs.find(l => l.id === id)
  if (lab) return wrap(lab.name, `Observation · drawn ${lab.drawn} · ${lab.lab}`, labObservation(lab))

  const wear = wearables.find(m => m.id === id)
  if (wear) return wrap(wear.name, `Observation · ${wear.source} · 90-day summary`, wearableObservation(wear))

  const cond = conditions.find(c => c.id === id)
  if (cond) return wrap(cond.name, `Condition · since ${cond.onset}`, conditionResource(cond))

  const med = medications.find(m => m.id === id)
  if (med) return wrap(med.name, `MedicationStatement · since ${med.since}`, medicationResource(med))

  const img = imaging.find(s => s.id === id)
  if (img) return wrap(img.study, `ImagingStudy · ${img.modality} · ${img.date}`, imagingResource(img), img.aiSummary)

  if (id === 'panel-lipid-2025-08') {
    return wrap('Lipid + metabolic panel', 'Bundle · drawn 2025-08-01 · LabCorp',
      panelBundle(id, 'panel', '2025-08-01', labs.map(labObservation)))
  }
  if (id === 'panel-lipid-2025-05') {
    return wrap('Prior lipid + metabolic panel', 'Bundle · drawn 2025-05-02 · LabCorp',
      panelBundle(id, 'panel-prior', priorLabDate, labs.map(priorLabObservation)))
  }
  if (id === 'gen-apoe') {
    const v = genomics.variants[0]
    return wrap('APOE genotype', `MolecularSequence · ${genomics.source}`, {
      resourceType: 'MolecularSequence',
      id: 'gen-apoe',
      subject,
      type: 'dna',
      // ayuOS excludes genomic data from cloud models and shares by default; the
      // user can opt in per call or per share, warned that a genome is identifiable.
      variant: [{ gene: v.gene, genotype: v.genotype, rsid: v.rsid }],
      note: [{ text: `${v.note} Genomic data is excluded from cloud models by default; sending it requires an explicit opt-in, with an identifiability warning.` }],
    })
  }
  if (id === 'gen-prs') {
    const p = genomics.prs[0]
    return wrap('CVD polygenic risk score', `MolecularSequence · derived · ${genomics.source}`, {
      resourceType: 'MolecularSequence',
      id: 'gen-prs',
      subject,
      type: 'dna',
      polygenicScore: { trait: p.trait, percentile: p.percentile, ancestry: p.ancestry },
      note: [{ text: p.caveat }],
    })
  }

  const exp = experiments.find(e => e.id === id)
  if (exp) {
    return wrap(exp.hypothesis.statement.replace(/\.$/, ''), `ayuos.experiment · ${exp.status}`,
      {
        resourceType: 'Basic', // an ayuOS app object (ayuos schema), not core FHIR
        id: exp.id,
        code: { text: 'n-of-1 experiment' },
        subject,
        goal: exp.goal,
        hypothesis: exp.hypothesis.statement,
        rationale: exp.hypothesis.rationale,
        evidence_strength: exp.hypothesis.evidence,
        confidence: exp.hypothesis.confidence,
        design: exp.design,
        status: exp.status,
        started: exp.started,
        ended: exp.ended,
        success_criterion: exp.successCriterion,
        metrics: exp.metrics.map(m => `${m.name} (${m.unit}) · ${m.source}`),
        baseline: `mean ${exp.baseline.stats.mean.toFixed(1)} ±${exp.baseline.stats.sd.toFixed(1)} ${exp.baseline.unit} (n=${exp.baseline.stats.n})`,
        result: exp.status === 'running' ? undefined : exp.verdict,
        effect_size_d: exp.effectD != null ? Number(exp.effectD.toFixed(2)) : undefined,
      })
  }
  return null
}

function wrap(title, subtitle, fhir, impression) {
  return { id: fhir.id, title, subtitle, fhir, impression }
}
