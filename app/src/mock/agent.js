// A fake agent-tool API. No network, no model — canned, structured answers that
// exercise the design system (evidence labels, comparison frames, source cards,
// concept injection). Answers are rich objects the Ask view renders as blocks.

export const suggestedQuestions = [
  'What changed in my last 90 days?',
  'Why is my HRV trending down?',
  'Should I take NMN?',
  'Am I at risk for heart disease?',
]

// block kinds: 'lead' | 'p' | 'frame' | 'source' | 'concept'
// Inline evidence labels are written as tokens the renderer parses: {{ev:src}},
// {{ev:inf}}, {{ev:high}}, {{ev:moderate}}, {{ev:low}}, {{ev:none}}, {{ev:guide}}.
export const answers = {
  'What changed in my last 90 days?': {
    tools: ['get_time_series', 'get_trend', 'get_correlations', 'search_records', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'Three things stand out over the last 90 days.' },
      { kind: 'p', text: 'Your **HRV is down ~8%** (46 → 42 ms) {{ev:src}}, while **VO₂max rose 2.5%** (50.7 → 52.0) {{ev:src}}. Those often move together in the *opposite* direction, so the pair is worth watching rather than either alone {{ev:inf}}.' },
      { kind: 'p', text: '**ApoB rose to 95 mg/dL** {{ev:src}}, now above the < 90 guideline threshold {{ev:guide}}. With a family history of early coronary disease, this is the number I would prioritise re-testing {{ev:inf}}.' },
      { kind: 'p', text: 'Post-meal glucose looks **more variable** — peaks roughly 15 mg/dL higher after refined-carb meals {{ev:inf}}. This is exactly what your active experiment is testing.' },
      { kind: 'concept', concept: 'effect-vs-certainty',
        text: 'A change being *real* and a change being *large enough to act on* are separate questions. HRV moves day to day; an 8% shift over 90 days is a trend, not a blip — but it is modest.' },
      { kind: 'p', text: 'The highest-evidence lever available to you here is post-meal walking {{ev:high}} — compare it against the alternatives:' },
      { kind: 'frame', caption: 'Comparison frame — the system fills the cells and stops. No score, no recommendation.',
        cols: ['Option', 'Evidence', 'Effect', 'Certainty', 'Cost', 'Risk', 'Reversible', 'Effort'],
        rows: [
          { cells: ['Post-meal walks', { ev: 'high' }, 'Moderate', 'High', 'Free', 'None', 'Yes', 'Daily habit'] },
          { cells: ['NMN 500 mg/day', { ev: 'low' }, 'Unknown', 'Low', '~$80/mo', 'LT unknown', 'Yes', 'Trivial'] },
          { cells: ['Statin (discuss w/ MD)', { ev: 'high' }, 'Large on ApoB', 'High', '~$10/mo', 'Low', 'Yes', 'Daily pill'] },
        ] },
      { kind: 'source', text: 'Sources: 4 Observations (ApoB, HbA1c, HRV, VO₂max), AHA lipid guideline range. This answer used the cloud reasoner — see the ledger.' },
    ],
  },
  'Why is my HRV trending down?': {
    tools: ['get_time_series', 'get_correlations', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'A few candidate explanations — none confirmed.' },
      { kind: 'p', text: 'HRV fell from ~46 to ~42 ms over the window {{ev:src}}. In the same period your **training strain rose** (VO₂max up) {{ev:src}}, which can transiently suppress HRV during a build phase {{ev:inf}}. Resting HR is flat, which argues against overtraining {{ev:inf}}.' },
      { kind: 'concept', concept: 'confounding',
        text: 'Several things changed at once — more training, warmer weather, a work travel week. When multiple inputs move together, no single one can be credited from observation alone.' },
      { kind: 'p', text: 'To separate signal from noise you would need to hold training roughly constant and watch HRV recover — an n-of-1 question {{ev:none}}.' },
    ],
  },
  'Should I take NMN?': {
    tools: ['query_health_model', 'rank_interventions', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: "Here is the honest picture — I won't tell you yes or no." },
      { kind: 'p', text: 'NMN has **low-quality evidence** on outcomes that matter {{ev:low}}: animal work and short human trials on surrogate markers, none powered for anything you care about. That is different from *negative* evidence — it mostly has not been tested at your endpoint {{ev:none}}.' },
      { kind: 'frame', caption: 'Same axes as everything else. Alternative interventions enter the same frame, no separate category.',
        cols: ['Option', 'Evidence', 'Effect', 'Certainty', 'Cost', 'Risk', 'Effort'],
        rows: [
          { cells: ['NMN 500 mg/day', { ev: 'low' }, 'Unknown', 'Low', '~$80/mo', 'LT unknown', 'Trivial'] },
          { cells: ['Post-meal walks', { ev: 'high' }, 'Moderate', 'High', 'Free', 'None', 'Daily habit'] },
        ] },
      { kind: 'source', text: 'Ask me to "simplify this" and I will rank these against your stated preferences — and show exactly which preference produced the order.' },
    ],
  },
}

export const defaultAnswer = {
  tools: ['search_records', 'query_clinical'],
  blocks: [
    { kind: 'lead', text: 'This is a demo with a fixed dataset.' },
    { kind: 'p', text: 'Try one of the suggested questions — those have fully worked answers with evidence labels, comparison frames, and source cards. Everything is mocked and runs locally in your browser {{ev:none}}.' },
  ],
}

export function ask(question) {
  return answers[question] || defaultAnswer
}
