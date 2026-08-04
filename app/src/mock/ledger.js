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
  ApoB 95 mg/dL (2025-04-06, shifted -117d)   # was 2025-08-01
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
  CAC Agatston 0 (2024-07-15, shifted -117d)   # was 2024-11-09
  reviewed by [PROVIDER_NAME]                  # was "Dr. Sarah Chen"
query: should I be worried about my CAC score?`,
  },
]

// Per-goal pre-send payloads.
//
// The diff has to quote the records the *chosen* goal actually selected. When
// the consent screen showed a fixed ApoB line for every question, a user could
// approve a payload headed by ApoB and then read an answer about HRV — the
// screen was illustrating the gateway rather than reporting the payload, and it
// read as the system contradicting itself. A consent screen that does not name
// what is in this call is decoration.
const PRESEND_BY_QUESTION = {
  'What changed in my cardiac markers?': {
    tokens: 2140, cost: 0.032,
    diff: [
      { pre: 'reviewed by ', rm: 'Dr. Sarah Chen', add: '[PROVIDER_NAME]' },
      { pre: 'drawn ', rm: '2025-08-01', add: '2025-04-06 (−117d)' },
      { pre: 'ApoB 95 mg/dL · LDL-C 128 mg/dL · CAC Agatston 0', keep: '✓ retained' },
    ],
  },
  'What changed in my heavy metals?': {
    tokens: 1180, cost: 0.018,
    diff: [
      { pre: 'collected at ', rm: 'Quest Diagnostics, San Mateo', add: '[FACILITY]' },
      { pre: 'drawn ', rm: '2025-08-01', add: '2025-04-06 (−117d)' },
      { pre: 'Mercury 12 µg/L (ref < 10) · no prior draw', keep: '✓ retained' },
    ],
  },
  'What changed in my sleep and recovery?': {
    tokens: 1960, cost: 0.029,
    diff: [
      { pre: 'device ', rm: 'Oura ring #A41C-8823', add: '[DEVICE_ID]' },
      { pre: 'nights ', rm: '2025-05-05 → 2025-08-01', add: '2025-01-08 → 2025-04-06 (−117d)' },
      { pre: 'HRV 46 → 42 ms · REM −7 min · VO₂max 50.7 → 52.0', keep: '✓ retained' },
    ],
  },
}

// The pre-send preview shown before a cloud call actually leaves. Falls back to
// the canonical example for the Transparency view and unauthored questions.
export function presendFor(question) {
  const scoped = PRESEND_BY_QUESTION[question]
  return scoped ? { ...presend, ...scoped } : presend
}

export const presend = {
  destination: 'api.anthropic.com',
  model: 'claude-opus-4-8',
  tokens: 2847, cost: 0.043, review: 'new_shape',
  diff: [
    { pre: 'reviewed by ', rm: 'Dr. Sarah Chen', add: '[PROVIDER_NAME]' },
    { pre: 'drawn ', rm: '2025-08-01', add: '2025-04-06 (−117d)' },
    { pre: 'ApoB 95 mg/dL · HbA1c 5.4%', keep: '✓ retained' },
  ],
  excluded: {
    type: 'MolecularSequence',
    reason: 'genomic data is excluded by default — a genome is itself an identifier, so masking a name changes nothing',
    // Unlike imaging pixels or raw documents, genomic data is a *default* exclusion,
    // not a hard one: the user can opt to include it, warned it stays identifiable.
    optIn: true,
    optInWarning: 'A genome cannot be de-identified. If you send it, the payload is permanently identifiable — of you and your blood relatives. Recorded in the ledger like any other call.',
    optInTokens: 480, // extra tokens the APOE genotype + CVD PRS add to the payload
  },
}
