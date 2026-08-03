// Modifier resolution — ported verbatim (logic-preserving) from the original
// single-file explorer. See prototype/ARCHITECTURE.md §Modifier resolution.
// Pure functions over the graph and a Set of active fact ids; no DOM.
import { N, E, byType, rank, PRECEDENCE } from './graph.js'

export function resolve(functionId, factsSet) {
  const supports = byType('SUPPORTS').filter(e => e.to === functionId)
  const active = [...factsSet]

  // Phase 1 — collect every modifier edge from an active fact onto a candidate.
  const collect = ivId => E.filter(e =>
    PRECEDENCE[e.type] && active.includes(e.from) &&
    (e.to === ivId || (e.to === '*' && e.type === 'BLOCKS')))

  // Phase 4 — fold in precedence order. Only BLOCKS is terminal; REQUIRES /
  // ADJUSTS / CAUTIONS accumulate. ELEVATES takes max, never a sum.
  function fold(ivId) {
    const applied = collect(ivId).sort((a, b) =>
      PRECEDENCE[a.type] - PRECEDENCE[b.type] || a.from.localeCompare(b.from))
    const trail = [], prereqs = new Map(), adjustments = new Map()
    let state = 'available', promotion = null, redFlag = null, suppress = false

    for (const e of applied) {
      const a = e.attrs ?? {}
      const text = a.resolution_text ?? a.caveat ?? a.adjustment ?? a.reason ?? ''
      trail.push({ type: e.type, modifier: e.from, text, citations: e.citations ?? [],
        dimension: a.dimension, escalates: a.escalates_to, when: a.escalation_when })
      if (e.type === 'BLOCKS') {
        state = 'blocked'
        if (a.routing === 'clinician') redFlag = e
        if (a.suppress_substitutes) suppress = true
      } else if (e.type === 'REQUIRES') {
        if (state === 'available') state = 'sequenced'
        if (a.prerequisite_node_id) prereqs.set(a.prerequisite_node_id, e.from)
      } else if (e.type === 'ADJUSTS') {
        if (state === 'available') state = 'adjusted'
        const d = a.dimension ?? 'other'
        if (!adjustments.has(d)) adjustments.set(d, [])
        adjustments.get(d).push({ text: a.adjustment ?? text, by: e.from })
      } else if (e.type === 'CAUTIONS') {
        if (state === 'available') state = 'cautioned'
      } else if (e.type === 'ELEVATES') {
        const d = rank('priority_delta', a.priority_delta ?? 'moderate')
        if (!promotion || d > promotion.delta)
          promotion = { delta: d, by: e.from, reason: a.reason ?? '' }
      }
    }
    return { state, trail, prereqs, adjustments, promotion, redFlag, suppress }
  }

  const rows = supports.map(s => ({ id: s.from, node: N.get(s.from), support: s, ...fold(s.from) }))
    .filter(r => r.node)

  // Phase 5 — substitutes for blocked candidates, resolved once.
  for (const r of rows.filter(r => r.state === 'blocked' && !r.suppress)) {
    r.substitutes = byType('SUBSTITUTES')
      .filter(e => e.from === r.id &&
        (!e.attrs?.serves_function_id || e.attrs.serves_function_id === functionId))
      .map(e => ({ to: e.to, delta: e.attrs?.effect_delta, reason: e.attrs?.reason }))
      .filter(s => N.has(s.to) && fold(s.to).state !== 'blocked')
  }

  // Phase 6 — Pareto tiers over (effect_size, evidence_strength).
  const live = rows.filter(r => r.state !== 'blocked')
  const pair = r => [rank('effect_size', r.support.attrs?.effect_size),
    rank('evidence_strength', r.support.attrs?.evidence_strength)]
  const dominates = (a, b) => {
    const [ae, av] = pair(a), [be, bv] = pair(b)
    return ae >= be && av >= bv && (ae > be || av > bv)
  }
  let pool = [...live], depth = 0
  while (pool.length) {
    const front = pool.filter(a => !pool.some(b => b !== a && dominates(b, a)))
    if (!front.length) { pool.forEach(r => { r.tier = depth }); break }
    front.forEach(r => { r.tier = depth })
    pool = pool.filter(r => !front.includes(r))
    depth++
  }
  // Promotion: at most one tier, never past the top, always labelled.
  for (const r of live) if (r.promotion && r.tier > 0) { r.tier -= 1; r.promoted = true }

  const maxTier = live.reduce((m, r) => Math.max(m, r.tier ?? 0), 0)
  const grouped = []
  for (let i = 0; i <= maxTier; i++) {
    const members = live.filter(r => r.tier === i).sort((a, b) =>
      rank('certainty', b.support.attrs?.certainty) - rank('certainty', a.support.attrs?.certainty) ||
      rank('adherence_realism', b.support.attrs?.adherence_realism) - rank('adherence_realism', a.support.attrs?.adherence_realism) ||
      rank('effort', a.support.attrs?.effort) - rank('effort', b.support.attrs?.effort) ||
      a.id.localeCompare(b.id))
    if (members.length) grouped.push(members)
  }
  return { grouped, blocked: rows.filter(r => r.state === 'blocked') }
}
