// Connector status for Ravi Mehta's sources. Each source is reachable either
// DIRECTLY (source → your store, nothing in between → green, zero transit) or
// through a BRIDGE (a paid vendor retrieves it first → amber, discloses the
// transit, and names the free direct path it falls back to). File sources land
// via manual upload — a local parse, no network at all. (ingestion/index.md,
// tiers.md#axis-3-connections.) Every count and date is fabricated but coherent
// with the persona: Oura + Whoop + Garmin + Cronometer active and direct,
// Dexcom bridged for the running CGM experiment, Epic connected, Fasten offered
// but not enrolled. Record counts are computed from the real mock modules rather
// than typed, so a card can never claim a number the store does not hold.

import {
  activityStats, nutritionStats, streamStats, labStats, storeStats,
  genomicStats, bodyCompStats, agingStats, screeningStats,
} from './persona.js'

// tier: 'direct' (green, zero-transit) · 'bridged' (amber, transits a vendor)
// · 'file' (local upload, no network)
// status: 'active' · 'connected' · 'available' (offered, not enrolled) · 'error'

export const streams = [
  {
    id: 'oura', group: 'Wearables', name: 'Oura Ring', method: 'Open Wearables · PAT',
    tier: 'direct', status: 'active',
    lastSync: '2025-08-03 06:12', nextRun: 'in ~6h (4× daily)',
    records: streamStats.sleepNights * (streamStats.sleepFields - 4) + 1092 * 4,
    metrics: 'HRV, resting HR, respiratory rate, sleep stages, readiness — 1,092 nights',
    note: 'Personal access token — data goes ring → Open Wearables → your store. Nothing transits ayuOS.',
  },
  {
    id: 'whoop', group: 'Wearables', name: 'Whoop', method: 'Open Wearables · OAuth',
    tier: 'direct', status: 'active',
    lastSync: '2025-08-03 05:48', nextRun: 'in ~6h (4× daily)', records: 2190,
    metrics: 'VO₂max (est.), strain, recovery, sleep',
    note: 'Self-hosted OAuth app — zero transit through any ayuOS-operated service. Its VO₂max is a model, not a measurement: it reads 52.0 against a metabolic cart\u2019s 47.8. Both are stored; answers say which one they are quoting.',
  },
  {
    id: 'garmin', group: 'Wearables', name: 'Garmin Connect', method: 'Open Wearables · OAuth',
    tier: 'direct', status: 'active',
    lastSync: '2025-08-03 07:31', nextRun: 'in ~6h (4× daily)', records: activityStats.activities,
    metrics: `Per-activity records — HR zones, training load, aerobic/anaerobic effect · ${activityStats.totalKm.toLocaleString()} km`,
    note: `${activityStats.activities} activities across ${activityStats.weeks} weeks, each with 16 fields. There is a ${activityStats.gapDays}-day hole in April 2025 — the watch stayed home during a travel week, and the gap is kept rather than interpolated.`,
  },
  {
    id: 'cronometer', group: 'Nutrition', name: 'Cronometer', method: 'Open Wearables · OAuth',
    tier: 'direct', status: 'active',
    lastSync: '2025-08-03 08:04', nextRun: 'nightly', records: nutritionStats.nutrientRows,
    metrics: `${nutritionStats.loggedDays} logged days × 23 nutrients + ${nutritionStats.declaredMeals.toLocaleString()} meal entries`,
    note: `Coverage is ${nutritionStats.coveragePct}%, not 100% — logging lapsed through winter 2024–25 and resumed with the training block. Any answer that uses this data is scoped to the days that exist.`,
  },
  {
    id: 'dexcom', group: 'Wearables', name: 'Dexcom G7 (CGM)', method: 'Terra bridge',
    tier: 'bridged', status: 'active',
    lastSync: '2025-08-03 07:55', nextRun: 'hourly · experiment window',
    records: streamStats.cgmDeclaredReadings,
    metrics: 'Interstitial glucose · post-meal peaks',
    disclosure: 'Dexcom has no individual API, so readings transit Terra’s cloud before landing locally. Enabled per-provider, only for the running post-meal-walks experiment.',
    fallback: { to: 'Open Wearables (direct)', costs: 'CGM coverage for this experiment', keeps: 'every other wearable stream and all stored history' },
  },
  {
    id: 'epic', group: 'Health records (EHR)', name: 'Epic · MyChart', method: 'SMART-on-FHIR (direct)',
    tier: 'direct', status: 'connected',
    lastSync: '2025-07-28 09:02', nextRun: 'weekly', records: 486,
    metrics: 'Labs, conditions, meds, clinical notes',
    note: 'Free SMART-on-FHIR app, auto-distributed to ~800 orgs. Records come straight from the health system — includes the clinical notes the Apple Health export omits.',
  },
  {
    id: 'fasten', group: 'Health records (EHR)', name: 'Fasten Connect', method: 'Paid bridge',
    tier: 'bridged', status: 'available',
    lastSync: null, nextRun: null, records: 0,
    metrics: 'Non-Epic health systems (breadth beyond direct)',
    disclosure: 'Reaches health systems Epic-direct can’t. Records transit Fasten with 24h retention, per-provider consent. A paid add-on — off unless you enrol a specific provider.',
    fallback: { to: 'Apple Health export + Epic direct', costs: 'breadth to non-Epic systems', keeps: 'the whole system and every record already stored' },
  },
]

// File sources — manual upload, parsed locally. No network in any tier. Each
// carries a fake parse/confidence result the "upload" action surfaces.
export const files = [
  {
    id: 'apple-health', group: 'Apple Health', name: 'Apple Health export', accept: 'export.zip',
    tier: 'file', lastImport: '2025-07-15', records: 5606,
    hint: 'The base EHR tier — the zip contains raw provider FHIR JSON plus device history. Cumulative full dump; re-imported wholesale, deduped by content hash.',
    parse: { found: 5606, kind: 'FHIR resources + device samples', confidence: 0.99, took: '38s',
      note: 'Deduped against 5,527 already stored — 79 new. No PII left the device; the whole parse ran locally.' },
  },
  {
    id: 'labs', group: 'Labs', name: 'Lab PDF', accept: 'PDF',
    tier: 'file', lastImport: '2025-08-01', records: labStats.results,
    hint: `LabCorp / Quest / concierge PDFs. ${labStats.analytes} analytes across ${labStats.draws} draws over ${labStats.months} months, LOINC-coded on the way in. One draw was ordered and never taken; one vendor switch changed units on Lp(a) and free testosterone — both are recorded as facts about the data, not smoothed away.`,
    parse: { found: labStats.analytes, kind: `Observations (1 panel, ${labStats.analytes} analytes)`, confidence: 0.94, took: '11s',
      note: `${labStats.analytes} analytes extracted, ${labStats.abnormalNow} flagged out of range. MedGemma ran locally — nothing was sent to a cloud OCR service.` },
  },
  {
    id: 'dicom', group: 'Imaging', name: 'DICOM study', accept: '.dcm / folder',
    tier: 'file', lastImport: '2025-02-18', records: 2,
    hint: 'MRI / CT / X-ray. pydicom parse → metadata into the store; the AI impression (MedGemma vision) is a DocumentReference. Pixel data stays on disk, viewable in OHIF.',
    parse: { found: 180, kind: 'instances (1 study · T1/T2/FLAIR)', confidence: 0.88, took: '1m 12s',
      note: 'Study indexed; MedGemma drafted an impression labelled AI-generated, not a radiologist read. Pixels never left the machine.' },
  },
  {
    id: 'genome', group: 'Genomics', name: 'Genome file', accept: '23andMe / VCF',
    tier: 'file', lastImport: '2025-03-24', records: genomicStats.reported,
    hint: `30× whole genome (CRAM/VCF), superseding the 2019 consumer array. ${genomicStats.variantsCalled.toLocaleString()} variants called, ${genomicStats.reported} annotated and reported: ${genomicStats.prs} polygenic scores, ${genomicStats.pgx} pharmacogenomic genes (${genomicStats.actionablePgx} actionable), ${genomicStats.carrier} carrier results. Excluded from cloud models and third-party shares by default — opt in per call or per share, warned that a genome is inherently identifiable.`,
    parse: { found: genomicStats.reported, kind: 'MolecularSequence + PRS + PGx', confidence: 0.91, took: '4m 38s',
      note: 'Raw CRAM (62 GB) stays on disk; only annotated findings enter the clinical schema. Two are actionable: SLCO1B1 *1/*5 (statin myopathy) and HFE C282Y/H63D.' },
  },
]

// Tier badge metadata. direct/file read green (zero transit); bridged reads
// amber (transits a vendor). This is the SAME colour law as the posture header.
// Third-party test reports arrive as PDFs and have no API anywhere. Grouped as
// one source because that is how they arrive — a folder of reports, parsed
// locally, no network in any tier.
files.push({
  id: 'tests', group: 'Third-party tests', name: 'Test report PDF', accept: 'PDF',
  tier: 'file', lastImport: '2025-07-19',
  records: bodyCompStats.dexaMeasures + bodyCompStats.functionalMeasures + agingStats.rows + screeningStats.rows,
  hint: `DEXA, metabolic-cart CPET, functional battery, epigenetic panels, MCED. ${bodyCompStats.dexaScans} DEXA scans, ${bodyCompStats.vo2Tests} lab VO₂max tests, ${bodyCompStats.functionalSessions} functional sessions, ${agingStats.tests} methylation panels, ${screeningStats.tests} screening results. Each carries its own reproducibility metadata, because a delta smaller than an assay's test–retest band is not a delta.`,
  parse: { found: 22, kind: 'DiagnosticReport (1 DEXA)', confidence: 0.93, took: '9s',
    note: 'Parsed locally. The scan is stored with its device and operator so a future delta is only computed against a comparable scan.' },
})

export const TIERS = {
  direct: { label: 'direct · zero transit', tone: 'local', glyph: '●' },
  file: { label: 'local file · no network', tone: 'local', glyph: '●' },
  bridged: { label: 'bridged · transits a vendor', tone: 'egress', glyph: '◍' },
}

export const STATUS = {
  active: { label: 'syncing', tone: 'local' },
  connected: { label: 'connected', tone: 'local' },
  available: { label: 'available · not enrolled', tone: 'idle' },
  error: { label: 'error', tone: 'block' },
}

// Group the streaming connectors by their `group` field, in first-seen order.
export function streamGroups() {
  const order = []
  const map = {}
  for (const s of streams) {
    if (!map[s.group]) { map[s.group] = []; order.push(s.group) }
    map[s.group].push(s)
  }
  return order.map(g => ({ group: g, items: map[g] }))
}
