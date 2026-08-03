// Resolve a stored-record id to a FHIR-shaped resource for the source drawer.
// FHIR is ayuOS's boundary format (ADR-0002: the store is Postgres, not a FHIR
// server), so these are the shapes a record *would* export as — enough to make
// "click a citation → see the underlying record" feel real. Built from persona
// data so the drawer never disagrees with the chart.
//
// Several of the newer record types have no good core-FHIR shape (DEXA regional
// breakdowns, epigenetic clocks, a Garmin activity, an n-of-1 experiment). Those
// export as `Basic` / `Observation` with an `ayuos` extension rather than being
// tortured into a profile that doesn't fit — which is precisely the argument in
// ADR-0002 for owning the store instead of running a FHIR server.

import {
  labs, wearables, conditions, medications, imaging, persona,
  activeHypothesis, priorLabDate, genomics, currentLabDate,
  labDraws, drawResults, labResults, analyteSeries, vendorSwitch,
  dexaScans, vo2maxTests, vo2Discrepancy, functionalTests, bpSummary,
  clockTests, clockTrends, clockDisagreement, telomereTrend,
  activities, trainingBlock, blockSummary, weeklyLoad,
  screenings, seafoodTrend, nutritionStats, nutritionCoverage,
  cgmSummary, cgmTraces, cgmExcursions, sleepSummary, storeStats,
  pharmacogenomics, carrierStatus, wgs, familyHistory,
} from './persona.js'
import { experiments } from './experiments.js'

const subject = { reference: 'Patient/ravi-mehta', display: persona.name }

function labObservation(l) {
  const code = l.flag === 'high' ? ['H', 'High'] : l.flag === 'low' ? ['L', 'Low'] : ['N', 'Normal']
  const interp = [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: code[0], display: code[1] }] }]
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
    _history: analyteSeries(l.key).map(r => `${r.drawn}  ${r.value} ${r.unit}${r.lab === 'Quest' ? '  (Quest)' : ''}`),
    _assayNote: vendorSwitch.affected.includes(l.key)
      ? `Assay/units changed at the ${vendorSwitch.date} vendor switch (${vendorSwitch.from} → ${vendorSwitch.to}). Values before that date are not directly comparable.`
      : undefined,
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
    note: [{ text: `Status: ${c.status}. Home cuff mean over the last 90 days: ${bpSummary.meanSystolic90}/${bpSummary.meanDiastolic90} mmHg across ${bpSummary.n90} readings (${bpSummary.pctAtGoal90}% at goal).` }],
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
    _source: m.otc ? 'Self-reported OTC — not on the Epic medication list.' : 'Epic · SMART-on-FHIR',
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
    _exclusion: 'Pixel data is a HARD exclusion — never sent to a cloud model under any setting. Only this extracted impression can leave.',
  }
}

// Panels bundle several observations drawn on the same day.
function panelBundle(id, drawn, obs) {
  return {
    resourceType: 'Bundle',
    id,
    type: 'collection',
    timestamp: drawn,
    total: obs.length,
    entry: obs.map(o => ({ resource: o })),
  }
}

// id -> { title, subtitle, tier, fhir }
export function resolveRecord(id) {
  if (!id) return null

  // Any lab result — current draw ids are canonical (`obs-apob`), historic ones
  // carry their draw date (`obs-apob-2024-02-24`).
  const lab = labResults.find(l => l.id === id)
  if (lab) return wrap(lab.name, `Observation · drawn ${lab.drawn} · ${lab.lab}`, labObservation(lab))

  const wear = wearables.find(m => m.id === id)
  if (wear) return wrap(wear.name, `Observation · ${wear.source} · 90-day summary`, wearableObservation(wear))

  const cond = conditions.find(c => c.id === id)
  if (cond) return wrap(cond.name, `Condition · since ${cond.onset}`, conditionResource(cond))

  const med = medications.find(m => m.id === id)
  if (med) return wrap(med.name, `MedicationStatement · since ${med.since}`, medicationResource(med))

  const img = imaging.find(s => s.id === id)
  if (img) return wrap(img.study, `ImagingStudy · ${img.modality} · ${img.date}`, imagingResource(img), img.aiSummary)

  // --- lab draws (whole panels) ---------------------------------------------
  const draw = labDraws.find(d => d.id === id)
  if (draw) {
    if (draw.scope === 'missed') {
      return wrap('Panel ordered — never drawn', `ServiceRequest · ${draw.date} · ${draw.lab}`, {
        resourceType: 'ServiceRequest', id: draw.id, status: 'revoked', intent: 'order',
        subject, occurrenceDateTime: draw.date,
        code: { text: 'Comprehensive quarterly panel' },
        note: [{ text: draw.note }],
        _whyItMatters: 'The store keeps the hole. A trend computed across this date has a 5-month gap in it, and the answer should say so rather than interpolate.',
      })
    }
    const rows = drawResults(draw.id)
    return wrap(
      draw.scope === 'basic' ? 'Basic panel (travelling)' : 'Full quarterly panel',
      `Bundle · ${rows.length} results · drawn ${draw.date} · ${draw.lab}`,
      panelBundle(draw.id, draw.date, rows.map(labObservation)))
  }

  // Legacy panel aliases kept so existing citations in agent.js keep resolving.
  if (id === 'panel-lipid-2025-08') {
    const rows = drawResults('draw-2025-08-01')
    return wrap('Full quarterly panel', `Bundle · ${rows.length} results · drawn ${currentLabDate} · LabCorp`,
      panelBundle(id, currentLabDate, rows.map(labObservation)))
  }
  if (id === 'panel-lipid-2025-05') {
    return wrap('Prior quarterly panel', `Bundle · drawn ${priorLabDate} · LabCorp`,
      panelBundle(id, priorLabDate, labs.map(priorLabObservation)))
  }
  if (id === 'lab-vendor-switch') {
    return wrap('Lab vendor switch', `ayuos.provenance · ${vendorSwitch.date}`, {
      resourceType: 'Basic', id: 'lab-vendor-switch', code: { text: 'assay/unit discontinuity' }, subject,
      date: vendorSwitch.date, from: vendorSwitch.from, to: vendorSwitch.to,
      affected_analytes: vendorSwitch.affected,
      summary: vendorSwitch.summary,
      trap: vendorSwitch.trap,
    })
  }

  // --- genomics -------------------------------------------------------------
  const variant = genomics.variants.find(v => v.id === id)
  if (variant) {
    return wrap(`${variant.gene} ${variant.genotype}`, `MolecularSequence · ${genomics.source}`, {
      resourceType: 'MolecularSequence', id: variant.id, subject, type: 'dna',
      variant: [{ gene: variant.gene, genotype: variant.genotype, rsid: variant.rsid }],
      _category: variant.category,
      note: [{ text: `${variant.note} Genomic data is excluded from cloud models by default; sending it requires an explicit opt-in, with an identifiability warning.` }],
    })
  }
  const score = genomics.prs.find(p => p.id === id)
  if (score) {
    return wrap(`${score.trait} PRS`, `MolecularSequence · derived · ${genomics.source}`, {
      resourceType: 'MolecularSequence', id: score.id, subject, type: 'dna',
      polygenicScore: { trait: score.trait, percentile: score.percentile, ancestry: score.ancestry },
      note: [{ text: score.caveat }, ...(score.note ? [{ text: score.note }] : [])],
    })
  }
  const pgx = pharmacogenomics.find(p => p.id === id)
  if (pgx) {
    return wrap(`${pgx.gene} ${pgx.diplotype}`, `MolecularSequence · pharmacogenomic · ${pgx.phenotype}`, {
      resourceType: 'MolecularSequence', id: pgx.id, subject, type: 'dna',
      gene: pgx.gene, diplotype: pgx.diplotype, phenotype: pgx.phenotype,
      impact: pgx.impact, affected_drugs: pgx.drugs,
      guidance: pgx.guidance,
      note: [{ text: 'Pharmacogenomic results are genomic data: default-excluded from cloud calls. This one changes a prescribing decision, so it is worth deliberately including when the question is about drugs.' }],
    })
  }
  const carrier = carrierStatus.find(c => c.id === id)
  if (carrier) {
    return wrap(`${carrier.gene} — ${carrier.status}`, `MolecularSequence · carrier screen`, {
      resourceType: 'MolecularSequence', id: carrier.id, subject, type: 'dna',
      gene: carrier.gene, variant: carrier.variant, status: carrier.status, condition: carrier.condition,
      note: [{ text: carrier.note || 'Carrier screening result. No personal health implication.' }],
    })
  }
  if (id === 'gen-wgs') {
    return wrap('Whole genome sequence (30×)', `MolecularSequence · ${wgs.source}`, {
      resourceType: 'MolecularSequence', id: 'gen-wgs', subject, type: 'dna',
      referenceSeq: { genomeBuild: wgs.build },
      _stats: {
        variants_called: wgs.variantsCalled, variants_annotated: wgs.variantsAnnotated,
        variants_reported: wgs.variantsReported, mean_depth: wgs.meanDepth,
        callable_fraction: wgs.callableFraction, raw_file_gb: wgs.fileSizeGb,
      },
      note: [{ text: wgs.storage }, { text: 'A genome cannot be de-identified — it fingerprints you and your blood relatives. Default-excluded from every cloud call; opt-in per call, recorded in the ledger.' }],
    })
  }

  // --- body composition & performance ---------------------------------------
  const dexa = dexaScans.find(s => s.id === id)
  if (dexa) {
    return wrap('DEXA body composition', `DiagnosticReport · ${dexa.date} · ${dexa.facility}`, {
      resourceType: 'DiagnosticReport', id: dexa.id, status: 'final', subject,
      effectiveDateTime: dexa.date, performer: [{ display: dexa.facility }],
      code: { text: 'Dual-energy X-ray absorptiometry, body composition' },
      _device: dexa.device, _read: dexa.operator,
      result: dexa.measures.map(m => `${m.name}: ${m.value} ${m.unit}${m.ref ? `  (ref ${m.ref})` : ''}`),
      note: dexa.note ? [{ text: dexa.note }] : undefined,
    })
  }
  const vo2 = vo2maxTests.find(t => t.id === id)
  if (vo2) {
    return wrap('VO₂max — metabolic cart', `DiagnosticReport · ${vo2.date} · ${vo2.facility}`, {
      resourceType: 'DiagnosticReport', id: vo2.id, status: 'final', subject,
      effectiveDateTime: vo2.date, code: { text: 'Cardiopulmonary exercise test, maximal' },
      result: [
        `VO₂max: ${vo2.vo2max} ${vo2.unit} (${vo2.percentile}th percentile)`,
        `HR max: ${vo2.hrMax} bpm · RER max: ${vo2.rerMax}`,
        `VT1: ${vo2.vt1Hr} bpm (${vo2.vt1Pct}% VO₂max) · VT2: ${vo2.vt2Hr} bpm (${vo2.vt2Pct}%)`,
        `Wearable estimate the same week: ${vo2.wearableEstimateSameWeek} — a modelled surrogate, not a measurement.`,
      ],
      note: [{ text: vo2.valid }],
    })
  }
  if (id === 'vo2-discrepancy') {
    return wrap('VO₂max — measured vs. estimated', 'ayuos.derived · measurement-quality conflict', {
      resourceType: 'Basic', id: 'vo2-discrepancy', code: { text: 'measurement conflict' }, subject,
      measured: `${vo2Discrepancy.measured} (${vo2Discrepancy.measuredBy}, ${vo2Discrepancy.measuredOn})`,
      estimated: `${vo2Discrepancy.estimated} (${vo2Discrepancy.estimatedBy}, ${vo2Discrepancy.estimatedOn})`,
      gap: `${vo2Discrepancy.gap} mL/kg/min (${vo2Discrepancy.gapPct}%)`,
      quality_tier: vo2Discrepancy.qualityTier,
      note: [{ text: vo2Discrepancy.note }],
    })
  }
  const func = functionalTests.find(t => t.id === id)
  if (func) {
    return wrap('Functional capacity battery', `DiagnosticReport · ${func.date}`, {
      resourceType: 'DiagnosticReport', id: func.id, status: 'final', subject,
      effectiveDateTime: func.date, code: { text: 'Physical performance battery' },
      result: func.tests.map(t => `${t.name}: ${t.value} ${t.unit}${t.ref ? `  (ref ${t.ref})` : ''}`),
      note: [{ text: func.setting }],
    })
  }

  // --- ageing clocks --------------------------------------------------------
  const clock = clockTests.find(c => c.id === id)
  if (clock) {
    return wrap('Epigenetic age panel', `DiagnosticReport · ${clock.date} · ${clock.vendor}`, {
      resourceType: 'DiagnosticReport', id: clock.id, status: 'final', subject,
      effectiveDateTime: clock.date, code: { text: 'DNA methylation biological age panel' },
      _array: clock.array, _sample: clock.sample, _chronologicalAge: clock.chronologicalAge,
      result: Object.entries(clock.clocks).map(([k, v]) => `${k}: ${v}`),
      _telomere_kb: clock.telomere,
      _immune: clock.immune,
      note: [{ text: 'Each clock carries its own test–retest reliability. See the reliability record before reading any single-timepoint value as a health fact.' }],
    })
  }
  if (id === 'clock-disagreement') {
    return wrap('Clock disagreement + reliability', 'ayuos.derived · epigenetic panel', {
      resourceType: 'Basic', id: 'clock-disagreement', code: { text: 'clock reliability analysis' }, subject,
      chronological_age: clockDisagreement.chronological,
      spread_years: clockDisagreement.spread,
      youngest: clockDisagreement.youngest, oldest: clockDisagreement.oldest,
      trends: clockTrends.map(t => `${t.name} (ICC ${t.icc}, CV ${t.cv}%): ${t.verdict}`),
      telomere: telomereTrend.verdict,
      summary: clockDisagreement.summary,
      vs_labs: clockDisagreement.labContrast,
    })
  }

  // --- activity -------------------------------------------------------------
  const act = activities.find(a => a.id === id)
  if (act) {
    return wrap(act.name, `Observation · ${act.label} · ${act.date} · Garmin`, {
      resourceType: 'Observation', id: act.id, status: 'final', subject,
      category: [{ coding: [{ code: 'activity' }] }],
      code: { text: `${act.label} — ${act.name}` },
      effectiveDateTime: act.date,
      device: { display: act.device },
      component: [
        { code: 'duration', valueQuantity: { value: act.durationMin, unit: 'min' } },
        ...(act.distanceKm ? [{ code: 'distance', valueQuantity: { value: act.distanceKm, unit: 'km' } }] : []),
        { code: 'avg-hr', valueQuantity: { value: act.avgHr, unit: 'bpm' } },
        { code: 'max-hr', valueQuantity: { value: act.maxHr, unit: 'bpm' } },
        { code: 'hr-zones-min', valueString: `Z1 ${act.zones.z1} · Z2 ${act.zones.z2} · Z3 ${act.zones.z3} · Z4 ${act.zones.z4} · Z5 ${act.zones.z5}` },
        { code: 'training-load', valueQuantity: { value: act.trainingLoad, unit: 'au' } },
        { code: 'aerobic-effect', valueQuantity: { value: act.aerobicEffect, unit: '0-5' } },
        { code: 'anaerobic-effect', valueQuantity: { value: act.anaerobicEffect, unit: '0-5' } },
      ],
      note: act.why ? [{ text: `Selected because: ${act.why}.` }] : undefined,
    })
  }
  if (id === 'block-aerobic-2025' || id === 'block-summary') {
    return wrap('Aerobic base block', `ayuos.training_block · ${trainingBlock.start} → ${trainingBlock.end}`, {
      resourceType: 'Basic', id: 'block-aerobic-2025', code: { text: 'training block' }, subject,
      design: trainingBlock.design, intent: trainingBlock.intent,
      weeks: blockSummary.blockWeeks,
      weekly_minutes: `${blockSummary.preMinutes} → ${blockSummary.blockMinutes}`,
      weekly_load: `${blockSummary.preLoad} → ${blockSummary.blockLoad}`,
      weekly_sessions: `${blockSummary.preSessions} → ${blockSummary.blockSessions}`,
      z2_share_pct: `${blockSummary.prePolarisation} → ${blockSummary.blockPolarisation}`,
      adherence_pct: blockSummary.adherence,
      pre_test: trainingBlock.preTest, post_test: trainingBlock.postTest,
      confounder: blockSummary.missedWeek.reason,
      _aggregate: `Aggregated from ${activities.length} activity records across ${weeklyLoad.length} weeks. The prompt gets this object; it never gets the 290 rows.`,
    })
  }

  // --- screening ------------------------------------------------------------
  const scr = screenings.find(s => s.id === id)
  if (scr) {
    return wrap(scr.name, `DiagnosticReport · ${scr.date}`, {
      resourceType: 'DiagnosticReport', id: scr.id, status: 'final', subject,
      effectiveDateTime: scr.date, code: { text: scr.name },
      conclusion: scr.result,
      _performance: scr.performance,
      _caveats: scr.caveats,
      note: scr.note ? [{ text: scr.note }] : undefined,
    })
  }

  // --- nutrition / CGM / sleep aggregates -----------------------------------
  if (id === 'nutr-seafood-trend') {
    return wrap('Seafood intake trend', 'ayuos.derived · Cronometer', {
      resourceType: 'Basic', id, code: { text: 'nutrition trend' }, subject,
      early_mean_per_week: seafoodTrend.earlyMean, late_mean_per_week: seafoodTrend.lateMean,
      weeks_compared: `${seafoodTrend.earlyWeeks} vs ${seafoodTrend.lateWeeks}`,
      summary: seafoodTrend.summary, caveat: seafoodTrend.caveat,
      logging_coverage_pct: nutritionStats.coveragePct,
      coverage_last_90d: `${nutritionCoverage('2025-05-05', '2025-08-03').pct}%`,
      _aggregate: `Derived from ${nutritionStats.loggedDays} logged days × 23 nutrients. The prompt gets these six numbers.`,
    })
  }
  if (id === 'cgm-summary') {
    return wrap('CGM summary — baseline vs. protocol', 'ayuos.derived · Dexcom G7', {
      resourceType: 'Basic', id, code: { text: 'CGM aggregate' }, subject,
      baseline_days: cgmSummary.baselineDays, protocol_days: cgmSummary.interventionDays,
      mean_peak: `${cgmSummary.baselinePeak} → ${cgmSummary.interventionPeak} mg/dL`,
      mean_glucose: `${cgmSummary.baselineMean} → ${cgmSummary.interventionMean} mg/dL`,
      cv: `${cgmSummary.baselineCv}% → ${cgmSummary.interventionCv}%`,
      _aggregate: `${cgmSummary.declaredReadings.toLocaleString()} five-minute readings reduced to eight numbers. Raw trace is available on request and costs ~80,000 tokens.`,
    })
  }
  const trace = cgmTraces.find(t => t.id === id)
  if (trace) {
    return wrap(`CGM trace · ${trace.date}`, `Observation · 288 readings · ${trace.arm}`, {
      resourceType: 'Observation', id: trace.id, status: 'final', subject,
      code: { text: 'Interstitial glucose, continuous' },
      effectiveDateTime: trace.date,
      _readings: trace.readings.length,
      _first20: trace.readings.slice(0, 20).map(r => `${r.t}  ${r.v}`),
      note: [{ text: 'One day of raw trace. Six such days are materialised in this demo; the store holds 89.' }],
    })
  }
  const peak = cgmExcursions.find(e => e.id === id)
  if (peak) {
    return wrap(`Post-prandial peak · ${peak.date}`, `Observation · CGM excursion · ${peak.arm}`, {
      resourceType: 'Observation', id: peak.id, status: 'final', subject,
      code: { text: 'Post-prandial glucose peak' }, effectiveDateTime: `${peak.date}T${peak.at}`,
      valueQuantity: { value: peak.peak, unit: 'mg/dL' },
      _meal: peak.meal, _arm: peak.arm,
      note: [{ text: 'Extracted from the 5-minute trace. The excursion is retrievable on its own so an answer can cite one peak without carrying the other 287 readings of that day.' }],
    })
  }
  if (id === 'sleep-summary') {
    return wrap('Sleep architecture summary', 'ayuos.derived · Oura', {
      resourceType: 'Basic', id, code: { text: 'sleep aggregate' }, subject,
      nights: sleepSummary.nights, window_nights: sleepSummary.window,
      rem_min: `${sleepSummary.remPrev} → ${sleepSummary.remNow}`,
      deep_min: `${sleepSummary.deepPrev} → ${sleepSummary.deepNow}`,
      total_min: `${sleepSummary.totalPrev} → ${sleepSummary.totalNow}`,
      efficiency_pct: sleepSummary.efficiencyNow,
      note: [{ text: sleepSummary.note }],
    })
  }
  if (id === 'store-stats') {
    return wrap('The store, counted', 'ayuos.meta · what is actually here', {
      resourceType: 'Basic', id: 'store-stats', code: { text: 'store inventory' }, subject,
      total_rows_excluding_genome: storeStats.withoutGenome,
      span: storeStats.span, years: storeStats.years,
      groups: storeStats.groups.map(g => `${g.label}: ${g.rows.toLocaleString()}${g.materialised ? '' : ' (declared, not materialised in this demo)'}`),
      note: [{ text: 'This is the number that makes context assembly a product problem rather than a plumbing detail.' }],
    })
  }

  const fam = familyHistory.find(f => f.id === id)
  if (fam) {
    return wrap(`${fam.relation} — ${fam.condition}`, 'FamilyMemberHistory', {
      resourceType: 'FamilyMemberHistory', id: fam.id, status: 'completed', patient: subject,
      relationship: { text: fam.relation },
      condition: [{ code: { text: fam.condition }, onsetAge: { value: fam.age, unit: 'yr' } }],
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

  // Fall back to the active hypothesis object if someone cites it directly.
  if (id === activeHypothesis.id) {
    return wrap(activeHypothesis.statement, 'ayuos.experiment · running', {
      resourceType: 'Basic', id: activeHypothesis.id, code: { text: 'n-of-1 experiment' }, subject,
      hypothesis: activeHypothesis.statement, status: activeHypothesis.status,
      started: activeHypothesis.started, adherence: `${activeHypothesis.adherence.done}/${activeHypothesis.adherence.of}`,
    })
  }
  return null
}

function wrap(title, subtitle, fhir, impression) {
  return { id: fhir.id, title, subtitle, fhir, impression }
}
