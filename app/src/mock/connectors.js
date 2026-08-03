// Connector status for Ravi Mehta's sources. Each source is reachable either
// DIRECTLY (source → your store, nothing in between → green, zero transit) or
// through a BRIDGE (a paid vendor retrieves it first → amber, discloses the
// transit, and names the free direct path it falls back to). File sources land
// via manual upload — a local parse, no network at all. (ingestion/index.md,
// tiers.md#axis-3-connections.) Every count and date is fabricated but coherent
// with the persona: Oura + Whoop active, Dexcom bridged for the running CGM
// experiment, Epic connected, Fasten offered but not enrolled, no Garmin.

// tier: 'direct' (green, zero-transit) · 'bridged' (amber, transits a vendor)
// · 'file' (local upload, no network)
// status: 'active' · 'connected' · 'available' (offered, not enrolled) · 'error'

export const streams = [
  {
    id: 'oura', group: 'Wearables', name: 'Oura Ring', method: 'Open Wearables · PAT',
    tier: 'direct', status: 'active',
    lastSync: '2025-08-03 06:12', nextRun: 'in ~6h (4× daily)', records: 3284,
    metrics: 'HRV, resting HR, sleep stages, readiness',
    note: 'Personal access token — data goes ring → Open Wearables → your store. Nothing transits ayuOS.',
  },
  {
    id: 'whoop', group: 'Wearables', name: 'Whoop', method: 'Open Wearables · OAuth',
    tier: 'direct', status: 'active',
    lastSync: '2025-08-03 05:48', nextRun: 'in ~6h (4× daily)', records: 2190,
    metrics: 'VO₂max (est.), strain, recovery, sleep',
    note: 'Self-hosted OAuth app — zero transit through any ayuOS-operated service.',
  },
  {
    id: 'dexcom', group: 'Wearables', name: 'Dexcom G7 (CGM)', method: 'Terra bridge',
    tier: 'bridged', status: 'active',
    lastSync: '2025-08-03 07:55', nextRun: 'hourly · experiment window', records: 1512,
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
    tier: 'file', lastImport: '2025-07-15', records: 5120,
    hint: 'The base EHR tier — the zip contains raw provider FHIR JSON plus device history. Cumulative full dump; re-imported wholesale, deduped by content hash.',
    parse: { found: 5120, kind: 'FHIR resources + device samples', confidence: 0.99, took: '38s',
      note: 'Deduped against 5,041 already stored — 79 new. No PII left the device; the whole parse ran locally.' },
  },
  {
    id: 'labs', group: 'Labs', name: 'Lab PDF', accept: 'PDF',
    tier: 'file', lastImport: '2025-08-01', records: 7,
    hint: 'LabCorp / Quest / concierge PDFs. Text-layer parse first, local doc-VLM extraction where the layout is scanned. LOINC-coded on the way in.',
    parse: { found: 7, kind: 'Observations (1 panel)', confidence: 0.94, took: '6s',
      note: '7 analytes extracted, 1 flagged for review (ApoB unit ambiguous). MedGemma ran locally — nothing was sent to a cloud OCR service.' },
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
    tier: 'file', lastImport: '2025-01-30', records: 1,
    hint: 'Raw genotype or VCF. Variant parse + PRS computed locally. Genomic data is never sent to a cloud model in any tier — it is withheld at the gateway outright.',
    parse: { found: 1, kind: 'MolecularSequence + PRS', confidence: 0.72, took: '22s',
      note: 'APOE ε3/ε3, CVD PRS 70th pct (South Asian — European-GWAS caveat applied). Confidence graded: consumer array, hypothesis-generating at best.' },
  },
]

// Tier badge metadata. direct/file read green (zero transit); bridged reads
// amber (transits a vendor). This is the SAME colour law as the posture header.
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
