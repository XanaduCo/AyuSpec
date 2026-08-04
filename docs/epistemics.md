# Health Literacy & Epistemics

!!! note "Status: draft"
    Approach is decided (no onboarding module; inject at decision points). Concept list, authorship model, and the preference-elicitation flow are open. See [Open questions](#open-questions).

## Overview

A core product thesis: **users don't know what to ask, or how to weigh the answers.** People come to ayuOS precisely because they don't have a clear picture of their health and no clinician has taken the time to build one with them. If the system just answers questions, it serves the users who already know how to interrogate evidence — and quietly fails everyone else.

This component teaches the *epistemic skills* needed to use ayuOS well — the hierarchy of evidence, how to reason with imperfect data, why "it worked for me" is hard to interpret, how to compare interventions on the same axes — **without an explicit onboarding module**. There is no course, no gate, no tutorial to complete. Education is injected at decision points, indexed by the user's actual situation, and it retires itself as the user demonstrates fluency.

Two hard constraints:

1. **Never prescriptive.** ayuOS does not say "heart disease is your most important lever." It shows the difference in likelihood-of-working between, say, NMN supplementation and a walk after every meal — same axes, labeled evidence — and leaves the choice with the user.
2. **Simplification is opt-in.** If the user asks ayuOS to simplify the choice, it collapses the trade-offs through an explicit [preference model](#the-preference-model-simplify-this-for-me) — and always shows how their stated preferences produced the ranking.

## Design principles

- **Labels are the curriculum.** The [evidence labels](evidence.md#strength-of-evidence-labeling) the agent already emits are the entry points. Every `EVIDENCE: LOW` is a teachable moment with the user's live decision as the worked example.
- **Not a people-pleaser.** The goal is that the user understands their health, not that every question is met with prose. Where a question cannot be answered well as asked, saying so — and saying *why* — is the more useful response. This is the half of the thesis the rest of this page does not cover: teaching people to **ask** better questions, not only to weigh the answers. It is executed by the agent loop's [clarifying turn](agent-loop.md#the-clarifying-turn), which must always carry what it found and why a straight answer would be worse, never a bare question back.
- **Just-in-time, not up-front.** A concept is surfaced the first time it's *load-bearing* for a decision the user is making — never as an abstract lesson.
- **Self-retiring.** A [literacy profile](#the-literacy-profile) tracks what the user has engaged with. Once fluency is demonstrated, the system stops explaining and just uses the labels. Injection must never become nagging.
- **Structure teaches.** The [comparison frame](#the-comparison-frame) does most of the pedagogy implicitly — fixed axes, side by side — without the system editorializing.
- **Sympathetic, not superior.** The tone is "here's how to think about this," never "you fell for a fallacy." Alternative medicine is engaged with on the evidence, not dismissed by category.

## The concept library

A small library (~20–30 entries) of **epistemic concepts**, each a first-class stored object the agent can cite, link inline, and track engagement with. Ships with the install, versioned with releases, fully offline.

### Concept object

| Field | Description |
|---|---|
| `id` | Stable slug, e.g. `hierarchy-of-evidence` |
| `title` | Display title |
| `summary` | One-liner the agent can drop inline |
| `body` | The ~2-minute write-up (markdown) |
| `deep_links` | Curated external content for going deeper |
| `quiz` | Optional [calibration game](#quizzes-as-calibration-games) items |
| `triggers` | Declarative conditions for proactive injection (see [injection policy](#the-injection-policy)) |
| `related` | Other concepts |

### Starter concept list

| Cluster | Concepts |
|---|---|
| **Asking answerable questions** | What makes a question answerable (a goal, a window, a comparator); why "what changed?" is underspecified and what it costs; the noise floor — no change smaller than a marker's own variability can be read as real; why one measurement is not a trend; `min_useful_interval` — when measuring more often tells you less |
| **Evidence** | Hierarchy of evidence (anecdote → mechanistic → observational → RCT → meta-analysis); what a mechanistic study can and can't tell you; surrogate endpoints vs. outcomes that matter; conflicts of interest and who funded the study |
| **Risk & probability** | Absolute vs. relative risk; base rates; effect size vs. certainty (small-certain vs. large-speculative); reasoning with imperfect data — deciding under uncertainty rather than waiting for proof |
| **Why you can fool yourself** | The placebo effect as a real, quantified force; regression to the mean (you sought help when you felt worst); confounding ("I started three things at once"); post-hoc rationalization |
| **Personal validation** | What an n-of-1 experiment can and can't establish; natural variability vs. signal; why pre-registering success criteria matters; how to determine if something actually worked *for you* |
| **Alternative medicine** | How different traditions generate evidence; comparing their evidence process to trials; absence of evidence vs. evidence of absence vs. evidence of harm; why "natural" ≠ safe and "ancient" ≠ tested |
| **Cautionary cases** | Seemingly effective, proven dangerous: hormone replacement therapy (pre-WHI), Vioxx, antioxidant megadose trials, fen-phen. Each told as a short story with the mechanism of the mistake — what evidence existed, what was missed, what would have caught it |

## The injection policy

Rules the [agent loop](agent-loop.md) applies to decide when a concept is surfaced *proactively* (vs. sitting behind a tappable label):

| Trigger | Example | Concept surfaced |
|---|---|---|
| Underspecified question | User asks "what changed in my last 90 days?" — a window and no goal | What makes a question answerable, via the [clarifying turn](agent-loop.md#the-clarifying-turn) |
| Sub-noise movement treated as a finding | User asks about a marker that moved less than its own test–retest band | The noise floor; measurement quality |
| First encounter with a label type | First time the user sees `EVIDENCE: NONE` | Hierarchy of evidence |
| Decision with a known trap | User attributes improvement to an intervention started during a symptom peak | Regression to the mean |
| Intervention with strong placebo literature | User asks about an intervention where trials show large placebo arms | Placebo effect |
| Cross-tier comparison | User weighs a `LOW`-evidence supplement against a `HIGH`-evidence behavior | Effect size vs. certainty, via the [comparison frame](#the-comparison-frame) |
| First experiment design | User starts their first [n-of-1](experimentation.md) | What n-of-1 can establish; pre-registration |
| Alternative-medicine query | User asks about an intervention from a non-trial evidence tradition | How to compare evidence traditions |

**Injection form:** one short inline paragraph or card, with a link to the full concept. Never a modal, never blocking, never more than one concept per response.

**Frequency capping:** a concept is proactively injected at most once until the user engages with it, and never again after the literacy profile marks it as understood. Tappable labels remain available forever.

## The literacy profile

Per-user record of epistemic fluency — what makes the layer self-retiring.

| Field | Description |
|---|---|
| `concept_id` | Which concept |
| `state` | `unseen` / `injected` / `read` / `quiz_passed` / `dismissed` |
| `last_surfaced` | For frequency capping |
| `dismissed_reason` | Optional: "I know this" is a valid, respected answer |

"Dismissed" is honored: a user who says they know the material is treated as fluent. The profile lives in the `ayuos` schema ([storage](storage.md)) and is never used for anything but injection decisions — it is not a score, never shown as a grade, and never gates functionality.

## The comparison frame

When the user weighs interventions — or asks "what should I do?" — options render on the **same fixed axes**, whatever their provenance:

| Axis | NMN 500mg/day (example) | Post-meal walks (example) |
|---|---|---|
| Evidence strength | `LOW` — animal + short human trials on surrogate markers | `HIGH` — consistent RCT + meta-analysis on glucose response |
| Expected effect | Unknown on outcomes that matter | Moderate, well-quantified |
| Certainty | Low — long-term effects unstudied | High |
| Cost | ~$80/mo | Free |
| Risk | Long-term unknowns | Essentially none |
| Reversibility | Yes | Yes |
| Effort | Trivial | Daily habit |

The system fills in the cells and stops. It does not rank, recommend, or editorialize. A user who reads that table has learned the comparison *method* — evidence strength, effect size, cost, risk are separate questions — without being told what to choose. This is the primary vehicle for the "likelihood of working" education, and it is deliberately structural rather than verbal.

Alternative-medicine options enter the same frame — same axes, no separate category. The labeling cuts both ways: *absence* of evidence is labeled distinctly from *negative* evidence, and where placebo-arm effects are large, that is stated as a real quantified effect, not a dismissal.

## The preference model ("simplify this for me")

When — and only when — the user asks ayuOS to simplify, the multi-axis frame collapses into a ranking via an explicit preference profile:

| Preference | Elicited as |
|---|---|
| Risk tolerance | Willingness to try things with long-term unknowns |
| Budget sensitivity | What monthly spend is trivial vs. meaningful |
| Time horizon | Optimizing for this year vs. decades |
| Effort budget | Appetite for habits vs. pills |
| Experiment appetite | Enthusiasm for self-testing vs. wanting settled answers |

Rules:

- **Elicited conversationally at first use**, a few questions in context — not a settings form, not an onboarding survey. Refined over time from choices the user actually makes (with consent).
- **The ranking always shows its work:** "Walking ranked first because you weighted certainty and cost highly; NMN ranked lower on long-term unknowns, which you said you're cautious about." The transparency is itself education.
- **Preferences are user-visible and editable** — a stored object in the `ayuos` schema, not an inferred shadow profile.

The preference model and the [literacy profile](#the-literacy-profile) are two facets of a broader **psychographic layer** — worries, disposition, and trust posture captured the same provenance-carrying way. See [Sample Patients](personas.md) for the two worked profiles (Ravi and Maya) and [Data Capture → Psychographic signal](data-capture.md#psychographic-preference-signal) for how each attribute is captured.

## Quizzes as calibration games

Quizzes exist, but as **prediction-and-reveal calibration games**, not comprehension tests:

- "Which of these two interventions has stronger evidence?" → reveal, with the reasoning.
- "Estimate the effect of X on Y" → reveal the actual trial data.
- "This study found a big effect. What would you want to know before acting on it?" → reveal the checklist.

Prediction-first is more fun than multiple choice, directly trains the judgment skill (not recall), and feeds the [literacy profile](#the-literacy-profile). Games are always optional, linked from concept cards and the entry write-up — never pushed into the chat flow.

## The entry write-up

One short document — *"How to think about your health with imperfect data"* — serves as the front door: the ~5-minute version of the whole epistemic stance, linking out to every concept and its quiz. It is linked from the first session, from concept cards, and from the docs — but it is never a gate. A user who skips it entirely still gets the full just-in-time experience; the write-up exists for the users who *want* the overview up front.

## Regulatory posture

This component strengthens the wellness-information positioning: a system that teaches evidence appraisal, renders neutral comparisons, and leaves every choice with the user is materially harder to construe as giving medical advice than one that recommends. The non-prescriptive constraint is load-bearing for [governance](governance.md), not just philosophy.

## Relationship to other components

- [Evidence & Hypotheses](evidence.md) — supplies the labels that serve as injection points; concepts explain the ladder. Directly addresses evidence.md's open question about the confident-but-wrong failure mode: an eloquent `EVIDENCE: NONE` hypothesis triggers the relevant concept.
- [Agent Loop](agent-loop.md) — executes the injection policy; concept summaries and comparison frames are rendered in responses.
- [Experimentation & Validation](experimentation.md) — the n-of-1 concept cluster teaches the methodology that component enforces; its guardrails against overclaiming and this component are two halves of the same stance.
- [Frontend & UI](frontend.md) — tappable evidence labels, concept cards, the comparison view, quiz surface.
- [Storage](storage.md) — concept library, literacy profile, and preference profile live in the `ayuos` schema.
- [Governance & Stewardship](governance.md) — editorial review of concept content; the non-prescriptive constraint.

## Open questions

- [ ] Who authors and medically reviews concept content? This is editorial liability adjacent to medical advice — does it need clinician review, and under what process?
- [ ] Final concept list — is ~25 right, and which cautionary cases make the cut?
- [ ] Trigger conditions: how are "known trap" patterns (regression to the mean, multi-intervention confounding) detected reliably enough to inject without false positives?
- [ ] How does the preference elicitation stay conversational without becoming a de-facto onboarding survey on first use?
- [x] ~~Do comparison-frame cell values come from the curated intervention library, or can the agent synthesize them?~~ **Resolved:** cells come from [The Healthspan Model](healthspan-model.md) — authored, cited, clinically reviewed. No cited edge, no cell; synthesis is not permitted.
- [ ] Quiz content format — hand-authored with the concepts, or partially generated and reviewed?
- [ ] Should the literacy profile inform the *voice* of ordinary responses (more/less explanatory), beyond injection decisions?
