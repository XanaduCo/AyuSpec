// Context assembly — the step between "the user asked something" and "a model
// was given a prompt".
//
// With ~62,000 stored rows, the interesting product question is no longer "can
// it answer?" but "what did it look at, what did it leave out, and why?" This
// module computes that, deterministically, from the real index in `store.js`
// plus the authored plan in `mock/retrieval.js`.
//
// Three things it deliberately keeps separate, because collapsing them is the
// failure mode the whole surface exists to prevent:
//
//   1. RELEVANCE  — dropped because it is not about this question. Neutral ink.
//   2. POLICY     — withheld because it may not leave the device (genome by
//                   default, imaging pixels and raw documents always). Red.
//   3. BUDGET     — evicted because it did not fit. Neutral, with a number.
//
// And one that is a transform rather than an omission: the PII gateway *strips*
// identifiers from what does go, which is amber — it left, in altered form.

import { addDays, daysBetween } from '../mock/rng.js'
import { anchor } from '../mock/persona.js'
import { candidates, unitById, toTokens, indexedRowsExGenome, units } from './store.js'
import { specFor } from '../mock/retrieval.js'

// --- why a record made the cut ---------------------------------------------
// Hue-free by construction: these are epistemic labels, not privacy signals, so
// they must never borrow green/amber (design-system.md, colour law).
export const REASONS = {
  guideline: { glyph: '▤', label: 'guideline-cited', weight: 10, desc: 'A guideline the planner retrieved names this marker by code.' },
  unique: { glyph: '◆', label: 'only one of its kind', weight: 9, desc: 'The record contains exactly one measurement like this — there is nothing to compare or average it against.' },
  outlier: { glyph: '!', label: 'out of range', weight: 9, desc: 'Outside its reference range, or outside its own two-year history.' },
  quality: { glyph: '⊙', label: 'measurement quality', weight: 8, desc: 'Where two sources disagree, the higher-quality measurement is pulled so the answer can say which it is quoting.' },
  change: { glyph: '△', label: 'change-point', weight: 8, desc: 'Moved further inside the window than its own historical variability.' },
  contradiction: { glyph: '⊗', label: 'disconfirms', weight: 7, desc: 'Retrieved because it argues *against* the emerging answer. Selecting only confirming records is how a retriever lies.' },
  baseline: { glyph: '⊢', label: 'baseline', weight: 7, desc: 'Pulled from outside the window deliberately — a delta needs a denominator.' },
  corroborate: { glyph: '≈', label: 'corroborates', weight: 6, desc: 'An independent source pointing at the same conclusion.' },
  aggregate: { glyph: 'Σ', label: 'aggregated', weight: 6, desc: 'A large series, summarised on the way in rather than sent row by row.' },
  experiment: { glyph: '⁘', label: 'active experiment', weight: 6, desc: 'A running n-of-1 is already testing this question.' },
  correlation: { glyph: '∿', label: 'co-moves', weight: 5, desc: 'Covaries with the metric in question above the planner\'s threshold.' },
  recency: { glyph: '◷', label: 'most recent', weight: 4, desc: 'Newest measurement of its kind inside the window.' },
  coverage: { glyph: '◌', label: 'coverage gap', weight: 4, desc: 'A hole in the data. Retrieved because it changes what can be claimed.' },
  vector: { glyph: '~', label: 'semantic match', weight: 3, desc: 'Nearest-neighbour hit against the embedded record.' },
  'weak-signal': { glyph: '·', label: 'checked, unremarkable', weight: 1, desc: 'In range and unmoved. Included so the answer can say it looked rather than staying silent.' },
}

// --- why a record did not ---------------------------------------------------
export const DROP_REASONS = {
  superseded: { label: 'summarised instead', desc: 'A derived summary of this series was selected, so the raw rows are redundant.' },
  unchanged: { label: 'in range, unmoved', desc: 'Inside its reference range and within its own noise since the prior draw.' },
  'weak-match': { label: 'peripheral to the question', desc: 'Matched the concept net on one distant tag only.' },
  stale: { label: 'predates the window', desc: 'Newest value is older than the window the question implies.' },
  redundant: { label: 'covered by a selection', desc: 'Another selected record already carries this information.' },
}

export const POLICY_RULES = {
  genome: {
    rule: 'default exclusion · reversible',
    tone: 'block',
    short: 'genomic data',
    desc: 'A genome identifies you and blood relatives who never consented, so stripping a name changes nothing. Excluded from cloud calls by default — you can opt in per call, and the ledger records it.',
  },
  pixels: {
    rule: 'hard exclusion · not reversible',
    tone: 'block',
    short: 'imaging pixel data',
    desc: 'Burned-in DICOM identifiers are not the clean extracted text the stripper operates on. Never sent to a cloud model under any setting; the extracted impression flows through the normal path.',
  },
  'raw-doc': {
    rule: 'hard exclusion · not reversible',
    tone: 'block',
    short: 'raw source documents',
    desc: 'Original PDFs and export files carry unbounded identifiers — scanned letterheads, export metadata — that regex and NER cannot be trusted to catch.',
  },
}

// Token budget for RETRIEVED CONTEXT. The cloud number is smaller than the local
// one on purpose, and that inversion is the whole thesis: the cloud model's
// window is 200k, so this is not a capability limit. It is a policy limit. Every
// token sent off-device is a token that left.
export const BUDGETS = {
  cloud: { cap: 8000, why: 'The model\'s window is 200k tokens. This budget is 8k because the constraint is egress, not capacity — the retriever spends as few tokens off-device as the answer allows.' },
  local: { cap: 24000, why: 'Nothing leaves the device, so there is no reason to be frugal. The local budget is three times the cloud one and nothing in it is stripped.' },
}

const virtualUnit = (pick, spec) => ({
  id: pick.id, label: pick.label || pick.id, kind: 'virtual', group: 'Derived',
  date: anchor, rows: 1, tags: spec.tags.slice(0, 2), rawBytes: 240, summaryBytes: 240,
  quality: 'derived', pii: 0, virtual: true,
})

function scoreOf(reasons) {
  const w = reasons.map(r => REASONS[r]?.weight || 2)
  return Math.max(0, ...w) + reasons.length * 0.1
}

/**
 * Assemble the context for one question under one posture and one set of
 * counterfactual toggles.
 *
 * @param question  the user's question (keys `mock/retrieval.js`)
 * @param where     'local' | 'cloud' — the reasoner's resolved location
 * @param toggles   { genome, widen, raw } booleans
 */
export function assemble(question, { where = 'cloud', toggles = {} } = {}) {
  const spec = specFor(question)
  const cf = spec.counterfactuals || {}

  // 1 · the window ------------------------------------------------------------
  const windowDays = toggles.widen && cf.widen ? cf.widen.days : spec.windowDays
  const from = addDays(anchor, -windowDays)
  const windowLabel = toggles.widen && cf.widen ? cf.widen.label
    : windowDays >= 365 ? `${Math.round(windowDays / 365)} year${windowDays >= 700 ? 's' : ''}` : `${windowDays} days`

  // 2 · candidate sweep — mechanical, no model involved -----------------------
  const cand = candidates({ tags: spec.tags, from, to: anchor })
  const consideredRows = cand.reduce((a, x) => a + x.rows, 0)

  // 3 · what the genome's status is under this posture ------------------------
  // Under a local reasoner the default exclusion does not apply: nothing is
  // leaving, so there is nothing to protect it from.
  const genomeIncluded = where === 'local' || !!toggles.genome
  const genomeAuto = where === 'local'

  // 4 · the picks -------------------------------------------------------------
  const picks = [...(spec.picks || [])]
  if (genomeIncluded && cf.genome?.picks) {
    for (const id of cf.genome.picks) picks.push({ id, reasons: ['guideline', 'corroborate'], fromToggle: 'genome' })
  }
  if (toggles.widen && cf.widen?.picks) {
    for (const id of cf.widen.picks) picks.push({ id, reasons: ['baseline', 'coverage'], fromToggle: 'widen' })
  }
  if (toggles.raw && cf.raw?.unitId) {
    picks.push({ id: cf.raw.unitId, reasons: ['aggregate'], mode: 'full', fromToggle: 'raw' })
  }

  const seen = new Set()
  let selected = []
  for (const pick of picks) {
    if (seen.has(pick.id)) continue
    seen.add(pick.id)
    const unit = pick.virtual ? virtualUnit(pick, spec) : unitById[pick.id]
    if (!unit) continue
    // A genomic pick under a cloud reasoner without opt-in never becomes a
    // selection — it is a policy item, handled below.
    if (unit.policy === 'genome' && !genomeIncluded) continue
    if (unit.policy === 'pixels' || unit.policy === 'raw-doc') continue
    const mode = pick.mode === 'full' || (toggles.raw && cf.raw?.unitId === pick.id) ? 'full' : (pick.mode || 'summary')
    const bytes = mode === 'full' ? unit.rawBytes : unit.summaryBytes
    selected.push({
      id: unit.id, unit, label: pick.label || unit.label, reasons: pick.reasons || ['vector'],
      note: pick.note, mode, bytes, tokens: toTokens(bytes),
      // A record the user explicitly toggled in outranks everything: they asked
      // for it, so if something has to be evicted it should not be that.
      score: pick.fromToggle ? 20 : scoreOf(pick.reasons || ['vector']),
      fromToggle: pick.fromToggle,
      resolvable: !unit.virtual,
    })
  }
  selected.sort((a, b) => b.score - a.score || a.tokens - b.tokens)

  // 5 · budget & eviction -----------------------------------------------------
  const budget = BUDGETS[where] || BUDGETS.cloud
  // The system prompt + the question itself are not free.
  // The system prompt, the evidence-labelling instructions and the question
  // itself, plus the retrieved guideline statements. None of it is free.
  const overhead = 1100 + (spec.guidelines || []).length * 46
  let used = overhead
  const kept = [], evicted = []
  for (const s of selected) {
    if (used + s.tokens <= budget.cap) { used += s.tokens; kept.push(s) }
    else evicted.push({ ...s, dropReason: 'budget' })
  }
  const requested = overhead + selected.reduce((a, s) => a + s.tokens, 0)
  selected = kept

  // 6 · aggregation ledger ----------------------------------------------------
  const aggregations = (spec.aggregate || []).map(a => {
    const unit = unitById[a.id]
    if (!unit) return null
    const sent = selected.find(s => s.id === a.id)
    const outBytes = sent?.mode === 'full' ? unit.rawBytes : unit.summaryBytes
    return {
      id: a.id, label: unit.label, method: a.method,
      rows: unit.rows, rawBytes: unit.rawBytes, outBytes,
      rawTokens: toTokens(unit.rawBytes), outTokens: toTokens(outBytes),
      savedPct: Math.round((1 - outBytes / unit.rawBytes) * 100),
      bypassed: sent?.mode === 'full',
    }
  }).filter(Boolean)

  // 7 · policy — what is withheld, and under which rule -----------------------
  const policy = []
  const genomicCandidates = cand.filter(x => x.policy === 'genome')
  if (genomicCandidates.length && !genomeIncluded) {
    policy.push({
      kind: 'genome', ...POLICY_RULES.genome,
      count: genomicCandidates.length,
      items: genomicCandidates.slice(0, 6).map(x => x.label),
      reversible: true,
      relevantHere: (cf.genome?.picks || []).length,
      noneRelevant: cf.genome?.noneRelevant || null,
    })
  }
  const pixelCandidates = cand.filter(x => x.policy === 'pixels')
  if (pixelCandidates.length && where === 'cloud') {
    policy.push({
      kind: 'pixels', ...POLICY_RULES.pixels,
      count: pixelCandidates.length,
      items: pixelCandidates.map(x => `${x.label} (${x.rows.toLocaleString()} instances)`),
      reversible: false,
      substitute: 'The MedGemma-extracted impression was used instead, and it is in the selection above.',
    })
  }

  // 8 · relevance drops — computed, with a reason each ------------------------
  const selectedIds = new Set([...selected.map(s => s.id), ...evicted.map(s => s.id)])
  const aggregatedIds = new Set(aggregations.map(a => a.id))
  const dropped = []
  for (const x of cand) {
    if (selectedIds.has(x.id)) continue
    if (x.policy) continue // handled as policy, never as relevance
    let reason = 'weak-match'
    if (x.expensive && [...aggregatedIds].some(id => siblingOf(id, x.id))) reason = 'superseded'
    else if (x.kind === 'lab' && x.flag === 'ok') reason = 'unchanged'
    else if ((x.to || x.date) < from) reason = 'stale'
    else if (x.kind === 'raw') reason = 'superseded'
    dropped.push({ id: x.id, label: x.label, group: x.group, rows: x.rows, reason, tokensSaved: toTokens(x.rawBytes) })
  }
  const dropGroups = Object.keys(DROP_REASONS).map(k => {
    const items = dropped.filter(d => d.reason === k)
    return {
      key: k, ...DROP_REASONS[k], count: items.length,
      rows: items.reduce((a, d) => a + d.rows, 0),
      tokensSaved: items.reduce((a, d) => a + d.tokensSaved, 0),
      items: items.sort((a, b) => b.rows - a.rows).slice(0, 8),
    }
  }).filter(g => g.count)

  // 9 · the gateway — a transform, not an omission ---------------------------
  const piiCount = selected.reduce((a, s) => a + (s.unit.pii || 0), 0)
  const gateway = where === 'cloud'
    ? {
      applied: true,
      redactions: {
        PERSON: Math.min(piiCount, Math.round(piiCount * 0.42)),
        FACILITY: Math.round(piiCount * 0.31),
        MRN: piiCount > 8 ? 1 : 0,
      },
      total: piiCount,
      dateShift: -117,
      note: 'Stripping is unconditional for a cloud destination — it cannot be turned off. What is configurable is how often you are asked to confirm.',
    }
    : {
      applied: true,
      redactions: {},
      total: 0,
      dateShift: 0,
      note: 'Local destination: the gateway is a no-op passthrough. Nothing is stripped, dates are not shifted — and the call is still written to the ledger.',
    }

  // 10 · caveats the answer has to carry -------------------------------------
  const caveats = []
  const c = spec.caveats || {}
  if (!genomeIncluded && policy.some(p => p.kind === 'genome') && c.genomeExcluded) {
    caveats.push({ key: 'genome', tone: 'block', text: c.genomeExcluded })
  }
  const genomicSelected = selected.filter(s => s.unit.policy === 'genome')
  if (genomeIncluded && genomicSelected.length) {
    caveats.push({
      key: 'genome-on', tone: genomeAuto ? 'local' : 'egress',
      text: genomeAuto
        ? 'Your genome was available to this answer. The reasoner is local, so it never had to leave the device and the default cloud exclusion did not apply.'
        : 'Your genome was included by your explicit choice. That payload is permanently identifiable — of you and of your blood relatives — and is recorded in the ledger like any other call.',
    })
  }
  if (where === 'cloud' && policy.some(p => p.kind === 'pixels') && c.pixelsExcluded) {
    caveats.push({ key: 'pixels', tone: 'block', text: c.pixelsExcluded })
  }
  if (evicted.length) {
    const oversized = evicted.filter(e => e.tokens + overhead > budget.cap)
    caveats.push({
      key: 'budget', tone: 'neutral',
      text: oversized.length
        ? `${oversized.map(e => e.label).join(', ')} could not be sent at any point: ${oversized[0].tokens.toLocaleString()} tokens against a ${budget.cap.toLocaleString()}-token budget. This is not a matter of dropping other records — it does not fit alone.`
        : `${evicted.length} record${evicted.length > 1 ? 's' : ''} did not fit the ${budget.cap.toLocaleString()}-token budget and ${evicted.length > 1 ? 'were' : 'was'} evicted: ${evicted.map(e => e.label).join(', ')}. The answer is narrower than the record allows.`,
    })
  }
  for (const k of ['coverage', 'speciation', 'quality', 'design', 'screening', 'empty', 'local', 'demo']) {
    if (c[k]) caveats.push({ key: k, tone: 'neutral', text: c[k] })
  }

  // 11 · answer addenda from active toggles ----------------------------------
  // An addendum only appears if the data behind it actually reached the model.
  // A counterfactual that claims a finding from a payload the budget refused
  // would be the exact dishonesty this whole surface exists to make impossible.
  const addenda = []
  if (genomeIncluded && cf.genome?.addendum && genomicSelected.length) {
    addenda.push({ key: 'genome', blocks: cf.genome.addendum })
  }
  if (toggles.widen && cf.widen?.addendum) addenda.push({ key: 'widen', blocks: cf.widen.addendum })
  if (toggles.raw && cf.raw?.addendum) {
    const sent = selected.some(s => s.id === cf.raw.unitId)
    addenda.push(sent
      ? { key: 'raw', blocks: cf.raw.addendum }
      : { key: 'raw', blocked: true, blocks: [{ kind: 'p', text: `**The raw payload did not fit.** ${evicted.find(e => e.id === cf.raw.unitId)?.tokens.toLocaleString() || '—'} tokens against a ${budget.cap.toLocaleString()}-token budget, so nothing was sent and the answer above is unchanged. Switch the reasoner to a local model in **Settings** and the same toggle has three times the room.` }] })
  }

  // 12 · the toggles themselves ----------------------------------------------
  const rawUnit = cf.raw?.unitId ? unitById[cf.raw.unitId] : null
  const counterfactuals = [
    cf.genome && {
      key: 'genome',
      label: genomeAuto ? 'Genome — included (local reasoner)' : 'Include the genome',
      on: genomeIncluded,
      locked: genomeAuto,
      lockNote: genomeAuto ? 'The reasoner is local, so nothing leaves and the default exclusion has nothing to protect against. Switch the reasoner to a cloud provider in Settings to see the exclusion bite.' : null,
      detail: cf.genome.noneRelevant
        || `${genomicCandidates.length} genomic findings match this question; ${(cf.genome.picks || []).length} would actually be selected.`,
      cost: `+${toTokens((cf.genome.picks || []).length * 190)} tok`,
      warn: !genomeAuto,
      warnText: 'A genome cannot be de-identified. Sending it makes the payload permanently identifiable.',
      disabled: !cf.genome.picks?.length,
    },
    cf.widen && {
      key: 'widen',
      label: `Widen the window to ${cf.widen.label}`,
      on: !!toggles.widen,
      detail: `${spec.windowDays} days → ${cf.widen.days} days. Re-runs the candidate sweep, not just the filter.`,
      cost: 're-scores the whole candidate set',
    },
    cf.raw && rawUnit && {
      key: 'raw',
      label: cf.raw.label,
      on: !!toggles.raw,
      detail: `${rawUnit.rows.toLocaleString()} rows · ${fmtBytes(rawUnit.rawBytes)} raw vs ${fmtBytes(rawUnit.summaryBytes)} summarised.`,
      cost: `+${(toTokens(rawUnit.rawBytes) - toTokens(rawUnit.summaryBytes)).toLocaleString()} tok`,
      breaks: toTokens(rawUnit.rawBytes) > budget.cap,
    },
  ].filter(Boolean)

  return {
    question, spec, where, windowDays, windowLabel, from, to: anchor,
    plan: spec.plan || [],
    guidelines: spec.guidelines || [],
    considered: {
      units: cand.length, rows: consideredRows,
      indexRows: indexedRowsExGenome, indexUnits: units.length,
    },
    selected, evicted, aggregations, policy, dropped, dropGroups, gateway,
    budget: {
      cap: budget.cap, why: budget.why, used, requested,
      pct: Math.min(100, Math.round((used / budget.cap) * 100)),
      requestedPct: Math.round((requested / budget.cap) * 100),
      over: requested > budget.cap, overBy: Math.max(0, requested - budget.cap),
      overhead,
    },
    caveats, addenda, counterfactuals,
    genomeIncluded, genomeAuto,
    // The one-line summary the collapsed strip shows.
    headline: `${consideredRows.toLocaleString()} rows considered → ${selected.length} selected`,
  }
}

// Do these two ids describe the same underlying data at different granularity?
function siblingOf(aggId, rawId) {
  const pairs = {
    'cgm-summary': 'cgm-raw', 'block-summary': 'activities-raw',
    'nutr-seafood-trend': 'nutrition-raw', 'sleep-summary': 'sleep-raw',
  }
  return pairs[aggId] === rawId
}

export function fmtBytes(b) {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  if (b >= 1024) return `${Math.round(b / 1024)} KB`
  return `${b} B`
}

export { daysBetween }
