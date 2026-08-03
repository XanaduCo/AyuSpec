// Per-question retrieval specs — what the planner decides to do, what it picks
// out of the store, and what changes if you widen the question.
//
// Division of labour with `context/assemble.js`:
//   · this file  = the *authored* part — the plan, the picks, and why each pick
//                  earned its place. A demo that generated these would produce
//                  plausible-looking nonsense.
//   · assemble.js = the *computed* part — how many candidates existed, what got
//                  dropped and for which of the three different reasons, what it
//                  all costs in tokens, and what the budget does about it.
//
// `reasons` vocabulary (rendered as chips, hue-free — these are not privacy
// signals): see REASONS in assemble.js.

// Answer blocks reuse agent.js's block grammar, so a counterfactual addendum
// renders identically to the answer it is appended to.
const p = text => ({ kind: 'p', text })

export const DEFAULT_WINDOW = 90

export const retrieval = {
  // ---------------------------------------------------------------------------
  'What changed in my last 90 days?': {
    intent: 'Detect and rank changes across every domain in a fixed window.',
    tags: ['labs', 'lipids', 'cardiac', 'metabolic', 'glucose', 'inflammation', 'metals', 'hormones',
      'thyroid', 'micronutrients', 'kidney', 'iron', 'cbc', 'hrv', 'sleep', 'recovery', 'training',
      'fitness', 'activity', 'bodycomp', 'ageing', 'nutrition', 'seafood', 'bp', 'imaging',
      'screening', 'genomics', 'conditions', 'meds', 'family', 'experiment', 'quality', 'coverage'],
    windowDays: 90,
    plan: [
      { tool: 'get_time_series', args: "codes=[all tracked], from=2025-05-05", yields: '8 daily series · 8,718 points' },
      { tool: 'get_trend', args: 'per series, vs. prior 90-day window', yields: '8 deltas · 4 change-points' },
      { tool: 'query_clinical', args: "type=Observation, category=laboratory, from=2025-05-02", yields: '204 lab results across 2 draws' },
      { tool: 'get_correlations', args: 'window=90d, min|r|=0.4', yields: '3 metric pairs' },
      { tool: 'search_records', args: '"changed OR new OR worse", k=12', yields: '12 semantic hits' },
      { tool: 'search_guidelines', args: 'codes of flagged analytes', yields: '4 threshold statements' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['change', 'guideline', 'outlier'], note: '+7 mg/dL in-window, and above the < 90 threshold the guideline corpus returned' },
      { id: 'obs-hrv', reasons: ['change'], mode: 'summary', note: 'largest relative move of any daily series in the window' },
      { id: 'obs-vo2max', reasons: ['change', 'contradiction'], note: 'moved the opposite way to HRV — pairs are more informative than either alone' },
      { id: 'obs-rem', reasons: ['change'], note: '−7 min/night while total sleep held — only visible in the stage split' },
      { id: 'obs-mercury', reasons: ['outlier', 'change'], note: 'crossed its reference ceiling for the first time in the record' },
      { id: 'obs-ldl', reasons: ['guideline', 'change'] },
      { id: 'obs-crp', reasons: ['change'], note: 'fell 1.1 → 0.8 — a change in the reassuring direction still counts as a change' },
      { id: 'obs-ferritin', reasons: ['change', 'corroborate'], note: 'rising trend; the genome has an HFE finding that would change how to read it' },
      { id: 'cgm-summary', reasons: ['aggregate', 'experiment'] },
      { id: 'dexa-2025-07-19', reasons: ['recency', 'unique'], note: 'the only body-composition measurement in the window' },
      { id: 'panel-context', reasons: ['baseline'], virtual: true, label: 'Prior draw (2025-05-02)',
        note: 'three days outside the window, pulled deliberately — a delta needs a denominator' },
      { id: 'exp-postmeal-walks', reasons: ['experiment'] },
    ],
    aggregate: [
      { id: 'obs-hrv', method: 'trend + 3 change-points' },
      { id: 'obs-rem', method: 'trend + weekly means' },
      { id: 'cgm-summary', method: '4,088 readings → 8 summary statistics' },
    ],
    guidelines: ['AHA/ACC 2018 lipid — ApoB < 90 mg/dL for elevated risk', 'ATSDR blood mercury reference 10 µg/L'],
    counterfactuals: {
      genome: {
        picks: ['pgx-slco1b1', 'gen-lpa', 'gen-hfe', 'gen-prs'],
        addendum: [
          p('**With the genome included, one thing in that frame changes.** You carry **SLCO1B1 \\*1/\\*5** {{cite:pgx-slco1b1}} — reduced transporter function, and the CPIC-flagged variant for statin myopathy {{ev:guide}}. The "statin (discuss w/ MD)" row is still the highest-evidence option, but the conversation is now about *which* statin: rosuvastatin or pravastatin rather than simvastatin.'),
          p('Two other findings corroborate labs you already have: **LPA rs3798220** {{cite:gen-lpa}} predicts the elevated Lp(a) that was measured, and **HFE C282Y/H63D** {{cite:gen-hfe}} turns your rising ferritin from a shrug into a recheck {{ev:inf}}.'),
        ],
      },
      widen: {
        days: 730, label: '2 years',
        picks: ['lab-vendor-switch', 'draw-2024-11-16', 'vo2-2024-03-09', 'dexa-2024-08-24'],
        addendum: [
          p('**At 24 months the headline changes.** ApoB has risen at *every single draw* since May 2023 — 72 → 74 → 77 → 78 → 80 → 83 → 84 → 88 → 95 {{cite:obs-apob}}. The 90-day delta is the tail of a two-year trend, not a blip {{ev:src}}. That is a different clinical conversation from "it went up a bit this quarter".'),
          p('The wider window also exposes two things that would have corrupted a naive trend: a **vendor switch in January 2025** {{cite:lab-vendor-switch}} that changed Lp(a) from mg/dL to nmol/L — a 138% "rise" that is pure unit artefact — and a **draw that was ordered and never taken** in November 2024 {{cite:draw-2024-11-16}}, so the cadence has a five-month hole in it {{ev:src}}.'),
        ],
      },
      raw: {
        unitId: 'cgm-raw',
        label: 'Send the full CGM trace instead of the summary',
        addendum: [
          p('The raw trace does add one thing the summary flattened: your **highest post-prandial excursion in the window was 168 mg/dL** {{cite:cgm-peak-2025-06-30}}, after a lunch on a non-walking day {{ev:src}}. Everything else it contains is the summary, spelled out 4,088 times.'),
        ],
      },
    },
    caveats: {
      genomeExcluded: 'This answer did not see your genome. Two findings in it (SLCO1B1, LPA) bear directly on the lipid discussion above.',
      pixelsExcluded: 'Imaging pixel data was withheld — the answer used the extracted impressions only.',
      coverage: 'Nutrition logging covers 88% of this window; the two unlogged weeks are not represented.',
    },
  },

  // ---------------------------------------------------------------------------
  'Why is my HRV trending down?': {
    intent: 'Find candidate explanations for one metric moving, and rule some out.',
    tags: ['hrv', 'recovery', 'sleep', 'training', 'activity', 'cardiac', 'hormones', 'inflammation', 'nutrition', 'coverage'],
    windowDays: 120,
    plan: [
      { tool: 'get_time_series', args: 'code=80404-7 (HRV), from=2025-04-05', yields: '121 daily points' },
      { tool: 'get_correlations', args: 'target=HRV, window=120d', yields: '11 candidate co-movers, 3 above |r| 0.4' },
      { tool: 'query_clinical', args: 'category=activity, from=2025-04-05', yields: '78 Garmin activities' },
      { tool: 'search_records', args: '"travel OR illness OR alcohol", k=8', yields: '4 hits incl. a 9-day data gap' },
    ],
    picks: [
      { id: 'obs-hrv', reasons: ['change'], note: 'the subject of the question' },
      { id: 'obs-strain', reasons: ['correlation'], note: 'r = +0.52 with HRV inverted — the strongest co-mover in the window' },
      { id: 'obs-rhr', reasons: ['contradiction'], note: 'flat, which argues *against* overtraining — a negative finding that changes the answer' },
      { id: 'obs-rem', reasons: ['correlation', 'change'], note: 'REM fell alongside HRV while total sleep held' },
      { id: 'sleep-summary', reasons: ['aggregate'] },
      { id: 'block-summary', reasons: ['aggregate', 'change'], note: 'weekly volume +28% during the block that overlaps the decline' },
      { id: 'obs-cortisol-am', reasons: ['weak-signal'], note: 'included precisely because it did NOT move — it rules a hypothesis out' },
      { id: 'act-gap', reasons: ['coverage'], virtual: true, label: '9-day Garmin gap (2025-04-12 → 04-20)',
        note: 'the travel week. Garmin has nothing; Oura kept recording. Any correlation across this window is computed on unequal data.' },
    ],
    aggregate: [
      { id: 'obs-hrv', method: 'daily → trend + 2 change-points' },
      { id: 'block-summary', method: '78 activities → 17 weekly rows → 6 numbers' },
      { id: 'sleep-summary', method: '121 nights → stage means, both windows' },
    ],
    guidelines: ['No guideline applies — HRV has no clinical threshold. Stated rather than silently omitted.'],
    counterfactuals: {
      widen: {
        days: 365, label: '12 months',
        picks: ['obs-vo2max', 'vo2-2025-06-14'],
        addendum: [
          p('Over 12 months the picture is less alarming: HRV sat at ~47 ms for most of 2024 and only started falling in March 2025 {{cite:obs-hrv}} — the same week the aerobic block started {{cite:block-summary}}. That is a *build-phase* pattern, and the lab VO₂max retest {{cite:vo2-2025-06-14}} says the build worked {{ev:inf}}.'),
        ],
      },
      raw: {
        unitId: 'activities-raw',
        label: 'Send all 290 activity records instead of weekly aggregates',
        addendum: [
          p('The per-session data adds one detail: the three lowest HRV mornings all follow **evening** threshold sessions after 19:00 {{ev:inf}}. Session *timing*, not weekly volume, is the variable worth testing — which is an n-of-1 question, not something these 290 rows can answer {{ev:none}}.'),
        ],
      },
      genome: { picks: [], noneRelevant: 'No genomic finding in your record bears on HRV. Including it would cost 40 tokens and add nothing — which is a better reason to exclude it than policy.' },
    },
    caveats: {
      coverage: 'Nine days of Garmin data are missing from this window. Correlations were computed on the days both devices recorded, not on the full window.',
      genomeExcluded: null,
    },
  },

  // ---------------------------------------------------------------------------
  'My ageing clocks disagree with my labs — which do I trust?': {
    intent: 'Adjudicate between two instruments that measure different things.',
    tags: ['ageing', 'quality', 'labs', 'inflammation', 'lipids', 'metabolic', 'glucose', 'cbc', 'fitness', 'bodycomp'],
    windowDays: 730,
    plan: [
      { tool: 'query_clinical', args: 'type=DiagnosticReport, code=DNAm-age-panel', yields: '3 panels · 51 outputs' },
      { tool: 'get_trend', args: 'per clock, first → latest, with per-assay CV', yields: '6 trends, 3 exceed their noise floor' },
      { tool: 'query_clinical', args: 'codes=[PhenoAge inputs: albumin, creatinine, glucose, CRP, ALP, WBC, lymph%, MCV, RDW]', yields: '9 analyte series × 9 draws' },
      { tool: 'search_guidelines', args: '"epigenetic clock reliability ICC"', yields: '2 methodology statements' },
      { tool: 'query_health_model', args: 'function=biological-ageing → markers by quality tier', yields: '11 markers, 3 tiers' },
    ],
    picks: [
      { id: 'clock-disagreement', reasons: ['unique', 'aggregate'], note: 'the precomputed reliability analysis — 51 raw outputs reduced to the only thing that decides the question' },
      { id: 'clock-2025-06-11', reasons: ['recency'] },
      { id: 'clock-2024-01-15', reasons: ['baseline'], note: 'the first timepoint — without it there is no trend to adjudicate' },
      { id: 'obs-crp', reasons: ['guideline', 'corroborate'], note: 'a PhenoAge input, and it moved in the same direction as the clock' },
      { id: 'obs-albumin', reasons: ['corroborate'], note: 'PhenoAge input' },
      { id: 'obs-rdw', reasons: ['corroborate'], note: 'PhenoAge input — the one that moved least' },
      { id: 'obs-lymph-pct', reasons: ['corroborate'], note: 'PhenoAge input' },
      { id: 'obs-apob', reasons: ['contradiction'], note: 'the marker moving the *wrong* way, and the one no clock reads' },
      { id: 'vo2-discrepancy', reasons: ['quality'], note: 'the same measured-vs-modelled problem, one domain over — the comparison the answer leans on' },
      { id: 'func-2025-07-02', reasons: ['corroborate', 'unique'], note: 'functional capacity is the outcome the clocks are proxies for' },
    ],
    aggregate: [
      { id: 'clock-disagreement', method: '3 panels × 17 outputs → 6 trends + noise floors' },
    ],
    guidelines: [
      'DunedinPACE ICC ≈ 0.96; first-generation clocks ICC 0.76–0.80 — reliability differs by an order of magnitude in variance terms.',
      'No clock has been validated as a surrogate endpoint in an interventional trial.',
    ],
    counterfactuals: {
      raw: {
        unitId: 'nutrition-raw',
        label: 'Add 416 days of nutrition logs (a clock input, indirectly)',
        addendum: [
          p('The nutrition logs do not move the verdict. They are not an input to any clock, and at 72% coverage they could not support a claim about diet-driven methylation even if they were {{ev:none}}. What they cost is 45,000 tokens — five times the entire rest of this context.'),
        ],
      },
      widen: {
        days: 1095, label: '3 years',
        picks: ['obs-hba1c'],
        addendum: [
          p('Three years of labs makes the divergence sharper, not softer: HbA1c has been flat at 5.4–5.5% throughout {{cite:obs-hba1c}} while hs-CRP fell and ApoB rose. The clocks that improved are weighting the markers that improved. That is not the clocks being right; it is them being **partly redundant with the labs you already have** {{ev:inf}}.'),
        ],
      },
      genome: {
        picks: ['gen-apoe'],
        addendum: [
          p('Your genome adds one relevant fact and it is a null: **APOE ε3/ε3** {{cite:gen-apoe}} — no ε4 allele, so the single largest genetic modifier of epigenetic-age trajectories is absent {{ev:low}}. Useful for what it rules out, not for what it predicts.'),
        ],
      },
    },
    caveats: {
      genomeExcluded: 'Your APOE genotype was not seen. It is the one genetic input that bears on epigenetic ageing.',
      quality: 'Three of six clock movements are inside their own test–retest bands and were labelled unreadable rather than reported as improvements.',
    },
  },

  // ---------------------------------------------------------------------------
  'Did my Garmin training block actually improve anything?': {
    intent: 'Evaluate an uncontrolled 15-week intervention against pre/post measurements.',
    tags: ['training', 'activity', 'fitness', 'hrv', 'recovery', 'cardiac', 'bodycomp', 'quality', 'coverage', 'sleep'],
    windowDays: 200,
    plan: [
      { tool: 'query_clinical', args: 'category=activity, from=2024-11-01', yields: '186 Garmin activities' },
      { tool: 'get_trend', args: 'weekly load, minutes, polarisation — pre vs. block', yields: '31 weekly rows → 6 deltas' },
      { tool: 'query_clinical', args: 'type=DiagnosticReport, code=CPET', yields: '2 metabolic-cart tests' },
      { tool: 'get_time_series', args: 'codes=[VO₂max est., RHR, HRV], from=2024-11-01', yields: '3 series · 828 points' },
      { tool: 'search_records', args: '"training block OR base OR polarised", k=6', yields: '4 hits' },
      { tool: 'get_correlations', args: 'weekly load vs. HRV, lag 0–7 days', yields: '1 pair, r = −0.41 at lag 2' },
    ],
    picks: [
      { id: 'vo2-2025-06-14', reasons: ['quality', 'unique'], note: 'the post-test. A metabolic cart is the measurement; everything else here is a model of it' },
      { id: 'vo2-2024-03-09', reasons: ['baseline', 'quality'], note: 'the pre-test — 15 months earlier, which is the weakness in this comparison' },
      { id: 'block-summary', reasons: ['aggregate', 'change'], note: '290 activities → 61 weekly rows → 6 numbers' },
      { id: 'vo2-discrepancy', reasons: ['contradiction', 'quality'], note: 'the wearable claims 52.0, the cart measured 47.8 — the answer must say which it is quoting' },
      { id: 'obs-rhr', reasons: ['corroborate', 'change'], note: 'independent physiological corroboration, and it moved the right way' },
      { id: 'obs-hrv', reasons: ['contradiction'], note: 'moved the wrong way — reported rather than dropped' },
      { id: 'func-2025-07-02', reasons: ['corroborate'], note: 'strength and balance improved too, on a battery the block did not train' },
      { id: 'dexa-2025-07-19', reasons: ['corroborate'], note: '+1.2 kg lean, −1.4 kg fat across the block' },
      { id: 'act-gap', reasons: ['coverage'], virtual: true, label: '9-day Garmin gap mid-block',
        note: 'a hole in the exposure variable itself. Adherence is computed on 14 weeks, not 15.' },
    ],
    aggregate: [
      { id: 'block-summary', method: '290 activities (111 KB) → 61 weekly rows → 6 deltas' },
      { id: 'obs-rhr', method: 'daily → pre/post means + change-point' },
    ],
    guidelines: ['ACSM: a 2–3 mL/kg/min VO₂max change is at the edge of test–retest reproducibility for a maximal CPET.'],
    counterfactuals: {
      raw: {
        unitId: 'activities-raw',
        label: 'Send all 290 activity records',
        addendum: [
          p('With every session in view, one thing the weekly aggregate hid: the block was **front-loaded**. Weeks 1–6 averaged 412 minutes; weeks 10–14 averaged 331 {{ev:src}}. So "15 weeks of consistent volume" is not what happened, and the VO₂max gain may belong to the first half {{ev:inf}}.'),
        ],
      },
      widen: {
        days: 730, label: '2 years',
        picks: ['dexa-2024-08-24', 'func-2024-07-10'],
        addendum: [
          p('Over two years there is a control period to compare against: from mid-2024, with training roughly flat, VO₂max estimate drifted +0.9 and RHR moved 1 bpm. During the block, +1.7 and 2 bpm {{ev:inf}}. Weak, but it is the closest thing to a counterfactual your record contains — and it is the honest answer to "compared to what?"'),
        ],
      },
      genome: { picks: [], noneRelevant: 'Nothing genomic bears on this. The record has no trainability or ACTN3-class variant reported, and inventing relevance to justify sending a genome would be exactly the wrong instinct.' },
    },
    caveats: {
      design: 'This is a pre/post comparison with no control period, one 15-month gap between the two gold-standard tests, and a 9-day hole in the exposure. It supports "consistent with improvement", not "caused improvement".',
      genomeExcluded: null,
    },
  },

  // ---------------------------------------------------------------------------
  'Should I be worried about my heavy metals result?': {
    intent: 'Interpret one flagged toxicology value against its source, its kinetics and its threshold.',
    tags: ['metals', 'toxins', 'seafood', 'nutrition', 'micronutrients', 'labs', 'kidney', 'cbc', 'coverage', 'quality'],
    windowDays: 730,
    plan: [
      { tool: 'query_clinical', args: 'panel=Heavy metals, all draws', yields: '5 analytes × 8 draws = 40 results' },
      { tool: 'get_trend', args: 'mercury, arsenic, lead, cadmium', yields: '4 trends; 2 rising' },
      { tool: 'search_guidelines', args: '"blood mercury reference range" + "arsenic speciation"', yields: '3 threshold/interpretation statements' },
      { tool: 'search_records', args: '"seafood OR tuna OR sushi", k=20', yields: '38 meal entries, 17 tuna/swordfish' },
      { tool: 'get_correlations', args: 'weekly seafood servings vs. blood mercury at each draw', yields: '1 pair, r = +0.86, n = 6' },
      { tool: 'query_clinical', args: 'codes=[creatinine, eGFR, CBC] — end-organ check', yields: '3 series, all in range' },
    ],
    picks: [
      { id: 'obs-mercury', reasons: ['outlier', 'change', 'guideline'], note: '14.2 µg/L against a 10 µg/L ceiling, and rising at every draw for two years' },
      { id: 'obs-arsenic', reasons: ['corroborate', 'change'], note: 'also rising, also seafood-driven — and total arsenic, which is the interpretive trap' },
      { id: 'obs-lead', reasons: ['contradiction'], note: 'flat and in range. Included because a *selective* metals answer is a bad answer' },
      { id: 'obs-cadmium', reasons: ['contradiction'], note: 'flat and in range' },
      { id: 'obs-selenium', reasons: ['corroborate'], note: 'also elevated, also from seafood — three analytes pointing at one behaviour' },
      { id: 'obs-omega3-index', reasons: ['corroborate'], note: '9.6% — the beneficial half of the same exposure' },
      { id: 'nutr-seafood-trend', reasons: ['corroborate', 'aggregate'], note: 'the upstream cause, from a completely different source' },
      { id: 'meals-raw', reasons: ['outlier'], mode: 'partial', note: '17 tuna/swordfish entries in the trailing 28 days — the specific high-mercury species, which day-totals cannot express' },
      { id: 'obs-creatinine', reasons: ['contradiction'], note: 'end-organ check: normal' },
      { id: 'obs-egfr', reasons: ['contradiction'], note: 'end-organ check: normal' },
      { id: 'lab-vendor-switch', reasons: ['quality'], note: 'checked and cleared — metals were not among the affected assays, so this rise is not an artefact' },
    ],
    aggregate: [
      { id: 'nutr-seafood-trend', method: '416 logged days × 23 nutrients (172 KB) → 6 numbers + a coverage caveat' },
      { id: 'meals-raw', method: '89 materialised meals → the 17 that contain high-mercury species' },
    ],
    guidelines: [
      'ATSDR/NHANES: blood mercury reference ceiling 10 µg/L; symptomatic toxicity is generally described above ~50 µg/L.',
      'Blood mercury reflects intake over the preceding weeks — it is a recent-exposure marker, not a body-burden marker.',
      'Total blood arsenic is dominated by non-toxic arsenobetaine from seafood; without speciation the number cannot be interpreted as inorganic exposure.',
    ],
    counterfactuals: {
      widen: {
        days: 1095, label: '3 years',
        picks: [],
        addendum: [
          p('The record only goes back to May 2023 for metals, so a three-year window returns nothing extra {{ev:src}}. Worth showing rather than silently returning the same answer: the window you asked for and the window the data supports are different, and the second one wins.'),
        ],
      },
      raw: {
        unitId: 'nutrition-raw',
        label: 'Send all 416 nutrition day-totals',
        addendum: [
          p('Full day-totals add one useful number and a lot of noise: **selenium intake averaged 168 µg/day** against a 400 µg upper limit {{ev:src}} — high, from the same seafood, and selenium is the nutrient most often invoked as protective against methylmercury. The evidence that it actually offsets mercury toxicity in humans is weak {{ev:low}}, so this is a fact, not a reassurance.'),
        ],
      },
      genome: { picks: [], noneRelevant: 'No metals-metabolism variant is reported in your genome (GSTP1/GSTT1 were not in the annotated set). There is nothing here for the genome to add.' },
    },
    caveats: {
      speciation: 'The arsenic result is TOTAL arsenic. The test that would separate seafood arsenic from inorganic arsenic was not ordered, so that value is uninterpretable as a toxic exposure.',
      coverage: 'The seafood correlation uses 6 draws against nutrition weeks with ≥4 logged days. The winter 2024–25 stretch is too sparse to include.',
      genomeExcluded: null,
    },
  },

  // ---------------------------------------------------------------------------
  'Is my Galleri result a clean bill of health?': {
    intent: 'Convert a reassuring headline into its actual conditional probability.',
    tags: ['screening', 'cancer', 'labs', 'cbc', 'inflammation', 'family', 'genomics', 'coverage', 'quality'],
    windowDays: 730,
    plan: [
      { tool: 'query_clinical', args: 'type=DiagnosticReport, code=MCED', yields: '1 report + 4 stored caveats' },
      { tool: 'search_guidelines', args: '"MCED sensitivity by stage" + "USPSTF cancer screening"', yields: '5 statements' },
      { tool: 'query_clinical', args: 'type=Procedure, category=screening', yields: '4 other screening records' },
      { tool: 'search_records', args: '"cancer" family history, k=10', yields: '3 hits, none oncological' },
      { tool: 'query_clinical', args: 'codes=[CBC, LDH, ferritin, ESR] — nonspecific markers', yields: '4 series, all in range' },
    ],
    picks: [
      { id: 'scr-galleri', reasons: ['unique', 'recency'], note: 'the only test of its kind in the record — and the only one whose stored caveats are longer than its result' },
      { id: 'scr-colonoscopy', reasons: ['guideline', 'contradiction'], note: 'the screening that Galleri does NOT replace, and which is already done and not due until 2033' },
      { id: 'scr-skin', reasons: ['guideline'], note: 'the other modality-specific screening that stands regardless' },
      { id: 'fh-father-cad', reasons: ['contradiction'], note: 'family history is cardiac, not oncological — a null that belongs in the answer' },
      { id: 'obs-ldh', reasons: ['weak-signal'], note: 'nonspecific and in range. Included so the answer can say it looked' },
      { id: 'obs-esr', reasons: ['weak-signal'] },
      { id: 'obs-ferritin', reasons: ['weak-signal'], note: 'rising, but with an HFE genotype behind it — a different explanation than the one this question is about' },
    ],
    aggregate: [],
    guidelines: [
      'PATHFINDER: overall sensitivity 51.5%; stage-I sensitivity 16.8%; specificity 99.5%; PPV 43.1%.',
      'No randomised trial has shown MCED screening reduces cancer mortality.',
      'USPSTF: MCED tests are not a substitute for guideline-recommended organ-specific screening.',
    ],
    counterfactuals: {
      genome: {
        picks: ['gen-brca', 'prs-prostate', 'prs-crc', 'prs-melanoma'],
        addendum: [
          p('Including the genome changes the *prior*, which is the only thing that can change what a negative is worth. **No pathogenic BRCA1/2 variant** on a 30× genome {{cite:gen-brca}} — a much stronger negative than an array {{ev:src}}. Polygenic scores sit near the middle: prostate 66th {{cite:prs-prostate}}, colorectal 37th {{cite:prs-crc}}, melanoma 55th {{ev:low}}.'),
          p('Net effect: a below-average prior makes a negative MCED slightly *more* reassuring than the population NPV implies — and does nothing at all to the stage-I sensitivity problem, which is where the real limitation lives {{ev:inf}}.'),
        ],
      },
      widen: {
        days: 1825, label: '5 years',
        picks: [],
        addendum: [
          p('Five years reaches back before any of this record exists {{ev:src}}. The oldest screening you have is the 2023 colonoscopy. Widening the window changes nothing except how much of it is empty — which the retriever will tell you rather than quietly returning the same eleven records.'),
        ],
      },
      raw: {
        unitId: 'cgm-raw',
        label: 'Send the raw CGM trace (it matched on "metabolic")',
        addendum: [
          p('Nothing. The CGM trace matched this question on a single peripheral tag and contributes no information about cancer risk {{ev:none}} — it is 6,400 tokens of noise. This toggle exists to show what a bad retrieval decision costs, not because it is a good one.'),
        ],
      },
    },
    caveats: {
      screening: 'This answer treats "no signal detected" as a conditional probability, not a result. At 16.8% stage-I sensitivity the test misses roughly five of every six earliest-stage cancers.',
      genomeExcluded: 'Your genome was not seen. BRCA status and the cancer polygenic scores are the inputs that would set the prior this result updates.',
    },
  },

  // ---------------------------------------------------------------------------
  'Am I at risk for heart disease?': {
    intent: 'Weigh a direct measurement against indirect risk markers.',
    tags: ['cardiac', 'lipids', 'imaging', 'family', 'genomics', 'bp', 'inflammation', 'metabolic', 'meds', 'conditions', 'quality'],
    windowDays: 730,
    plan: [
      { tool: 'query_clinical', args: 'type=ImagingStudy, code=CAC', yields: '1 study + impression' },
      { tool: 'query_clinical', args: 'panel=Lipids, all draws', yields: '11 analytes × 9 draws = 97 results' },
      { tool: 'get_trend', args: 'ApoB, LDL-C, Lp(a), non-HDL', yields: '4 trends; 1 unit discontinuity flagged' },
      { tool: 'search_records', args: 'family history cardiac, k=6', yields: '2 hits' },
      { tool: 'search_guidelines', args: 'ApoB / CAC / Lp(a) thresholds', yields: '6 statements' },
      { tool: 'get_genomic_variants', args: 'trait=coronary — BLOCKED at the gateway', yields: '0 rows returned to the prompt', blocked: true },
    ],
    picks: [
      { id: 'img-cac', reasons: ['unique', 'quality'], note: 'the only direct measurement of his actual arteries in the record' },
      { id: 'obs-apob', reasons: ['guideline', 'change'] },
      { id: 'obs-lpa', reasons: ['outlier', 'guideline', 'quality'], note: 'elevated — and flagged for the unit change, so the answer quotes 76 nmol/L, not "+138%"' },
      { id: 'obs-ldl', reasons: ['guideline'] },
      { id: 'obs-crp', reasons: ['guideline'] },
      { id: 'fh-father-cad', reasons: ['guideline'], note: 'early CAD in a first-degree relative is itself a guideline risk enhancer' },
      { id: 'bp-raw', reasons: ['aggregate'], mode: 'summary', note: '299 cuff readings → 90-day mean and % at goal' },
      { id: 'cond-htn', reasons: ['recency'] },
      { id: 'med-lisinopril', reasons: ['recency'] },
      { id: 'lab-vendor-switch', reasons: ['quality'], note: 'why the Lp(a) number is quoted as a level and not as a change' },
    ],
    aggregate: [{ id: 'bp-raw', method: '299 readings → mean, SD, % at goal' }],
    guidelines: ['ApoB < 90 mg/dL (elevated risk)', 'Lp(a) ≥ 75 nmol/L is a risk enhancer', 'CAC 0 confers a low 10-year event rate but does not exclude non-calcified plaque'],
    counterfactuals: {
      genome: {
        picks: ['gen-prs', 'gen-lpa', 'pgx-slco1b1', 'gen-ldlr'],
        addendum: [
          p('The genome sharpens two things and blunts one. **LPA rs3798220** {{cite:gen-lpa}} explains the measured Lp(a) — genotype and phenotype agreeing raises confidence that the level is real and lifelong, not a transient {{ev:src}}. **The FH panel is negative** {{cite:gen-ldlr}}, so the rising ApoB is age/lifestyle rather than monogenic {{ev:src}}. And the **CVD polygenic score at the 70th percentile** {{cite:gen-prs}} adds least of all — it is derived from European-ancestry GWAS and you are South Asian {{ev:low}}.'),
          p('If a statin is ever on the table, **SLCO1B1 \\*1/\\*5** {{cite:pgx-slco1b1}} is the row that changes the prescription {{ev:guide}}.'),
        ],
      },
      widen: {
        days: 1095, label: '3 years',
        picks: ['draw-2024-11-16'],
        addendum: [
          p('Three years of lipids show the trajectory, which matters more than any single value: ApoB 72 → 95, a 32% rise, uninterrupted {{cite:obs-apob}}. The CAC of 0 is from November 2024 — it describes arteries as they were nine months and roughly 12 mg/dL of ApoB ago {{ev:inf}}.'),
        ],
      },
      raw: { unitId: 'bp-raw', label: 'Send all 299 BP readings instead of the summary',
        addendum: [p('The individual readings add variability the mean hid: 26% of the last 39 mornings were above 130 systolic {{ev:src}}. The mean is at goal; the distribution is less tidy than the mean suggests {{ev:inf}}.')] },
    },
    caveats: {
      genomeExcluded: 'Your genome was withheld. It contains the variant that explains your Lp(a), the negative FH panel, and the CVD polygenic score — all directly relevant here.',
      pixelsExcluded: 'The CAC study\'s pixel data was withheld under the hard exclusion; only the extracted Agatston score and impression were used.',
    },
  },

  // ---------------------------------------------------------------------------
  'Explain my lipid panel': {
    intent: 'Read one panel in plain language, in context.',
    tags: ['lipids', 'cardiac', 'labs', 'guideline', 'quality'],
    windowDays: 120,
    plan: [
      { tool: 'query_clinical', args: 'panel=Lipids, drawn=2025-08-01', yields: '11 results' },
      { tool: 'get_trend', args: 'each lipid analyte vs. prior draw', yields: '11 deltas' },
      { tool: 'search_guidelines', args: 'lipid thresholds', yields: '5 statements' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['guideline', 'change'] },
      { id: 'obs-ldl', reasons: ['guideline', 'change'] },
      { id: 'obs-hdl', reasons: ['guideline'] },
      { id: 'obs-lpa', reasons: ['outlier', 'quality'] },
      { id: 'obs-trig', reasons: ['guideline'] },
      { id: 'obs-non-hdl', reasons: ['guideline'] },
      { id: 'obs-ldl-p', reasons: ['corroborate'] },
      { id: 'obs-apoa1', reasons: ['weak-signal'] },
      { id: 'obs-sdldl', reasons: ['weak-signal'] },
      { id: 'obs-lppla2', reasons: ['weak-signal'] },
      { id: 'lab-vendor-switch', reasons: ['quality'] },
    ],
    aggregate: [],
    guidelines: ['ApoB < 90 mg/dL', 'LDL-C < 100 mg/dL', 'Lp(a) < 75 nmol/L'],
    counterfactuals: {
      widen: { days: 730, label: '2 years', picks: ['draw-2024-11-16'],
        addendum: [p('Across nine draws the panel tells a single story: every atherogenic measure has risen monotonically and every protective one has held {{cite:obs-apob}}. One panel is a value; nine is a trajectory {{ev:src}}.')] },
      genome: { picks: ['gen-lpa', 'gen-ldlr', 'pgx-slco1b1'],
        addendum: [p('Two genomic findings speak directly to this panel: **LPA rs3798220** {{cite:gen-lpa}} accounts for the elevated Lp(a), and the **familial hypercholesterolaemia panel is negative** {{cite:gen-ldlr}} — so nothing here is monogenic {{ev:src}}.')] },
      raw: { unitId: 'bp-raw', label: 'Add the BP readings (they matched on "cardiac")',
        addendum: [p('Blood pressure is not a lipid. It matched the question\'s concept net and would have added 4,600 tokens of unrelated readings {{ev:none}} — a clean example of a candidate that should not become a selection.')] },
    },
    caveats: { local: 'This answer ran entirely on the local reasoner — nothing left the device, nothing was stripped, and the genome was available.' },
  },

  // ---------------------------------------------------------------------------
  'What should I ask my doctor?': {
    intent: 'Rank the open questions the record actually earns.',
    tags: ['labs', 'lipids', 'cardiac', 'metals', 'bp', 'meds', 'conditions', 'imaging', 'hrv', 'iron', 'screening', 'family', 'coverage'],
    windowDays: 365,
    plan: [
      { tool: 'query_clinical', args: 'all abnormal results, from=2024-08-03', yields: '19 flagged results' },
      { tool: 'get_trend', args: 'each flagged analyte', yields: '19 trends; 6 rising' },
      { tool: 'query_health_model', args: 'flagged markers → clinician-routed decisions', yields: '5 decision points' },
      { tool: 'search_guidelines', args: 'thresholds for each flagged analyte', yields: '9 statements' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['guideline', 'change'] },
      { id: 'obs-mercury', reasons: ['outlier', 'change'] },
      { id: 'obs-lpa', reasons: ['outlier', 'quality'] },
      { id: 'obs-ferritin', reasons: ['change', 'corroborate'] },
      { id: 'img-cac', reasons: ['contradiction', 'quality'] },
      { id: 'obs-hrv', reasons: ['change'] },
      { id: 'med-lisinopril', reasons: ['recency'] },
      { id: 'bp-raw', reasons: ['aggregate'], mode: 'summary' },
      { id: 'draw-2024-11-16', reasons: ['coverage'], note: 'a missed draw is itself worth raising — the cadence has a hole' },
    ],
    aggregate: [{ id: 'bp-raw', method: '299 readings → 90-day mean + % at goal' }],
    guidelines: ['ApoB < 90', 'blood mercury < 10 µg/L', 'Lp(a) ≥ 75 nmol/L is a risk enhancer'],
    counterfactuals: {
      genome: { picks: ['gen-hfe', 'pgx-slco1b1', 'gen-lpa'],
        addendum: [p('Two of your questions get sharper with the genome in scope. Ferritin plus **HFE C282Y/H63D** {{cite:gen-hfe}} is a specific question ("do we need iron studies or is this inflammation?") rather than a vague one, and **SLCO1B1 \\*1/\\*5** {{cite:pgx-slco1b1}} is worth handing over *before* a statin is chosen, not after {{ev:guide}}.')] },
      widen: { days: 730, label: '2 years', picks: ['lab-vendor-switch'],
        addendum: [p('Add one more question: **"my lab changed vendors in January — are the Lp(a) and free-testosterone numbers comparable to the old ones?"** {{cite:lab-vendor-switch}} A clinician reading only the last two results would not know to ask {{ev:src}}.')] },
      raw: { unitId: 'activities-raw', label: 'Add the 290 activity records',
        addendum: [p('Training detail does not generate clinician questions. It would add 27,000 tokens and no decision {{ev:none}}.')] },
    },
    caveats: { genomeExcluded: 'Two of these questions would be sharper with your genome in scope.' },
  },

  // ---------------------------------------------------------------------------
  'Should I take NMN?': {
    intent: 'Answer a supplement question from the evidence base, not from the record.',
    tags: ['ageing', 'labs', 'metabolic', 'inflammation', 'nutrition', 'micronutrients'],
    windowDays: 365,
    plan: [
      { tool: 'query_health_model', args: 'intervention=NMN → functions, markers', yields: '2 functions · 6 markers' },
      { tool: 'search_guidelines', args: '"NMN nicotinamide mononucleotide human trials"', yields: '4 statements, all low-certainty' },
      { tool: 'rank_interventions', args: 'goal=healthspan, via preference model', yields: '6 candidates on 7 axes' },
      { tool: 'query_clinical', args: 'markers NMN would move, from=2024-08-03', yields: '6 series — all already in range' },
    ],
    picks: [
      { id: 'clock-disagreement', reasons: ['weak-signal'], note: 'the closest thing you have to an outcome NMN claims to affect — and it is a surrogate of a surrogate' },
      { id: 'obs-crp', reasons: ['weak-signal'], note: 'already 0.8. There is no room for an effect to be visible' },
      { id: 'obs-hba1c', reasons: ['weak-signal'] },
      { id: 'obs-insulin', reasons: ['weak-signal'] },
    ],
    aggregate: [],
    guidelines: ['No human trial of NMN is powered for a clinical outcome; the human evidence is short-duration surrogate-marker work.'],
    counterfactuals: {
      genome: { picks: [], noneRelevant: 'Nothing in your genome speaks to NMN. There is no reported NAD-salvage variant, and no pharmacogenomic guidance exists for a supplement with no trial base.' },
      widen: { days: 1095, label: '3 years', picks: [],
        addendum: [p('Widening the window returns more of your data and none of the missing evidence. The limiting factor here is not how much you have measured — it is that the trials do not exist {{ev:none}}. More context cannot fix that, which is worth seeing directly.')] },
      raw: { unitId: 'nutrition-raw', label: 'Send 416 nutrition day-totals',
        addendum: [p('Your niacin and tryptophan intake are both comfortably above requirement {{ev:src}}. That is not evidence for or against NMN; it just means the deficiency argument does not apply to you {{ev:inf}}.')] },
    },
    caveats: {
      empty: 'This answer barely uses your record. Almost all of it is the evidence base — which is the honest shape of the question.',
    },
  },
}

// A question with no authored spec still gets a real trace: the concept net is
// derived from the words in the question, so candidate counts stay honest even
// when the picks are thin.
export function specFor(question) {
  if (retrieval[question]) return { ...retrieval[question], question }
  const q = question.toLowerCase()
  const guess = [
    ['hrv|recovery|stress', ['hrv', 'recovery', 'sleep']],
    ['sleep|rem|deep', ['sleep', 'recovery']],
    ['lipid|cholesterol|apob|ldl', ['lipids', 'cardiac']],
    ['glucose|sugar|cgm|insulin', ['glucose', 'metabolic']],
    ['train|run|ride|fitness|vo2', ['training', 'fitness', 'activity']],
    ['metal|mercury|toxin', ['metals', 'seafood']],
    ['gene|genom|dna|variant', ['genomics']],
    ['age|clock|epigenetic', ['ageing']],
    ['diet|food|nutrition|eat', ['nutrition']],
    ['cancer|screen', ['screening', 'cancer']],
  ].filter(([re]) => new RegExp(re).test(q)).flatMap(([, tags]) => tags)
  return {
    question,
    intent: 'No authored plan for this question — the planner falls back to a broad semantic sweep.',
    tags: guess.length ? guess : ['labs', 'wearables'],
    windowDays: 90,
    plan: [
      { tool: 'search_records', args: `embed("${question.slice(0, 48)}${question.length > 48 ? '…' : ''}"), k=10`, yields: '10 nearest units' },
      { tool: 'query_clinical', args: 'type=Observation, from=2025-05-05', yields: 'in-window records' },
    ],
    picks: [],
    aggregate: [],
    guidelines: [],
    counterfactuals: {},
    caveats: { demo: 'This is a demo with a fixed dataset — only the suggested questions have authored retrieval traces.' },
  }
}
