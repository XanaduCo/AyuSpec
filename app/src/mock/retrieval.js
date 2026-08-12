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
          p('Over two years there is a control period to compare against: from mid-2024, with training roughly flat, VO₂max estimate drifted +0.9 and RHR moved 1 bpm. During the block, +1.7 and 2 bpm {{ev:inf}}. Weak, but it is the closest thing to a counterfactual your record contains — and it is the answer to "compared to what?"'),
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
  // --- the three scoped re-asks --------------------------------------------
  // Same window and same store as the anchor question, but a goal narrows the
  // tag set — so the candidate sweep is smaller, the payload is smaller, and
  // the consent screen has something specific to name. This is the practical
  // argument for establishing the goal before spending egress on it.
  'What changed in my cardiac markers?': {
    intent: 'Rank cardiac change against the goal the user just chose.',
    tags: ['lipids', 'cardiac', 'labs', 'imaging', 'bp', 'meds', 'family', 'guideline'],
    windowDays: 90,
    plan: [
      { tool: 'get_trend', args: 'cardiac analytes vs. prior 90-day window', yields: '3 deltas past noise floor' },
      { tool: 'query_clinical', args: 'category=laboratory, panel=Lipids, from=2025-05-05', yields: '11 results' },
      { tool: 'search_guidelines', args: 'ApoB / LDL-C thresholds w/ family history', yields: '3 statements' },
      { tool: 'query_health_model', args: 'function=vascular, markers→interventions', yields: '6 cited edges' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['change', 'guideline', 'outlier'], note: '+7 mg/dL, past the assay noise floor and above the guideline threshold' },
      { id: 'obs-ldl', reasons: ['change', 'guideline'] },
      // The CAC study itself is a hard pixel exclusion and appears under policy,
      // not here. What reaches the model is the extracted Agatston score — which
      // is the record's strongest *disconfirming* evidence, so it has to reach it.
      { id: 'ev-cac', reasons: ['contradiction'], virtual: true, label: 'CAC Agatston 0 (extracted impression)',
        note: 'retrieved because it argues against the emerging concern — the single most reassuring datum in the record' },
      { id: 'obs-non-hdl', reasons: ['corroborate'] },
      { id: 'fh-father-cad', reasons: ['guideline'], note: 'what moves the ApoB target from < 100 to < 90' },
      { id: 'cond-htn', reasons: ['corroborate'] },
      { id: 'panel-context', reasons: ['baseline'], virtual: true, label: 'Prior draw (2025-05-02)' },
    ],
    aggregate: [],
    guidelines: ['AHA/ACC 2018 lipid — ApoB < 90 mg/dL for elevated risk', 'CAC 0 as a near-term negative predictor'],
    counterfactuals: {
      genome: { picks: ['gen-lpa', 'gen-prs'],
        addendum: [p('Two genomic findings bear on this: **LPA rs3798220** {{cite:gen-lpa}} and a **CVD polygenic score at the 70th percentile** {{cite:gen-prs}} — both context, neither a verdict, and the score is derived from European-ancestry cohorts so it is less predictive for you {{ev:low}}.')] },
      widen: { days: 730, label: '2 years', picks: ['draw-2024-11-16'],
        addendum: [p('Across nine draws ApoB has risen monotonically {{cite:obs-apob}}. One delta is a change; nine draws are a trajectory, and the trajectory is what makes this worth acting on {{ev:src}}.')] },
    },
    caveats: {
      coverage: 'No lipid draw between 2025-05-02 and 2025-08-01, so the "when did it start rising" question cannot be answered more precisely than a 90-day block.',
      pixelsExcluded: 'The CAC scan\'s pixel data never left the device — it cannot, under any setting. What the reasoner saw was the extracted Agatston score of 0. Clicking the citation still opens the full study locally; that is inspection, not egress.',
    },
  },

  'What changed in my heavy metals?': {
    intent: 'Establish whether a single out-of-range result is a change at all.',
    tags: ['metals', 'labs', 'nutrition', 'seafood', 'coverage'],
    windowDays: 90,
    plan: [
      { tool: 'query_clinical', args: 'panel=Heavy metals, from=2025-05-05', yields: '4 results, 1 out of range' },
      { tool: 'get_trend', args: 'mercury vs. prior draws', yields: 'no prior comparator' },
      { tool: 'search_guidelines', args: 'blood mercury reference', yields: '1 statement' },
      { tool: 'search_records', args: '"seafood OR fish", k=8', yields: '1 nutrition trend' },
    ],
    picks: [
      { id: 'obs-mercury', reasons: ['outlier', 'unique'], note: 'above its reference ceiling, and the only measurement of its kind in the record — there is no delta to compute' },
      { id: 'obs-lead', reasons: ['weak-signal'] },
      { id: 'obs-cadmium', reasons: ['weak-signal'] },
      { id: 'obs-arsenic', reasons: ['weak-signal'] },
      { id: 'nutr-seafood-trend', reasons: ['correlation'], note: 'a plausible exposure route, retrieved so the answer can name it as untested rather than silent' },
    ],
    aggregate: [{ id: 'nutr-seafood-trend', method: '90 days of logged meals → one intake trend' }],
    guidelines: ['ATSDR blood mercury reference 10 µg/L'],
    counterfactuals: {
      widen: { days: 730, label: '2 years', picks: [],
        addendum: [p('Widening the window changes nothing: there is still no earlier mercury draw {{ev:none}}. A coverage gap is not fixed by asking for more of a window that never contained the measurement.')] },
    },
    caveats: {
      coverage: 'One mercury measurement exists in the entire record. Every directional claim about it — rising, falling, stable — is unsupported, and the answer says so rather than picking one.',
    },
  },

  'What changed in my sleep and recovery?': {
    intent: 'Read a divergence between two recovery signals that usually move together.',
    tags: ['hrv', 'sleep', 'recovery', 'training', 'fitness', 'activity'],
    windowDays: 90,
    plan: [
      { tool: 'get_time_series', args: 'hrv, rem, rhr, vo2max, from=2025-05-05', yields: '4 series · 4,300 points' },
      { tool: 'get_trend', args: 'per series vs. prior 90-day window', yields: '3 deltas past noise floor' },
      { tool: 'get_correlations', args: 'window=90d, min|r|=0.4', yields: '2 pairs' },
      { tool: 'search_records', args: '"travel OR illness OR training block", k=8', yields: '2 hits' },
    ],
    picks: [
      { id: 'obs-hrv', reasons: ['change'], mode: 'summary', note: 'largest relative move of any daily series in the window' },
      { id: 'obs-vo2max', reasons: ['change', 'contradiction'], note: 'moved the opposite way to HRV — the pair is the finding, not either number alone' },
      { id: 'obs-rem', reasons: ['change'], note: '−7 min/night while total sleep held; only visible in the stage split' },
      { id: 'obs-rhr', reasons: ['weak-signal'], note: 'flat, which is what argues against overtraining — a non-finding that changes the conclusion' },
      { id: 'block-summary', reasons: ['aggregate', 'correlation'] },
      { id: 'sleep-summary', reasons: ['aggregate'] },
    ],
    aggregate: [
      { id: 'obs-hrv', method: 'trend + 3 change-points' },
      { id: 'sleep-summary', method: '1,092 nights → nightly stage means' },
    ],
    guidelines: [],
    counterfactuals: {
      raw: { unitId: 'sleep-raw', label: 'Send the raw nightly series instead of the summary',
        addendum: [p('The raw series carries per-night stage durations for every night in the window {{ev:src}}. It says nothing the trend and change-points did not already carry — it just costs an order of magnitude more to send.')] },
      widen: { days: 365, label: '1 year', picks: ['block-aerobic-2025'],
        addendum: [p('Over a year the HRV dip sits inside normal seasonal range {{cite:obs-hrv}}, and the training block {{cite:block-aerobic-2025}} lines up with it — which weakens the concern rather than strengthening it {{ev:inf}}.')] },
    },
    caveats: {
      speciation: 'HRV here is Oura’s overnight rMSSD. Whoop reports a different HRV on the same nights; the two are not interchangeable, and this answer quotes only the Oura series.',
    },
  },

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
  // The worked example of the INTERVENTION shape (agent-loop.md → "Intervention
  // questions"). Anchored on a graph node, not a window — a supplement's
  // evidence base does not change because the user asked about 365 days — and
  // assembled as SLOTS rather than a ranked bag, because this answer has parts
  // it cannot be missing. The slot each pick fills is marked below.
  'Should I take NMN?': {
    shape: 'intervention',
    intent: 'Fill the comparison frame for a candidate intervention: what it claims to move, what competes with it, what it interacts with, and what the record could show.',
    tags: ['ageing', 'labs', 'metabolic', 'glucose', 'inflammation', 'nutrition', 'micronutrients', 'meds', 'conditions', 'experiment'],
    windowDays: 365,
    plan: [
      { tool: 'query_health_model', args: 'intervention=NMN → functions, markers, evidence tier', yields: '2 functions · 6 markers · 4 cited edges' },
      { tool: 'query_health_model', args: 'functions of NMN → all interventions with a cited edge', yields: '5 comparators across 3 evidence tiers' },
      { tool: 'resolve_modifiers', args: 'profile=conditions+meds+stack, candidates=[NMN, …]', yields: '1 interaction flag · 0 locked safety edges' },
      { tool: 'query_clinical', args: 'active medications and supplements', yields: '4 — one prescription, three OTC' },
      { tool: 'query_clinical', args: 'markers NMN claims to move, current values', yields: '6 series — all already at or inside target' },
      { tool: 'search_guidelines', args: '"NMN nicotinamide mononucleotide human trials"', yields: '4 statements, all low-certainty' },
      { tool: 'rank_interventions', args: 'goal=healthspan, via preference model', yields: '6 candidates on 7 axes' },
    ],
    picks: [
      // — slot: safety & interaction. Pinned: filled before the budget is
      //   computed, never evicted. An answer that never saw the stack is unsafe
      //   however well it scored.
      { id: 'med-lisinopril', reasons: ['interaction'], note: 'the only prescription in the stack — an ACE inhibitor is the interaction surface that actually carries risk' },
      { id: 'med-vitd', reasons: ['interaction', 'in-flight'], note: 'already supplementing' },
      { id: 'med-omega3', reasons: ['interaction', 'in-flight'], note: 'already supplementing — and taken *for lipids*, which is the marker actually moving' },
      { id: 'med-mag', reasons: ['interaction', 'in-flight'], note: 'already supplementing, and the one he adopted off his own n-of-1 — the precedent for how he evaluates a supplement' },
      { id: 'cond-htn', reasons: ['interaction'], note: 'the condition the prescription is for' },

      // — slot: target markers. Selected at current value WHETHER OR NOT they
      //   moved. "Already at target" is the finding, not a null.
      { id: 'obs-crp', reasons: ['mechanism'], note: 'already 0.8 mg/L. NMN claims to move inflammation; there is no room here for an effect to be visible' },
      { id: 'obs-hba1c', reasons: ['mechanism'], note: '5.4% and flat for three years — the metabolic claim has no headroom either' },
      { id: 'obs-insulin', reasons: ['mechanism'] },
      { id: 'obs-homa-ir', reasons: ['mechanism'], note: 'the derived index the human NMN trials actually report' },
      { id: 'obs-igf1', reasons: ['mechanism'], note: 'the ageing-axis marker with the least bad claim to being an outcome' },
      { id: 'clock-disagreement', reasons: ['mechanism', 'quality'], note: 'the closest thing in the record to an outcome NMN claims to affect — and it is a surrogate of a surrogate, with the reliability analysis attached' },

      // — slot: comparators. From the graph, not the store: these are nodes, not
      //   records. A frame with one row is a recommendation wearing a table's
      //   clothes, so the comparator slot is required, not opportunistic.
      { id: 'exp-postmeal-walks', reasons: ['comparator', 'in-flight'], note: 'HIGH-evidence, free, and he is *already running it* as an n-of-1 — the strongest row in the frame is one he does not need to buy' },
      { id: 'iv-resistance-training', reasons: ['comparator'], virtual: true, label: 'Resistance training 2×/wk (graph node)',
        note: 'same function edges, HIGH tier, and nothing in the record says he is doing it' },
      { id: 'iv-sleep-extension', reasons: ['comparator'], virtual: true, label: 'Sleep extension +30 min (graph node)',
        note: 'MODERATE tier — and his REM is down 7 min/night, so unlike NMN this one has somewhere to move' },
      { id: 'iv-apob-lowering', reasons: ['comparator'], virtual: true, label: 'ApoB-lowering (diet / statin — graph node)',
        note: 'enters only because the goal resolved to healthspan generically. Scoped to metabolic function it has no path and drops' },

      // — slot: preference weights. Present only because a ranking was asked
      //   for; the ranking has to show its work.
      { id: 'pref-model', reasons: ['preference'], virtual: true, label: 'Your stated weighting (evidence & long-term safety high · effort low)',
        note: 'the weights that turn 7 axes into an order — quoted in the answer so the ranking is auditable rather than asserted' },
    ],
    aggregate: [],
    guidelines: [
      'No human trial of NMN is powered for a clinical outcome; the human evidence is short-duration surrogate-marker work.',
      'No NMN trial has enrolled participants whose target markers were already within range at baseline.',
      'No pharmacokinetic interaction between NMN and ACE inhibitors is described — an absence of evidence, not a clearance.',
    ],
    counterfactuals: {
      genome: { picks: [], noneRelevant: 'Nothing in your genome speaks to NMN. There is no reported NAD-salvage variant, and no pharmacogenomic guidance exists for a supplement with no trial base.' },
      widen: { days: 1095, label: '3 years', picks: [],
        addendum: [p('Widening the window returns more of your data and none of the missing evidence. The limiting factor here is not how much you have measured — it is that the trials do not exist {{ev:none}}. More context cannot fix that, which is worth seeing directly.')] },
      raw: { unitId: 'nutrition-raw', label: 'Send 416 nutrition day-totals',
        addendum: [p('Your niacin and tryptophan intake are both comfortably above requirement {{ev:src}}. That is not evidence for or against NMN; it just means the deficiency argument does not apply to you {{ev:inf}}.')] },
    },
    caveats: {
      empty: 'Most of this answer is the evidence base, not your record — which is the shape of the question. What your record contributes is mainly negative: the markers NMN claims to move are already where you would want them, so it has nowhere visible to work.',
      quality: 'NMN claims edges to two functions — metabolic and biological ageing — and the question named neither. The comparator set was scoped to healthspan generically, which is why an ApoB-lowering row appears. Asked "should I take NMN for my HbA1c?", that row has no cited path and drops.',
      coverage: 'Nothing in the record measures NAD+ or its metabolites. The pathway NMN acts on is not something you currently measure, so no result here could confirm or refute an effect.',
    },
  },

  // ---------------------------------------------------------------------------
  // --- behavioural-flows showcase conversations ------------------------------
  // Compact specs for the four seeded multi-turn threads (see
  // state/conversations.js). Each question gets a real trace so the context
  // strip stays honest across a conversation, not just on its first turn.

  // Conversation 1 · sleep-score sharpening
  'Is my sleep score bad?': {
    intent: 'Sharpen a vague composite-score question into a baseline-relative one.',
    tags: ['sleep', 'recovery', 'hrv', 'training', 'quality'],
    windowDays: 90,
    plan: [
      { tool: 'get_time_series', args: 'sleep stages + score, from=2025-05-05', yields: '90 nights · 9 fields' },
      { tool: 'get_trend', args: 'score, total, per-stage vs. six-month baseline', yields: '1 delta past noise floor (REM)' },
      { tool: 'search_records', args: '"travel OR training block", k=6', yields: '2 hits' },
    ],
    picks: [
      { id: 'sleep-summary', reasons: ['aggregate'], note: 'the stage split — where the composite score’s movement actually lives' },
      { id: 'obs-rem', reasons: ['change'], note: '−7 min/night since early May while total sleep held; the one component past its noise floor' },
      { id: 'obs-hrv', reasons: ['correlation'], note: 'drifting down across the same window — recovery signals read together' },
      { id: 'block-summary', reasons: ['correlation'], note: 'the training ramp that overlaps the decline' },
      { id: 'obs-rhr', reasons: ['weak-signal'], note: 'flat — included so the answer can say it looked' },
    ],
    aggregate: [{ id: 'sleep-summary', method: '1,092 nights → stage means, both windows' }],
    guidelines: ['No clinical threshold exists for a vendor sleep score — stated rather than silently omitted.'],
    counterfactuals: {},
    caveats: {
      quality: 'The "sleep score" is a vendor composite with no published error model. This answer reads its components, not the composite.',
    },
  },

  'Is the REM drop real, or is it my ring?': {
    intent: 'Validate one signal: noise floor, persistence, measurement context, second instrument.',
    tags: ['sleep', 'quality', 'coverage', 'recovery'],
    windowDays: 120,
    plan: [
      { tool: 'get_time_series', args: 'REM minutes, weekly means, from=2025-04-05', yields: '17 weekly rows' },
      { tool: 'search_records', args: '"firmware OR device OR sync", k=6', yields: '1 hit — the Whoop sync failure' },
      { tool: 'get_trend', args: 'REM vs. per-night noise (±16 min)', yields: 'shift present in 10 of last 12 weekly means' },
    ],
    picks: [
      { id: 'obs-rem', reasons: ['change'], note: 'the signal under validation — persistent across weekly means, not one bad stretch' },
      { id: 'sleep-summary', reasons: ['aggregate', 'baseline'] },
      { id: 'whoop-gap', reasons: ['coverage'], virtual: true, label: 'Whoop sync failure (stale since 2025-08-01)',
        note: 'the second instrument is missing for the newest nights — a hole in the corroboration, named rather than hidden' },
      { id: 'obs-hrv', reasons: ['corroborate'], note: 'an independent signal bending the same way in the same window' },
    ],
    aggregate: [{ id: 'sleep-summary', method: '121 nights → weekly stage means' }],
    guidelines: ['Consumer sleep-staging agrees with polysomnography on roughly 60–80% of epochs — trends are more trustworthy than absolute minutes.'],
    counterfactuals: {},
    caveats: {
      coverage: 'Whoop has been stale since August 1, so the most recent nights are single-source. Persistence within Oura against its own baseline is what carries the claim.',
    },
  },

  'What would make the REM drop worth acting on?': {
    intent: 'Turn a validated signal into explicit action thresholds anchored to function.',
    tags: ['sleep', 'recovery', 'hrv', 'training', 'fitness'],
    windowDays: 120,
    plan: [
      { tool: 'get_trend', args: 'REM, HRV, RHR — joint read', yields: '2 moving, 1 flat' },
      { tool: 'query_health_model', args: 'function=recovery → markers, reversible levers', yields: '3 cited edges' },
      { tool: 'get_correlations', args: 'REM vs. block weekly load', yields: '1 pair above threshold' },
    ],
    picks: [
      { id: 'obs-rem', reasons: ['change'] },
      { id: 'obs-hrv', reasons: ['correlation'], note: 'the signal that would mark "spreading" if it keeps drifting' },
      { id: 'obs-rhr', reasons: ['contradiction'], note: 'flat — the strongest argument against a systemic problem, kept visible' },
      { id: 'block-summary', reasons: ['correlation', 'change'], note: 'the reversible exposure the action thresholds hang on' },
    ],
    aggregate: [],
    guidelines: ['No guideline defines an actionable REM-minutes threshold — the decision anchors to function, not a cutoff.'],
    counterfactuals: {},
    caveats: {},
  },

  // Conversation 2 · repeat-CAC decision
  'A friend my age just got a stent — should I repeat my calcium scan?': {
    intent: 'Decompose a screening decision into its hidden questions before framing any of them.',
    tags: ['cardiac', 'imaging', 'lipids', 'family', 'screening', 'quality'],
    windowDays: 730,
    plan: [
      { tool: 'query_clinical', args: 'type=ImagingStudy, code=CAC', yields: '1 study (2024-11) + impression' },
      { tool: 'get_trend', args: 'ApoB, Lp(a) since the scan date', yields: '2 trends; 1 rising' },
      { tool: 'search_guidelines', args: '"CAC 0 repeat interval" + "risk enhancers"', yields: '4 statements' },
      { tool: 'query_health_model', args: 'decision=repeat-imaging → benefits, harms, alternatives', yields: '3 cited edges' },
    ],
    picks: [
      // The CAC study itself is a hard pixel exclusion and appears under policy;
      // what reaches the model is the extracted Agatston score (same pattern as
      // the cardiac re-ask above).
      { id: 'ev-cac', reasons: ['unique', 'quality'], virtual: true, label: 'CAC Agatston 0 (extracted impression)',
        note: 'the baseline the whole question compares against — a 0, nine months old' },
      { id: 'obs-apob', reasons: ['change', 'guideline'], note: 'what has actually moved since the scan' },
      { id: 'obs-lpa', reasons: ['outlier', 'guideline'], note: 'the risk enhancer the scan cannot see' },
      { id: 'fh-father-cad', reasons: ['guideline'], note: 'what moves the targets, and part of why the friend’s story resonates' },
      { id: 'obs-ldl', reasons: ['corroborate'] },
      { id: 'note-cardiology-2025-02', reasons: ['vector'], note: 'the last clinician conversation about this territory' },
    ],
    aggregate: [],
    guidelines: [
      'SCCT: after a CAC of 0, repeat imaging is generally considered at 3–5 years for risk reassessment.',
      'CAC 0 confers a low near-term event rate but does not exclude non-calcified plaque.',
    ],
    counterfactuals: {},
    caveats: {
      pixelsExcluded: 'The CAC study’s pixel data never leaves the device; what the reasoner saw was the extracted Agatston score of 0.',
    },
  },

  'What would a repeat scan actually buy me?': {
    intent: 'Price one screening decision in natural frequencies — benefits and harms on the same page.',
    tags: ['cardiac', 'imaging', 'screening', 'lipids', 'family'],
    windowDays: 730,
    plan: [
      { tool: 'search_guidelines', args: '"CAC 0 conversion rate" + "CT incidental findings" + dose', yields: '5 statements' },
      { tool: 'query_clinical', args: 'CAC study + lipid trend since scan', yields: '1 study · 2 trends' },
      { tool: 'query_health_model', args: 'test → what each result changes downstream', yields: '2 decision paths, 1 shared endpoint' },
    ],
    picks: [
      { id: 'ev-cac', reasons: ['baseline', 'quality'], virtual: true, label: 'CAC Agatston 0 (extracted impression)',
        note: 'the denominator’s anchor: a 0 nine months ago' },
      { id: 'obs-apob', reasons: ['change', 'guideline'], note: 'the marker that makes the statin conversation live regardless of scan result' },
      { id: 'obs-lpa', reasons: ['outlier'], note: 'raises the conversion prior; invisible to the scan itself' },
      { id: 'fh-father-cad', reasons: ['guideline'] },
    ],
    aggregate: [],
    guidelines: [
      'MESA-derived: with risk factors, conversion from CAC 0 runs roughly 5–10% per year; near-term event rates with CAC 0 stay low.',
      'A CAC scan delivers ~1 mSv; incidental findings on chest CT trigger follow-up in a meaningful minority of scans.',
      'SCCT: repeat interval after CAC 0 is 3–5 years.',
    ],
    counterfactuals: {},
    caveats: {
      screening: 'The frequencies quoted are population estimates applied to a profile like his — they carry cohort uncertainty and are labelled as such in the answer.',
    },
  },

  'Honestly, I just want the reassurance. Scans are cheap.': {
    intent: 'Surface a stated-vs-meta-preference conflict as a question, not a verdict.',
    tags: ['cardiac', 'screening', 'imaging'],
    windowDays: 730,
    plan: [
      { tool: 'query_health_model', args: 'decision=repeat-imaging → information value per result', yields: '2 paths, 1 shared endpoint' },
      { tool: 'search_records', args: 'preference model: decision style', yields: '1 stored weighting' },
    ],
    picks: [
      { id: 'ev-cac', reasons: ['baseline'], virtual: true, label: 'CAC Agatston 0 (extracted impression)' },
      { id: 'obs-apob', reasons: ['contradiction'], note: 'the thing the reassurance would not actually check — soft plaque tracks the particle number, not the calcium' },
      { id: 'pref-decision-style', reasons: ['preference'], virtual: true, label: 'Your stated weighting (settled evidence & long-term safety high)',
        note: 'retrieved because the turn is about the conflict between this and what was just said — quoted so the conflict is auditable' },
    ],
    aggregate: [],
    guidelines: [],
    counterfactuals: {},
    caveats: {},
  },

  'Evidence first — if it changes nothing before 2027, I can wait.': {
    intent: 'Record a decision surface — direction, shift conditions, confidence — not a verdict.',
    tags: ['cardiac', 'lipids', 'family', 'screening'],
    windowDays: 730,
    plan: [
      { tool: 'query_clinical', args: 'ApoB series + CAC + family history — the surface’s inputs', yields: '3 records' },
      { tool: 'search_records', args: 'preference model: update at rung=understood', yields: '1 stored object, provenance=this conversation' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['change', 'guideline'], note: 'shift condition (a): two more rising draws reopens the question' },
      { id: 'ev-cac', reasons: ['baseline'], virtual: true, label: 'CAC Agatston 0 (extracted impression)' },
      { id: 'fh-father-cad', reasons: ['guideline'] },
      { id: 'pref-decision-style', reasons: ['preference'], virtual: true, label: 'Considered preference — recorded at rung: understood',
        note: 'stored with provenance and moderate confidence; editable, and expected to move with the next draw' },
    ],
    aggregate: [],
    guidelines: ['SCCT: repeat interval after CAC 0 is 3–5 years.'],
    counterfactuals: {},
    caveats: {},
  },

  // Conversation 3 · evening sessions vs. HRV
  'Evening training is tanking my HRV — pretty clear cause and effect, right?': {
    intent: 'Hold a causal claim to what observational personal data can support.',
    tags: ['hrv', 'recovery', 'training', 'activity', 'sleep', 'coverage'],
    windowDays: 120,
    plan: [
      { tool: 'get_time_series', args: 'HRV daily, from=2025-04-05', yields: '121 points' },
      { tool: 'get_correlations', args: 'weekly load vs. HRV, lag 0–7 days', yields: '1 pair, r = −0.41 at lag 2' },
      { tool: 'search_records', args: '"travel OR illness OR alcohol", k=8', yields: '4 hits incl. a 9-day data gap' },
    ],
    picks: [
      { id: 'obs-hrv', reasons: ['change'], note: 'the subject of the claim — 46 → 42 ms across the window' },
      { id: 'block-summary', reasons: ['correlation', 'change'], note: 'volume up 28% over the same weeks — the rival explanation' },
      { id: 'obs-strain', reasons: ['correlation'] },
      { id: 'act-gap', reasons: ['coverage'], virtual: true, label: '9-day Garmin gap (2025-04-12 → 04-20)',
        note: 'the travel week — correlations across it are computed on unequal data' },
      { id: 'obs-rhr', reasons: ['weak-signal'], note: 'flat, which argues against a systemic recovery problem' },
    ],
    aggregate: [{ id: 'block-summary', method: '78 activities → 17 weekly rows → 6 numbers' }],
    guidelines: ['No guideline applies — HRV has no clinical threshold. Stated rather than silently omitted.'],
    counterfactuals: {},
    caveats: {
      coverage: 'Nine days of Garmin data are missing mid-window. The load side of the correlation has a hole in it.',
    },
  },

  'Every hard evening session is followed by a bad morning. What else could it be?': {
    intent: 'Run the counterfactual the record supports and check confounders one at a time.',
    tags: ['hrv', 'training', 'activity', 'recovery', 'coverage', 'quality'],
    windowDays: 120,
    plan: [
      { tool: 'get_time_series', args: 'threshold sessions split by start time', yields: '19 sessions: 13 evening, 6 morning' },
      { tool: 'get_correlations', args: 'next-morning HRV by session timing', yields: '3 conditional means' },
      { tool: 'search_records', args: '"illness OR alcohol OR firmware", k=8', yields: '1 device-provenance hit, 0 illness' },
    ],
    picks: [
      { id: 'obs-hrv', reasons: ['change'] },
      { id: 'session-splits', reasons: ['aggregate', 'quality'], virtual: true, label: 'Threshold sessions split by start time (19 sessions)',
        note: 'the counterfactual’s raw material — thin on the morning side, and the answer says so' },
      { id: 'act-gap', reasons: ['coverage'], virtual: true, label: '9-day Garmin gap (2025-04-12 → 04-20)' },
      { id: 'lab-vendor-switch', reasons: ['quality'], note: 'checked and cleared — the vendor switch touched assays, not wearables' },
    ],
    aggregate: [{ id: 'obs-hrv', method: 'daily → conditional means by prior-day session type' }],
    guidelines: [],
    counterfactuals: {},
    caveats: {
      coverage: 'Alcohol is logged too patchily to clear or convict as a confounder. An unlogged confounder is not an absent one, and the answer carries that.',
    },
  },

  'OK — how do we actually find out?': {
    intent: 'Hand the question off to a small reversible n-of-1 with a pre-registered bar.',
    tags: ['hrv', 'training', 'recovery', 'experiment'],
    windowDays: 120,
    plan: [
      { tool: 'get_time_series', args: 'morning-after HRV, trailing 14 days — the baseline window', yields: '14 points' },
      { tool: 'query_health_model', args: 'exposure=session timing → reversibility, risk', yields: 'reversible · no safety edge' },
    ],
    picks: [
      { id: 'obs-hrv', reasons: ['baseline'], note: 'the outcome metric — its trailing 14 days become the pre-registered baseline' },
      { id: 'block-summary', reasons: ['change'], note: 'the held variable: same sessions, same weekly load, only the clock moves' },
    ],
    aggregate: [],
    guidelines: [],
    counterfactuals: {},
    caveats: {
      design: 'A three-week single-switch design cannot blind the subject and inherits the season as a slow confounder. It can still separate timing from load — which is the only question on the table.',
    },
  },

  // Conversation 4 · the statin decision (local reasoner, genome in scope)
  'My doctor wants me on a statin. My calcium score was zero — why does a guy in the best shape of his life need a heart disease pill?': {
    intent: 'Separate the fitness record from the risk record before the question can be answered.',
    tags: ['lipids', 'cardiac', 'fitness', 'imaging', 'family', 'genomics', 'guideline'],
    windowDays: 730,
    plan: [
      { tool: 'get_trend', args: 'ApoB, all draws since 2023-05', yields: '9 draws — a rise at every one' },
      { tool: 'query_clinical', args: 'type=ImagingStudy, code=CAC', yields: '1 study (2024-11) + impression' },
      { tool: 'search_guidelines', args: '"ApoB target family history" + "CAC 0 statin deferral"', yields: '4 statements' },
      { tool: 'get_time_series', args: 'VO₂max est., RHR — the fitness he is arguing from', yields: '2 series' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['change', 'guideline'], note: 'the series the question is actually about — risen at all nine draws, past the < 90 target' },
      { id: 'ev-cac', reasons: ['contradiction', 'quality'], virtual: true, label: 'CAC Agatston 0 (extracted impression)',
        note: 'the reassuring datum, retrieved with its blind spot named: it cannot see non-calcified plaque' },
      { id: 'obs-lpa', reasons: ['outlier', 'guideline'], note: 'the lifelong enhancer no statin lowers — which raises, not lowers, the stakes of the movable load' },
      { id: 'fh-father-cad', reasons: ['guideline'] },
      { id: 'vo2-2025-06-14', reasons: ['contradiction'], note: 'retrieved because the question equates fitness with low risk — the record holds both, moving in opposite directions' },
      { id: 'obs-rhr', reasons: ['corroborate'] },
    ],
    aggregate: [],
    guidelines: [
      'ApoB < 90 mg/dL with a first-degree family history of premature CAD.',
      'CAC scores calcified plaque only; a rising ApoB builds non-calcified plaque first.',
    ],
    counterfactuals: {},
    caveats: {
      local: 'This thread runs on the local reasoner with the genome in scope — the pharmacogenomics it leans on never leave the device.',
      pixelsExcluded: 'The CAC study’s pixel data stays local under the hard exclusion; the reasoner saw the extracted Agatston score.',
    },
  },

  'Wait — Lp(a)? A genetic problem the pill doesn’t even fix? And muscle is my real worry. A guy in my running club quit his statin because he couldn’t train.': {
    intent: 'Answer two fears at once: what Lp(a) changes about the logic, and what the genome says about the muscle story.',
    tags: ['lipids', 'genomics', 'cardiac', 'quality', 'guideline'],
    windowDays: 730,
    plan: [
      { tool: 'query_clinical', args: 'Lp(a) + ApoB, latest draw', yields: '2 results' },
      { tool: 'get_genomic_variants', args: 'genes=[LPA, SLCO1B1]', yields: '2 annotated findings' },
      { tool: 'search_guidelines', args: '"statin muscle symptoms blinded" + "CPIC SLCO1B1"', yields: '4 statements' },
    ],
    picks: [
      { id: 'pgx-slco1b1', reasons: ['unique', 'guideline'], note: 'the record’s answer to the running-club story — agent-specific, actionable, and checkable' },
      { id: 'gen-lpa', reasons: ['corroborate'], note: 'genotype and phenotype agree — the Lp(a) level is real and lifelong, not a lab artefact' },
      { id: 'obs-lpa', reasons: ['outlier'] },
      { id: 'obs-apob', reasons: ['baseline'], note: 'the movable load the fixed load makes more valuable' },
    ],
    aggregate: [],
    guidelines: [
      'CPIC: SLCO1B1 decreased function — increased simvastatin myopathy risk; rosuvastatin or pravastatin preferred.',
      'Blinded-trial excess of muscle symptoms ≈ 1%; open-label reports run 10–30% (SAMSON, StatinWISE).',
    ],
    counterfactuals: {},
    caveats: {},
  },

  '90% of the pain showed up on placebo? So my friend imagined it? And you skipped the diabetes thing — I read statins raise it 10%.': {
    intent: 'Hold the nocebo distinction without dismissing the pain, and convert a relative risk into an absolute one.',
    tags: ['metabolic', 'glucose', 'labs', 'guideline', 'quality'],
    windowDays: 1095,
    plan: [
      { tool: 'query_clinical', args: 'codes=[HbA1c, insulin, HOMA-IR], all draws', yields: '3 series, all flat and in range' },
      { tool: 'search_guidelines', args: '"statin new-onset diabetes absolute" + "SAMSON funding"', yields: '3 statements' },
    ],
    picks: [
      { id: 'obs-hba1c', reasons: ['contradiction'], note: 'flat at 5.4% for three years — the personal fact that resizes the population risk' },
      { id: 'obs-insulin', reasons: ['corroborate'] },
      { id: 'obs-homa-ir', reasons: ['corroborate'] },
    ],
    aggregate: [],
    guidelines: [
      'New-onset diabetes ≈ 1 extra case per 250–500 treated over 4–5 years, concentrated in people already near the diabetic threshold.',
      'SAMSON and StatinWISE were publicly funded — no industry sponsor.',
    ],
    counterfactuals: {},
    caveats: {},
  },

  'If I’m the rare real case, how fast does it reverse? And why can’t I just diet my way out of this?': {
    intent: 'Price the two levers honestly: a reversibility timeline for the drug, a headroom ceiling for the diet.',
    tags: ['lipids', 'nutrition', 'guideline', 'experiment', 'coverage'],
    windowDays: 730,
    plan: [
      { tool: 'search_guidelines', args: '"statin symptom washout" + "dietary ApoB effect size"', yields: '4 statements' },
      { tool: 'query_clinical', args: 'nutrition coverage + dietary pattern, trailing 90d', yields: '88% of days logged, Mediterranean-leaning' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['change', 'baseline'], note: 'the 95 both levers are priced against' },
      { id: 'diet-baseline', reasons: ['coverage', 'baseline'], virtual: true, label: 'Nutrition log — 88% coverage, Mediterranean-leaning',
        note: 'the fact that puts his dietary headroom at the low end of the published range — he is not starting from a bad diet' },
      { id: 'pgx-slco1b1', reasons: ['quality'], note: 'why the realistic worst case is agent-switching measured in weeks, not a lost season' },
    ],
    aggregate: [],
    guidelines: [
      'Dietary change moves ApoB ~5–15%; highly adherent portfolio-style ~20–30%; a moderate-intensity statin ~30–40%.',
      'Common statin muscle symptoms typically resolve within days to weeks of stopping.',
    ],
    counterfactuals: {},
    caveats: {},
  },

  'Sketch the diet experiment. But honestly — is it informative, or am I just buying six weeks of feeling like I did something?': {
    intent: 'Pre-register a six-week diet experiment so the result cannot be renegotiated after it lands.',
    tags: ['experiment', 'lipids', 'nutrition', 'labs', 'quality'],
    windowDays: 90,
    plan: [
      { tool: 'get_trend', args: 'ApoB within-person variation → smallest real difference', yields: '±6–8% band from 95' },
      { tool: 'query_health_model', args: 'intervention=soluble fibre → ApoB edge', yields: '1 cited edge, MODERATE tier' },
      { tool: 'search_records', args: 'training block schedule — the held variable', yields: '1 hit' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['baseline'], note: 'the 95 the pre-registered bar is set against' },
      { id: 'block-summary', reasons: ['quality'], note: 'held steady for the six weeks so only one variable moves' },
      { id: 'exp-postmeal-walks', reasons: ['experiment', 'in-flight'], note: 'the precedent — he already runs pre-registered n-of-1s, so this is his own method pointed at a new lever' },
      { id: 'exp-fibre-criteria', reasons: ['experiment'], virtual: true, label: 'Pre-registered readings (≤ 85 · 86–90 · > 90)',
        note: 'locked before the draw; the guard against the self-negotiation he named himself' },
    ],
    aggregate: [],
    guidelines: ['Within-person ApoB variation ≈ 6–8% — from 95, results above ~88 are indistinguishable from no effect.'],
    counterfactuals: {},
    caveats: {
      design: 'Six weeks tests the fast levers (fibre, saturated fat). It cannot test weight-mediated effects, which move on a slower clock — the criteria only claim what the window can support.',
    },
  },

  'Lock it in. But nobody starts a statin and stops. Is there data on decades, or just five-year trials? My dad’s been on one since his stent and I can’t tell it’s done anything.': {
    intent: 'Answer the decades question with the layered evidence that exists — and name each layer’s weakness.',
    tags: ['guideline', 'cardiac', 'lipids', 'genomics', 'family', 'meds'],
    windowDays: 1095,
    plan: [
      { tool: 'search_guidelines', args: '"statin legacy follow-up 20 year" + "mendelian randomisation LDL"', yields: '5 statements' },
      { tool: 'query_clinical', args: 'active prescriptions — the re-decision framing', yields: '1: lisinopril, renewed yearly since 2022' },
    ],
    picks: [
      { id: 'gen-lpa', reasons: ['corroborate'], note: 'the cumulative-exposure argument he already accepts — same logic, sign flipped' },
      { id: 'med-lisinopril', reasons: ['corroborate'], note: 'proof in his own record that a daily preventive pill is a yearly re-decision, not a sentence' },
      { id: 'fh-father-cad', reasons: ['corroborate'], note: 'the counterfactual he cannot see: the father’s statin era has no visible receipt precisely when it works' },
    ],
    aggregate: [],
    guidelines: [
      'Trial cohorts followed ~20 years post-randomisation show persistent benefit and no late harm signal (WOSCOPS).',
      'Mendelian randomisation: lifelong genetically low LDL yields roughly 3× the per-mg/dL risk reduction of five-year trials — risk tracks cumulative exposure (LDL-years).',
    ],
    counterfactuals: {},
    caveats: {},
  },

  'He’s 74 and still gardening — that’s the receipt, isn’t it. One more: is red yeast rice anything, or just an unregulated statin with extra steps?': {
    intent: 'Resolve a "natural alternative" to its actual pharmacology, against his genome.',
    tags: ['meds', 'genomics', 'quality', 'guideline'],
    windowDays: 730,
    plan: [
      { tool: 'search_guidelines', args: '"red yeast rice monacolin K" + "citrinin contamination"', yields: '3 statements' },
      { tool: 'query_health_model', args: 'intervention=red-yeast-rice → resolves to lovastatin node', yields: '1 identity edge' },
    ],
    picks: [
      { id: 'iv-ryr', reasons: ['comparator'], virtual: true, label: 'Red yeast rice (graph node — monacolin K ≡ lovastatin)',
        note: 'not a third option: the graph resolves it to the statin class his genome flags, minus the dose label' },
      { id: 'pgx-slco1b1', reasons: ['guideline'], note: 'lovastatin shares the lipophilic class the variant flags — the "natural" route is the worst-matched one' },
    ],
    aggregate: [],
    guidelines: [
      'Monacolin K is chemically identical to lovastatin.',
      'Tested products range from ~0 to prescription-dose monacolin between brands and batches; citrinin contamination occurs.',
    ],
    counterfactuals: {},
    caveats: {},
  },

  'Should I redo the calcium scan before the follow-up — or is that me shopping for another zero?': {
    intent: 'Re-read the recorded scan surface under a live statin decision, and price the repeat’s information value.',
    tags: ['imaging', 'cardiac', 'screening', 'lipids', 'family', 'guideline'],
    windowDays: 730,
    plan: [
      { tool: 'search_records', args: 'preference model: CAC decision surface (2025-08-01)', yields: '1 stored surface, rung understood' },
      { tool: 'search_guidelines', args: '"CAC 0 statin deferral" + "conversion with risk enhancers"', yields: '3 statements' },
      { tool: 'query_clinical', args: 'the four enhancers the scan cannot see', yields: '4 records' },
    ],
    picks: [
      { id: 'pref-decision-style', reasons: ['preference'], virtual: true, label: 'Recorded decision surface (2025-08-01) — wait; steer by quarterly ApoB',
        note: 'read back to him verbatim, shift conditions and all — the surface is his, editable, and one of its conditions just went live' },
      { id: 'ev-cac', reasons: ['baseline'], virtual: true, label: 'CAC Agatston 0 (extracted impression)' },
      { id: 'obs-lpa', reasons: ['guideline'], note: 'enhancer the scan cannot see, 1 of 4' },
      { id: 'obs-apob', reasons: ['change', 'guideline'], note: 'enhancer 2 — and the reason a repeat zero cannot carry the first zero’s weight' },
      { id: 'fh-father-cad', reasons: ['guideline'], note: 'enhancer 3; ancestry is the fourth and lives in the profile, not a record' },
    ],
    aggregate: [],
    guidelines: [
      'Some guidance uses CAC 0 to defer statins at borderline risk; risk enhancers argue the reverse.',
      'Conversion from CAC 0 with risk factors runs ≈ 5–10% per year.',
    ],
    counterfactuals: {},
    caveats: {
      pixelsExcluded: 'The CAC study’s pixel data never leaves the device; the reasoner saw the extracted Agatston score of 0.',
    },
  },

  'Real talk — a pill at 45 feels like the opening scene of becoming my dad. Build me the packet for the follow-up.': {
    intent: 'File the fear where it belongs, ask one coherence question, and assemble the packet.',
    tags: ['cardiac', 'lipids', 'genomics', 'meds', 'metabolic', 'family', 'imaging'],
    windowDays: 1095,
    plan: [
      { tool: 'query_clinical', args: 'packet contents: lipid trend, genome flags, metabolic baseline, CAC', yields: '7 records + 1 pending slot' },
      { tool: 'query_health_model', args: 'statin decision → clinician-routed questions', yields: '6 queued questions' },
    ],
    picks: [
      { id: 'obs-apob', reasons: ['change', 'guideline'] },
      { id: 'obs-lpa', reasons: ['outlier', 'guideline'] },
      { id: 'gen-lpa', reasons: ['corroborate'] },
      { id: 'pgx-slco1b1', reasons: ['unique', 'guideline'], note: 'the packet’s highest-value row — it changes which statin the six-week conversation is about' },
      { id: 'obs-hba1c', reasons: ['contradiction'], note: 'the diabetes-risk conversation, pre-armed with his own flat three-year line' },
      { id: 'ev-cac', reasons: ['baseline'], virtual: true, label: 'CAC Agatston 0 (extracted impression)' },
      { id: 'med-lisinopril', reasons: ['unique'], note: 'the coherence probe — three years of a daily preventive pill that never touched his identity' },
      { id: 'fh-father-cad', reasons: ['guideline'], note: 'the fear’s referent, filed as history rather than argued with' },
    ],
    aggregate: [],
    guidelines: ['CPIC SLCO1B1 guidance travels with the packet so the prescriber sees it before an agent is chosen.'],
    counterfactuals: {},
    caveats: {
      local: 'The packet is assembled locally. Nothing leaves the device until he explicitly shares it.',
    },
  },

  'The lisinopril question got me. Run the experiment, redraw, walk in with the packet — that’s the plan.': {
    intent: 'Store the statin decision surface — direction, shift conditions, rung, confidence — as data he owns.',
    tags: ['cardiac', 'lipids', 'experiment', 'labs'],
    windowDays: 90,
    plan: [
      { tool: 'search_records', args: 'preference model: write statin surface, rung=understood→endorsed', yields: '1 stored object, provenance=this conversation' },
      { tool: 'get_trend', args: 'week-six draw scheduled against the follow-up', yields: '1 pending measurement' },
    ],
    picks: [
      { id: 'pref-statin-surface', reasons: ['preference'], virtual: true, label: 'Considered decision surface — statin (rung: understood → endorsed)',
        note: 'stored with provenance and moderate confidence, and expected to move with the week-six draw — a model of him, not a verdict' },
      { id: 'obs-apob', reasons: ['baseline'], note: 'shift condition (a): a diet draw at or below 85 reopens the question from the other side' },
      { id: 'exp-fibre-criteria', reasons: ['experiment', 'in-flight'], virtual: true, label: 'Diet experiment (pre-registered, week-six draw)' },
    ],
    aggregate: [],
    guidelines: [],
    counterfactuals: {},
    caveats: {},
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
