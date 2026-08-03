// The session overlay.
//
// `src/mock/**` is the read-only base record — the deterministic Ravi Mehta
// dataset every view has always read. This module layers a *mutable* overlay on
// top of it so that things the user does in the demo have consequences: an
// import lands records on the Timeline, a capture advances a running experiment,
// a correction follows a value into the doctor packet.
//
// Rules this module keeps:
//   · the mocks are never mutated — views read `base + overlay`;
//   · the overlay lives in memory and resets on reload, and the UI says so;
//   · nothing here is random or clock-dependent, so the demo is reproducible.

import { createContext, createElement, useContext, useMemo, useReducer, useCallback } from 'react'
import * as P from '../mock/persona.js'
import { experiments as baseExperiments } from '../mock/experiments.js'
import { inventory as baseInventory } from '../mock/shares.js'
import { streams as baseStreams, files as baseFiles } from '../mock/connectors.js'
import {
  IMPORTS, SEED_ATTENTION, RECORD_GAPS, stepsSeries, WALK_LOG_QUEUE,
  anchor, NEW_PANEL_DATE,
} from './fixtures.js'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const subject = { reference: 'Patient/ravi-mehta', display: P.persona?.name || 'Ravi Mehta' }

export function stats(xs) {
  const n = xs.length
  if (!n) return { n: 0, mean: 0, sd: 0 }
  const mean = xs.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  return { n, mean, sd, min: Math.min(...xs), max: Math.max(...xs) }
}

function cohenD(base, interv) {
  const b = stats(base), i = stats(interv)
  const pooled = Math.sqrt((b.sd ** 2 + i.sd ** 2) / 2) || 1
  return (i.mean - b.mean) / pooled
}

// A lab row → the FHIR Observation the source drawer renders.
function labObservation(l) {
  const ref = []
  if (l.low != null) ref.push({ low: { value: l.low, unit: l.unit } })
  if (l.high != null) ref.push({ high: { value: l.high, unit: l.unit } })
  return {
    resourceType: 'Observation', id: l.id, status: 'final',
    category: [{ coding: [{ code: 'laboratory' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: l.code, display: l.name }], text: l.name },
    subject,
    effectiveDateTime: l.drawn,
    performer: [{ display: l.lab }],
    valueQuantity: { value: l.value, unit: l.unit, system: 'http://unitsofmeasure.org' },
    interpretation: [{ coding: [{ code: l.flag === 'ok' ? 'N' : l.flag === 'low' ? 'L' : 'H' }] }],
    referenceRange: ref.length ? ref : undefined,
    provenance: { source: 'pdf', path: 'text-layer', confidence: l.conf, imported: 'this session' },
  }
}

const wrap = (id, title, subtitle, fhir, impression) => ({ id, title, subtitle, fhir, impression })

// ---------------------------------------------------------------------------
// reducer
// ---------------------------------------------------------------------------

const ARRAYS = [
  'labs', 'events', 'wearables', 'imaging', 'medications', 'inventory',
  'imports', 'artifacts', 'trace', 'attention', 'newExperiments',
]

const initial = {
  labs: [],            // persona-lab-shaped rows added this session
  events: [],          // Timeline events added this session
  wearables: [],       // whole new wearable lanes
  imaging: [],
  medications: [],
  inventory: [],       // extra shareable items
  records: {},         // id → drawer-resolvable record
  imports: [],         // {key, title, at, note, counts}
  artifacts: [],       // generated shares
  trace: [],           // reverse-chronological session log
  attention: SEED_ATTENTION,
  newExperiments: [],
  experiments: {},     // id → patch { extraSamples, adherence, confounders, closed, verdict… }
  corrections: {},     // recordId → { value, unit, note, excluded, reason, original }
  connectors: {
    // The canonical loud-failure state. Neutral, not the reserved red: an
    // outage is a degradation, not a hard block (journeys 08 §5, 14 §6).
    whoop: { status: 'error', error: 'OAuth token refresh failed — vendor changed the token endpoint (HTTP 400).', lastSync: '2025-08-01 04:20' },
  },
  imported: {},        // import key → true
  counts: {},          // connector/file id → extra records
  gapsFilled: {},      // record-gap id → how it was filled
}

function applyPatch(s, patch) {
  const next = { ...s }
  for (const k of ARRAYS) {
    if (!patch[k]) continue
    // attention and trace read newest-first; records append.
    next[k] = (k === 'attention' || k === 'trace')
      ? [...patch[k], ...s[k]]
      : [...s[k], ...patch[k]]
  }
  if (patch.records) next.records = { ...s.records, ...patch.records }
  if (patch.imported) next.imported = { ...s.imported, ...patch.imported }
  if (patch.counts) {
    next.counts = { ...s.counts }
    for (const [k, v] of Object.entries(patch.counts)) next.counts[k] = (next.counts[k] || 0) + v
  }
  if (patch.resolve) {
    next.attention = next.attention.map(a =>
      patch.resolve[a.id] ? { ...a, state: 'done', resolvedNote: patch.resolve[a.id] } : a)
    // Some resolvable ids are record *gaps* rather than attention items.
    const knownIds = new Set(next.attention.map(a => a.id))
    const filled = {}
    for (const [id, how] of Object.entries(patch.resolve)) if (!knownIds.has(id)) filled[id] = how
    if (Object.keys(filled).length) next.gapsFilled = { ...s.gapsFilled, ...filled }
  }
  return next
}

function reducer(s, a) {
  switch (a.type) {
    case 'apply':
      return applyPatch(s, a.patch)

    case 'attention/set':
      return {
        ...s,
        attention: s.attention.map(x =>
          x.id === a.id ? { ...x, state: a.state, resolvedNote: a.note ?? x.resolvedNote } : x),
      }

    case 'connector/set':
      return { ...s, connectors: { ...s.connectors, [a.id]: { ...(s.connectors[a.id] || {}), ...a.patch } } }

    case 'experiment/patch': {
      const cur = s.experiments[a.id] || {}
      return { ...s, experiments: { ...s.experiments, [a.id]: { ...cur, ...a.patch } } }
    }

    case 'record/correct':
      return { ...s, corrections: { ...s.corrections, [a.id]: { ...(s.corrections[a.id] || {}), ...a.patch } } }

    case 'record/uncorrect': {
      const next = { ...s.corrections }
      delete next[a.id]
      return { ...s, corrections: next }
    }

    default:
      return s
  }
}

// ---------------------------------------------------------------------------
// provider
// ---------------------------------------------------------------------------

const Ctx = createContext(null)

let traceSeq = 0

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)

  const apply = useCallback(patch => dispatch({ type: 'apply', patch }), [])

  // Monotonic, not clock-based, so the session log is reproducible.
  const trace = (text, to) => ({ id: `tr-${++traceSeq}`, text, to })

  // --- imports -------------------------------------------------------------
  // Each import lands records AND the downstream consequences of those records.
  const commitImport = useCallback((key, opts = {}) => {
    const spec = IMPORTS[key]
    if (!spec) return
    const rows = opts.rows || spec.rows
    const patch = {
      imports: [], labs: [], events: [], wearables: [], imaging: [], inventory: [],
      records: {}, attention: [], trace: [], imported: { [key]: true }, counts: {},
    }
    const push = (k, ...v) => patch[k].push(...v)

    if (key === 'labs') {
      const kept = rows.filter(r => r.include && !(r.ask && !r.ask.chosen))
      const drawn = spec.panel.drawn
      for (const r of kept) {
        const unit = r.ask?.chosen || r.unit
        const l = {
          id: r.id, code: r.code, name: r.name, value: r.value, prior: null, unit,
          low: r.low, high: r.high, flag: r.flag, drawn, panel: spec.panel.label,
          lab: spec.panel.lab, conf: r.conf, isNew: true,
        }
        push('labs', l)
        patch.records[r.id] = wrap(r.id, r.name, `Observation · drawn ${drawn} · ${spec.panel.lab}`, labObservation(l))
        push('inventory', {
          id: r.id, label: r.name, domain: 'metabolic',
          source: 'labs', type: 'Observation', date: drawn,
          detail: `${r.value} ${unit}${r.flag !== 'ok' ? ` · ${r.flag === 'low' ? 'below' : 'above'} range` : ''}`,
        })
      }
      if (kept.length) {
        push('events', {
          id: 'ev-labs-extended', track: 'labs', date: drawn, ref: spec.panel.id,
          label: spec.panel.label, detail: `${kept.length} analytes · ${spec.panel.lab}`,
          flag: kept.some(r => r.flag !== 'ok') ? 'out' : undefined, isNew: true,
        })
        patch.records[spec.panel.id] = wrap(spec.panel.id, spec.panel.label,
          `Bundle · drawn ${drawn} · ${spec.panel.lab}`,
          {
            resourceType: 'Bundle', id: spec.panel.id, type: 'collection', timestamp: drawn,
            entry: kept.map(r => ({
              resource: labObservation({ ...r, unit: r.ask?.chosen || r.unit, drawn, lab: spec.panel.lab }),
            })),
          })
        patch.counts.labs = kept.length
      }
      // The payoff: this panel closes a question the stored record has been
      // carrying since 2023, and opens a smaller, more specific one.
      const inorg = kept.find(r => r.id === 'obs-as-inorg')
      const abet = kept.find(r => r.id === 'obs-as-abet')
      if (inorg && abet) {
        const pct = Math.round((abet.value / (abet.value + inorg.value)) * 100)
        push('attention', {
          id: 'att-arsenic', kind: 'finding',
          title: `Your arsenic is ${pct}% arsenobetaine — the harmless seafood form`,
          body: `The fraction that actually matters, inorganic plus methylated, is ${inorg.value} ${inorg.ask?.chosen || inorg.unit} against a limit of ${inorg.high}. The total arsenic your quarterly panels have been reporting was never interpretable on its own, and now it does not need to be. This is the rarer kind of result: one that closes a question rather than opening one.`,
          when: 'just now', action: { label: 'Open the result', record: 'obs-as-inorg' }, state: 'open',
        })
        patch.resolve = { ...(patch.resolve || {}), 'gap-arsenic': `Closed — inorganic fraction ${inorg.value} ${inorg.ask?.chosen || inorg.unit}, well under the limit.` }
      }
      const mehg = kept.find(r => r.id === 'obs-mehg')
      if (mehg) {
        push('attention', {
          id: 'att-mehg', kind: 'finding',
          title: `Methylmercury ${mehg.value} µg/L — most of your total mercury, and it is dietary`,
          body: 'Methylmercury is the seafood form. It confirms the source rather than the severity: your total is still above the limit, and the thing that moves it is what you eat, on a timescale of weeks rather than years. That makes it one of the few markers in this record where a short, honest experiment could actually settle the question.',
          when: 'just now',
          action: { label: 'Design that experiment', to: '/experiments' }, state: 'open',
        })
        patch.resolve = { ...(patch.resolve || {}), 'att-mercury': 'Speciated — methylmercury 11.4 µg/L of a 14.2 total; dietary, not industrial.' }
      }
      if (kept.some(r => r.id === 'obs-iodine-u')) {
        push('attention', {
          id: 'att-iodine', kind: 'finding',
          title: 'Urine iodine 412 µg/L — roughly twice the adequate band',
          body: 'From the same seafood that is driving the mercury. Excess iodine is one of the few things that can push a thyroid, and your TPO antibodies have been drifting upward across the last four draws while still sitting inside the reference range. Neither number is alarming alone; together they are worth one conversation.',
          when: 'just now', action: { label: 'Open the result', record: 'obs-iodine-u' }, state: 'open',
        })
      }
      push('trace', trace(`Imported ${spec.file} — ${kept.length} observations added`, '/timeline'))
      push('imports', { key, title: spec.title, at: 'just now', note: `${kept.length} of ${rows.length} rows added`, counts: { added: kept.length } })
    }

    if (key === 'apple-health') {
      const steps = stepsSeries()
      push('wearables', steps)
      patch.records[steps.id] = wrap(steps.id, steps.name,
        'Observation · apple watch · 276-day series',
        {
          resourceType: 'Observation', id: steps.id, status: 'final',
          code: { coding: [{ system: 'http://loinc.org', code: '55423-8', display: 'Number of steps' }] },
          subject, device: { display: 'Apple Watch (Apple Health export · zero transit)' },
          valueQuantity: { value: steps.current, unit: 'steps/day' },
          note: [{ text: 'Daily series held in the timeseries schema, not as individual FHIR Observations. Overlaps the Garmin step series over the same 276 days; both are kept with their own provenance rather than merged or summed.' }],
        })
      push('events', {
        id: 'ev-imm-tdap', track: 'procedures', date: '2023-06-14', ref: 'imm-tdap',
        label: 'Tdap immunisation', detail: 'from Apple Health Records', isNew: true,
      })
      patch.records['imm-tdap'] = wrap('imm-tdap', 'Tdap immunisation', 'Immunization · 2023-06-14', {
        resourceType: 'Immunization', id: 'imm-tdap', status: 'completed',
        vaccineCode: { coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '115', display: 'Tdap' }] },
        patient: subject, occurrenceDateTime: '2023-06-14',
        provenance: { source: 'apple-health', sourceName: 'Sutter Health' },
      })
      push('attention', {
        id: 'att-overlap', kind: 'finding',
        title: 'The Apple Watch and the Garmin both count your steps — both are kept',
        body: '276 days overlap. The two are not averaged into a fiction and neither is dropped: each day keeps its own provenance and the Timeline shows them as separate lanes, because they genuinely disagree by a few hundred steps and pretending otherwise would invent a number neither device measured. Deduplication is by content hash, so re-importing this export next quarter adds only what changed.',
        when: 'just now', action: { label: 'See both lanes', to: '/timeline' }, state: 'open',
      })
      patch.counts['apple-health'] = spec.counts.added
      push('trace', trace('Imported Apple Health export — 187 new resources, 5,419 deduped', '/timeline'))
      push('imports', { key, title: spec.title, at: 'just now', note: `${spec.counts.added} new · ${spec.counts.deduped.toLocaleString()} recognised and not duplicated`, counts: spec.counts })
    }

    if (key === 'dicom') {
      const st = spec.study
      push('imaging', st)
      push('events', {
        id: 'ev-knee-mri', track: 'imaging', date: st.date, ref: st.id,
        label: st.study, detail: `${st.series.length} series · ${st.instances} img`, isNew: true,
      })
      patch.records[st.id] = wrap(st.id, st.study, `ImagingStudy · ${st.modality} · ${st.date}`, {
        resourceType: 'ImagingStudy', id: st.id, status: 'available', subject, started: st.date,
        modality: [{ code: st.modality }], numberOfSeries: st.series.length, numberOfInstances: st.instances,
        series: st.series.map((d, i) => ({ uid: `1.2.840.${st.id}.${i}`, description: d })),
        pixelData: 'local disk · excluded from every cloud payload, in every tier',
      })
      push('inventory', {
        id: st.id, label: st.study, domain: 'musculoskeletal', source: 'imaging',
        type: 'ImagingStudy', date: st.date, detail: '3 series · summary only, never pixels',
      })
      push('attention', {
        id: 'att-knee', kind: 'decision',
        title: 'Knee MRI imported — read it locally?',
        body: 'The study is indexed and the pixel data is on this machine’s disk. Nothing has been summarised yet: the local vision model only runs when you ask it to. Imaging pixels are a hard exclusion from any cloud model, in any tier and at any setting — burned-in DICOM tags carry identifiers no stripper can be trusted to catch.',
        when: 'just now', action: { label: 'Summarise on-device', act: 'summarize-mri' }, state: 'open',
      })
      patch.counts.dicom = 1
      push('trace', trace('Imported knee MRI — 240 instances, pixels stayed on disk', '/timeline'))
      push('imports', { key, title: spec.title, at: 'just now', note: '1 study · 240 instances indexed', counts: { added: 1 } })
    }

    if (key === 'genome') {
      // The array adds no new sites — a 650k SNP chip is a sparse subset of a
      // 30× genome. What it can do is disagree, and a disagreement kept is worth
      // more than a duplicate silently discarded.
      const kept = rows.filter(x => x.include)
      for (const r of kept) {
        patch.records[r.id] = wrap(r.id, `${r.name} (2019 array)`, `MolecularSequence · 23andMe v5 · ${r.conflict ? 'conflicts with the 30× sequence' : 'concordant'}`, {
          resourceType: 'MolecularSequence', id: r.id, subject, type: 'dna',
          variant: [{ description: r.detail }],
          concordance: r.conflict ? 'discordant with WGS — sequence preferred' : 'concordant with WGS',
          note: [{
            text: r.conflict
              ? 'Array genotyping has a real error rate at low-frequency and multi-allelic sites; a 30× sequence read is the better call and is what the agent reasons over. The array result is kept, marked discordant, rather than overwritten — a record that quietly drops its own contradictions cannot be audited.'
              : 'Concordant with the stored 30× whole-genome call. Kept as corroboration, not as a second copy.',
          }],
        })
        push('inventory', {
          id: r.id, label: `${r.name} (array)`, domain: 'metabolic',
          source: 'genomics', type: 'MolecularSequence', date: '2019-06-02', detail: r.detail,
        })
      }
      const conflict = kept.find(r => r.conflict)
      if (conflict) {
        push('attention', {
          id: 'att-geno-conflict', kind: 'decision',
          title: 'Two genotyping methods disagree at one site',
          body: 'Your 2019 array calls MTHFR C677T as C/C; your 2025 30× sequence calls it C/T. They cannot both be right. The sequence wins — deeper coverage, fewer assay artefacts — and that is what the agent reasons over. Both calls stay in the record with the disagreement marked, because the alternative is a store that silently launders its own contradictions and then sounds equally confident either way.',
          when: 'just now', action: { label: 'Open the discordant call', record: 'arr-mthfr' }, state: 'open',
        })
      }
      patch.counts.genome = kept.length
      push('trace', trace('Imported the 2019 array — 0 new sites, 1 disagreement with the sequence', '/now'))
      push('imports', {
        key, title: spec.title, at: 'just now',
        note: '638,214 SNPs · 0 new sites (already covered by the 30× genome) · 1 discordant call kept',
        counts: { added: kept.length },
      })
    }

    apply(patch)
  }, [apply])

  // --- the MRI impression, produced only when asked ------------------------
  const summarizeMRI = useCallback(() => {
    const spec = IMPORTS.dicom
    const rec = state.records['img-knee-mri']
    if (!rec) return
    apply({
      records: { 'img-knee-mri': { ...rec, impression: spec.impression } },
      attention: [{
        id: 'att-knee-read', kind: 'finding',
        title: 'Knee MRI read, on this machine',
        body: spec.impression,
        when: 'just now', action: { label: 'Open the study', record: 'img-knee-mri' }, state: 'open',
      }],
      trace: [trace('MedGemma summarised the knee MRI locally — pixels never left', '/now')],
      resolve: { 'att-knee': 'Summarised on-device.' },
    })
  }, [apply, state.records])

  // --- captures ------------------------------------------------------------
  const captureMed = useCallback((med, { held, why } = {}) => {
    const patch = { medications: [], events: [], inventory: [], records: {}, trace: [], attention: [] }
    if (held) {
      patch.attention.push({
        id: `att-hold-${med.id}`, kind: 'block',
        title: `${med.name} — log held, raise it with your clinician`,
        body: why,
        when: 'just now', action: { label: 'Compose a question for your doctor', to: '/share' }, state: 'open',
      })
      patch.trace.push(trace(`${med.name} log held — interaction with lisinopril routed to a clinician`, '/now'))
      apply(patch)
      return
    }
    const m = { ...med, since: anchor, isNew: true }
    patch.medications.push(m)
    patch.events.push({
      id: `ev-${med.id}`, track: 'medications', date: anchor, ref: med.id,
      label: `${med.name} started`, detail: `${med.dose} ${med.freq}`, isNew: true,
    })
    patch.records[med.id] = wrap(med.id, med.name, `MedicationStatement · since ${anchor}`, {
      resourceType: 'MedicationStatement', id: med.id, status: 'active',
      medicationCodeableConcept: { coding: [{ code: med.code, display: med.name }], text: med.name },
      subject, effectiveDateTime: anchor,
      dosage: [{ text: `${med.dose} ${med.freq}`, reason: med.for }],
      provenance: { source: 'capture', method: med.method || 'photo', confidence: 'confirmed by user' },
    })
    patch.inventory.push({
      id: med.id, label: `${med.name} ${med.dose}`, domain: 'metabolic', source: 'notes',
      type: 'MedicationStatement', date: anchor, detail: med.freq,
    })
    patch.trace.push(trace(`Logged ${med.name} ${med.dose} — interaction check passed`, '/timeline'))
    apply(patch)
  }, [apply])

  const captureActivity = useCallback(a => {
    apply({
      events: [{ id: `ev-${a.id}`, track: 'procedures', date: a.date, ref: a.id, label: a.label, detail: a.detail, isNew: true }],
      records: {
        [a.id]: wrap(a.id, a.label, `Observation · activity · ${a.date}`, {
          resourceType: 'Observation', id: a.id, status: 'final',
          category: [{ coding: [{ code: 'activity' }] }],
          code: { text: 'Exercise session' }, subject, effectiveDateTime: a.date,
          valueString: a.detail,
          provenance: { source: 'apple-watch', method: 'passive detection, user-confirmed' },
        }),
      },
      trace: [trace('Confirmed a run the watch had already detected — zero typing', '/timeline')],
    })
  }, [apply])

  const captureReading = useCallback(({ systolic, diastolic, pulse }) => {
    const id = 'obs-bp-today'
    apply({
      labs: [{
        id, code: '85354-9', name: 'Blood pressure', value: `${systolic}/${diastolic}`, unit: 'mmHg',
        low: null, high: null, flag: systolic >= 130 || diastolic >= 80 ? 'out' : 'ok',
        drawn: anchor, panel: 'Self-measured', lab: 'home cuff', isNew: true, text: true,
      }],
      events: [{ id: 'ev-bp-today', track: 'labs', date: anchor, ref: id, label: `BP ${systolic}/${diastolic}`, detail: 'self-measured · home cuff', isNew: true }],
      inventory: [{ id, label: 'Blood pressure', domain: 'cardiac', source: 'labs', type: 'Observation', date: anchor, detail: `${systolic}/${diastolic} mmHg · self-measured` }],
      records: {
        [id]: wrap(id, 'Blood pressure', `Observation · self-measured · ${anchor}`, {
          resourceType: 'Observation', id, status: 'final',
          code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] },
          subject, effectiveDateTime: anchor,
          component: [
            { code: { text: 'Systolic' }, valueQuantity: { value: systolic, unit: 'mmHg' } },
            { code: { text: 'Diastolic' }, valueQuantity: { value: diastolic, unit: 'mmHg' } },
            { code: { text: 'Pulse' }, valueQuantity: { value: pulse, unit: 'bpm' } },
          ],
          provenance: { source: 'manual', device: 'home cuff', quality: 'single reading — not a diagnosis' },
        }),
      },
      attention: [{
        id: 'att-bp-first', kind: 'finding',
        title: `First blood pressure on record in 20 months — ${systolic}/${diastolic}`,
        body: 'One reading is a data point, not a trend, and cuff technique moves it more than most people expect. Three readings a minute apart, seated, on two different days is what makes it worth anything. But the largest hole in the record just got smaller.',
        when: 'just now', action: { label: 'Open the reading', record: id }, state: 'open',
      }],
      resolve: { 'gap-bp': `First reading logged — ${systolic}/${diastolic} mmHg.` },
      trace: [trace(`Logged blood pressure ${systolic}/${diastolic} — the record's biggest gap`, '/timeline')],
      counts: { manual: 1 },
    })
  }, [apply])

  const captureFamily = useCallback(({ relation, condition, age }) => {
    const id = `fam-${relation.toLowerCase()}`
    apply({
      records: {
        [id]: wrap(id, `${relation} — ${condition}`, `FamilyMemberHistory · onset ${age}`, {
          resourceType: 'FamilyMemberHistory', id, status: 'completed', patient: subject,
          relationship: { text: relation },
          condition: [{ code: { text: condition }, onsetAge: { value: Number(age), unit: 'years' } }],
          provenance: { source: 'manual', quality: 'self-reported — recall, not a record' },
        }),
      },
      inventory: [{ id, label: `Family history — ${relation}`, domain: 'cardiac', source: 'notes', type: 'FamilyMemberHistory', date: anchor, detail: `${condition} at ${age}` }],
      resolve: { 'gap-family-paternal': `Recorded: ${relation}, ${condition} at ${age}.` },
      trace: [trace(`Added family history — ${relation}, ${condition} at ${age}`, '/now')],
    })
  }, [apply])

  // --- experiments ---------------------------------------------------------
  const logExperimentDay = useCallback((id, { count = 1, recalled = false, note } = {}) => {
    const cur = state.experiments[id] || {}
    const extra = cur.extraSamples || []
    const add = []
    for (let i = 0; i < count; i++) add.push(WALK_LOG_QUEUE[(extra.length + i) % WALK_LOG_QUEUE.length])
    apply({
      trace: [trace(recalled
        ? `Backfilled ${count} recalled days on the post-meal-walks experiment`
        : 'Logged today on the post-meal-walks experiment — the distribution redrew', '/experiments')],
    })
    dispatch({
      type: 'experiment/patch',
      id,
      patch: {
        extraSamples: [...extra, ...add],
        recalled: (cur.recalled || 0) + (recalled ? count : 0),
        extraDays: (cur.extraDays || 0) + count,
        note: note || cur.note,
      },
    })
    if (!recalled) dispatch({ type: 'attention/set', id: 'att-exp-log', state: 'done', note: 'Logged today.' })
  }, [apply, state.experiments])

  const flagConfounder = useCallback((id, flag) => {
    const cur = state.experiments[id] || {}
    dispatch({ type: 'experiment/patch', id, patch: { confounders: [...(cur.confounders || []), flag] } })
    apply({ trace: [trace(`Flagged a confounder (${flag.flag}) on a running experiment — shown, not dropped`, '/experiments')] })
  }, [apply, state.experiments])

  const closeExperiment = useCallback((id, verdictBundle) => {
    dispatch({ type: 'experiment/patch', id, patch: { closed: true, ...verdictBundle } })
    apply({
      trace: [trace(`Closed the post-meal-walks window — verdict: ${verdictBundle.verdict}`, '/experiments')],
      attention: [{
        id: `att-verdict-${id}`, kind: 'finding',
        title: `Experiment closed — ${verdictBundle.verdict}`,
        body: verdictBundle.resultText,
        when: 'just now', action: { label: 'Read the result', to: '/experiments' }, state: 'open',
      }],
    })
  }, [apply])

  const addExperiment = useCallback(exp => {
    apply({
      newExperiments: [exp],
      records: {
        [exp.id]: wrap(exp.id, exp.hypothesis.statement.replace(/\.$/, ''), `ayuos.experiment · ${exp.status}`, {
          resourceType: 'Basic', id: exp.id, code: { text: 'n-of-1 experiment' }, subject,
          goal: exp.goal, hypothesis: exp.hypothesis.statement, rationale: exp.hypothesis.rationale,
          evidence_strength: exp.hypothesis.evidence, confidence: exp.hypothesis.confidence,
          design: exp.design, status: exp.status, started: exp.started,
          success_criterion: exp.successCriterion,
          success_criterion_locked_at: exp.started,
          metrics: exp.metrics.map(m => `${m.name} (${m.unit}) · ${m.source}`),
          baseline: `${exp.baseline.window} — no samples yet`,
        }),
      },
      events: [{ id: `ev-${exp.id}`, track: 'procedures', date: anchor, ref: exp.id, label: `${exp.hypothesis.statement.slice(0, 44)}… — n-of-1 start`, detail: `${exp.design} · criterion locked`, isNew: true }],
      attention: [{
        id: `att-${exp.id}`, kind: 'decision',
        title: 'New experiment pre-registered',
        body: `The success bar is fixed and greyed out before day one: ${exp.successCriterion} You cannot move it after you see the data — that is the whole mechanism.`,
        when: 'just now', action: { label: 'Open the experiment', to: '/experiments' }, state: 'open',
      }],
      trace: [trace('Pre-registered a new n-of-1 — criterion locked before day one', '/experiments')],
    })
  }, [apply])

  // --- corrections ---------------------------------------------------------
  const correctRecord = useCallback((id, patch, label) => {
    dispatch({ type: 'record/correct', id, patch })
    apply({
      trace: [trace(
        patch.excluded ? `Excluded ${label || id} from the agent's reasoning`
          : patch.value != null ? `Corrected ${label || id} to ${patch.value}`
            : `Annotated ${label || id}`, '/now')],
      attention: patch.excluded ? [{
        id: `att-excl-${id}`, kind: 'decision',
        title: `${label || id} is excluded from reasoning`,
        body: `Reason given: “${patch.reason || 'not stated'}”. The original value is kept — exclusion hides it from the agent and from any sliver you compose, it does not delete it. Undo it from the record at any time.`,
        when: 'just now', action: { label: 'Open the record', record: id }, state: 'open',
      }] : [],
    })
  }, [apply])

  const uncorrectRecord = useCallback(id => dispatch({ type: 'record/uncorrect', id }), [])

  // --- connectors ----------------------------------------------------------
  const resyncConnector = useCallback(id => {
    dispatch({ type: 'connector/set', id, patch: { status: 'active', error: null, lastSync: 'just now', backfilled: 41 } })
    dispatch({ type: 'attention/set', id: 'att-whoop', state: 'done', note: 'Re-synced — 41 recovery records backfilled.' })
    apply({
      counts: { whoop: 41 },
      trace: [trace('Whoop re-synced — 41 records backfilled, nothing was lost while it was down', '/data')],
    })
  }, [apply])

  const breakConnector = useCallback((id, error) => {
    dispatch({ type: 'connector/set', id, patch: { status: 'error', error } })
  }, [])

  // --- attention -----------------------------------------------------------
  const resolveAttention = useCallback((id, note) => dispatch({ type: 'attention/set', id, state: 'done', note }), [])
  const snoozeAttention = useCallback((id, note) => dispatch({ type: 'attention/set', id, state: 'snoozed', note: note || 'Snoozed for 30 days — it will come back, it is not gone.' }), [])
  const reopenAttention = useCallback(id => dispatch({ type: 'attention/set', id, state: 'open' }), [])

  const addArtifact = useCallback(art => {
    apply({
      artifacts: [art],
      trace: [trace(`Generated ${art.format === 'link' ? 'a hosted share link' : 'a local file'} — ${art.purpose}`, '/share')],
    })
  }, [apply])

  const actions = useMemo(() => ({
    commitImport, summarizeMRI, captureMed, captureActivity, captureReading, captureFamily,
    logExperimentDay, flagConfounder, closeExperiment, addExperiment,
    correctRecord, uncorrectRecord, resyncConnector, breakConnector,
    resolveAttention, snoozeAttention, reopenAttention, addArtifact,
  }), [commitImport, summarizeMRI, captureMed, captureActivity, captureReading, captureFamily,
    logExperimentDay, flagConfounder, closeExperiment, addExperiment,
    correctRecord, uncorrectRecord, resyncConnector, breakConnector,
    resolveAttention, snoozeAttention, reopenAttention, addArtifact])

  const value = useMemo(() => ({ state, actions }), [state, actions])
  // `createElement` rather than JSX so this module can stay a plain `.js` file.
  return createElement(Ctx.Provider, { value }, children)
}

export const useSession = () => useContext(Ctx)

// ---------------------------------------------------------------------------
// selectors — every view reads `base mock + overlay` through one of these
// ---------------------------------------------------------------------------

// A lab value with any session correction applied, keeping the original.
function applyCorrection(l, c) {
  if (!c) return l
  return {
    ...l,
    value: c.value != null ? c.value : l.value,
    unit: c.unit || l.unit,
    corrected: c.value != null || !!c.unit,
    excluded: !!c.excluded,
    correctionNote: c.note,
    correctionReason: c.reason,
    original: c.value != null ? l.value : undefined,
  }
}

export function useLabs() {
  const { state } = useSession()
  return useMemo(() => {
    const base = P.labs || []
    return [...base, ...state.labs].map(l => applyCorrection(l, state.corrections[l.id]))
  }, [state.labs, state.corrections])
}

export function useWearables() {
  const { state } = useSession()
  return useMemo(() => [...(P.wearables || []), ...state.wearables], [state.wearables])
}

export function useEvents() {
  const { state } = useSession()
  return useMemo(() => {
    const excluded = new Set(Object.entries(state.corrections).filter(([, c]) => c.excluded).map(([k]) => k))
    return [...(P.events || []), ...state.events].filter(e => !excluded.has(e.ref))
  }, [state.events, state.corrections])
}

export function useImaging() {
  const { state } = useSession()
  return useMemo(() => [...(P.imaging || []), ...state.imaging], [state.imaging])
}

export function useMedications() {
  const { state } = useSession()
  return useMemo(() => [...(P.medications || []), ...state.medications], [state.medications])
}

export function useInventory() {
  const { state } = useSession()
  return useMemo(() => {
    const excluded = new Set(Object.entries(state.corrections).filter(([, c]) => c.excluded).map(([k]) => k))
    return [...baseInventory, ...state.inventory].filter(i => !excluded.has(i.id))
  }, [state.inventory, state.corrections])
}

// Merged experiments: base three + any created this session, with logged days
// folded into the intervention arm and the stats recomputed from real samples.
export function useExperiments() {
  const { state } = useSession()
  return useMemo(() => {
    const merge = e => {
      const patch = state.experiments[e.id]
      if (!patch) return e
      const extra = patch.extraSamples || []
      const samples = [...(e.intervention.samples || []), ...extra]
      const interv = { ...e.intervention, samples, stats: stats(samples) }
      const out = {
        ...e,
        intervention: interv,
        effectD: cohenD(e.baseline.samples, samples),
        adherence: e.adherence ? { ...e.adherence, done: e.adherence.done + (patch.extraDays || 0) } : e.adherence,
        confounders: [...(e.confounders || []), ...(patch.confounders || [])],
        recalledDays: patch.recalled || 0,
        loggedThisSession: patch.extraDays || 0,
      }
      if (patch.closed) {
        out.status = 'complete'
        out.verdict = patch.verdict
        out.resultText = patch.resultText
        out.underpowered = patch.underpowered
        out.ended = anchor
      }
      return out
    }
    return [...baseExperiments.map(merge), ...state.newExperiments.map(merge)]
  }, [state.experiments, state.newExperiments])
}

// Connector status/record-count with session overrides folded in.
export function useConnectors() {
  const { state } = useSession()
  return useMemo(() => ({
    streams: baseStreams.map(s => ({
      ...s,
      ...(state.connectors[s.id] || {}),
      records: s.records + (state.counts[s.id] || 0),
    })),
    files: baseFiles.map(f => ({
      ...f,
      records: f.records + (state.counts[f.id] || 0),
      importedThisSession: !!state.imported[f.id],
    })),
  }), [state.connectors, state.counts, state.imported])
}

// Attention items + the record gaps that have not been filled.
export function useAttention() {
  const { state } = useSession()
  return useMemo(() => {
    const open = state.attention.filter(a => a.state === 'open')
    const filled = RECORD_GAPS.filter(g => state.gapsFilled[g.id])
      .map(g => ({ ...g, how: state.gapsFilled[g.id] }))
    const gaps = RECORD_GAPS.filter(g => !state.gapsFilled[g.id])
    return { all: state.attention, open, gaps, filled, count: open.length }
  }, [state.attention, state.gapsFilled])
}

// Any record the session created, for the shared source drawer.
export function useSessionRecord(id) {
  const { state } = useSession()
  return id ? state.records[id] || null : null
}

export { RECORD_GAPS }
