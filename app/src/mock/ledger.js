// The call ledger — every model invocation, local or cloud, appended forever.
// Mirrors ayuos.model_calls from docs/ai-transparency.md. Fabricated payloads.

export const ledger = [
  {
    id: '01J8F2K7',
    time: '10:23:14', day: 'today',
    role: 'reasoner', model: 'claude-opus-4-8', provider: 'anthropic',
    destination: 'api.anthropic.com', left: true,
    trigger: 'query · "what changed in my last 90 days?"',
    gateway: { applied: true, redactions: { PERSON: 4, FACILITY: 2, MRN: 1 }, dateShift: -117, exclusions: ['MolecularSequence'] },
    tokens: 2847, respTokens: 512, cost: 0.043, review: 'new_shape',
    payloadPreview:
`system: You are a health reasoning assistant...
context:
  ApoB 95 mg/dL (2025-11-17, shifted -117d)   # was 2025-08-01
  HbA1c 5.4%   HRV 42ms   VO2max 52
  reviewed by [PROVIDER_NAME]                  # was "Dr. Sarah Chen"
  facility [FACILITY]                          # was "Marin Health"
query: what changed in my last 90 days?`,
  },
  {
    id: '01J8F2K5',
    time: '10:23:11', day: 'today',
    role: 'tools', model: 'qwen2.5:7b', provider: 'ollama',
    destination: 'localhost:11434', left: false,
    trigger: 'plan_tool_calls',
    gateway: { applied: true, redactions: {}, dateShift: 0, exclusions: [] },
    tokens: 1204, respTokens: 96, cost: 0, review: 'off',
    payloadPreview: 'plan tool calls for: "what changed in my last 90 days?"\nselected: get_time_series, get_trend, get_correlations, search_records, search_guidelines',
  },
  {
    id: '01J8F2K3',
    time: '10:23:10', day: 'today',
    role: 'medical', model: 'medgemma:4b', provider: 'ollama',
    destination: 'localhost:11434', left: false,
    trigger: 'extract MRI impression',
    gateway: { applied: true, redactions: {}, dateShift: 0, exclusions: [] },
    tokens: 890, respTokens: 140, cost: 0, review: 'off',
    payloadPreview: 'Raw clinical text from Brain MRI report — never leaves the device.\n"...no acute white-matter changes, normal hippocampal volumes..."',
  },
  {
    id: '01J8D9Q1',
    time: '18:02:41', day: 'yesterday',
    role: 'reasoner', model: 'deepseek-r1:8b', provider: 'ollama',
    destination: 'localhost:11434', left: false,
    trigger: 'query · "explain my lipid panel"',
    gateway: { applied: true, redactions: {}, dateShift: 0, exclusions: [] },
    tokens: 3120, respTokens: 640, cost: 0, review: 'off',
    payloadPreview: 'Local reasoner run — full context, nothing stripped, nothing left the device.',
  },
]

// The pre-send preview shown before the one cloud call above actually leaves.
export const presend = {
  destination: 'api.anthropic.com',
  model: 'claude-opus-4-8',
  tokens: 2847, cost: 0.043, review: 'new_shape',
  diff: [
    { pre: 'reviewed by ', rm: 'Dr. Sarah Chen', add: '[PROVIDER_NAME]' },
    { pre: 'drawn ', rm: '2026-03-14', add: '2025-11-17 (−117d)' },
    { pre: 'ApoB 95 mg/dL · HbA1c 5.4%', keep: '✓ retained' },
  ],
  excluded: { type: 'MolecularSequence', reason: 'genomic data is never sent to a cloud model, in any tier' },
}
