// A small slice of the epistemics concept library (docs/epistemics.md). Each is
// a first-class object the agent can cite inline and expand on tap — "labels are
// the curriculum" (Interaction law 3). Bodies are the ~1-minute write-up; the
// live claim is shown as the worked example when the card opens.

export const concepts = {
  'hierarchy-of-evidence': {
    id: 'hierarchy-of-evidence',
    title: 'Hierarchy of evidence',
    summary: 'Not all evidence is equal — a rung on a ladder from anecdote to meta-analysis.',
    body:
`Evidence sits on a ladder. From weakest to strongest: a single anecdote → a mechanistic "it should work because…" argument → observational studies (people who did X tended to do better) → a randomised controlled trial (RCT) → a meta-analysis pooling many trials.

Higher rungs rule out more ways of fooling yourself. Observational data can't separate the intervention from the kind of person who chooses it; only randomisation can. The dot ramp on each label is this ladder: ●●●● is meta-analysis-grade, ○○○○ is untested.

The point is not to dismiss the lower rungs — it's to know which rung you're standing on before you act.`,
    related: ['effect-vs-certainty', 'surrogate-endpoints', 'absence-of-evidence'],
    deepLink: 'GRADE working group — levels of evidence',
  },
  'effect-vs-certainty': {
    id: 'effect-vs-certainty',
    title: 'Effect size vs. certainty',
    summary: 'How big a change is, and how sure we are it is real, are two separate questions.',
    body:
`A change can be real but tiny, or huge but unproven. These are different axes and the comparison frame keeps them apart on purpose.

"Certainty" is how confident we are the effect exists at all (the evidence rung). "Effect" is how much it moves the thing you care about, assuming it's real. A high-certainty / small-effect lever (post-meal walks on glucose) and a low-certainty / maybe-large one (an unproven supplement) are not comparable on a single "good/bad" scale.

Collapsing them into one number is exactly the sleight of hand ayuOS refuses to do for you.`,
    related: ['hierarchy-of-evidence', 'surrogate-endpoints'],
    deepLink: 'Understanding effect sizes vs. statistical significance',
  },
  'confounding': {
    id: 'confounding',
    title: 'Confounding',
    summary: 'When several things change at once, no single one can be credited from observation alone.',
    body:
`If you started training harder, the weather warmed, and you travelled for work all in the same month, and your HRV moved — which one did it? From observation alone, you can't say. They are confounded.

This is the central reason "it worked for me" is hard to interpret: life rarely changes one variable at a time. The fix is to hold the other inputs roughly constant and vary just one — which is what an n-of-1 experiment is for.

Confounding isn't a flaw in your data; it's a property of the world. Naming it is the first defence.`,
    related: ['n-of-1', 'regression-to-the-mean', 'effect-vs-certainty'],
    deepLink: 'Confounding variables — a plain-English primer',
  },
  'regression-to-the-mean': {
    id: 'regression-to-the-mean',
    title: 'Regression to the mean',
    summary: 'You act when things are at their worst — so they were going to improve anyway.',
    body:
`Extreme measurements tend to be followed by more ordinary ones, purely by chance. You usually start an intervention when a number looks alarming — its worst point. It then drifts back toward your normal range on its own, and the intervention gets the credit.

This is not a rare edge case; it's the default trap in self-experimentation. It's why a pre-registered baseline window matters: you compare against your typical range, not against the bad day that prompted you to act.`,
    related: ['n-of-1', 'confounding'],
    deepLink: 'Regression to the mean in health self-tracking',
  },
  'placebo-effect': {
    id: 'placebo-effect',
    title: 'The placebo effect',
    summary: 'A real, measurable effect from expectation — which is exactly why it fools you.',
    body:
`The placebo effect is not "nothing." It's a genuine, quantified response to the belief that you're being treated — it can move subjective symptoms substantially. That's precisely the problem: feeling better after starting something is fully compatible with the something doing nothing.

For interventions with large placebo arms in trials, ayuOS states that as a real effect, not a dismissal. It just means "I feel better" can't, by itself, tell you the mechanism is working.`,
    related: ['regression-to-the-mean', 'n-of-1'],
    deepLink: 'How placebo-controlled trials isolate the drug effect',
  },
  'n-of-1': {
    id: 'n-of-1',
    title: 'What an n-of-1 can establish',
    summary: 'A single-person experiment — powerful for you, but only under real controls.',
    body:
`An n-of-1 is a trial with one subject: you. Done well — a defined baseline, one variable changed, pre-registered success criteria, ideally an on/off/on structure — it can tell you whether something works *for you*, which population trials can't.

Done casually it inherits every trap on this list: confounding, regression to the mean, placebo. The discipline is what separates a real personal finding from a story. That's why ayuOS makes you write down the success criterion before you start, and reports "inconclusive" honestly when the result overlaps your baseline noise.`,
    related: ['confounding', 'regression-to-the-mean', 'placebo-effect'],
    deepLink: 'Designing an n-of-1 trial',
  },
  'surrogate-endpoints': {
    id: 'surrogate-endpoints',
    title: 'Surrogate endpoints vs. outcomes that matter',
    summary: 'Moving a marker is not the same as changing what you actually care about.',
    body:
`A surrogate endpoint is a stand-in — a biomarker that's easy to measure and *assumed* to track the real outcome. "It raised NAD+ levels" is a surrogate; "it reduced heart attacks" is an outcome that matters.

Surrogates are seductive because they move fast and photograph well in a study. But history is full of interventions that improved a marker and harmed the outcome. When evidence rests only on surrogates, the honest label is that the endpoint you care about simply hasn't been tested — different from evidence that it fails.`,
    related: ['absence-of-evidence', 'effect-vs-certainty', 'hierarchy-of-evidence'],
    deepLink: 'Surrogate vs. clinical endpoints',
  },
  'absence-of-evidence': {
    id: 'absence-of-evidence',
    title: 'Absence of evidence ≠ evidence of absence',
    summary: 'Untested is not the same as disproven — and neither is the same as harmful.',
    body:
`Three states get collapsed into "no good evidence," and they mean very different things:

• Absence of evidence — it mostly hasn't been tested at the endpoint you care about. Unknown, not refuted.
• Evidence of absence — it was tested properly and didn't work.
• Evidence of harm — it was tested and caused damage.

An ○○○○ NONE label means the first: plausible but untested. ayuOS keeps these distinct on purpose, because treating "untested" as "debunked" is as much an error as the reverse.`,
    related: ['hierarchy-of-evidence', 'surrogate-endpoints'],
    deepLink: 'Absence of evidence is not evidence of absence',
  },
  'source-backed': {
    id: 'source-backed',
    title: 'Source-backed facts',
    summary: 'This value is a stored record in your data, not the model recalling or guessing.',
    body:
`A ◆ SOURCE label means the statement is anchored to an actual resource in your store — a lab Observation, an imaging study, a document — and you can open that record to see it.

This matters because language models otherwise blur two things: what they retrieved from your data, and what they generated from training. ayuOS forces the distinction. If it's ◆ SOURCE, click it and the underlying FHIR resource is right there. If it's ◇ INFERRED, the model reasoned it — the record won't literally say it.`,
    related: ['inferred', 'guideline'],
    deepLink: 'Grounding answers in stored records (RAG)',
  },
  'inferred': {
    id: 'inferred',
    title: 'Inferred from your data',
    summary: 'A reasoned conclusion drawn from your records — not a value any single record states.',
    body:
`A ◇ INFERRED label means the agent reached this by reasoning over your data, not by reading it off a record. "HRV and VO₂max moving in opposite directions is worth watching" is an inference; no Observation says it.

Inferences are useful but they are the model's judgement, one rung above the raw record. They should be checkable against the ◆ SOURCE facts they're built on — which is why the two label types sit side by side in the same sentence.`,
    related: ['source-backed', 'effect-vs-certainty'],
    deepLink: 'Reasoning over records vs. retrieving them',
  },
  'guideline': {
    id: 'guideline',
    title: 'Backed by a clinical guideline',
    summary: 'A threshold or recommendation from a published clinical body, cited as such.',
    body:
`A ▤ GUIDELINE label means the claim rests on a published clinical guideline — e.g. an ApoB target from a lipid-management body — not on your personal data or the model's inference.

Guidelines are consensus reads of the evidence for a population. They're a strong anchor, but they're general: they set thresholds for "people like you," not a verdict on you specifically. ayuOS cites which guideline so you can see the source and its population.`,
    related: ['source-backed', 'hierarchy-of-evidence'],
    deepLink: 'How clinical guidelines are graded and updated',
  },
}

// Which concept an evidence label opens when tapped.
export const evidenceConcept = {
  high: 'hierarchy-of-evidence',
  moderate: 'hierarchy-of-evidence',
  low: 'hierarchy-of-evidence',
  none: 'absence-of-evidence',
  src: 'source-backed',
  inf: 'inferred',
  guide: 'guideline',
}

export const getConcept = id => concepts[id] || null
