// The call ledger — every model invocation, local or cloud, appended forever.
// Mirrors ayuos.model_calls from docs/ai-transparency.md. Fabricated payloads.
// `daysAgo` drives the date-range filter; `day` is its human label.

export const ledger = [
  {
    id: '01J8F2K7',
    time: '10:23:14', day: 'today', daysAgo: 0,
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
    time: '10:23:11', day: 'today', daysAgo: 0,
    role: 'tools', model: 'qwen2.5:7b', provider: 'ollama',
    destination: 'localhost:11434', left: false,
    trigger: 'plan_tool_calls',
    gateway: { applied: true, redactions: {}, dateShift: 0, exclusions: [] },
    tokens: 1204, respTokens: 96, cost: 0, review: 'off',
    payloadPreview: 'plan tool calls for: "what changed in my last 90 days?"\nselected: get_time_series, get_trend, get_correlations, search_records, search_guidelines',
  },
  {
    id: '01J8F2K3',
    time: '10:23:10', day: 'today', daysAgo: 0,
    role: 'medical', model: 'medgemma:4b', provider: 'ollama',
    destination: 'localhost:11434', left: false,
    trigger: 'extract MRI impression',
    gateway: { applied: true, redactions: {}, dateShift: 0, exclusions: [] },
    tokens: 890, respTokens: 140, cost: 0, review: 'off',
    payloadPreview: 'Raw clinical text from Brain MRI report — never leaves the device.\n"...no acute white-matter changes, normal hippocampal volumes..."',
  },
  {
    // The interesting case: a cloud call the gateway had *nothing* to strip — a
    // general-guideline question with no personal identifiers in the context. It
    // still left, and it is still recorded in full. "Zero PII" ≠ "never sent".
    id: '01J8F2M9',
    time: '09:41:02', day: 'today', daysAgo: 0,
    role: 'reasoner', model: 'claude-opus-4-8', provider: 'anthropic',
    destination: 'api.anthropic.com', left: true,
    trigger: 'query · "what is a healthy ApoB target?"',
    gateway: { applied: true, redactions: {}, dateShift: 0, exclusions: [] },
    tokens: 640, respTokens: 210, cost: 0.011, review: 'new_shape',
    payloadPreview:
`system: You are a health reasoning assistant...
context: (no personal records referenced — general lipid guideline lookup)
query: what is a healthy ApoB target for primary prevention?

gateway: scanned — 0 identifiers found, nothing to strip. Call still logged.`,
  },
  {
    id: '01J8D9Q1',
    time: '18:02:41', day: 'yesterday', daysAgo: 1,
    role: 'reasoner', model: 'deepseek-r1:8b', provider: 'ollama',
    destination: 'localhost:11434', left: false,
    trigger: 'query · "explain my lipid panel"',
    gateway: { applied: true, redactions: {}, dateShift: 0, exclusions: [] },
    tokens: 3120, respTokens: 640, cost: 0, review: 'off',
    payloadPreview: 'Local reasoner run — full context, nothing stripped, nothing left the device.',
  },
  {
    id: '01J89C4T',
    time: '08:14:55', day: '6 days ago', daysAgo: 6,
    role: 'medical', model: 'medgemma:4b', provider: 'ollama',
    destination: 'localhost:11434', left: false,
    trigger: 'extract lab PDF (Quest lipid panel)',
    gateway: { applied: true, redactions: {}, dateShift: 0, exclusions: [] },
    tokens: 1450, respTokens: 220, cost: 0, review: 'off',
    payloadPreview: 'Raw OCR text from a lab PDF — extraction runs on device, never leaves.',
  },
  {
    id: '01J82A0F',
    time: '21:30:12', day: '22 days ago', daysAgo: 22,
    role: 'reasoner', model: 'claude-opus-4-8', provider: 'anthropic',
    destination: 'api.anthropic.com', left: true,
    trigger: 'query · "should I be worried about my CAC score?"',
    gateway: { applied: true, redactions: { PERSON: 2, FACILITY: 1 }, dateShift: -117, exclusions: ['MolecularSequence'] },
    tokens: 2110, respTokens: 480, cost: 0.032, review: 'new_shape',
    payloadPreview:
`context:
  CAC Agatston 12 (2024-... shifted -117d)
  reviewed by [PROVIDER_NAME]                  # was "Dr. Sarah Chen"
query: should I be worried about my CAC score?`,
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
