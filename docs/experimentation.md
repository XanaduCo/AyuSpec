# Experimentation & Validation (n-of-1)

!!! note "Status: draft stub"
    Scope is defined; the experiment schema and analysis methods are still open. See [Open questions](#open-questions).

## Overview

This component turns a [hypothesis](evidence.md) into a **testable personal experiment** and validates it against the user's own data. It is the *measure* and *learn* stages of the ayuOS loop (**understand → hypothesize → act → measure → learn**), applying n-of-1 methodology so a user can iterate toward better health on real evidence rather than a hunch.

It serves user job #5 in the [vision](vision.md#what-users-want-to-do).

## The experiment object

| Field | Description |
|---|---|
| `hypothesis_ref` | The [hypothesis](evidence.md) being tested |
| `intervention` | What the user changes — substance/behavior, dose, timing |
| `protocol` | Duration, schedule, and any washout/crossover structure |
| `metrics` | Which signals track the outcome, and from which source (wearable, lab, manual capture) |
| `baseline` | Pre-intervention baseline window and its summary statistics |
| `success_criteria` | What counts as a real effect — effect size threshold set *before* the experiment starts |
| `confounder_flags` | Known events to watch for (illness, travel, alcohol, cycle phase) |
| `status` | planned / running / complete / abandoned |
| `result` | supported / not supported / inconclusive, with the analysis |

## Methodology support

The value here is methodological honesty — most people run bad n-of-1s. ayuOS should help with:

- **Baseline establishment** — measure natural variability before intervening, so signal can be told from noise.
- **Duration / power heuristics** — given a metric's variance and the expected effect size, suggest a minimum window. Underpowered experiments get flagged, not silently run.
- **Design selection** — simple pre/post, A-B-A reversal, or randomized block, depending on the metric and how reversible the intervention is.
- **Confounder tracking** — surface events during the window that could explain the result.
- **Pre-registered success criteria** — lock the threshold before data collection to avoid post-hoc rationalization.

## Analysis

```
Baseline window ──► Intervention window ──► Comparison
                                              │
                                              ▼
        effect size vs. baseline natural variability
                                              │
                                              ▼
     result label: supported / not supported / inconclusive
```

Analysis must account for measurement noise, regression to the mean, and the small-n reality. When variability swamps the effect, the honest answer is **inconclusive** — and the component should say so rather than manufacture a finding.

## Honesty guardrails

n-of-1 is genuinely weak evidence: one subject, no blinding by default, high confounding. The component must:

- Never report correlation from a single window as causation.
- Carry the [evidence-strength labeling](evidence.md#strength-of-evidence-labeling) through to results — a positive n-of-1 is `EVIDENCE: LOW`, full stop.
- Encourage replication (re-run, or A-B-A) before a user treats a result as settled.

## Capturing the inputs

Experiments depend on getting the outcome metric with minimal friction (user job #3). Metrics come from:

- **Wearables & labs** — already flowing via [ingestion](ingestion/index.md); zero extra effort.
- **Manual capture** — for subjective or un-instrumented outcomes (mood, energy, symptom severity), a low-friction capture path in the [frontend](frontend.md) is required. Design goal: the single metric that matters for *this* experiment, prompted at the right moment — not a form.

## Relationship to other components

- [Evidence & Hypotheses](evidence.md) — supplies the hypothesis; receives the validated (or refuted) result back.
- [Ingestion](ingestion/index.md) & [Frontend](frontend.md) — supply the outcome metrics (automatic and manual capture).
- [Agent Loop](agent-loop.md) — results feed back into the user's record and future reasoning ("your last magnesium trial was inconclusive").
- [Storage](storage.md) — experiments and their time-boxed metric windows need a home in the schema.

## Open questions

- [ ] What is the experiment schema, and does any of it map to FHIR (`ResearchStudy` / `ResearchSubject` are a loose fit) or stay bespoke in Postgres?
- [ ] How much statistics do we actually run locally — simple effect-size comparison, or Bayesian n-of-1 models?
- [ ] How are power/duration heuristics computed per metric, and where do the variance priors come from?
- [ ] What's the manual-capture UX that hits "minimal friction" without becoming another abandoned habit tracker?
- [ ] Should the agent proactively suggest experiments, or only design them on request?
- [ ] How do we handle overlapping experiments (two interventions running at once) — disallow, or model the interaction?
