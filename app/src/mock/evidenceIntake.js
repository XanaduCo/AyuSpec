// Evidence intake — the scripted submissions and their appraisals
// (docs/evidence-intake.md).
//
// The user brings something in from outside: a paper, a podcast claim, a
// preprint someone linked, or something they noticed about themselves. Each
// submission below carries its provenance verbatim, a staged appraisal, and a
// graded verdict on the SAME ladder the rest of the app uses
// (evidence.md#strength-of-evidence-labeling) — HIGH / MODERATE / LOW / NONE.
//
// Three properties are the point of the fixture, so they are hand-built rather
// than generated:
//
//   1. The grade tracks what is ATTACHED to the claim, never who made it. The
//      podcast item and the friend's tip would grade identically; the pooled
//      trials grade high whoever forwarded them.
//   2. The ceiling per evidence type is a ceiling, not a floor. The preprint is
//      a real randomised trial and still lands at LOW, because n=18, open-label,
//      manufacturer-funded and a surrogate endpoint each cost it a rung.
//   3. Strength, applicability and confidence are three axes and are never
//      multiplied into one number.
//
// Every value is fabricated but internally consistent with Ravi's record: ApoB
// 95 mg/dL and rising at every draw, a closed cold-shower n-of-1 that returned
// inconclusive, DunedinPACE 0.94 with a 2.1% technical CV, and a training block
// whose hard sessions drifted late into the evening.

// A stage in the appraisal pipeline. `run` says where it executed — every stage
// here is local, which is the default self-hosted + local-inference posture; the
// only thing that ever leaves is a paper fetch the user approves.
const stage = (key, title, run, rows, note) => ({ key, title, run, rows, note })

export const SUBMISSIONS = [
  // ---------------------------------------------------------------------
  // 1 · STRONG — pooled RCTs, close population match, offered as a hypothesis.
  // ---------------------------------------------------------------------
  {
    id: 'ei-fibre',
    pickLabel: 'A paper a colleague forwarded',
    pickClaim: 'Psyllium fibre lowers ApoB — meta-analysis of 28 randomised trials',
    pickTag: 'journal · study',
    keywords: ['fibre', 'fiber', 'psyllium', 'apob', 'lipid', 'cholesterol', 'ldl'],
    intake: {
      source_type: 'journal',
      evidence_types: ['study'],
      claim_verbatim:
        '"Supplemental psyllium at 10 g/day reduced apolipoprotein B by a pooled 6.4 mg/dL (95% CI 4.1–8.7) across 28 randomised trials in adults with elevated LDL-C."',
      claim_user_framing:
        'Sanjay sent me this. My ApoB has gone up at every draw for two years — is this worth doing before the next panel?',
      artifact: 'Full text · PDF, 14 pp · fetched with your approval and stored on this machine',
      goal_ref: 'Metabolic health — lower ApoB',
    },
    provenance: {
      attributed_to: 'Jovanovski et al.',
      venue: 'Am J Clin Nutr',
      stated_at: '2023-11',
      captured_at: 'just now',
      locator: 'doi:10.0000/ajcn.fabricated.2023',
      capture_method: 'Pasted DOI',
      retrieved: 'yes — fetch approved and logged',
    },
    egress: {
      kind: 'fetched',
      text:
        'Resolving that DOI meant one request to the publisher, which told their server your IP and which paper you were reading. It was disclosed before it happened and is in the call ledger. Pasting the text instead is always available and costs nothing but the copy-paste.',
    },
    stages: [
      stage('extract', 'Extract & normalize', 'local · medical extractor', [
        { k: 'intervention', v: 'Psyllium husk, 10 g/day, oral' },
        { k: 'population', v: 'Adults with elevated LDL-C, mean age 52, mixed sex' },
        { k: 'outcome', v: 'ApoB, serum' },
        { k: 'direction', v: 'down' },
        { k: 'magnitude', v: '−6.4 mg/dL (95% CI 4.1–8.7)' },
        { k: 'timeframe', v: '6–12 weeks in the pooled trials' },
      ], 'Intervention and marker both resolved to nodes in the healthspan model — psyllium → soluble fibre intake, ApoB → the Tier B lipid marker. Nothing left unresolved.'),
      stage('background', 'Background check', 'local · healthspan model + bundled corpus', [
        { k: 'prior position', v: 'Held — SUPPORTS edge, soluble fibre → lipid handling, cited, graded MODERATE' },
        { k: 'guideline', v: 'Consistent with the bundled lipid guideline’s dietary section' },
        { k: 'prior intake', v: 'None — first time you have brought this claim in' },
      ], 'This runs before the quality read on purpose. Against a held, cited MODERATE edge, a pooled analysis of 28 trials is the thing that moves it — it would have been noise against a HIGH edge and the only evidence anywhere against an empty one.'),
      stage('quality', 'Study quality & power', 'local', [
        { k: 'design', v: 'Meta-analysis of randomised, placebo-controlled trials' },
        { k: 'n', v: '1,924 across 28 trials' },
        { k: 'effect size', v: '−6.4 mg/dL, CI excludes zero and is narrow' },
        { k: 'blinding', v: 'Placebo-controlled in 24 of 28; the other 4 are open-label' },
        { k: 'endpoint', v: 'ApoB — a surrogate, but a well-validated one for cardiovascular risk' },
        { k: 'replication', v: 'Consistent direction in 26 of 28 trials' },
        { k: 'funding', v: 'Two included trials were fibre-industry funded; effect is unchanged with them removed' },
      ], 'The ceiling for pooled consistent RCTs is HIGH, and nothing here routes it down. The endpoint is a surrogate — this is evidence about a number, not about events — and the verdict says so rather than quietly upgrading it.'),
      stage('relevance', 'Relevance to your record', 'local · your store, nothing sent', [
        { k: 'your ApoB', v: '95 mg/dL, up from 72 in May 2023 — higher at every draw' },
        { k: 'population match', v: 'Close — 45, elevated ApoB, no lipid-lowering therapy' },
        { k: 'baseline', v: 'Your ApoB sits above the pooled trial mean, where the effect was slightly larger' },
        { k: 'measurable', v: 'Yes — ApoB is on your quarterly panel, Tier B, low noise, 90-day useful interval' },
      ], 'The marker is already in the record on a cadence that can see a 6 mg/dL move. That is what makes this testable rather than merely interesting.'),
    ],
    verdict: {
      strength: 'high',
      ceilingNote: 'Ceiling for pooled consistent RCTs is HIGH; nothing routed it down.',
      applicability: { level: 'close', note: 'Same age band, same marker, higher baseline than the trial mean. No named mismatch.' },
      confidence: 0.72,
      unknowns: ['Adherence in the pooled trials was self-reported', 'No trial ran past 12 weeks'],
      whatWouldChangeIt:
        'A hard-endpoint trial — events, not particles. That does not exist for fibre supplementation and probably never will, which is a real limit on how far this can be pushed.',
      narrative:
        'Pooled randomised evidence, consistent across trials, in a population close to yours, on a marker you already measure quarterly. The effect is small and real: roughly 6 mg/dL, which against your 95 would not by itself change the trajectory but is one of the cheapest levers available. This is evidence about ApoB, not about heart attacks.',
    },
    offer: {
      kind: 'hypothesis',
      why: 'Testable with a marker you already draw, at an effect size the marker can resolve.',
    },
    hypothesis: {
      statement: 'Psyllium husk 10 g/day lowers my ApoB by ≥ 6 mg/dL by the next quarterly draw.',
      goal: 'Metabolic health — lower ApoB',
      rationale:
        'Your ApoB has risen at every draw for two years (72 → 95 mg/dL). The healthspan model already held a cited MODERATE edge for soluble fibre; this pooled analysis of 28 randomised trials raises it, and your baseline sits above the trial mean.',
      evidence_strength: 'high',
      proposed_intervention: 'Psyllium husk 10 g/day, split across two doses with meals',
      expected_effect: '−6 mg/dL ApoB over 8–12 weeks; larger effects are not supported',
      confidence: 0.72,
      origin: 'user_intake · ei-fibre',
    },
  },

  // ---------------------------------------------------------------------
  // 2 · WEAK — a bare claim by a well-known voice. NONE, and kept.
  // ---------------------------------------------------------------------
  {
    id: 'ei-cold',
    pickLabel: 'A claim from a podcast',
    pickClaim: 'Three minutes of cold every morning raises resting HRV, and it compounds',
    pickTag: 'podcast · bare claim',
    keywords: ['cold', 'plunge', 'shower', 'ice', 'hrv', 'vagal', 'sauna'],
    intake: {
      source_type: 'podcast_video',
      evidence_types: ['bare_claim'],
      claim_verbatim:
        '"If you do three minutes of cold every single morning, your resting HRV goes up — and the effect compounds over months. This is one of the highest-leverage things you can do for your nervous system."',
      claim_user_framing:
        'Heard this on my run. I tried cold showers earlier this year and it did nothing, but he sounded very sure.',
      artifact: 'Transcript excerpt, 41 s · pasted with the episode timestamp',
      goal_ref: 'Recovery & autonomic',
    },
    provenance: {
      attributed_to: 'Podcast host (name recorded)',
      venue: 'Health podcast, episode 214',
      stated_at: '2025-07-28',
      captured_at: 'just now',
      locator: 'episode 214 · 01:12:40',
      capture_method: 'Pasted transcript excerpt',
      retrieved: 'n/a — the claim is the artifact; no study was named to retrieve',
    },
    egress: {
      kind: 'none',
      text: 'Nothing was fetched. The claim came in as pasted text and every stage ran on this machine.',
    },
    stages: [
      stage('extract', 'Extract & normalize', 'local · medical extractor', [
        { k: 'intervention', v: 'Cold exposure, ~3 min, daily, on waking' },
        { k: 'population', v: 'Unspecified' },
        { k: 'outcome', v: 'Resting HRV' },
        { k: 'direction', v: 'up' },
        { k: 'magnitude', v: 'Not stated' },
        { k: 'timeframe', v: '"compounds over months" — not quantified' },
        { k: 'cited support', v: 'None. No study, trial, or author is named in the segment' },
      ], 'Two of the six fields the claim needs are missing, and one of them is the effect size. A claim with no magnitude cannot be right or wrong — it can only feel true.'),
      stage('background', 'Background check', 'local · healthspan model + your own record', [
        { k: 'prior position', v: 'No cited edge — the model holds nothing linking cold exposure to durable resting HRV' },
        { k: 'your own test', v: 'You ran this. exp-cold-hrv, 3 min at ~15 °C, closed 2025-06-14' },
        { k: 'that result', v: 'Inconclusive — mean HRV rose 1.5 ms against a pre-registered 5 ms bar, inside baseline noise' },
      ], 'This is the case the intake record exists for. You brought in a claim you have already tested on yourself, and the closed experiment is the most relevant evidence anyone has about you specifically — weak as an n-of-1 is.'),
      stage('quality', 'Study quality & power', 'local', [
        { k: 'design', v: 'unknown — nothing was cited' },
        { k: 'n', v: 'unknown' },
        { k: 'effect size', v: 'unknown' },
        { k: 'blinding', v: 'not applicable' },
        { k: 'endpoint', v: 'unknown' },
        { k: 'conflicts', v: 'The host sells a cold-plunge unit; disclosed in the episode' },
      ], 'There is nothing to appraise. That is a finding, not a failure of the appraisal — the unknowns are printed rather than filled in with plausible defaults.'),
      stage('relevance', 'Relevance to your record', 'local · your store, nothing sent', [
        { k: 'your HRV', v: '42 ms, down from 46 across the 90-day window' },
        { k: 'marker quality', v: 'Tier C — Oura HRV, high day-to-day noise, useful for your own trend only' },
        { k: 'population match', v: 'Unknown — the claim names no population' },
        { k: 'testable again', v: 'Only with a longer window or a better sensor; the last design could not resolve 5 ms' },
      ], 'The topic is relevant to you. The claim still carries no evidence.'),
    ],
    verdict: {
      strength: 'none',
      ceilingNote:
        'Ceiling for a bare claim is NONE, whoever makes it. If the episode had cited a trial, the trial would have been appraised and the grade would have come from the trial — not from the host.',
      applicability: { level: 'unknown', note: 'No population, dose-response, or duration was specified, so there is nothing to match against you.' },
      confidence: 0.15,
      unknowns: ['No study named', 'No effect size', 'No duration or population'],
      whatWouldChangeIt:
        'A randomised trial measuring resting HRV — not acute post-immersion HRV, which is a different question — over at least eight weeks. If one exists, bring it in and this item gets re-appraised in place.',
      narrative:
        'A confident assertion with nothing attached to it. The grade is NONE, which is not a claim that cold does nothing — absence of evidence is not evidence of absence — but a statement that this submission carries no weight on its own. The sharper point is in your own record: you already ran this experiment, and it came back inconclusive because the effect, if there is one, is smaller than your sensor’s daily swing.',
    },
    offer: {
      kind: 'file',
      why: 'Nothing new to test. Your closed n-of-1 is already the strongest evidence about you, and a repeat needs a better design before it is worth days.',
    },
    hypothesis: {
      statement: 'Three minutes of cold on waking raises my resting HRV by ≥ 5 ms.',
      goal: 'Recovery & autonomic',
      rationale:
        'Brought in from a podcast with nothing cited. Filed as EVIDENCE: NONE. You have tested this once already and the window returned inconclusive.',
      evidence_strength: 'none',
      proposed_intervention: '3 min cold shower (~15 °C) on waking',
      expected_effect: 'Unknown — the claim states no magnitude',
      confidence: 0.15,
      origin: 'user_intake · ei-cold',
    },
  },

  // ---------------------------------------------------------------------
  // 3 · A REAL TRIAL THAT STILL LANDS LOW — the ceiling-is-not-a-floor case.
  // ---------------------------------------------------------------------
  {
    id: 'ei-nmn',
    pickLabel: 'A preprint from a newsletter',
    pickClaim: 'NMN 500 mg/day slowed pace-of-ageing on DunedinPACE in 8 weeks',
    pickTag: 'preprint · study',
    keywords: ['nmn', 'nad', 'nicotinamide', 'clock', 'ageing', 'aging', 'dunedin', 'epigenetic'],
    intake: {
      source_type: 'preprint',
      evidence_types: ['study'],
      claim_verbatim:
        '"Participants receiving 500 mg/day NMN showed a mean reduction in DunedinPACE of 0.03 yrs/yr versus baseline over 8 weeks (p = 0.04)."',
      claim_user_framing:
        'This was the lead item in a longevity newsletter. I already track DunedinPACE, so it would be easy for me to test.',
      artifact: 'Preprint PDF, 22 pp · fetched with your approval and stored on this machine',
      goal_ref: 'Healthspan — pace of ageing',
    },
    provenance: {
      attributed_to: 'Author list of 6 (2 affiliated with the sponsor)',
      venue: 'bioRxiv preprint, not peer reviewed',
      stated_at: '2025-06',
      captured_at: 'just now',
      locator: 'biorxiv/2025.06.fabricated',
      capture_method: 'Pasted URL',
      retrieved: 'yes — fetch approved and logged',
    },
    egress: {
      kind: 'fetched',
      text:
        'One request to bioRxiv, disclosed before it went and written to the ledger. The PDF now lives on this machine, so re-reading this appraisal never re-fetches and never re-discloses.',
    },
    stages: [
      stage('extract', 'Extract & normalize', 'local · medical extractor', [
        { k: 'intervention', v: 'NMN 500 mg/day, oral' },
        { k: 'population', v: 'Healthy adults 40–65, n=18, single site' },
        { k: 'outcome', v: 'DunedinPACE (pace-of-ageing clock)' },
        { k: 'direction', v: 'down' },
        { k: 'magnitude', v: '−0.03 yrs/yr, p = 0.04' },
        { k: 'timeframe', v: '8 weeks' },
      ], 'Confidence interval not reported — only a p-value. That is recorded as an absence, and it matters: a p-value alone says the result cleared a threshold, not how big or how uncertain the effect is.'),
      stage('background', 'Background check', 'local · healthspan model + bundled corpus', [
        { k: 'prior position', v: 'No cited edge for NMN in the shipped model — the node exists, the evidence does not' },
        { k: 'guideline', v: 'Not addressed in any bundled guideline' },
        { k: 'prior intake', v: 'None' },
      ], 'An empty node is the situation where a single small trial counts for the most. It is still a single small trial.'),
      stage('quality', 'Study quality & power', 'local', [
        { k: 'design', v: 'Randomised, but open-label — participants and assessors knew the arm' },
        { k: 'n', v: '18 (9 per arm)' },
        { k: 'effect size', v: '−0.03 yrs/yr; no confidence interval reported' },
        { k: 'endpoint', v: 'Surrogate — an epigenetic clock, itself a proxy for the thing you care about' },
        { k: 'replication', v: 'None. First report, not peer reviewed' },
        { k: 'funding', v: 'Funded by an NMN manufacturer; two authors hold equity' },
        { k: 'power', v: 'n=9 per arm cannot resolve an effect this small against known between-person clock variance' },
      ], 'The ceiling for a single randomised trial is MODERATE. Four things route it down a rung: n=18, open-label, a surrogate endpoint, and sponsor funding with author equity. A trial does not earn MODERATE for being a trial.'),
      stage('relevance', 'Relevance to your record', 'local · your store, nothing sent', [
        { k: 'your DunedinPACE', v: '0.94 yrs/yr, from 1.04 across three timepoints' },
        { k: 'marker noise', v: 'Technical CV 2.1% — roughly ±0.02 yrs/yr on a single test' },
        { k: 'claimed effect', v: '0.03 yrs/yr — barely above your own assay’s test–retest band' },
        { k: 'testable', v: 'Not usefully. You would be reading a 0.03 shift through a ±0.02 measurement' },
      ], 'This is the decisive one, and it is about measurement rather than about NMN. Even if the effect is exactly as claimed, your instrument cannot see it in one comparison.'),
    ],
    verdict: {
      strength: 'low',
      ceilingNote: 'Single RCT ceiling is MODERATE; routed down to LOW by n=18, open-label design, surrogate endpoint, and sponsor funding.',
      applicability: { level: 'partial', note: 'Age band matches and you already track the marker. The mismatch is not the population — it is that your assay’s noise is nearly as large as the claimed effect.' },
      confidence: 0.25,
      unknowns: ['No confidence interval', 'No adherence data', 'No peer review'],
      whatWouldChangeIt:
        'A pre-registered, blinded replication with n in the hundreds, reporting an interval rather than a p-value, and ideally an outcome that is not itself a proxy.',
      narrative:
        'A genuine randomised trial that still cannot bear much weight. Small, open-label, sponsor-funded, on a surrogate of a surrogate, with a p-value in place of an interval. Set against your record it fails on a simpler ground: the claimed 0.03 yrs/yr sits inside the ±0.02 test–retest band of the clock you would use to detect it. Running this would produce a number, and the number would not mean anything.',
    },
    offer: {
      kind: 'watch',
      why: 'Worth holding, not worth days. It resurfaces if a replication lands or if you add a clock with a tighter reproducibility band.',
    },
    hypothesis: {
      statement: 'NMN 500 mg/day lowers my DunedinPACE by ≥ 0.03 yrs/yr.',
      goal: 'Healthspan — pace of ageing',
      rationale:
        'One small open-label sponsor-funded trial, graded LOW. Held on the watch list rather than tested: the claimed effect is inside the measurement band of the marker that would have to detect it.',
      evidence_strength: 'low',
      proposed_intervention: 'NMN 500 mg/day, oral',
      expected_effect: '−0.03 yrs/yr claimed; unresolvable with your current assay',
      confidence: 0.25,
      origin: 'user_intake · ei-nmn',
    },
  },

  // ---------------------------------------------------------------------
  // 4 · THE USER'S OWN OBSERVATION — NONE as external evidence, and yet the
  // best reason to run an experiment, because the data is his.
  // ---------------------------------------------------------------------
  {
    id: 'ei-self',
    pickLabel: 'Something you noticed',
    pickClaim: 'I fall asleep badly on the nights I train hard after 7pm',
    pickTag: 'self-observation',
    keywords: ['sleep', 'train', 'late', 'evening', 'lift', 'latency', 'myself', 'noticed'],
    intake: {
      source_type: 'self_observation',
      evidence_types: ['self_observation'],
      claim_verbatim:
        '"On the nights I do the hard session after work — anything past 7 — I lie there. Easy runs in the morning, no problem."',
      claim_user_framing: 'Been noticing it since the aerobic block started. Is it real or am I making it up?',
      artifact: 'Voice note, 18 s · transcribed on-device',
      goal_ref: 'Sleep',
    },
    provenance: {
      attributed_to: 'You',
      venue: '—',
      stated_at: 'just now',
      captured_at: 'just now',
      locator: '—',
      capture_method: 'Voice note, transcribed locally',
      retrieved: 'n/a — the observation is the artifact',
    },
    egress: {
      kind: 'none',
      text: 'A voice note transcribed on this machine and checked against your own store. No fetch, no model call off the device.',
    },
    stages: [
      stage('extract', 'Extract & normalize', 'local · medical extractor', [
        { k: 'intervention', v: 'Hard training session finishing after 19:00' },
        { k: 'population', v: 'You, n=1' },
        { k: 'outcome', v: 'Sleep-onset latency' },
        { k: 'direction', v: 'up on late-session nights' },
        { k: 'magnitude', v: 'Not stated — "I lie there"' },
        { k: 'timeframe', v: 'Same night' },
      ], 'The claim is vague on magnitude, which is normal for something noticed rather than measured. Unlike the podcast claim, this one can be checked immediately, because both variables are already in the store.'),
      stage('background', 'Background check', 'local · healthspan model + your own record', [
        { k: 'prior position', v: 'Held — CAUTIONS edge, late high-intensity training → sleep architecture, cited, MODERATE' },
        { k: 'mechanism', v: 'Core temperature and sympathetic arousal take hours to come down after hard efforts' },
        { k: 'your record', v: '34 sessions since the aerobic block started finished after 19:00' },
      ], 'The outside evidence for this is better than the outside evidence for most things people bring in — which is not what promotes it. What promotes it is the next stage.'),
      stage('quality', 'Study quality & power', 'local', [
        { k: 'design', v: 'Uncontrolled personal observation — recalled, not logged at the time' },
        { k: 'n', v: '1 person, unknown number of nights recalled' },
        { k: 'known trap', v: 'You remember the bad nights. That is what memory is for, and it is why recall is not data' },
        { k: 'as external evidence', v: 'NONE — one person’s recollection establishes nothing about anyone' },
      ], 'Graded on the external ladder, this is the weakest thing on the page. The interesting part is that it is not only external evidence.'),
      stage('relevance', 'Relevance to your record', 'local · your store, nothing sent', [
        { k: 'late-session nights', v: 'Mean sleep-onset latency 21 min across 34 nights' },
        { k: 'all other nights', v: 'Mean 13 min' },
        { k: 'label', v: 'INFERRED from your own data — a correlation, not a cause' },
        { k: 'confounded by', v: 'Late sessions cluster on work days and on the days you eat later' },
        { k: 'testable', v: 'Yes — the marker is nightly, low-cost, and the intervention is reversible' },
      ], 'Your record agrees with you: an 8-minute gap, larger than the night-to-night swing. That makes it worth testing, and it does not make it true — three things move together here and observation alone cannot separate them.'),
    ],
    verdict: {
      strength: 'none',
      strengthNote: 'as external evidence',
      ceilingNote:
        'A personal observation carries no external weight, whoever the person is. But it is the one submission type that can be checked against your own store on the spot — and that check came back corroborating, labelled INFERRED.',
      applicability: { level: 'close', note: 'It is about you, measured on you, with the marker already flowing nightly.' },
      confidence: 0.6,
      unknowns: ['Recall, not logged at the time', 'Meal timing moves with session timing'],
      whatWouldChangeIt:
        'Nothing external. What settles this is an experiment on you — which is exactly what the weak-evidence, high-relevance corner of the record is for.',
      narrative:
        'EVIDENCE: NONE as a claim about people, and simultaneously the most actionable item on this page. Your own nights say 21 minutes against 13, which is bigger than the noise, and the intervention is free and reversible. The confound is real — late sessions travel with late meals and work days — and that is a reason to design the window properly, not a reason to drop it.',
    },
    offer: {
      kind: 'hypothesis',
      why: 'Corroborated in your own record, nightly marker, reversible intervention. This is the cheapest real experiment available to you.',
    },
    hypothesis: {
      statement: 'Finishing hard sessions before 19:00 shortens my sleep-onset latency by ≥ 6 min.',
      goal: 'Sleep',
      rationale:
        'You noticed it; your own record agrees — 21 min mean latency on 34 late-session nights against 13 min otherwise. The healthspan model holds a cited CAUTIONS edge for late high-intensity training. External evidence for the personal claim is NONE; the case for testing it is your own data.',
      evidence_strength: 'none',
      proposed_intervention: 'Move hard sessions to before 19:00; keep easy sessions where they are',
      expected_effect: '−8 min sleep-onset latency, confounded by meal timing',
      confidence: 0.6,
      origin: 'user_intake · ei-self',
    },
  },
]

// Anything typed that matches nothing scripted lands here. It is not a dead end:
// the pipeline runs, the unknowns are printed, and the verdict is NONE with a
// stated route out — which is the honest response to a claim with no source
// attached, and the same one a famous person's unsourced claim gets.
export const FALLBACK = {
  id: 'ei-unsourced',
  intake: {
    source_type: 'bare_claim',
    evidence_types: ['bare_claim'],
    claim_user_framing: 'Typed in directly.',
    artifact: 'Text as typed',
    goal_ref: 'Not attached to a goal yet',
  },
  provenance: {
    attributed_to: 'Not stated',
    venue: 'Not stated',
    stated_at: 'unknown',
    captured_at: 'just now',
    locator: '—',
    capture_method: 'Typed',
    retrieved: 'no — no source was given to retrieve',
  },
  egress: { kind: 'none', text: 'Nothing was fetched. The text was appraised on this machine.' },
  stages: [
    stage('extract', 'Extract & normalize', 'local · medical extractor', [
      { k: 'intervention', v: 'parsed from your text' },
      { k: 'population', v: 'unknown' },
      { k: 'outcome', v: 'unknown or unquantified' },
      { k: 'magnitude', v: 'unknown' },
      { k: 'cited support', v: 'None given' },
    ], 'Most of the fields an appraisal needs are missing. They are printed as unknown rather than guessed — a filled-in default here is how a confident wrong answer gets built.'),
    stage('background', 'Background check', 'local · healthspan model + bundled corpus', [
      { k: 'prior position', v: 'No matching cited edge found for the claim as written' },
      { k: 'prior intake', v: 'None' },
    ], 'A near-miss against the graph is not treated as a match. If the claim is about something the model does hold, sharpening the wording will find it.'),
    stage('quality', 'Study quality & power', 'local', [
      { k: 'design', v: 'unknown — nothing cited' },
      { k: 'n', v: 'unknown' },
      { k: 'effect size', v: 'unknown' },
      { k: 'conflicts', v: 'unknown' },
    ], 'There is nothing to appraise yet. That is a finding about the submission, not a verdict on the idea.'),
    stage('relevance', 'Relevance to your record', 'local · your store, nothing sent', [
      { k: 'marker', v: 'No outcome marker identified, so nothing to match against your store' },
      { k: 'testable', v: 'Not as written — no direction, no magnitude, no window' },
    ], 'Relevance cannot be scored against a claim with no outcome in it.'),
  ],
  verdict: {
    strength: 'none',
    ceilingNote: 'Ceiling for a claim with nothing attached is NONE — the same grade a famous person’s unsourced claim gets.',
    applicability: { level: 'unknown', note: 'No population or marker to match.' },
    confidence: 0.1,
    unknowns: ['No source', 'No effect size', 'No outcome marker'],
    whatWouldChangeIt:
      'Add the source — a link, a DOI, a screenshot, or who said it and where. If there is a study behind this, it gets appraised on its own terms and this item is re-graded in place rather than replaced.',
    narrative:
      'Filed as NONE, and kept. This is not a judgement that the claim is false; it is a statement that nothing came in with it. Bringing the source back re-runs the appraisal against this same item, so the history stays in one place.',
  },
  offer: {
    kind: 'file',
    why: 'Nothing to test until there is something to appraise.',
  },
  hypothesis: {
    statement: 'Claim as typed, awaiting a source.',
    goal: 'Not attached to a goal yet',
    rationale: 'Brought in without a source. Filed as EVIDENCE: NONE.',
    evidence_strength: 'none',
    proposed_intervention: 'Not specified',
    expected_effect: 'Unknown',
    confidence: 0.1,
    origin: 'user_intake · ei-unsourced',
  },
}

// Free text → one of the scripted appraisals. Deterministic keyword scoring: no
// randomness, no clock, and the fallback is a real appraisal rather than an
// apology.
export function appraiseText(text) {
  const t = (text || '').toLowerCase()
  let best = null, bestScore = 0
  for (const s of SUBMISSIONS) {
    const score = s.keywords.reduce((a, k) => a + (t.includes(k) ? 1 : 0), 0)
    if (score > bestScore) { best = s; bestScore = score }
  }
  if (best) return { ...best, matchedOn: best.keywords.filter(k => t.includes(k)) }
  return {
    ...FALLBACK,
    intake: { ...FALLBACK.intake, claim_verbatim: `"${(text || '').trim()}"` },
    hypothesis: { ...FALLBACK.hypothesis, statement: (text || '').trim() || 'Claim as typed, awaiting a source.' },
  }
}

export const OFFER = {
  hypothesis: { label: 'Offered as a hypothesis', tone: 'yes' },
  watch: { label: 'Held on the watch list', tone: 'watch' },
  file: { label: 'Filed with its grade', tone: 'file' },
}

export const APPLICABILITY = {
  close: 'close',
  partial: 'partial',
  distant: 'distant',
  unknown: 'unknown',
}

export const byId = Object.fromEntries(SUBMISSIONS.map(s => [s.id, s]))
