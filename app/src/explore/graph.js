// The compiled healthspan graph is the single source of truth in
// prototype/seed/graph.json, regenerated and validated by prototype/build.mjs.
// We import it directly so a graph rebuild flows straight into the app.
import GRAPH from '../../../prototype/seed/graph.json'

export { GRAPH }
export const N = new Map(GRAPH.nodes.map(n => [n.id, n]))
export const E = GRAPH.edges
export const byType = t => E.filter(e => e.type === t)
export const nodesOf = t => GRAPH.nodes.filter(n => n.type === t)
export const title = id => N.get(id)?.title ?? id

// Ordinal scales — declaration order IS the ordering.
export const ORD = {
  effect_size: ['none', 'small', 'moderate', 'large'],
  evidence_strength: ['none', 'low', 'moderate', 'high'],
  certainty: ['low', 'moderate', 'high'],
  adherence_realism: ['low', 'moderate', 'high'],
  effort: ['trivial', 'low', 'moderate', 'high'],
  priority_delta: ['none', 'small', 'moderate', 'large'],
}
export const rank = (scale, v) => {
  const i = ORD[scale].indexOf(v)
  return i < 0 ? -1 : i
}
export const PRECEDENCE = { BLOCKS: 1, REQUIRES: 2, ADJUSTS: 3, CAUTIONS: 4, ELEVATES: 5 }

export const AXES = ['effect_size', 'evidence_strength', 'certainty', 'time_to_effect',
  'cost', 'risk', 'effort', 'reversibility', 'adherence_realism']

export const PRESETS = [
  ['I want to swim, and my heel hurts', ['md-prefers-swimming', 'md-plantar-fasciitis']],
  ['Chronic back pain, want to get fitter', ['md-chronic-low-back-pain']],
  ['Pre-diabetic, deskbound, no gym', ['rf-prediabetes', 'md-no-gym-access', 'md-time-poor']],
  ['Knee osteoarthritis in a hot climate', ['md-knee-osteoarthritis', 'md-hot-humid-climate']],
  ['Low bone density, older adult', ['md-osteoporosis', 'md-older-adult']],
  ['Chest pain when I exert myself', ['md-exertional-chest-pain']],
]
