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
  // NOTE: "What changed in my last 90 days?" deliberately has no entry here.
  // It has no goal term, so it cannot be ranked and does not get a synthesis —
  // it resolves to a deterministic clarifying turn instead (see
  // `clarifyingTurns` below). The old synthesis for it led with HRV while the
  // consent screen led with ApoB, which is the exact incoherence the two-stage
  // split exists to remove: retrieval rank and salience rank are different
  // orderings, and showing both without saying so reads as the system
  // contradicting itself.

  // --- the three scoped re-asks the clarifying turn hands off to ---------------
  // Each one has a goal, so each one can be ranked — and each payload is scoped
  // to that goal rather than to everything that moved. This is the turn where a
  // cloud model earns its place and where the egress decision belongs.
  'What changed in my cardiac markers?': {
    cloud: true,
    tools: ['get_time_series', 'get_trend', 'query_clinical', 'search_guidelines', 'query_health_model'],
    actions: [
      { kind: 'experiment', propose: 'fibre', label: 'Test the ApoB lever' },
      { kind: 'share', domains: ['cardiac'], label: 'Add to a doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'One number moved in a way worth acting on, against one that argues the other way.' },
      { kind: 'p', text: '**ApoB rose 88 → 95 mg/dL** {{cite:obs-apob}}, crossing the < 90 threshold the guideline corpus returns for someone with your family history {{ev:guide}}. LDL-C {{cite:obs-ldl}} moved with it, which is what you would expect — where the two disagree, ApoB counts the actual particle burden and is the one I would trust {{ev:guide}}.' },
      { kind: 'p', text: 'Against that: your **coronary calcium score is 0** {{cite:img-cac}} — no detectable plaque as of that scan, which is the most reassuring datum in your record {{ev:src}}. A rising ApoB with a CAC of 0 is a trajectory question, not an alarm {{ev:inf}}.' },
      { kind: 'concept', concept: 'effect-vs-certainty',
        text: 'A 7 mg/dL rise is well past the assay noise, so the change is real. Whether it is *large enough to act on* is a separate question, and the CAC of 0 is what makes it a watch-and-retest rather than an urgent one.' },
      { kind: 'p', text: 'The levers available, on the same axes, with no ranking applied:' },
      { kind: 'frame', caption: 'Comparison frame — the system fills the cells and stops. No score, no recommendation.',
        cols: ['Option', 'Evidence', 'Effect', 'Certainty', 'Cost', 'Risk', 'Reversible', 'Effort'],
        rows: [
          { cells: ['Soluble fibre +10 g/day', { ev: 'moderate' }, 'Small on ApoB', 'Moderate', '~$15/mo', 'None', 'Yes', 'Daily habit'] },
          { cells: ['Post-meal walks', { ev: 'high' }, 'Moderate (glucose)', 'High', 'Free', 'None', 'Yes', 'Daily habit'] },
          { cells: ['Statin (discuss w/ MD)', { ev: 'high' }, 'Large on ApoB', 'High', '~$10/mo', 'Low', 'Yes', 'Daily pill'] },
        ] },
      { kind: 'p', text: 'What I cannot tell you: your personal 10-year event risk, whether to start a statin, or that any one of these caused another. Those are clinician decisions {{ev:none}}.' },
      { kind: 'sources', text: 'Records behind this answer:', cites: ['obs-apob', 'obs-ldl', 'img-cac', 'panel-lipid-2025-08'] },
    ],
  },

  'What changed in my heavy metals?': {
    cloud: true,
    tools: ['query_clinical', 'search_guidelines', 'search_records'],
    actions: [
      { kind: 'share', domains: ['metals'], label: 'Add to a doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'Strictly, nothing changed — because there is nothing to compare it to.' },
      { kind: 'p', text: '**Blood mercury came back at 12 µg/L** {{cite:obs-mercury}}, above the 10 µg/L ATSDR reference ceiling {{ev:guide}}. That is a real out-of-range result and worth following up.' },
      { kind: 'p', text: 'But this is the **first mercury measurement in your record** {{ev:src}}. There is no prior draw, so I cannot tell you whether it is rising, falling, or exactly where it has always sat. A single point is not a trend, and treating it as one is the most common way to over-read a lab {{ev:inf}}.' },
      { kind: 'concept', concept: 'measurement-quality',
        text: 'One measurement establishes a level, not a direction. The only thing that turns this into a trend is a second draw — which is why the useful next step is a re-test, not an intervention.' },
      { kind: 'p', text: 'Your nutrition log does show **elevated seafood intake** across the same period {{cite:nutr-seafood-trend}}, which is a plausible and benign explanation {{ev:inf}} — but plausible is not established, and I have no pre-exposure baseline to test it against.' },
      { kind: 'sources', text: 'Records behind this answer:', cites: ['obs-mercury', 'nutr-seafood-trend'] },
    ],
  },

  'What changed in my sleep and recovery?': {
    cloud: true,
    tools: ['get_time_series', 'get_trend', 'get_correlations', 'search_records'],
    actions: [
      { kind: 'experiment', propose: 'caffeine', label: 'Test a sleep lever' },
    ],
    blocks: [
      { kind: 'lead', text: 'Two things moved in opposite directions, which is more informative than either alone.' },
      { kind: 'p', text: '**HRV fell ~8%** (46 → 42 ms) {{cite:obs-hrv}} while **VO₂max rose 2.5%** (50.7 → 52.0) {{cite:obs-vo2max}}. Those usually move together, so the divergence is the finding here — not the HRV number by itself {{ev:inf}}.' },
      { kind: 'p', text: 'Underneath it, **REM fell about 7 min/night while total sleep held steady** {{cite:obs-rem}} — a change only visible in the stage split, invisible in total-hours {{ev:src}}. Resting heart rate is flat {{cite:obs-rhr}}, which argues against overtraining {{ev:inf}}.' },
      { kind: 'concept', concept: 'confounding',
        text: 'A training build, warmer weather, and a travel week all overlap this window. When several inputs move together, observation alone cannot credit any one of them.' },
      { kind: 'p', text: 'A rising VO₂max during a build phase can transiently suppress HRV, which would make this expected rather than concerning {{ev:inf}}. Separating that from the alternatives needs training held roughly constant while HRV is watched — an n-of-1 question, not an observational one {{ev:none}}.' },
      { kind: 'sources', text: 'Records behind this answer:', cites: ['obs-hrv', 'obs-vo2max', 'obs-rem', 'obs-rhr'] },
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
      { kind: 'lead', text: "Here is what the evidence supports — I won't tell you yes or no." },
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
      { kind: 'lead', text: 'One metal is above its reference ceiling, and it has an obvious cause you can act on.' },
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
      { kind: 'p', text: 'And the structural point: **no randomised trial has shown that MCED screening reduces cancer mortality** {{ev:none}}. The evidence supports "detects signal", not "saves lives" — those are different claims and the marketing tends to blur them.' },
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
  // --- behavioural-flows showcase (docs/behavioural-flows.md) ----------------
  // Four seeded conversations exercise the conversational spec: question
  // sharpening + signal validation, considered-preference formation on a
  // screening decision, the correlation→causation boundary handed off to a
  // reversible n-of-1, and a full-depth therapy decision (the statin thread)
  // that runs the whole flow loop across ten exchanges. Every answer here
  // carries the four-part contract — what the data says / what it cannot yet
  // say / why it matters to the goal / the next question most likely to change
  // the action — and never more than one concept card per response.

  // Conversation 1 · question sharpening & signal validation (local reasoner)
  'Is my sleep score bad?': {
    cloud: false,
    tools: ['get_time_series', 'get_trend', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'Not by the number — but the number is answering a different question than the one worth asking.' },
      { kind: 'p', text: 'Your sleep score has averaged **82 over the last two weeks against 85 for your six-month baseline** {{cite:sleep-summary}} {{ev:src}}. That dip sits inside the score’s normal week-to-week wobble, so as asked, the answer is "no" {{ev:inf}}. But the score is a composite the vendor invents — total time, stages, restlessness and timing folded into one number — and composites are where changes go to hide.' },
      { kind: 'p', text: 'Unfolded, one component is genuinely moving: **REM is down about 7 minutes a night since early May, while total sleep has held steady** {{cite:obs-rem}} {{ev:src}}. That is a twelve-week pattern, not a bad night — single nights swing ±16 minutes, so only a sustained shift like this clears the stage data’s own noise {{ev:inf}}.' },
      { kind: 'p', text: 'So the sharper question than "is my score bad": has your sleep changed against your **own** baseline, is the change likely real rather than device noise, and does it connect to something you care about? On the first two: yes, and probably. On the third: the same window holds your **HRV drift (46 → 42 ms)** {{cite:obs-hrv}} and the training block’s ramp {{cite:block-summary}} — three recovery signals bending together says more than any score {{ev:inf}}.' },
      { kind: 'p', text: 'What this cannot yet say is *why*. The next question most likely to change what you do: whether the REM decline tracks your evening sessions, your travel weeks, or neither — and whether it is even real, which is worth checking before interpreting it. Ask either and I’ll bring what the record has.' },
    ],
  },

  'Is the REM drop real, or is it my ring?': {
    cloud: false,
    tools: ['get_time_series', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'The right first suspicion — and mostly answerable from your own record.' },
      { kind: 'p', text: 'Checked in order, cheapest first. **Measurement context:** no firmware update is logged in the window, and the ring’s wear pattern is unchanged {{ev:src}}. **Persistence:** the drop shows in ten of the last twelve weekly means — a sustained shift, not one bad stretch {{cite:obs-rem}} {{ev:src}}. **Baseline:** it is measured against your own six months, a window long enough to hold your normal variability {{ev:inf}}.' },
      { kind: 'p', text: 'What weakens the check: your second instrument is missing. **Whoop has been stale since August 1** — a sync failure, logged as an error — so the most recent nights are single-source {{ev:src}}. And even with both running, they would not have settled this cleanly:' },
      { kind: 'concept', concept: 'measurement-quality',
        text: 'Oura and Whoop don’t measure REM — each infers it from movement, heart rate and temperature through its own model, and the same night routinely scores differently on the two. Agreement between them would mean "both models moved", not "your physiology moved"; disagreement wouldn’t make the change false. What makes this drop credible is persistence within one instrument against its own baseline.' },
      { kind: 'p', text: 'What it cannot yet say: the absolute minutes. Consumer sleep-staging agrees with a sleep-lab polysomnogram on roughly 60–80% of epochs, so "7 minutes" carries real uncertainty even when the direction is trustworthy {{ev:guide}}. Why it matters to your goal: REM is one of the three recovery signals bending together this window. The next question worth asking is what would make this worth acting on rather than watching — and your record already holds the candidates: the block’s ramp {{cite:block-summary}} and the April travel week {{ev:src}}.' },
    ],
  },

  'What would make the REM drop worth acting on?': {
    cloud: false,
    tools: ['get_time_series', 'get_trend', 'query_health_model'],
    actions: [
      { kind: 'experiment', propose: 'session-timing', label: 'Test session timing' },
    ],
    blocks: [
      { kind: 'lead', text: 'Three things — and none of them is "the score gets worse".' },
      { kind: 'p', text: '**If it outlasts the block.** The decline started the same month the aerobic block ramped {{cite:block-summary}} {{ev:src}}, and hard evening sessions are a plausible, reversible suppressor of deep and REM sleep {{ev:inf}}. If REM recovers when the block tapers, the 7 minutes were the price of the training — a cost you were paying knowingly.' },
      { kind: 'p', text: '**If it spreads.** Right now this is one stage of one signal. Resting heart rate is flat {{cite:obs-rhr}}, which is reassuring {{ev:src}}. If HRV keeps drifting {{cite:obs-hrv}}, resting HR joins in, or daytime energy and session quality bend, the same 7 minutes reads differently {{ev:inf}}.' },
      { kind: 'p', text: '**If it starts costing a function you value.** There is no clinical threshold for REM minutes to cross {{ev:none}} — no guideline turns 7 minutes into a diagnosis. The reason to care is the goal you’ve stated: training capacity and recovery. A number can wait; a function that degrades is the thing worth responding to.' },
      { kind: 'p', text: 'What the record cannot do is separate those by watching — the block, the season and the schedule move together. The next question most likely to change what you do is the first one, and it is testable: hold the load, move the hard sessions earlier, and score morning recovery against a bar set in advance. Cheap, reversible, and it converts a worry into a result either way.' },
    ],
  },

  // Conversation 2 · a considered preference, not a mined one (cloud reasoner)
  'A friend my age just got a stent — should I repeat my calcium scan?': {
    cloud: true,
    tools: ['query_clinical', 'get_trend', 'search_guidelines', 'query_health_model'],
    blocks: [
      { kind: 'lead', text: 'That lands close — a friend, your age, your sport. Let me separate what his story changes for you from what it doesn’t.' },
      { kind: 'p', text: 'Hidden inside "should I repeat the scan" are four different questions: how likely your arteries have changed since the last scan; how likely a repeat is to **change what you and your doctor actually do**; what the scan costs in radiation, money and follow-up; and how you weigh reassurance against acting on soft signals. They have different answers, so they’re worth keeping apart.' },
      { kind: 'p', text: 'What your record says: your **CAC was 0 in November 2024** {{cite:img-cac}} — no detectable calcified plaque {{ev:src}}. Since that scan, **ApoB has gone 88 → 95 mg/dL** {{cite:obs-apob}}, continuing a two-year climb past the < 90 target your family history makes relevant {{cite:fh-father-cad}} {{ev:guide}}. And **Lp(a) sits elevated at 76 nmol/L** {{cite:obs-lpa}} — a lifelong risk enhancer the scan cannot see {{ev:src}}.' },
      { kind: 'p', text: 'One check before any numbers, because your friend’s story is doing real work in this question. A vivid case from someone like you *feels* like evidence about your own risk — and it is genuine evidence that this disease exists in fit men your age; that weight doesn’t get dismissed here. What the story cannot carry is a **rate**: one stent among the men you run with says almost nothing about the chance your arteries changed in nine months {{ev:inf}}. Keep the story — it’s why you’re asking a good question early. Just don’t let it stand in for the denominator.' },
      { kind: 'p', text: 'What this cannot yet say: whether a scan today would read anything but 0 — and the more decisive question, whether *either* result would change a decision you aren’t already facing on ApoB alone. That second question is the one most likely to settle this. Ask and I’ll lay the numbers out.' },
    ],
  },

  'What would a repeat scan actually buy me?': {
    cloud: true,
    tools: ['search_guidelines', 'query_health_model', 'query_clinical'],
    blocks: [
      { kind: 'lead', text: 'Less than it feels like it would — and the shortfall is worth seeing as counts, not percentages.' },
      { kind: 'p', text: 'Take **1,000 men in their mid-forties with a CAC of 0** and a profile like yours — rising ApoB, elevated Lp(a), a father with CAD at 62 {{cite:fh-father-cad}}. Over the **next three years**, roughly **200–300 of them convert to a score above zero**, and **fewer than 10 have a cardiac event** in that window — the zero is precisely why the near-term number is that low {{ev:guide}} {{ev:inf}}. Nine months after your scan, you are early in that curve, not late.' },
      { kind: 'concept', concept: 'base-rates',
        text: 'What a test is worth depends on what you’d do differently with each result. A second 0 mostly repeats what you know — and cannot rule out the soft, non-calcified plaque that a rising ApoB builds first. A score above 0 would sharpen the statin conversation — but that conversation is already on the table from the ApoB trend and family history alone. When both results lead to the same next step, the test buys mostly feelings, not decisions.' },
      { kind: 'p', text: 'Both columns of the ledger, since a fair frame shows harms with benefits. Harms: about **1 mSv of radiation** — a few months of background exposure {{ev:guide}}; roughly **$100–200** out of pocket; and the quiet one, **incidental findings** — chest CTs surface something unexpected in a meaningful minority of scans, and some of those start follow-up cascades of their own {{ev:guide}}. Benefits: genuine reclassification power once conversion is actually likely — the guideline interval for a CAC of 0 is **3–5 years**, so late 2027 at the earliest {{ev:guide}} — and reassurance, which is worth something real to a person even when it changes no decision {{ev:inf}}.' },
      { kind: 'frame', caption: 'Same fixed axes as every frame. The system fills the cells and stops — no ranking unless you ask it to simplify.',
        cols: ['Option', 'Evidence', 'What it can change', 'Harms', 'Cost', 'Reversible'],
        rows: [
          { cells: ['Repeat CAC now (9 months after a 0)', { ev: 'low' }, 'Little — both results lead to the same ApoB conversation', '~1 mSv · incidentals', '~$150', 'n/a'] },
          { cells: ['Repeat at the guideline interval (2027–29)', { ev: 'guide' }, 'Reclassifies risk when conversion is plausible', 'Same, deferred', '~$150', 'n/a'] },
          { cells: ['No repeat — steer by quarterly ApoB', { ev: 'moderate' }, 'Tracks the particle number that moves first', 'None', 'Already ordered', 'Yes'] },
        ] },
      { kind: 'p', text: 'The invariants, stated so the frame stays honest: baseline — your own 0, nine months old; denominator — 1,000 men like you; horizon — three years; and what would change the arithmetic — a symptom, a new family event, or ApoB continuing to climb {{ev:inf}}. What no number here can weigh is how much the reassurance itself is worth to you. That part is yours, and it’s still open.' },
    ],
  },

  'Honestly, I just want the reassurance. Scans are cheap.': {
    cloud: true,
    tools: ['query_health_model'],
    blocks: [
      { kind: 'lead', text: 'That’s a legitimate thing to want — and it sits at an angle to something else you’ve told me.' },
      { kind: 'p', text: 'Two statements of yours now pull in different directions. Today: *"I just want the reassurance."* On file, from how you’ve made every other call in this record: *settled evidence and long-term safety outweigh everything, and you don’t act on soft signals — you read the derivation before you trust a number* {{ev:inf}}. Neither is wrong; values don’t get graded here. But they disagree about this scan, and which one governs it is yours to say, not mine to infer.' },
      { kind: 'p', text: 'Worth carrying into that choice: the reassurance a second 0 offers is **partly false reassurance**. The scan cannot see non-calcified plaque — which is what a rising ApoB builds first — so it would quiet the fear without checking the thing the fear is about {{cite:img-cac}} {{ev:inf}}.' },
      { kind: 'p', text: 'So one question back, because it does more work than any number so far: **is this scan for your arteries, or for the week after your friend’s stent?** Both are real needs. They just have different best responses — and only one of them costs a scan.' },
    ],
  },

  'Evidence first — if it changes nothing before 2027, I can wait.': {
    cloud: true,
    tools: ['query_health_model'],
    actions: [
      { kind: 'share', domains: ['cardiac'], label: 'Add to a doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'Noted — and here is the shape of where you’ve landed, so you can check it against yourself.' },
      { kind: 'p', text: 'Your considered preference, as I currently model it: **it favours waiting for the guideline interval and steering by quarterly ApoB in the meantime — but it shifts if (a) ApoB keeps rising through the next two draws, (b) anything symptomatic appears, or (c) a therapy arrives that a scan result would actually gate**, such as Lp(a)-directed treatment reaching the clinic {{ev:inf}}. I hold that model with **moderate confidence** — your tolerance for waiting seems to depend more on the trend staying explicable than on the raw probabilities.' },
      { kind: 'p', text: 'To be precise about what that is: a model of where your thinking currently stands — **not a recommendation, and not a claim to have found your "true" preference**. It is stored as provisional, at the *understood* rung of the preference ladder, with this conversation as its provenance — visible and editable like everything else about you, including the day after your next draw {{ev:src}}.' },
      { kind: 'p', text: 'Separate from the scan question: the ApoB trend and family history {{cite:obs-apob}} {{cite:fh-father-cad}} are already the makings of a doctor packet. That conversation is available whichever way the scan decision goes — and it is the one your record has been earning for two years.' },
    ],
  },

  // Conversation 3 · correlation → causation → a reversible experiment (cloud)
  'Evening training is tanking my HRV — pretty clear cause and effect, right?': {
    cloud: true,
    tools: ['get_time_series', 'get_correlations', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'The pattern is real. The word "tanking" is carrying more than the data can lift.' },
      { kind: 'p', text: 'What the data says: your **three lowest HRV mornings this window each followed a threshold session that started after 19:00** {{cite:obs-hrv}} {{ev:src}}. Across the same window HRV drifted **46 → 42 ms** while weekly training load rose about 28% {{cite:block-summary}} {{ev:src}}, and load does co-move with next-morning HRV: r = −0.41 at a two-day lag {{ev:src}}.' },
      { kind: 'p', text: 'What it cannot yet say: **your data show that these happened together. They do not yet show that one caused the other** {{ev:inf}}. Three other things moved across the same weeks — total volume (up 28%, at every hour of the day), the season (warmer nights), and an April travel week that took Garmin offline for nine days, so any correlation across it is computed on unequal data {{ev:src}}.' },
      { kind: 'p', text: 'Why the difference matters to your goal: if evening **timing** is the cause, you keep the whole block and buy back recovery by moving the clock — the cheapest fix on the table. If total **load** is the cause, moving sessions changes nothing and the block itself is the cost {{ev:inf}}.' },
      { kind: 'p', text: 'The next question most likely to change what you do: what would these mornings look like if timing were *not* the cause? Your record can partly answer that already — ask, and I’ll run the comparison it supports.' },
    ],
  },

  'Every hard evening session is followed by a bad morning. What else could it be?': {
    cloud: true,
    tools: ['get_time_series', 'get_correlations', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'Here is the counterfactual, run against what you already have.' },
      { kind: 'p', text: '**If evening timing were the main cause**, morning sessions of similar load should be followed by near-normal HRV. The window holds 19 threshold sessions: 13 evening, 6 morning-or-midday {{ev:src}}. Next-morning HRV averaged **39 ms after evening sessions, 43 ms after morning ones, 44 ms after easy days** {{ev:inf}}. The direction supports your hunch — but six morning sessions is a thin comparison, and they cluster in the cooler early weeks, so timing is still tangled with season and with where in the block you were.' },
      { kind: 'p', text: 'Confounders, taken one at a time: **illness** — nothing logged in the window {{ev:src}}; **alcohol** — your log carries it too patchily to clear it, and an unlogged confounder is not an absent one {{ev:src}}; **travel** — the April week is a real hole in the exposure data {{ev:src}}; **device change** — none: same ring, same firmware, and the January lab-vendor switch touched assays, not wearables {{cite:lab-vendor-switch}} {{ev:src}}.' },
      { kind: 'concept', concept: 'regression-to-the-mean',
        text: 'One quieter distortion: you tend to open the app on the low mornings — the state is what sends you to look. Sampling your worst days makes any pattern near them look tighter than it is, and the morning after a worst-morning was always likely to be better regardless of what you change. The fix is deciding in advance which mornings count — which is exactly what a pre-registered window does.' },
      { kind: 'p', text: 'Net: the hypothesis survived every check it could be put to — plausible, directionally supported, unproven {{ev:inf}}. Watching longer will not untangle timing from load and season; they move together in the life you actually live. What remains is the version of the question only a deliberate change can answer — and it is a small one.' },
    ],
  },

  'OK — how do we actually find out?': {
    cloud: true,
    tools: ['query_health_model', 'get_time_series'],
    actions: [
      { kind: 'experiment', propose: 'session-timing', label: 'Pre-register the timing experiment' },
    ],
    blocks: [
      { kind: 'lead', text: 'With the smallest reversible change that separates timing from load — designed before you see another morning.' },
      { kind: 'p', text: 'The design: for **three weeks, keep the block exactly as planned — same sessions, same weekly load — and move every threshold session before noon.** One variable moves; everything that would otherwise confound it is held {{ev:inf}}. Fully reversible: week four, your evenings come back if you want them.' },
      { kind: 'p', text: '**Pre-registered before day one**, so the bar cannot drift once results arrive: the baseline is your last 14 days of morning-after readings {{cite:obs-hrv}}; success is the morning-after HRV dip shrinking by **≥ 4 ms** against that baseline; the check-in is **day 21**. Stopping rules, set now: illness or unplanned travel pauses the clock rather than polluting the window, and if the block’s load itself changes, the run is void — that would be a different experiment {{ev:inf}}.' },
      { kind: 'concept', concept: 'n-of-1',
        text: 'This is the rare health question where you can run the decisive study on yourself: you schedule the exposure, the outcome is already measured every morning, and the change costs nothing but calendar friction. The discipline — one variable, a locked bar, a fixed horizon — is what separates a finding from a story.' },
      { kind: 'p', text: '**What would support the hypothesis:** the dip shrinks past the bar while load stays on plan — timing was doing real work, and you own a free lever. **What would weaken it:** mornings look the same as the evening weeks did — the cost lives in the load itself, and the honest next question becomes whether the block’s remaining weeks are worth their recovery price. Either result is a finding; the run is scored against the bar above, not against how it feels {{ev:inf}}.' },
    ],
  },

  // Conversation 4 · a therapy decision at full depth (local reasoner)
  // The longest seeded thread — ten exchanges, produced by running a simulated
  // user (who knew nothing of the spec) against an agent bound to it, then
  // edited down. It exercises what the shorter threads can't: several distinct
  // fears surfacing across turns rather than at once, one bias check per turn
  // (availability → the running-club story; relative→absolute → the diabetes
  // number; the lisinopril coherence probe), a pre-registered hand-off to
  // Experimentation mid-conversation, and a decision surface stored at the end.
  // Local on purpose: the thread leans on his genome throughout, and the
  // pharmacogenomics never leave the device.
  'My doctor wants me on a statin. My calcium score was zero — why does a guy in the best shape of his life need a heart disease pill?': {
    cloud: false,
    tools: ['get_trend', 'query_clinical', 'search_guidelines', 'get_genomic_variants'],
    blocks: [
      { kind: 'lead', text: 'Straight answer: your doctor isn’t looking at your fitness. He’s looking at a different line than the one you feel.' },
      { kind: 'p', text: 'The fitness part of the record is genuinely excellent — **metabolic-cart VO₂max 47.8 and climbing** {{cite:vo2-2025-06-14}}, resting HR 54 {{cite:obs-rhr}} {{ev:src}}. The statin conversation is about a different series: **ApoB has risen at every one of nine draws since May 2023 — 72 → 95 mg/dL** {{cite:obs-apob}}, now past the < 90 target your family history sets {{cite:fh-father-cad}} {{ev:guide}}. Add **Lp(a) at 76 nmol/L** {{cite:obs-lpa}} — genetic, lifelong, and not something any statin lowers {{ev:src}}. Plaque and fitness run on separate channels, and in your record they point in opposite directions {{ev:inf}}.' },
      { kind: 'p', text: 'The calcium zero is real and it matters {{cite:img-cac}}. But that scan sees only *calcified* plaque, and a rising ApoB builds soft plaque first — the kind that calcifies later. A 21-month-old zero says "nothing far along yet." It cannot say "nothing starting" {{ev:inf}}.' },
      { kind: 'p', text: 'What your data cannot say is whether to treat — that is the six-week decision, and it belongs to you and your doctor {{ev:none}}. What I can do is put absolute numbers on the three harms you read about, from blinded trials rather than forums — the gap between those two sources is unusually large. Which is carrying the most weight tonight: muscle, brain fog, or diabetes?' },
      { kind: 'sources', text: 'Records behind this answer:', cites: ['obs-apob', 'obs-lpa', 'img-cac', 'fh-father-cad', 'vo2-2025-06-14'] },
    ],
  },

  'Wait — Lp(a)? A genetic problem the pill doesn’t even fix? And muscle is my real worry. A guy in my running club quit his statin because he couldn’t train.': {
    cloud: false,
    tools: ['query_clinical', 'get_genomic_variants', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'Two separate things — and the Lp(a) point cuts the opposite way from how it landed.' },
      { kind: 'p', text: 'ApoB is the total count of artery-damaging particles: 95 as of August 1 {{cite:obs-apob}}. Lp(a) is one stubborn slice of that total — 76 nmol/L, set by your genes (your **LPA rs3798220** variant explains it {{cite:gen-lpa}}), and no, statins don’t touch it {{ev:src}}. What a statin does is cut the rest, hard — 30–40% at moderate doses {{ev:guide}}. So the pill isn’t *for* the Lp(a). The Lp(a) is why the rest matters more for you than for most people: a fixed load you can’t lower makes the load you *can* lower do double duty {{ev:inf}}.' },
      { kind: 'p', text: 'On muscle — your friend’s story is real, and I won’t argue with it. One thing worth separating: in open-label use, 10–30% of people report muscle pain. In blinded trials, where nobody knows pill from placebo, the excess over placebo is about **1 in 100** {{ev:guide}}. In SAMSON, people who had quit statins over pain took placebo months without knowing — and reported about 90% of the same pain {{ev:guide}}. The nightmare is common; the drug causing it is rare. That is a population fact, not a promise about you {{ev:inf}}.' },
      { kind: 'p', text: 'And your record says something a forum can’t: you carry **SLCO1B1 \\*1/\\*5** {{cite:pgx-slco1b1}} — elevated myopathy risk *specifically on simvastatin*; rosuvastatin and pravastatin don’t carry that flag for you {{ev:guide}}. Your friend’s outcome ran on his genetics and, likely, his statin. Yours would run on yours — and yours come with a legible warning label about which one to avoid.' },
    ],
  },

  '90% of the pain showed up on placebo? So my friend imagined it? And you skipped the diabetes thing — I read statins raise it 10%.': {
    cloud: false,
    tools: ['query_clinical', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'Not in his head — in his body, really hurting, really unable to run. What the blinded data question is the molecule, not the man.' },
      { kind: 'p', text: 'SAMSON’s finding is that the *pain* is real while the *cause* is usually not the statin: the same tablets minus the drug produced almost the same symptoms {{ev:guide}}. The distinction matters practically — pain from expectation responds to blinding and structure; pain from the drug responds only to stopping it. Both are exits. Nobody is trapped {{ev:inf}}.' },
      { kind: 'concept', concept: 'placebo-effect',
        text: 'Expectation-generated pain runs on the same nerves as any other pain — "90% on placebo" is not an accusation of imagining it. It means the tablet’s chemistry was rarely the difference. Isolating that is exactly what a blinded comparison is for.' },
      { kind: 'p', text: 'On funding — fair instinct, and here it has an answer: SAMSON and StatinWISE were publicly funded, no industry sponsor {{ev:src}}. The big efficacy meta-analyses do pool industry trials, so keep your scepticism pointed there if anywhere. Though note the incentive argument cuts both ways: the diabetes number you’re citing came out of those same trials {{ev:inf}}.' },
      { kind: 'p', text: 'Which brings me to it. The "10% increase" is relative. In absolute terms: roughly **1 extra case of diabetes per 250–500 people treated for 4–5 years**, landing almost entirely in people already near the diabetic threshold {{ev:guide}}. Your HbA1c is **5.4% and has been flat for three years** {{cite:obs-hba1c}}; fasting insulin and HOMA-IR are normal {{ev:src}}. Family history matters, but your own three-year line is the better witness here, and it is quiet {{ev:inf}}.' },
    ],
  },

  'If I’m the rare real case, how fast does it reverse? And why can’t I just diet my way out of this?': {
    cloud: false,
    tools: ['search_guidelines', 'query_clinical', 'query_health_model'],
    blocks: [
      { kind: 'lead', text: 'Fair — I owed you that number.' },
      { kind: 'p', text: 'For the common form of statin muscle symptoms, stopping resolves them typically within **days to a few weeks**; most people are clear inside a month {{ev:guide}}. Two weeks is a better estimate than two months. The serious, slow-to-reverse myopathy is the rare thing your SLCO1B1 flag exists to help avoid {{cite:pgx-slco1b1}} — dose- and agent-linked, which is why the flag names simvastatin {{ev:guide}}. So the realistic worst case reads: notice symptoms, stop or switch, lose part of a training cycle — not a season {{ev:inf}}. What nobody can give you is a personal guarantee, which is why tracking matters more than forecasting.' },
      { kind: 'p', text: 'On diet — you’re right that you never ran that experiment, and I won’t pretend you did. The ceiling: realistic sustained change moves ApoB **5–15%**; aggressive portfolio-style eating with very high adherence, **20–30%** {{ev:guide}}. Your diet is already Mediterranean-leaning at 88% logging coverage {{ev:src}}, so your remaining headroom is likely the low end. From 95, a strong 10% gets you to ~86 — under target, barely, with the trend still pointed up underneath {{ev:inf}}.' },
      { kind: 'frame', caption: 'The same fixed axes as every frame. The cells are filled and nothing is ranked.',
        cols: ['Option', 'Evidence', 'Effect on ApoB', 'Risk', 'Reversible', 'Effort'],
        rows: [
          { cells: ['Tighten diet hard (fibre, sat-fat)', { ev: 'moderate' }, '−5–15%, from a good baseline', 'None', 'Yes', 'Daily habit'] },
          { cells: ['Moderate statin (discuss w/ MD)', { ev: 'high' }, '−30–40%', 'Low, genome-matched', 'Yes — washes out in weeks', 'Daily pill'] },
          { cells: ['Both', { ev: 'high' }, 'Additive', 'Low', 'Yes', 'Both habits'] },
        ] },
      { kind: 'p', text: 'Those first two aren’t mutually exclusive, and six weeks is enough time to learn something real about the diet lever before the follow-up. Want the experiment sketched properly — with the bar set before you see the number?' },
    ],
  },

  'Sketch the diet experiment. But honestly — is it informative, or am I just buying six weeks of feeling like I did something?': {
    cloud: false,
    tools: ['get_trend', 'query_health_model', 'search_records'],
    actions: [
      { kind: 'experiment', propose: 'fibre', label: 'Pre-register the diet experiment' },
    ],
    blocks: [
      { kind: 'lead', text: 'It’s informative if — and only if — you pre-register what each result means before you see it. That’s the guard against the thing you just named.' },
      { kind: 'p', text: 'The sketch: hold the training block steady so one variable moves {{cite:block-summary}}. Six weeks of saturated fat down hard and **15 g/day added soluble fibre**, everything else as-is — your logging makes adherence verifiable rather than vibes {{ev:src}}. Redraw ApoB at week six: same lab, fasted, same time of day. One measurement note before any criteria: ApoB bounces 6–8% within a person, so from 95, anything above ~88 is indistinguishable from no effect {{ev:guide}}.' },
      { kind: 'p', text: 'Pre-registered readings, locked now: **≤ 85** — real dietary headroom exists, and how far it goes becomes a live question. **86–90** — marginal, at the edge of the assay’s noise. **> 90** — your diet was already near its floor, and "I never tried" has been replaced with evidence {{ev:inf}}. Whatever it reads, the number can’t be renegotiated by the version of you looking at it in six weeks.' },
      { kind: 'concept', concept: 'n-of-1',
        text: 'The run is scored against a bar set before the result exists — that is the entire discipline. A criterion chosen afterwards always agrees with whoever chose it.' },
      { kind: 'p', text: 'And be clear-eyed about what it can’t answer: the Lp(a) and the two-year climb exist in every branch {{cite:obs-lpa}}. Even the best result hands your doctor a sharper question, not a resolved one — *is 85-and-holding enough margin, given Lp(a) at 76?* But that is a real conversation with a real number in it {{ev:inf}}.' },
    ],
  },

  'Lock it in. But nobody starts a statin and stops. Is there data on decades, or just five-year trials? My dad’s been on one since his stent and I can’t tell it’s done anything.': {
    cloud: false,
    tools: ['search_guidelines', 'get_genomic_variants', 'query_clinical'],
    blocks: [
      { kind: 'lead', text: 'Locked — it’ll sit on your timeline next to the post-meal-walks trial. The forever question, honestly: nobody has run a 40-year randomised trial, and nobody ever will.' },
      { kind: 'p', text: 'What exists is layered. Trials run about five years; their cohorts have been followed for up to twenty after — WOSCOPS is the cleanest — with the benefit persisting and no late harm signal emerging {{ev:guide}}. Statins have been in mass use since 1987, so rare-harm surveillance now spans nearly four decades. That is weaker than a trial, and worth saying so {{ev:inf}}.' },
      { kind: 'concept', concept: 'hierarchy-of-evidence',
        text: 'The decades question is answered by three instruments, none sufficient alone: five-year trials, twenty-year cohort follow-ups, and people born with LDL-lowering variants. The genetic one is the only instrument that covers the horizon the trials can’t — and it is observational, so it borrows credibility from the other two agreeing with it.' },
      { kind: 'p', text: 'That genetic evidence is the strongest long-horizon signal, and you’re the right reader for it: people born with lifelong-low LDL show far larger risk reductions per mg/dL than five-year trials do — because plaque tracks *cumulative* exposure. LDL-years, like pack-years {{ev:guide}}. You already believe this argument: it is the same logic that makes your Lp(a) matter {{cite:gen-lpa}} — a lifelong exposure raising risk and a lifelong exposure lowering it are the same curve with the sign flipped {{ev:inf}}. It is also why "start at 45 versus 55" is a real question rather than the same question later.' },
      { kind: 'p', text: 'And "forever" isn’t the commitment on the table — it’s a yearly re-decision that is fully reversible. As for your dad: prevention’s cruelty is that a heart attack that never happened leaves no receipt. Refills are what success looks like from the inside {{ev:inf}}.' },
    ],
  },

  'He’s 74 and still gardening — that’s the receipt, isn’t it. One more: is red yeast rice anything, or just an unregulated statin with extra steps?': {
    cloud: false,
    tools: ['search_guidelines', 'query_health_model', 'get_genomic_variants'],
    blocks: [
      { kind: 'lead', text: 'That’s the receipt. And notice what you just did — re-read a piece of evidence you’d held one way for years. That’s the update working, not me winning.' },
      { kind: 'p', text: 'Red yeast rice: your instinct is right, and the *why* is worth having. Its active compound, monacolin K, is chemically identical to lovastatin — not statin-like, the same molecule {{ev:guide}}. So "natural statin, no pharma" is really "statin, no dose label, no quality control." Independent testing finds monacolin content varying from nearly nothing to prescription-level doses between brands and between batches, plus occasional contamination with citrinin, a kidney toxin {{ev:guide}}.' },
      { kind: 'p', text: 'The part specific to you: lovastatin sits in the same lipophilic family as simvastatin — the family your **SLCO1B1 variant flags for myopathy risk** {{cite:pgx-slco1b1}} {{ev:guide}}. The "natural" route would be an *unknown* dose of a statin from the *worst-matched* chemical class for your genome, with no monitoring. The pharmacogenomics that let you dodge the nightmare scenario by name only work when you know what and how much you’re taking {{ev:inf}}. Whatever you decide about statins, this door isn’t a third option — it’s the same door, unlit.' },
    ],
  },

  'Should I redo the calcium scan before the follow-up — or is that me shopping for another zero?': {
    cloud: false,
    tools: ['search_records', 'search_guidelines', 'query_clinical'],
    blocks: [
      { kind: 'lead', text: 'You answered most of this a week ago — let me read your own decision surface back before adding anything.' },
      { kind: 'p', text: 'Recorded August 1, at rung *understood*, moderate confidence: you favour waiting for the guideline scan interval and steering by quarterly ApoB, with three shift conditions — ApoB still rising through the next two draws, anything symptomatic, or a therapy arriving that a scan result would gate {{ev:src}}. What has genuinely changed since: that third condition is arguably live, because a statin decision is now on the table, and some guidance does use a calcium zero to defer statins in borderline-risk people {{ev:guide}}.' },
      { kind: 'p', text: 'But run the information value for *your* case. A repeat zero can’t carry the weight the first one did — you hold four risk enhancers the scan cannot see: Lp(a) 76 {{cite:obs-lpa}}, the unbroken ApoB climb {{cite:obs-apob}}, your father at 62 {{cite:fh-father-cad}}, South Asian ancestry {{ev:guide}}. With those, conversion from zero runs maybe 5–10% a year {{ev:guide}}. And a nonzero would only push in the direction everything else already points. The scan is asymmetric for you: one result changes little, the other confirms what’s known {{ev:inf}}.' },
      { kind: 'p', text: 'Which leaves the motive you named yourself, and I won’t grade it — wanting to feel like a healthy person is legitimate. But a test you’ve pre-decided to believe in only one direction isn’t measurement any more {{ev:inf}}. It reads better as a question for the follow-up than as a scan bought before it.' },
    ],
  },

  'Real talk — a pill at 45 feels like the opening scene of becoming my dad. Build me the packet for the follow-up.': {
    cloud: false,
    tools: ['query_clinical', 'get_genomic_variants', 'query_health_model'],
    actions: [
      { kind: 'share', domains: ['cardiac'], label: 'Build the doctor packet' },
    ],
    blocks: [
      { kind: 'lead', text: 'That fear is a data point — it’s filed under values rather than labs, and that layer gets equal standing here.' },
      { kind: 'p', text: 'Hold it next to the record for one moment. Your dad started his statin at 62, *after* the stent — the pill arrived as damage control. What’s on your table at 45 is the reverse scene: nine ApoB draws {{cite:obs-apob}}, a genome {{cite:pgx-slco1b1}}, a calcium scan he never had {{cite:img-cac}}, and seventeen years he didn’t get. Whichever way you decide, you are not in his movie — you’re deciding with information that didn’t exist for him {{ev:inf}}.' },
      { kind: 'p', text: 'One gentle question, not an argument: you’ve taken lisinopril every morning for three years {{cite:med-lisinopril}} without it touching your identity. What makes this pill different? You don’t owe me the answer — it might be worth knowing before the follow-up.' },
      { kind: 'p', text: 'The packet will hold: the ApoB trajectory with the < 90 target flagged {{cite:obs-apob}}; Lp(a) 76 with the rs3798220 note {{cite:gen-lpa}}; the **SLCO1B1 \\*1/\\*5 flag with its CPIC guidance** — rosuvastatin or pravastatin preferred, simvastatin avoided {{cite:pgx-slco1b1}} {{ev:guide}}; your metabolic baseline for the diabetes conversation {{cite:obs-hba1c}}; the CAC context {{cite:img-cac}}; and a slot for the week-six draw. Questions queued: agent choice given the genome, starting dose and target, recheck cadence, whether the Lp(a) changes intensity, a symptom protocol with a baseline CK, and the rescan timing {{ev:inf}}.' },
      { kind: 'sources', text: 'Records behind this answer:',
        cites: ['obs-apob', 'obs-lpa', 'gen-lpa', 'pgx-slco1b1', 'img-cac', 'med-lisinopril', 'fh-father-cad'] },
    ],
  },

  'The lisinopril question got me. Run the experiment, redraw, walk in with the packet — that’s the plan.': {
    cloud: false,
    tools: ['search_records', 'get_trend'],
    blocks: [
      { kind: 'lead', text: 'Then here is the model I’m storing — a model of you, editable like everything else in your preference layer, and not a recommendation.' },
      { kind: 'p', text: 'Direction: open to a structured, reversible trial of a genome-matched agent, contingent on the week-six draw and the follow-up conversation — evidence weighted over identity, a weighting you arrived at tonight rather than one I assigned {{ev:inf}}. It shifts if the diet draw comes back at or below 85, if a pre-registered trial produces symptoms that persist under blinding, or if your metabolic markers move. Rung: *understood*, edging toward *endorsed* — it survived the action-versus-inaction comparison and the lisinopril mirror. My confidence in the model: **moderate**; its newest parts are hours old {{ev:src}}.' },
      { kind: 'p', text: 'For the record, success here was never you agreeing to anything. It was the question sharpening — from *why does a fit guy need a heart pill* to *what’s my dietary headroom, and which molecule fits my genome*. It did. See you at the draw.' },
    ],
  },

  // --- guest thread · Maya (docs/behavioural-flows-transcripts.md) -----------
  // A different patient, a different register: meaning first, turns under ~160
  // words, plans capped at two steps. Her instance runs everything local, so
  // `guest` pins the trace to a local destination regardless of Ravi's header.
  'It’s 3pm and my brain shut off again. My ring says my sleep is fine, which makes it worse. What is going on with me? And don’t tell me my labs are normal.': {
    guest: 'maya',
    cloud: false,
    tools: ['get_time_series', 'get_trend', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'You’re not imagining it — and your ring actually backs you up.' },
      { kind: 'p', text: 'Sleep is averaging **7h20 with solid efficiency, steady for months** {{cite:maya-sleep-summary}} {{ev:src}}. By your own data, sleep is largely ruled out as the culprit. And your crashes aren’t random: seven logs in three weeks, **all landing between about 1:40 and 3pm** {{cite:maya-energy-logs}} {{ev:src}}. That’s a pattern, not a mood {{ev:inf}}.' },
      { kind: 'p', text: 'Now, about "your labs are normal." Normal means the population range — not *your* range. Two years ago your TSH was **1.6** on this same dose. Last draw: **3.8** {{cite:maya-tsh-series}} {{ev:src}}. Every value inside the lab’s lines, but for someone on treatment, more than doubling from your own baseline is a real signal — the kind "normal" quietly hides {{ev:inf}}.' },
      { kind: 'p', text: 'What the numbers can’t yet say is *why* it’s drifting. But that hands you a sharper question than "why am I tired" — and I have a couple of candidates when you want them.' },
    ],
  },

  'It doubled and nobody said anything?? Is this the Hashimoto’s getting worse? That’s the thing I don’t let myself google at 2am.': {
    guest: 'maya',
    cloud: false,
    tools: ['query_clinical', 'get_trend', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'You’re not crazy — the drift is right there in your own numbers. Let’s take the 2am fear first.' },
      { kind: 'p', text: 'The marker that tracks the autoimmune attack itself — your **TPO antibodies — has been roughly stable across three measurements** {{cite:maya-tpo}} {{ev:src}}. If the Hashimoto’s were speeding up, that’s where I’d expect movement. It’s not proof, but your data does not look like a disease accelerating {{ev:inf}}.' },
      { kind: 'p', text: 'Two more ordinary candidates fit better. First: your morning logs show **coffee within about fifteen minutes of your pill most days** {{cite:maya-intake-log}} {{ev:src}} — and coffee measurably cuts levothyroxine absorption {{ev:guide}}. Same dose swallowed, less of it arriving. Second: your **ferritin is 22** {{cite:maya-ferritin}} — inside the range, but below 30 is linked to exactly this kind of fatigue in women {{ev:guide}}.' },
      { kind: 'p', text: 'Candidates, not verdicts {{ev:inf}}. But notice your question just sharpened: not "why am I tired" — *is my dose actually getting in, and is low iron riding along?*' },
    ],
  },

  'The coffee thing is real?? And since we’re here — I’ve got a tab open for a thyroid glandular supplement. Wouldn’t a natural boost cover the gap?': {
    guest: 'maya',
    cloud: false,
    tools: ['search_guidelines', 'query_health_model'],
    blocks: [
      { kind: 'lead', text: 'Real and well-documented — and the fix costs nothing.' },
      { kind: 'p', text: 'Coffee that close to the pill measurably blunts absorption {{ev:guide}}. Not half, most likely, but enough that a drifting TSH on an unchanged dose is exactly what it can look like {{ev:inf}}. The fix: **water with the pill, coffee thirty to sixty minutes later** {{cite:maya-med-levo}}. Six years of nobody mentioning it is maddening — and it may also be your cheapest lever.' },
      { kind: 'p', text: 'On the glandular — your instinct that something thyroid-shaped is off looks right. **The bottle is the wrong instrument, though.** Independent testing keeps finding actual T3/T4 hormone in those supplements, unlabeled, in amounts that vary bottle to bottle {{ev:guide}}. On top of levothyroxine that’s a second hormone dose nobody’s measuring or adjusting — and chronic excess carries real risks, heart-rhythm problems and bone loss among them {{ev:guide}}.' },
      { kind: 'p', text: 'If the problem is your dose not arriving, the fix that matches it is making *that* dose arrive {{ev:inf}}. The choice stays yours — I just want it made with the label filled in.' },
    ],
  },

  'Tab closed. Mostly. Now be honest about the 30-day gluten elimination every Hashimoto’s podcast swears by.': {
    guest: 'maya',
    cloud: false,
    tools: ['search_guidelines', 'query_clinical', 'query_health_model'],
    blocks: [
      { kind: 'lead', text: 'Honest answer: not a wrong instrument like the glandular — but the evidence is much thinner than the podcasts make it sound.' },
      { kind: 'concept', concept: 'hierarchy-of-evidence',
        text: 'The gluten-Hashimoto’s trials are small and mixed; the clearest benefit is in confirmed celiac disease. The podcast stories are people who genuinely felt better — that’s real, it’s just a story, not a probability.' },
      { kind: 'p', text: 'And here’s the interesting gap: **your record has no celiac test in it** {{ev:src}}. That test is the thing that would turn this from a podcast question into a real one {{ev:inf}}.' },
      { kind: 'p', text: 'Two practical problems for you specifically. Thirty days of reading every label is exactly the kind of babysitting that eats your energy. And you’re on **day 12 of the ashwagandha run** {{cite:maya-exp-ashwagandha}} — start a second change now and neither one can get credit for anything {{ev:inf}}. So the low-effort version: coffee timing starts tomorrow, and a celiac check simply rides along on your next blood draw.' },
    ],
  },

  'A draw means facing the endocrinologist I’ve been dodging for a year and a half. If I go, give me the receipts. And is the ashwagandha even doing anything?': {
    guest: 'maya',
    cloud: false,
    tools: ['get_trend', 'query_clinical', 'search_records'],
    blocks: [
      { kind: 'lead', text: 'Done — I’ll build the packet. It leads with the one picture that changes the room.' },
      { kind: 'p', text: 'Your TSH plotted against your own treated baseline — **1.6, 2.1, 3.8 — same dose throughout, every point stamped "normal"** {{cite:maya-tsh-series}} {{ev:src}}. Then the coffee-timing question {{cite:maya-intake-log}}, ferritin at 22 with the fatigue evidence {{cite:maya-ferritin}} {{ev:guide}}, and a requested add-on: celiac serology on the same draw. One vial, four answers.' },
      { kind: 'p', text: 'The ashwagandha: nine days left, and your energy logs show the crashes **still landing in the same afternoon window** {{cite:maya-energy-logs}} {{ev:src}} — no visible shift yet. Let it finish cleanly rather than judge it early {{ev:inf}}. It goes in the packet too, because ashwagandha can nudge thyroid hormone levels {{ev:guide}}, and your endo should know that when she reads the TSH.' },
      { kind: 'p', text: 'One choice that’s genuinely yours: draw soon and it’s a baseline, or give the coffee fix six weeks and the draw shows whether it worked. Either is defensible {{ev:inf}}. You’re not walking in with a feeling this time — you’re walking in with a chart.' },
      { kind: 'sources', text: 'Records behind this answer:', cites: ['maya-tsh-series', 'maya-intake-log', 'maya-ferritin', 'maya-exp-ashwagandha', 'maya-energy-logs'] },
    ],
  },

  'Six weeks then: coffee fix tomorrow, the ashwagandha finishes its run, then the draw. And the antibodies being stable did more for my 2am brain than any appointment ever has.': {
    guest: 'maya',
    cloud: false,
    tools: ['search_records'],
    blocks: [
      { kind: 'lead', text: 'Recorded, all of it.' },
      { kind: 'p', text: 'Coffee fix from tomorrow morning {{cite:maya-med-levo}}, the ashwagandha finishes its nine days and gets its verdict {{cite:maya-exp-ashwagandha}}, and the draw — TSH, free T4, ferritin, celiac — lands in about six weeks, when it can actually show whether the fix worked {{ev:src}}. The packet’s built and waiting for the appointment.' },
      { kind: 'p', text: 'Only thing that moves the timeline up: if the crashes get worse instead of holding steady, or anything new shows up — then we don’t wait, we go {{ev:inf}}.' },
      { kind: 'p', text: 'It was never a folder of vibes. It was data nobody had plotted for you {{cite:maya-tsh-series}}. Enjoy the coffee — 3pm is officially the correct time for it.' },
    ],
  },

  // --- guest thread · Dev (docs/behavioural-flows-transcripts.md) -------------
  // The measure-before-intervening register: mechanism separated from outcome,
  // conflicts of interest named in every direction, and the decision criterion
  // authored by the user and audited rather than assigned.
  'Every longevity podcast says plant omega-3 barely converts and my brain needs algae oil. You have my data — real physiology or supplement funnel?': {
    guest: 'dev',
    cloud: false,
    tools: ['query_clinical', 'get_trend', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'Both, partly — and your record lets me be specific.' },
      { kind: 'p', text: 'The physiology is real: ALA→EPA conversion runs roughly **5–8%**, ALA→DHA **well under 1%** in most studies {{ev:guide}}. The podcasts aren’t wrong about the mechanism. Your logged intake is actually strong: **flax ~5 mornings a week plus walnuts ~4×/week ≈ 4–5 g ALA on logged days** — about 3× the adequate-intake figure — plus ~75 mg DHA per egg most days {{cite:dev-diet-log}} {{ev:src}}. More flax wouldn’t move DHA either way; the conversion enzyme is the bottleneck, not the input {{ev:guide}}.' },
      { kind: 'p', text: 'Here’s what your record cannot say: **nothing in it has ever measured your omega-3 status.** No omega-3 index, no fatty-acid panel {{ev:src}}. So every claim about *your* levels — podcast or supplement label — is an extrapolation from population averages (vegetarians typically test ~3.5–4.5% vs omnivores ~4–6% {{ev:guide}}). "The mechanism is real" and "your levels are low" are different claims; only the first is established {{ev:inf}}.' },
      { kind: 'p', text: 'A dried-blood-spot omega-3 index test runs about $50–80, at home {{ev:src}}. Before debating the supplement at all — want to work out what result would actually change your decision?' },
    ],
  },

  'Before I spend $70 — wasn’t the omega-3 index invented by the people selling omega-3s? And are my eggs already giving me actual DHA?': {
    guest: 'dev',
    cloud: false,
    tools: ['search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'Your instinct is aimed at the right people but the wrong claim.' },
      { kind: 'p', text: 'The measurement itself is sound: RBC EPA+DHA as a fraction of total fatty acids is reproducible, stable over ~120 days of red-cell life, and rises predictably with intake {{ev:guide}}. As an *assay*, it’s real chemistry. What’s contaminated is the **8% target**: it derives from fish-eating cohorts and from researchers who commercialised the test {{ev:guide}}. The number you’d get is trustworthy; the line someone draws on it is where the money enters {{ev:inf}}.' },
      { kind: 'concept', concept: 'surrogate-endpoints',
        text: 'The honest chain has two links of different strength: supplementation raises the index (near-certain), and a raised index improves outcomes (uncertain — VITAL, 25,000 adults at 1 g/day, was null for major cardiovascular events and for cognition). The index is a surrogate, not an outcome.' },
      { kind: 'p', text: 'And the conflicts run every direction — test-sellers, supplement-sellers, podcasts with algae-oil sponsors, and the null side too {{ev:inf}}. Eggs: yes — **~75 mg DHA each, direct, no conversion needed** {{cite:dev-diet-log}} {{ev:src}}. Modest against the 250–500 mg/day trial doses, but not zero, and already in your baseline. The $70 wouldn’t tell you what to do; it would tell you where you’re starting from.' },
    ],
  },

  'VITAL was null for cognition? Is there any chain where someone like me supplements and an actual outcome improves — not a blood number?': {
    guest: 'dev',
    cloud: false,
    tools: ['search_guidelines', 'query_clinical'],
    blocks: [
      { kind: 'lead', text: 'Straight answer: no.' },
      { kind: 'p', text: 'There is no trial where healthy midlife adults — vegetarian or otherwise — supplemented DHA and a cognitive outcome improved {{ev:none}}. VITAL’s cognition substudies were null {{ev:guide}}; the DHA-brain link in adults rests on observational data. "Brain-critical" is developmental biology — prenatal, infant — stretched to midlife without the evidence making the jump {{ev:inf}}.' },
      { kind: 'concept', concept: 'confounding',
        text: 'The people with high omega-3 indices also eat fish, exercise, and are richer. And vegetarians as a population have *lower* cardiovascular event rates than omnivores despite lower indices — whatever the index costs the dietary pattern, the pattern more than repays it. The podcasts skip this entirely.' },
      { kind: 'p', text: 'The closest thing to a real chain: VITAL’s low-fish-intake subgroup showed a modest cardiovascular signal — hypothesis-generating, not proof {{ev:low}}. REDUCE-IT was positive but used 4 g/day pharmaceutical EPA in statin-treated high-risk patients; you are not in that room {{ev:guide}}.' },
      { kind: 'p', text: 'And your own numbers say your absolute stakes are small: **ApoB 78, hs-CRP 0.6** {{cite:dev-lipids}}, resting HR 58 {{cite:dev-garmin}}, no family history before 75 {{cite:dev-fh}} {{ev:src}}. A low-baseline-risk person buys little absolute benefit from *any* cardiovascular intervention {{ev:inf}}. As for 37 years of quiet worry — nothing in your record supports it. The brain claim is precisely where the evidence is thinnest.' },
    ],
  },

  'B12 I supplement without drama because deficiency causes named damage — is that the difference? And doesn’t my genome change how badly I convert?': {
    guest: 'dev',
    cloud: false,
    tools: ['query_clinical', 'get_genomic_variants', 'search_guidelines'],
    blocks: [
      { kind: 'lead', text: 'Yes — that’s exactly the difference, and it’s why your B12 habit is coherent rather than hypocritical.' },
      { kind: 'p', text: 'The B12 chain is complete at every link: no reliable intake on a lacto-ovo diet → measurable deficiency → *named* outcomes → supplementation prevents them {{cite:dev-supplements}} {{ev:guide}}. Omega-3 has the first links — conversion is genuinely inefficient, vegetarian indices genuinely run lower — and then the chain stops before the outcome {{ev:inf}}. You applied a bar; B12 cleared it. Omega-3, on current evidence, doesn’t clear it as cleanly. That’s not a diet verdict, it’s a data inventory.' },
      { kind: 'p', text: 'The genome, honestly labeled: you carry the **derived FADS1/FADS2 haplotype (rs174546 and linked variants)** {{cite:dev-genome-fads}}, common in South Asian ancestry and associated with *more* efficient ALA→EPA/DHA conversion — direction favourable for your pattern, effect size modest, evidence quality low-to-moderate {{ev:low}}. It nudges the prior that your index sits at the better end of the vegetarian range; it does not replace measuring {{ev:inf}}.' },
      { kind: 'p', text: 'Which leaves one live question, and it’s yours, not mine: is there a number the $70 test could return that would change what you do?' },
    ],
  },

  'If I test sub-3% I add algae oil; 4%+ I keep the flax. Sanity-check my thresholds — am I inventing a cutoff the same way the 8% people did?': {
    guest: 'dev',
    cloud: false,
    tools: ['search_guidelines', 'query_health_model'],
    blocks: [
      { kind: 'lead', text: 'Your cutoff is invented, but not the way theirs was — and the difference matters.' },
      { kind: 'p', text: 'The 8% target smuggles in an outcome claim — *above this, protected* — that no trial supports {{ev:none}}. Yours is a distributional rule: if you’re an outlier *within your own reference class*, cheap insurance wins under asymmetric cost. That claims nothing about outcomes, which is exactly why it’s honest {{ev:inf}}. Pre-registering it before seeing the number is the right move too — the same discipline that keeps you from rationalizing after the fact.' },
      { kind: 'concept', concept: 'measurement-quality',
        text: 'A single dried-blood-spot has real noise — assay plus biological variability — so the lines are bands: a 2.9 and a 3.2 are not meaningfully different values, and a result near a boundary is worth a retest before acting on it.' },
      { kind: 'p', text: 'One more engineering note: you’ve specified two regions and left **3–4% undefined** — which is where a vegetarian with your flax intake {{cite:dev-diet-log}} and favourable FADS haplotype {{cite:dev-genome-fads}} is most likely to land {{ev:inf}}. And whatever you choose there is reversible and checkable: 250–500 mg/day algae DHA (~$10–25/month) typically moves the index over 4–6 months, so test → change → retest is a clean n-of-1 {{ev:guide}}. What’s your default in the gap — supplement or sit tight?' },
    ],
  },

  'Gap default: sit tight. Order the test, thresholds pre-registered. The B12 stays because that chain actually reaches the end.': {
    guest: 'dev',
    cloud: false,
    tools: ['search_records'],
    blocks: [
      { kind: 'lead', text: 'Recorded as pre-registered.' },
      { kind: 'p', text: 'Order the dried-blood-spot omega-3 index (~$70). **Below 3%** — retest first if within noise of the line — add 250–500 mg/day algae DHA and re-measure at 6 months. **At 3% or above**, no change: flax stays {{cite:dev-diet-log}}, wallet stays closed. B12 and vitamin D continue as-is {{cite:dev-supplements}} {{ev:src}}.' },
      { kind: 'p', text: 'Your decision surface, as I’ve modeled it: you intervene when you’re an outlier within your own reference class and the fix is cheap, reversible, and diet-compatible; you don’t pay monthly to move a surrogate that hasn’t earned an outcome {{ev:inf}}. It would shift if outcome-level trial evidence in people like you appeared, or if your baseline risk rose {{cite:dev-lipids}}. **Moderate-to-high confidence** — it matches three years of your own behaviour, B12 included. That’s a model of you, not advice. Good experiment.' },
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

// --- clarifying turns -------------------------------------------------------
// A question with no goal term cannot be ranked, so it does not get a synthesis.
// It gets this instead: the Stage 1 candidate set, grouped, with the reason each
// group earned its place — and the reason a straight answer would be worse.
//
// Three properties make this the *first* turn rather than a fallback:
//
//   · it is DETERMINISTIC. No model is called. Everything below is computed from
//     the store by the mechanistic pass, which is why `local: true` and why no
//     pre-send gate appears — there is no payload, because nothing is being sent.
//   · it PAYS FOR ITSELF. Each option carries its finding, so the user learns
//     what moved in the act of choosing what to spend an answer on.
//   · it GROUPS, it does not rank. Counts and findings, no ordering claim.
//
// The egress decision moves to the *second* turn, where the user knows what they
// are buying and the payload is scoped to a goal they picked.
export const clarifyingTurns = {
  'What changed in my last 90 days?': {
    clarify: true,
    local: true,
    tools: ['get_time_series', 'get_trend', 'query_clinical', 'get_correlations'],
    lead: 'Eleven markers moved more than their own measurement noise in that window.',
    why: 'But "what changed" has no target, so I have no basis for saying which of the eleven matters to you — and a list would imply they matter equally. They don\'t. A statin decision and a seafood habit are not the same question.',
    groups: [
      {
        key: 'cardiac',
        label: 'Cardiac',
        count: 3,
        finding: '**ApoB rose 88 → 95 mg/dL**, crossing the < 90 threshold your family history makes relevant. LDL-C and non-HDL moved with it.',
        reasons: ['change', 'guideline', 'outlier'],
        cites: ['obs-apob', 'obs-ldl'],
        question: 'What changed in my cardiac markers?',
      },
      {
        key: 'metals',
        label: 'Heavy metals',
        count: 1,
        finding: '**Blood mercury 12 µg/L**, above its 10 µg/L reference ceiling — but this is one draw with no prior comparator, so strictly it has not *changed*. There is nothing to compare it against.',
        reasons: ['outlier', 'unique'],
        cites: ['obs-mercury'],
        question: 'What changed in my heavy metals?',
      },
      {
        key: 'sleep',
        label: 'Sleep & recovery',
        count: 4,
        finding: '**HRV fell ~8%** (46 → 42 ms) and **REM fell ~7 min/night** while total sleep held. VO₂max rose over the same window, which is the opposite of what usually accompanies falling HRV.',
        reasons: ['change', 'contradiction'],
        cites: ['obs-hrv', 'obs-rem', 'obs-vo2max'],
        question: 'What changed in my sleep and recovery?',
      },
    ],
    unremarkable: {
      count: 3,
      text: 'Three others cleared their noise floor but stayed inside their reference ranges — CRP fell 1.1 → 0.8, ferritin rose, and body composition was measured once. Say the word and I will list them.',
    },
    concept: {
      concept: 'measurement-quality',
      text: 'Sixty-one other analytes were checked and moved *less* than their own test–retest band. A number that wobbles inside its noise floor has not changed, however different the two printed values look.',
    },
  },
}

export function clarifyFor(question) {
  return clarifyingTurns[question] || null
}

export function ask(question) {
  return answers[question] || defaultAnswer
}

// Questions offered in the "history" sidebar beyond the suggested chips.
// Guest-thread questions are excluded: they belong to other personas' seeded
// instances and are not askable from Ravi's.
export const libraryQuestions = Object.keys(answers).filter(q => !answers[q].guest)
