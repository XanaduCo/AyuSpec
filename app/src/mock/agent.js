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
//
// `actions` is the hand-off out of the answer and into the rest of the loop —
// understand → act → measure → share (vision.md). An answer that ends in prose
// is a dead end: the user has just been told their mercury is rising and their
// only remaining verb is to type another question. Each entry routes to the view
// that can actually do the thing, carrying enough state to arrive pre-filled:
//   { kind: 'experiment', propose: <HYPOTHESIS_CANDIDATES key> }
//   { kind: 'share',      domains: [<share inventory domain>, …] }

export const suggestedQuestions = [
  'What changed in my last 90 days?',
  'Should I be worried about my heavy metals result?',
  'My ageing clocks disagree with my labs — which do I trust?',
  'Did my Garmin training block actually improve anything?',
  'Is my Galleri result a clean bill of health?',
  'Why is my HRV trending down?',
]

// block kinds: 'lead' | 'p' | 'frame' | 'sources' | 'concept'
export const answers = {
  'What changed in my last 90 days?': {
    cloud: true,
    tools: ['get_time_series', 'get_trend', 'get_correlations', 'search_records', 'search_guidelines'],
    actions: [
      { kind: 'experiment', propose: 'fibre', label: 'Test the ApoB lever' },
      { kind: 'share', domains: ['cardiac','metabolic'], label: 'Add to a doctor packet' },
    ],
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
    actions: [
      { kind: 'experiment', propose: 'caffeine', label: 'Test a sleep lever' },
    ],
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
    actions: [
      { kind: 'experiment', propose: 'fibre', label: 'Test the ApoB lever' },
      { kind: 'share', domains: ['cardiac'], label: 'Add to a doctor packet' },
    ],
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
    actions: [
      { kind: 'experiment', propose: 'fibre', label: 'Test the ApoB lever' },
      { kind: 'share', domains: ['cardiac','metabolic'], label: 'Add to a doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'Your 2025-08-01 lipid panel, read in plain language.' },
      { kind: 'p', text: 'Two markers are flagged high: **ApoB 95 mg/dL** {{cite:obs-apob}} and **LDL-C 128 mg/dL** {{cite:obs-ldl}}. ApoB counts the actual number of atherogenic particles, so where the two disagree, ApoB is the one I would trust {{ev:guide}}. **HDL-C 52** {{cite:obs-hdl}} is in a healthy range.' },
      { kind: 'p', text: 'Both rose modestly since your prior draw {{ev:src}}. Neither is dramatic on its own — but combined with your family history, the direction is what makes ApoB worth re-testing {{ev:inf}}.' },
      { kind: 'p', text: 'This answer ran entirely on your **local reasoner** — nothing left the device {{ev:src}}.' },
      { kind: 'sources', text: 'The full panel:', cites: ['panel-lipid-2025-08'] },
    ],
  },

  // --- questions that only exist because the store got deep -----------------
  // Each of these is unanswerable from a thin dataset: they need years of a
  // series, two instruments measuring the same thing, or a second source to
  // corroborate a first. They are also the questions where the *retrieval* is
  // the interesting part — see the context strip on each answer.

  'Should I be worried about my heavy metals result?': {
    cloud: true,
    tools: ['query_clinical', 'get_trend', 'search_guidelines', 'search_records', 'get_correlations'],
    actions: [
      { kind: 'experiment', propose: 'seafood', label: 'Test the seafood hypothesis' },
      { kind: 'share', domains: ['toxicology'], label: 'Add to a doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'One metal is genuinely elevated, and it has an obvious cause you can act on.' },
      { kind: 'p', text: '**Blood mercury is 14.2 µg/L** {{cite:obs-mercury}}, against a reference ceiling of 10 {{ev:guide}}. It has risen at every draw for two years — 5.8 → 8.1 → 9.8 → 11.6 → 14.2 {{ev:src}}. That is a trend, not a single odd result, which is the difference between "recheck it" and "look for the source".' },
      { kind: 'p', text: 'The source is almost certainly food, and your own logs say so: seafood servings went from **~3/week in 2024 to ~8/week since April** {{cite:nutr-seafood-trend}}, including 17 tuna or swordfish meals in the last four weeks alone {{ev:src}}. Two other analytes corroborate it from different directions — **selenium 168 µg/L** {{cite:obs-selenium}} and an **omega-3 index of 9.6%** {{cite:obs-omega3-index}}, both high, both tracking the same behaviour {{ev:inf}}.' },
      { kind: 'p', text: 'The other three metals are unremarkable: **lead 1.8** {{cite:obs-lead}}, **cadmium 0.38** {{cite:obs-cadmium}}, both flat and in range {{ev:src}}. I am telling you that explicitly because an answer that only reports the abnormal one is a worse answer.' },
      { kind: 'concept', concept: 'effect-vs-certainty',
        text: 'The arsenic result is where certainty collapses. Total blood arsenic is 9.4 µg/L and rising — but "total" is dominated by arsenobetaine, the harmless form in fish. The speciation test that separates it from inorganic arsenic was not ordered, so that number cannot be read as a toxic exposure at all.' },
      { kind: 'p', text: 'On the scale that matters: 14.2 is above a *reference* ceiling, which is a population statistic, not a *toxicity* threshold — symptomatic methylmercury toxicity is generally described an order of magnitude higher {{ev:guide}}. And blood mercury reflects the last few weeks of intake, so it responds quickly to a change in what you eat {{ev:src}}.' },
      { kind: 'frame', caption: 'The same fixed axes. Nothing here is ranked for you.',
        cols: ['Option', 'Evidence', 'Effect', 'Certainty', 'Cost', 'Risk', 'Reversible', 'Effort'],
        rows: [
          { cells: ['Swap tuna/swordfish → salmon, sardines', { ev: 'high' }, 'Large on blood Hg', 'High', 'Free', 'None', 'Yes', 'Shopping habit'] },
          { cells: ['Order arsenic speciation', { ev: 'high' }, 'Resolves the unknown', 'High', '~$120', 'None', 'n/a', 'One draw'] },
          { cells: ['Recheck mercury in 8–12 weeks', { ev: 'high' }, 'Confirms the trend broke', 'High', '~$60', 'None', 'n/a', 'One draw'] },
          { cells: ['Chelation therapy', { ev: 'none' }, 'Unknown', 'Low', '$$$', 'Real', 'No', 'Clinic visits'] },
        ] },
      { kind: 'p', text: 'Chelation is in that frame only so you can see where it sits: **no evidence base at this level, real risk, not reversible** {{ev:none}}. It is the option to be most sceptical of, and it is the one most easily found online.' },
      { kind: 'sources', text: 'Records behind this answer:',
        cites: ['obs-mercury', 'obs-arsenic', 'obs-selenium', 'nutr-seafood-trend', 'draw-2025-08-01'] },
    ],
  },

  'My ageing clocks disagree with my labs — which do I trust?': {
    cloud: true,
    tools: ['query_clinical', 'get_trend', 'search_guidelines', 'query_health_model'],
    actions: [
      { kind: 'share', domains: ['ageing'], label: 'Add to a doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'Neither, unconditionally. The question resolves on reproducibility, not on which one you like.' },
      { kind: 'p', text: 'Six clocks ran on the same blood spot and span **6.2 years** — PhenoAge 39.4 at the young end, Horvath 45.6 at the old {{cite:clock-disagreement}}. Before treating any of that as biology, the useful filter is: did each clock move further than its own test–retest noise? {{ev:inf}}' },
      { kind: 'p', text: 'Three did. **DunedinPACE 1.04 → 0.94** against a ±0.03 band, **PhenoAge −1.8 yrs** against ±1.37, **GrimAge2 −1.2** against ±1.13 {{ev:src}}. Three did not: OMICmAge, Horvath and Hannum all moved less than their own assay noise, and reporting them as improvements would be reading the instrument, not you.' },
      { kind: 'p', text: 'Telomere length is the clearest case. It moved **+0.03 kb** against a ±0.32 kb reproducibility band {{ev:src}}. That is not "stable" — it is **unmeasured** {{ev:none}}. The panel prints it as a number, which is exactly how a noise floor gets mistaken for a finding.' },
      { kind: 'concept', concept: 'measurement-quality',
        text: 'DunedinPACE has an intraclass correlation near 0.96; the first-generation clocks sit around 0.76–0.80. In variance terms that is roughly an order of magnitude. Two numbers printed in the same font on the same PDF are not the same kind of evidence.' },
      { kind: 'p', text: 'Now the disagreement with your labs. **ApoB has gone 72 → 95 over the same period** {{cite:obs-apob}} while the clocks improved. That is not a contradiction — **PhenoAge and GrimAge2 do not read ApoB at all** {{ev:src}}. They weight albumin, CRP, glucose, RDW, lymphocyte percentage — and those did improve or hold {{cite:obs-crp}} {{cite:obs-albumin}}. The clocks are partly a re-encoding of the labs you already have, minus the one marker that is moving against you.' },
      { kind: 'p', text: 'The instrument I would weight highest is neither: **grip strength 48.5 → 51.2 kg, dead hang 68 → 84 s, FMS 15 → 17** {{cite:func-2025-07-02}}. Functional capacity is the outcome the clocks are proxies *for*, and you measured it directly {{ev:inf}}.' },
      { kind: 'p', text: 'You have seen this shape before in your own data — the wearable says VO₂max 52.0 and the metabolic cart measured 47.8 {{cite:vo2-discrepancy}}. Same lesson, different domain: prefer the measurement over the model of the measurement {{ev:inf}}.' },
      { kind: 'sources', text: 'Records behind this answer:',
        cites: ['clock-disagreement', 'clock-2025-06-11', 'obs-apob', 'func-2025-07-02', 'vo2-discrepancy'] },
    ],
  },

  'Did my Garmin training block actually improve anything?': {
    cloud: true,
    tools: ['query_clinical', 'get_trend', 'get_time_series', 'get_correlations', 'search_records'],
    actions: [
      { kind: 'share', domains: ['fitness'], label: 'Add to a doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'Yes on the measurement that counts — with three caveats that are not decoration.' },
      { kind: 'p', text: 'The gold-standard number moved: **metabolic-cart VO₂max 44.9 → 47.8 mL/kg/min** {{cite:vo2-2025-06-14}}, same lab, same protocol, same technician {{ev:src}}. Ventilatory thresholds moved with it — VT1 138 → 142 bpm, VT2 164 → 168 — which is the pattern you would expect from aerobic base work rather than from a good day on the treadmill {{ev:inf}}.' },
      { kind: 'p', text: 'Caveat one: **that is +2.9, and ACSM puts CPET test–retest reproducibility at roughly 2–3** {{ev:guide}}. The gain is real at the edge of what the test can resolve, not comfortably beyond it.' },
      { kind: 'p', text: 'Caveat two: **the two tests are 15 months apart** and the block was 15 weeks {{cite:vo2-2024-03-09}}. Some of that gain predates the block. The weekly aggregate says the block itself was a real change in stimulus — **289 → 370 min/week, load 437 → 583, sessions 4.6 → 5.7** {{cite:block-summary}} — with the intensity distribution held at 80/20, so it was volume, not intensity {{ev:src}}.' },
      { kind: 'p', text: 'Caveat three: there was **no control period**. This is pre/post on an uncontrolled intervention, so it supports *consistent with improvement*, never *caused improvement* {{ev:inf}}.' },
      { kind: 'p', text: 'Corroboration from things the block did not directly train: **resting HR 56 → 54** {{cite:obs-rhr}}, **lean mass +1.2 kg and fat −1.4 kg** on DEXA {{cite:dexa-2025-07-19}}, and the functional battery up across the board {{cite:func-2025-07-02}} {{ev:src}}. Independent instruments moving the same way is worth more than any one of them.' },
      { kind: 'p', text: 'Against it: **HRV fell 46 → 42 ms over the same window** {{cite:obs-hrv}}. I am not dropping that because it is inconvenient — it is the one measure that argues the block cost you something {{ev:inf}}.' },
      { kind: 'concept', concept: 'confounding',
        text: 'Your wearable also says VO₂max is 52.0. It is not — that is a model of VO₂max from heart-rate and pace, running about 4 points high against the cart in both tests. What makes it useful anyway is that it moved up by a similar amount, so the trend agrees even though the level does not.' },
      { kind: 'sources', text: 'Records behind this answer:',
        cites: ['vo2-2025-06-14', 'vo2-2024-03-09', 'block-summary', 'vo2-discrepancy', 'dexa-2025-07-19'] },
    ],
  },

  'Is my Galleri result a clean bill of health?': {
    cloud: true,
    tools: ['query_clinical', 'search_guidelines', 'search_records'],
    actions: [
      { kind: 'share', domains: ['screening'], label: 'Add to a doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'No — and the gap between what it says and what it means is unusually large.' },
      { kind: 'p', text: 'The result reads **"no cancer signal detected"** {{cite:scr-galleri}}. What that sentence is worth depends entirely on the test\'s sensitivity, and Galleri\'s is **51.5% overall and 16.8% at stage I** {{ev:guide}}. At the stage where finding a cancer would change the outcome most, it misses roughly five of every six {{ev:src}}.' },
      { kind: 'p', text: 'Its strength is the other direction: **specificity 99.5%** {{ev:guide}}. A *positive* would have been worth taking seriously — although even then the PPV in PATHFINDER was 43.1%, so about half of positives were false and each one started an imaging cascade with its own harms {{ev:inf}}.' },
      { kind: 'concept', concept: 'base-rates',
        text: 'A negative on a test with 16.8% early-stage sensitivity barely moves your posterior probability of having an early cancer. A negative on your colonoscopy — a test with high sensitivity for the thing it looks at — moves it a great deal, for that one organ. Sensitivity, not the word "negative", is what carries the information.' },
      { kind: 'p', text: 'It also replaces nothing. Your **colonoscopy was clean in 2023 and is not due until 2033** {{cite:scr-colonoscopy}}; your **skin check was clear in February** {{cite:scr-skin}} {{ev:src}}. Those are guideline-recommended, organ-specific, and stand regardless of what the blood test said {{ev:guide}}.' },
      { kind: 'p', text: 'And the honest structural point: **no randomised trial has shown that MCED screening reduces cancer mortality** {{ev:none}}. The evidence supports "detects signal", not "saves lives" — those are different claims and the marketing tends to blur them.' },
      { kind: 'p', text: 'I checked the nonspecific markers that sometimes accompany occult malignancy — **LDH, ESR, CBC all in range** {{cite:obs-ldh}} {{cite:obs-esr}} {{ev:src}}. Weak reassurance, stated so you know it was looked at rather than skipped. Your rising **ferritin** {{cite:obs-ferritin}} has a much more likely explanation waiting in your genome than this one.' },
      { kind: 'sources', text: 'Records behind this answer:',
        cites: ['scr-galleri', 'scr-colonoscopy', 'scr-skin', 'obs-ferritin'] },
    ],
  },

  'What should I ask my doctor?': {
    cloud: true,
    tools: ['search_records', 'get_trend', 'query_health_model'],
    actions: [
      { kind: 'share', domains: ['cardiac','metabolic'], label: 'Add to a doctor packet' },
    ],
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
