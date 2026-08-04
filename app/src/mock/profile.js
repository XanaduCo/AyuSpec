// The psychographic layer — what ayuOS has learned about *who the person is*, not
// just what their labs say. Worries, communication style, health literacy,
// decision preferences, trust posture.
//
// The reframe that makes this ayuOS and not a chatbot test harness: these are not
// hidden ground-truth fields an evaluator plants for a model to elicit. They are
// a **captured data class** like any other — inferred, graded for confidence, and
// (this is the load-bearing part) *shown with their provenance*. Every attribute
// records HOW it was captured, HOW sure we are, WHAT evidence backs it, and WHAT
// the agent uses it for. That mirrors the pattern already established in
// preferences.js (`elicited`) and the literacy profile (docs/epistemics.md): the
// transparency is the product, not a nicety.
//
// Two contrasting people share the schema:
//   ravi  — 45, self-hosted power user, eyes-open cloud, quantitative, experimenter
//   maya  — 39, sovereign purist, Hashimoto's, low tolerance for busywork
//
// Ravi's attributes cite his real records and queries (agent.js, persona.js,
// preferences.js, concepts.js) so the provenance is checkable, not decorative.

// --- capture vocabulary -----------------------------------------------------
// The methods by which a soft signal enters the store. Deliberately aligned with
// the capture mechanisms in docs/data-capture.md — passive-before-manual is the
// governing principle, so each method is tagged `passive` or not, and the UI can
// show at a glance how much of a profile was earned without asking.
export const CAPTURE_METHODS = {
  stated: {
    label: 'Stated in chat', passive: false,
    note: 'The person said it, in their own words. Highest fidelity, lowest coverage.',
  },
  'inferred:query': {
    label: 'Inferred from query pattern', passive: true,
    note: 'Read from what they repeatedly ask and how they ask it — never from a survey.',
  },
  'affect:wearable': {
    label: 'Affect from wearables', passive: true,
    note: 'Query timing/sentiment correlated with HRV, sleep and strain to read state.',
  },
  behavior: {
    label: 'Observed behaviour', passive: true,
    note: 'What they do in the app — what they open, abandon, re-run, act on.',
  },
  ema: {
    label: 'EMA micro-prompt', passive: false,
    note: 'A single in-context, one-tap check at a smart moment. Under ten seconds.',
  },
  posture: {
    label: 'Chosen posture / settings', passive: false,
    note: 'Their egress and model choices are themselves a trust signal.',
  },
  onboarding: {
    label: 'First-run conversation', passive: false,
    note: 'A few questions in context on first use — not an onboarding survey.',
  },
}

// Confidence tiers. A captured psychographic attribute is a noisy inference and is
// graded exactly like any other noisy input (data-capture principle 5:
// confidence-graded interpretation). We never render one of these as a fact.
export const CONFIDENCE = {
  hypothesis:   { rank: 1, label: 'Hypothesis',   note: 'One weak signal. Held, not used to shape anything yet.' },
  observed:     { rank: 2, label: 'Observed',     note: 'Seen once, clearly. Used softly; easy to revise.' },
  corroborated: { rank: 3, label: 'Corroborated', note: 'Multiple independent signals agree.' },
  confirmed:    { rank: 4, label: 'Confirmed',    note: 'The person stated it, or acted on it repeatedly.' },
}

// The five dimensions the profile is organised into. `concern` is the ayuOS
// reframe of the CardioNAVIX "doorknob / underlying fear"; `disposition` folds in
// affect, verbosity and interaction stance; the last three map onto surfaces that
// already exist (literacy profile, preference model, egress posture).
export const DIMENSIONS = [
  { key: 'concern',     label: 'On their mind',      blurb: 'What they are worried about — including what the data implies but they have not said.' },
  { key: 'disposition', label: 'How they show up',   blurb: 'Communication style, affect, appetite for effort and ambiguity.' },
  { key: 'literacy',    label: 'Health literacy',    blurb: 'What we can stop explaining, and what still lands as jargon.' },
  { key: 'decision',    label: 'How they decide',    blurb: 'What they weight when choosing — feeds "simplify this for me".' },
  { key: 'trust',       label: 'Trust posture',      blurb: 'What they will let leave the machine, and how much they audit.' },
]

// A single evidence pointer. `kind` lets the UI resolve it: a query string, a
// record id (fhir.js can open it), a concept id, a setting, or a bare behaviour.
const q = (text) => ({ kind: 'query', ref: text })
const rec = (id) => ({ kind: 'record', ref: id })
const concept = (id) => ({ kind: 'concept', ref: id })
const setting = (text) => ({ kind: 'setting', ref: text })
const act = (text) => ({ kind: 'behaviour', ref: text })

// Shorthand for one attribute. Keeping the call sites terse keeps the two
// profiles readable side by side, which is the point of the contrast.
const S = (dimension, label, o) => ({ dimension, label, ...o })

// ---------------------------------------------------------------------------
// RAVI — 45, self-hosted power user. Quantitative, an experimenter, eyes-open
// about the cloud. His profile is dense because his query history is dense.
// ---------------------------------------------------------------------------
const raviSignals = [
  // -- concerns (what's on his mind) ----------------------------------------
  S('concern', 'Early heart disease, before it shows', {
    detail:
      'The through-line under most of what he asks. His father had a heart attack pathway at 62 ' +
      '(coronary artery disease); Ravi treats his own cardiac numbers as the ones that must not drift. ' +
      'He does not phrase it as fear — he phrases it as wanting the earliest possible warning.',
    capturedVia: 'inferred:query', confidence: 'corroborated', firstObserved: '2025-05-09',
    evidence: [q('Should I be worried about my CAC score?'), q('Why is my HRV trending down?'), rec('fh-father-cad'), rec('img-cac')],
    usedFor: 'Cardiac signals are weighted up in 90-day change detection, and a clean CAC is kept visible so reassurance is grounded, not asserted.',
  }),
  S('concern', 'Heavy-metal load from all the fish', {
    detail:
      'He eats a lot of seafood and knows it. When a metals panel moved he asked directly. A real, ' +
      'specific, checkable worry rather than free-floating anxiety.',
    capturedVia: 'stated', confidence: 'confirmed', firstObserved: '2025-07-30',
    evidence: [q('Should I be worried about my heavy metals result?'), rec('high-mercury-meals')],
    usedFor: 'Nutrition (seafood cadence) is joined to the metals trend automatically when he raises either.',
  }),
  S('concern', 'Whether the anti-ageing effort is real or self-flattery', {
    detail:
      'He runs the clocks and the labs and notices when they disagree. The worry underneath is ' +
      'epistemic — that he is measuring himself into a comforting story.',
    capturedVia: 'inferred:query', confidence: 'observed', firstObserved: '2025-06-11',
    evidence: [q('My ageing clocks disagree with my labs — which do I trust?'), rec('clock-2025-06-11')],
    usedFor: 'Disagreement between sources is surfaced rather than reconciled away; evidence labels stay on.',
  }),
  // The buried one — the ayuOS analogue of a CardioNAVIX "buried red flag". He has
  // NOT said it. The data says it, and the agent holds it as a hypothesis to raise
  // gently, not a fact to assert.
  S('concern', 'That the training block is costing him the recovery he is chasing', {
    detail:
      'Unvoiced. He frames rising training load as pure progress. But HRV and REM both bend down as the ' +
      'block ramps, and his "why is my HRV down" queries cluster on mornings after the biggest sessions. ' +
      'He has not connected these himself. Held as a hypothesis to raise, not a conclusion to deliver.',
    capturedVia: 'affect:wearable', confidence: 'hypothesis', firstObserved: '2025-07-06', unvoiced: true,
    evidence: [rec('obs-hrv'), rec('obs-rem'), rec('obs-strain'), q('Why is my HRV trending down?')],
    usedFor: 'Queued as a decision-point nudge, phrased as a question, only when he next asks about HRV or recovery — never pushed.',
  }),

  // -- disposition (how he shows up) ----------------------------------------
  S('disposition', 'Wants the number and the method behind it', {
    detail:
      'He does not accept a score without its derivation — his questions ask which source to trust and ' +
      'why, not just what the answer is. High numeracy; comfortable with intervals and effect sizes.',
    capturedVia: 'inferred:query', confidence: 'corroborated', firstObserved: '2025-05-09',
    evidence: [q('My ageing clocks disagree with my labs — which do I trust?'), q('Did my Garmin training block actually improve anything?')],
    usedFor: 'Answers lead with the figure and keep the working attached; the response voice stays quantitative.',
  }),
  S('disposition', 'Runs his own experiments — high agency', {
    detail:
      'An active n-of-1 (post-meal walks vs. glucose/HRV), currently week 4. "You could test this yourself" ' +
      'reads to him as an invitation, not a chore.',
    capturedVia: 'behavior', confidence: 'confirmed', firstObserved: '2025-07-06',
    evidence: [rec('exp-postmeal-walks'), act('started an n-of-1 unprompted')],
    usedFor: 'The agent offers testable framings and n-of-1 scaffolding rather than just recommendations.',
  }),
  S('disposition', 'Skeptical of black-box scores', {
    detail:
      'Distrusts closed vendor AI scores; prefers raw metrics he can recompute. This is why he self-hosts ' +
      'and why he reads the call ledger.',
    capturedVia: 'behavior', confidence: 'corroborated', firstObserved: '2025-05-06',
    evidence: [act('opened the call ledger'), setting('recompute-own-scores')],
    usedFor: 'Derived scores are shown with their inputs; nothing is presented as an oracle.',
  }),
  S('disposition', 'Even-keeled, but ambiguous results spike him', {
    detail:
      'Mostly measured. But his querying clusters on poor-sleep, low-HRV mornings — the state, not the ' +
      'result, is often what sends him to ask. A soft signal, held lightly.',
    capturedVia: 'affect:wearable', confidence: 'observed', firstObserved: '2025-06-14',
    evidence: [rec('obs-hrv'), rec('obs-sleep'), act('query timestamps track low-HRV mornings')],
    usedFor: 'On a flagged-low morning the agent leads with the reassuring context first, then the detail.',
  }),

  // -- literacy -------------------------------------------------------------
  S('literacy', 'Fluent in the evidence frame — stop explaining the basics', {
    detail:
      'Has engaged the core epistemics concepts and uses the labels correctly. The literacy profile has ' +
      'retired proactive injection for these; the tappable definitions stay available.',
    capturedVia: 'behavior', confidence: 'confirmed', firstObserved: '2025-05-20',
    evidence: [concept('hierarchy-of-evidence'), concept('effect-vs-certainty'), concept('n-of-1'), concept('confounding')],
    usedFor: 'Responses use evidence labels without re-teaching them; injection is off for engaged concepts.',
  }),

  // -- decision (feeds preferences.js) --------------------------------------
  S('decision', 'Weights settled evidence and long-term safety above all', {
    detail:
      'When he asks to simplify a choice, certainty and long-term risk dominate the ranking — his own ' +
      'stated weighting, editable, always shown as the reason for the order.',
    capturedVia: 'stated', confidence: 'confirmed', firstObserved: '2025-05-22',
    evidence: [setting('preference: certainty 0.90'), setting('preference: risk 0.85'), rec('fh-father-cad')],
    usedFor: 'Drives rankFrame() in the comparison view; the two heaviest preferences are named as the drivers.',
  }),
  S('decision', 'Effort barely counts against an option', {
    detail:
      'Already habit-dense and prefers behaviours to pills, so "daily habit" scarcely lowers an option for ' +
      'him — the near-inverse of Maya.',
    capturedVia: 'stated', confidence: 'confirmed', firstObserved: '2025-05-22',
    evidence: [setting('preference: effort 0.25'), rec('exp-postmeal-walks')],
    usedFor: 'High-adherence interventions are not discounted for him the way they would be for a busywork-averse user.',
  }),

  // -- trust ----------------------------------------------------------------
  S('trust', 'Eyes-open: own the store, audit the cloud', {
    detail:
      'The store of record must be his — self-hosted, FileVault, local by default. He will use a cloud ' +
      'reasoner, but only disclosed and logged, and he reads the ledger to confirm what left.',
    capturedVia: 'posture', confidence: 'confirmed', firstObserved: '2025-05-05',
    evidence: [setting('deployment: self-hosted'), setting('reasoner: cloud opt-in, disclosed'), act('reviews the call ledger')],
    usedFor: 'Cloud calls are pre-disclosed with payload; the PII gateway strips unconditionally; nothing is silent.',
  }),
]

// ---------------------------------------------------------------------------
// MAYA — 39, she/her. Sovereign purist, Hashimoto's on levothyroxine. The
// deliberate contrast to Ravi: warmer, less quantitative, allergic to busywork,
// maximally private. Her profile is thinner because she gives the system less —
// and the roadmap below is largely about earning the rest without taxing her.
// ---------------------------------------------------------------------------
const mayaSignals = [
  // -- concerns -------------------------------------------------------------
  S('concern', 'Keeping the Hashimoto’s from stealing her energy', {
    detail:
      'Her live question is functional, not numeric: energy and mood through the day. She is running an ' +
      'n-of-1 on a supplement change against exactly that.',
    capturedVia: 'stated', confidence: 'confirmed', firstObserved: '2025-06-30',
    evidence: [rec('cond-hashimotos'), rec('exp-energy-supplement'), act('set the experiment outcome to energy/mood')],
    usedFor: 'The EMA prompt that advances her experiment asks about energy, in her framing, not a lab surrogate.',
  }),
  S('concern', 'Whether anything new interacts with her levothyroxine', {
    detail:
      'Levo is the baseline every new intake is checked against. She does not always raise it — but the ' +
      'system treats each supplement log as an interaction question because for her it always is.',
    capturedVia: 'behavior', confidence: 'corroborated', firstObserved: '2025-07-01',
    evidence: [rec('med-levothyroxine'), act('every intake checked against the med list')],
    usedFor: 'Interventions are the highest-liability class: the interaction check runs and is surfaced before a log is accepted.',
  }),
  S('concern', 'That her body’s data should never live on someone else’s server', {
    detail:
      'Not anxiety — a principle, held firmly enough to shape every setting. It is the reason she chose ' +
      'ayuOS over Function or Superpower.',
    capturedVia: 'posture', confidence: 'confirmed', firstObserved: '2025-06-28',
    evidence: [setting('all three model roles: local'), setting('on-device STT'), setting('egress: declined')],
    usedFor: 'Cloud escalation is never offered unprompted; the header stays three-greens and the app respects it silently.',
  }),
  // Maya's buried one — she will not say she is afraid of relapsing into tracker
  // burnout, but she abandons anything with friction, fast. The agent infers the
  // pattern and adapts capture to it rather than confronting her with it.
  S('concern', 'That this becomes another app she abandons', {
    detail:
      'Unvoiced. She has quit every food diary and mood tracker she ever started, and chose ayuOS partly on ' +
      'the promise it treats adherence as the product’s problem, not her discipline. The tell is behavioural: ' +
      'any flow over a few taps and she drops it.',
    capturedVia: 'behavior', confidence: 'observed', firstObserved: '2025-07-02', unvoiced: true,
    evidence: [act('abandoned two multi-step logging flows'), act('completes only sub-10s captures')],
    usedFor: 'Capture is kept passive-first and every manual log under ten seconds; a stalled flow is dropped, not nagged.',
  }),

  // -- disposition ----------------------------------------------------------
  S('disposition', 'Will not babysit a tracker', {
    detail:
      'The strongest single fact about how to serve her. Manual capture must pay her back in the same tap or ' +
      'it will not happen. Photo, voice, one-tap — never a form.',
    capturedVia: 'behavior', confidence: 'confirmed', firstObserved: '2025-07-02',
    evidence: [act('completes photo/voice/one-tap captures'), act('abandons forms')],
    usedFor: 'The capture micro-UX defaults to passive detection and surfaces manual logging only for what it cannot infer.',
  }),
  S('disposition', 'Wants meaning, not just a metric', {
    detail:
      'Where Ravi wants the derivation, Maya wants the "so what". Warmer register; a number without a plain ' +
      'reading of what it means for her day does not land.',
    capturedVia: 'inferred:query', confidence: 'observed', firstObserved: '2025-06-30',
    evidence: [act('asks what results mean for how she feels, not for their derivation')],
    usedFor: 'Answers to her lead with the plain-language meaning and keep the numbers in support, not in front.',
  }),
  S('disposition', 'Vendor-skeptical and private by default', {
    detail:
      'Assumes a company will monetise anything it holds. This is disposition as much as posture — it colours ' +
      'how she reads every suggestion the system makes.',
    capturedVia: 'posture', confidence: 'corroborated', firstObserved: '2025-06-28',
    evidence: [setting('declined all bridged connectors'), act('chose the zero-transit path at every fork')],
    usedFor: 'Suggestions that would add egress are framed with the trade named up front, never defaulted on.',
  }),

  // -- literacy -------------------------------------------------------------
  S('literacy', 'Engaged and well-read, but carries a few confident wrong priors', {
    detail:
      'Moderate-to-high literacy — she reads a lot, which is why she knows the vocabulary AND holds some ' +
      'firm misconceptions (a natural-is-safer lean). Injection is still on for the concepts that would ' +
      'correct those, delivered as a light touch, not a correction.',
    capturedVia: 'inferred:query', confidence: 'observed', firstObserved: '2025-07-01',
    evidence: [concept('measurement-quality'), concept('placebo-effect'), act('states natural-is-safer priors')],
    usedFor: 'Decision-point injection stays on for the concepts that touch her priors; nothing is retired prematurely.',
  }),

  // -- decision -------------------------------------------------------------
  S('decision', 'One or two steps, natural-leaning, but evidence-checked', {
    detail:
      'Easily overwhelmed by more than a couple of actions at once, and pulled toward the gentler option — ' +
      'but she will accept an evidence check if it is not delivered as a scolding. Effort tolerance is LOW: ' +
      'the exact inverse of Ravi, which is what makes the two useful to hold side by side.',
    capturedVia: 'inferred:query', confidence: 'observed', firstObserved: '2025-07-01',
    evidence: [act('drops multi-step plans'), act('prefers the lower-effort option at forks')],
    usedFor: 'For her, effort weighs heavily in the ranking and plans are capped to one or two steps at a time.',
  }),

  // -- trust ----------------------------------------------------------------
  S('trust', 'Maximal: nothing leaves, and she has checked', {
    detail:
      'All three model roles local, voice transcription on-device, every egress declined. The most ' +
      'conservative posture the product supports, chosen deliberately and verified.',
    capturedVia: 'posture', confidence: 'confirmed', firstObserved: '2025-06-28',
    evidence: [setting('reasoner/tools/medical: all local'), setting('STT: on-device'), act('verified nothing egressed after first run')],
    usedFor: 'There is no cloud codepath to disclose for her; transparency here is proving the absence, on her hardware.',
  }),
]

// --- the expansion roadmap --------------------------------------------------
// "Illustrate how we would weave more data capture in." For each soft signal:
// what we have today and by what method, what the next increment is, and — because
// this data is sensitive — the consent condition on collecting it. The framework
// is shared; the per-person `note` says how it lands for someone like this.
const roadmap = (rows) => rows

const raviRoadmap = roadmap([
  { signal: 'Concerns', have: 'Inferred from his query pattern and stated directly when specific (metals).',
    haveMethod: 'inferred:query', next: 'A monthly one-tap EMA — "anything weighing on you health-wise this month?" — plus an affect-triggered version on a run of low-HRV mornings.',
    nextMethod: 'ema', consent: 'Opt-in; the affect trigger is disclosed as "we noticed a low-recovery stretch" so the inference is never hidden.',
    note: 'He will answer a well-timed one-tap; he would ignore a standing mood diary.' },
  { signal: 'Communication style', have: 'Inferred from how quantitative his questions are.',
    haveMethod: 'inferred:query', next: 'An explicit, editable "just the number / show the working" control, seeded from the inference and refined by which answers he expands.',
    nextMethod: 'onboarding', consent: 'User-visible and editable — a stored object, never a shadow profile.',
    note: 'He would set this deliberately and trust it because he can see it.' },
  { signal: 'Affect / state', have: 'Coarse: query timing correlated with HRV and sleep.',
    haveMethod: 'affect:wearable', next: 'Sentiment of the query text joined to the wearable stress read, to detect anxious stretches and soften the lead of a response.',
    nextMethod: 'affect:wearable', consent: 'On-device only; the correlation and its use are shown, and it can be turned off without losing any stored history.',
    note: 'Fits his eyes-open stance — he tolerates inference he can audit.' },
  { signal: 'Literacy', have: 'Tracked from which concepts he has engaged.',
    haveMethod: 'behavior', next: 'Optional prediction games (epistemics) that train judgment and feed the profile faster than passive engagement alone.',
    nextMethod: 'behavior', consent: 'Always optional, linked from concept cards — never pushed into the chat flow.',
    note: 'An experimenter will play a calibration game for its own sake.' },
])

const mayaRoadmap = roadmap([
  { signal: 'Concerns', have: 'Stated for the live experiment; the rest inferred from behaviour.',
    haveMethod: 'stated', next: 'A single voice line after a logged intake — "how’s your energy today?" — that also advances her experiment, so the ask pays her back in the same breath.',
    nextMethod: 'ema', consent: 'On-device STT; opt-in; skippable with one tap and never repeated in a session.',
    note: 'She will speak an answer she would never type into a form.' },
  { signal: 'Interaction safety', have: 'Every intake is checked against her med list automatically.',
    haveMethod: 'behavior', next: 'Surface the interaction check inline before a log is accepted, with its confidence, and route anything clinically significant to a clinician rather than storing it silently.',
    nextMethod: 'behavior', consent: 'No new consent needed to run the check; a red-flag routing is disclosed to her, not hidden.',
    note: 'For a Hashimoto’s patient on levo this is the highest-liability capture in her record.' },
  { signal: 'Communication style', have: 'Inferred from her "what does it mean" framing.',
    haveMethod: 'inferred:query', next: 'Let the literacy/disposition read set the *voice* of ordinary answers — warmer, meaning-first — not just the injection decisions.',
    nextMethod: 'inferred:query', consent: 'Visible and reversible; she can see why a response is phrased the way it is.',
    note: 'She will stay if it sounds like it understands her; she will leave if it reads like a spreadsheet.' },
  { signal: 'Adherence pattern', have: 'Observed: she completes sub-10s captures and abandons everything longer.',
    haveMethod: 'behavior', next: 'Treat the abandonment signal as a first-class input — shorten or drop any flow she stalls on automatically, and never re-prompt a dropped one.',
    nextMethod: 'behavior', consent: 'No collection beyond in-app behaviour; used to reduce asks, not increase them.',
    note: 'The whole point for her: adherence is the product’s problem, not her discipline.' },
])

// --- the two profiles -------------------------------------------------------
export const profiles = {
  ravi: {
    patient: 'ravi',
    summary:
      'A quantitative self-experimenter who wants the earliest possible warning on his heart and the method ' +
      'behind every number. Gives the system a lot to read; trusts what he can audit.',
    signals: raviSignals,
    captureRoadmap: raviRoadmap,
  },
  maya: {
    patient: 'maya',
    summary:
      'A private, principled Hashimoto’s patient who wants meaning over metrics and will not babysit a ' +
      'tracker. Gives the system little on purpose; the work is earning the rest without taxing her.',
    signals: mayaSignals,
    captureRoadmap: mayaRoadmap,
  },
}

// --- derived helpers (for the view) -----------------------------------------
export function profileFor(patientId) {
  return profiles[patientId] || profiles.ravi
}

// Group a profile's signals by dimension, in DIMENSIONS order, dropping empty ones.
export function signalsByDimension(patientId) {
  const p = profileFor(patientId)
  return DIMENSIONS
    .map(d => ({ ...d, signals: p.signals.filter(s => s.dimension === d.key) }))
    .filter(g => g.signals.length > 0)
}

// How much of this profile was earned passively vs. asked for — the headline the
// data-capture story turns on (passive-before-manual).
export function captureMix(patientId) {
  const p = profileFor(patientId)
  let passive = 0, active = 0
  for (const s of p.signals) {
    const m = CAPTURE_METHODS[s.capturedVia]
    if (m && m.passive) passive += 1; else active += 1
  }
  const total = passive + active
  return { passive, active, total, passivePct: total ? Math.round((passive / total) * 100) : 0 }
}

// The unvoiced signals — what the data implies that the person has not said. The
// most distinctive thing the profile surfaces, so the view can call it out.
export function unvoiced(patientId) {
  return profileFor(patientId).signals.filter(s => s.unvoiced)
}
