// A fake agent-tool API. No network, no model — canned, structured answers that
// exercise the design system (evidence labels, comparison frames, source cards,
// concept injection). Answers are rich objects the Ask view renders as blocks.
//
// Inline token syntax the renderer understands:
//   **bold**            → strong
//   {{ev:kind}}         → evidence label (kind ∈ src|inf|guide|high|moderate|low|none)
//                         tap → opens the matching epistemics concept
//   {{cite:record-id}}  → a ◆ citation chip; tap → opens that record in the source drawer
//
// `cloud: true` marks an answer whose reasoner runs in the cloud — the Ask view
// shows the pre-send review before the first such answer "leaves".

export const suggestedQuestions = [
  'What changed in my last 90 days?',
  'Why is my HRV trending down?',
  'Should I take NMN?',
  'Am I at risk for heart disease?',
]

// block kinds: 'lead' | 'p' | 'frame' | 'sources' | 'concept'
export const answers = {
  'What changed in my last 90 days?': {
    cloud: true,
    tools: ['get_time_series', 'get_trend', 'get_correlations', 'search_records', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'Three things stand out over the last 90 days.' },
      { kind: 'p', text: 'Your **HRV is down ~8%** (46 → 42 ms) {{cite:obs-hrv}}, while **VO₂max rose 2.5%** (50.7 → 52.0) {{cite:obs-vo2max}}. Those often move together in the *opposite* direction, so the pair is worth watching rather than either alone {{ev:inf}}.' },
      { kind: 'p', text: '**ApoB rose to 95 mg/dL** {{cite:obs-apob}}, now above the < 90 guideline threshold {{ev:guide}}. With a family history of early coronary disease, this is the number I would prioritise re-testing {{ev:inf}}.' },
      { kind: 'p', text: 'Post-meal glucose looks **more variable** — peaks roughly 15 mg/dL higher after refined-carb meals {{ev:inf}}. This is exactly what your active experiment {{cite:exp-postmeal-walks}} is testing.' },
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
      { kind: 'sources', text: 'Sourced from your stored records — click any to open it:',
        cites: ['panel-lipid-2025-08', 'obs-hrv', 'obs-vo2max', 'exp-postmeal-walks'] },
    ],
  },

  'Why is my HRV trending down?': {
    cloud: true,
    tools: ['get_time_series', 'get_correlations', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'A few candidate explanations — none confirmed.' },
      { kind: 'p', text: 'HRV fell from ~46 to ~42 ms over the window {{cite:obs-hrv}}. In the same period your **training strain rose** (VO₂max up) {{cite:obs-vo2max}}, which can transiently suppress HRV during a build phase {{ev:inf}}. Resting HR is flat {{cite:obs-rhr}}, which argues against overtraining {{ev:inf}}.' },
      { kind: 'concept', concept: 'confounding',
        text: 'Several things changed at once — more training, warmer weather, a work travel week. When multiple inputs move together, no single one can be credited from observation alone.' },
      { kind: 'p', text: 'To separate signal from noise you would need to hold training roughly constant and watch HRV recover — an n-of-1 question {{ev:none}}.' },
      { kind: 'sources', text: 'Records behind this answer:', cites: ['obs-hrv', 'obs-vo2max', 'obs-rhr'] },
    ],
  },

  'Should I take NMN?': {
    cloud: true,
    tools: ['query_health_model', 'rank_interventions', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: "Here is the honest picture — I won't tell you yes or no." },
      { kind: 'p', text: 'NMN has **low-quality evidence** on outcomes that matter {{ev:low}}: animal work and short human trials on surrogate markers {{ev:inf}}, none powered for anything you care about. That is different from *negative* evidence — it mostly has not been tested at your endpoint {{ev:none}}.' },
      { kind: 'frame', caption: 'Same axes as everything else. Alternative interventions enter the same frame, no separate category.',
        cols: ['Option', 'Evidence', 'Effect', 'Certainty', 'Cost', 'Risk', 'Effort'],
        rows: [
          { cells: ['NMN 500 mg/day', { ev: 'low' }, 'Unknown', 'Low', '~$80/mo', 'LT unknown', 'Trivial'] },
          { cells: ['Post-meal walks', { ev: 'high' }, 'Moderate', 'High', 'Free', 'None', 'Daily habit'] },
        ] },
      { kind: 'p', text: 'Tap **Simplify this for me** on the frame and I will rank these against your stated preferences — and show exactly which preference produced the order.' },
    ],
  },

  'Am I at risk for heart disease?': {
    cloud: true,
    tools: ['search_records', 'query_health_model', 'get_trend', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'A mixed picture — one reassuring anchor, two things to watch.' },
      { kind: 'p', text: 'The most decisive datum you have is a **coronary calcium score of 0** from 2024 {{cite:img-cac}} — no detectable plaque, which is a strong near-term negative signal {{ev:src}}. That is the single most reassuring number here.' },
      { kind: 'p', text: 'Against it: **ApoB is 95 mg/dL and rising** {{cite:obs-apob}}, above the < 90 guideline target {{ev:guide}}; a **father with CAD at 62**; and a **CVD polygenic score at the 70th percentile** {{ev:low}} — though that score is derived from European-ancestry data and is less predictive for your South Asian ancestry {{ev:inf}}.' },
      { kind: 'concept', concept: 'effect-vs-certainty',
        text: 'A CAC of 0 (high certainty, measured directly) and a polygenic risk score (low certainty, population-derived) are not the same kind of evidence. Weight them by how directly each measures *your* arteries — the CAC wins on that axis.' },
      { kind: 'p', text: 'Net: your imaging says low plaque burden *today*, but ApoB and family history are levers for the *trajectory*. This is a re-test-and-track situation, not an alarm {{ev:inf}}.' },
      { kind: 'sources', text: 'Records behind this answer:', cites: ['img-cac', 'obs-apob', 'panel-lipid-2025-08'] },
    ],
  },

  'Explain my lipid panel': {
    cloud: false,
    tools: ['search_records', 'get_trend', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'Your 2025-08-01 lipid panel, read in plain language.' },
      { kind: 'p', text: 'Two markers are flagged high: **ApoB 95 mg/dL** {{cite:obs-apob}} and **LDL-C 128 mg/dL** {{cite:obs-ldl}}. ApoB counts the actual number of atherogenic particles, so where the two disagree, ApoB is the one I would trust {{ev:guide}}. **HDL-C 52** {{cite:obs-hdl}} is in a healthy range.' },
      { kind: 'p', text: 'Both rose modestly since your prior draw {{ev:src}}. Neither is dramatic on its own — but combined with your family history, the direction is what makes ApoB worth re-testing {{ev:inf}}.' },
      { kind: 'p', text: 'This answer ran entirely on your **local reasoner** — nothing left the device {{ev:src}}.' },
      { kind: 'sources', text: 'The full panel:', cites: ['panel-lipid-2025-08'] },
    ],
  },

  'What should I ask my doctor?': {
    cloud: true,
    tools: ['search_records', 'get_trend', 'query_health_model'],
    blocks: [
      { kind: 'lead', text: 'Four questions your data actually earns — in priority order.' },
      { kind: 'p', text: '1. **"My ApoB is 95 and rising with a family history of early CAD — should we treat, and to what target?"** {{cite:obs-apob}} This is your highest-yield conversation {{ev:inf}}.' },
      { kind: 'p', text: '2. **"My CAC was 0 in 2024 {{cite:img-cac}} — does that change how aggressively we manage the ApoB?"** The two facts pull in different directions and a clinician can weigh them {{ev:guide}}.' },
      { kind: 'p', text: '3. **"My HRV is drifting down while training load is up {{cite:obs-hrv}} — is this a recovery issue or expected?"**' },
      { kind: 'p', text: '4. **"Is my lisinopril dose still right?"** {{cite:med-lisinopril}} Blood pressure control hasn’t been reviewed on the record recently {{ev:inf}}.' },
      { kind: 'p', text: 'The **Share** view can turn these into a doctor packet with the supporting values attached.' },
      { kind: 'sources', text: 'Records referenced:', cites: ['obs-apob', 'img-cac', 'obs-hrv', 'med-lisinopril'] },
    ],
  },
}

export const defaultAnswer = {
  cloud: false,
  tools: ['search_records', 'query_clinical'],
  blocks: [
    { kind: 'lead', text: 'This is a demo with a fixed dataset.' },
    { kind: 'p', text: 'Try one of the suggested questions — those have fully worked answers with evidence labels, comparison frames, and source cards. Everything is mocked and runs locally in your browser {{ev:none}}.' },
  ],
}

export function ask(question) {
  return answers[question] || defaultAnswer
}

// Questions offered in the "history" sidebar beyond the suggested chips.
export const libraryQuestions = Object.keys(answers)
