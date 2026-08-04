# Evidence & Hypotheses

!!! note "Status: draft stub"
    Scope is defined; corpus selection and the hypothesis schema are still open. See [Open questions](#open-questions).

## Overview

This component grounds ayuOS's reasoning in the **external body of healthcare evidence** and helps the user **form testable hypotheses**. It is distinct from the [Agent Loop](agent-loop.md), which reasons over the user's *own* record: this component brings in outside knowledge (guidelines, literature) and is disciplined about rating how strong that knowledge actually is.

It serves user jobs #4 in the [vision](vision.md#what-users-want-to-do), and produces the hypotheses that [Experimentation & Validation](experimentation.md) then tests.

## Two jobs

1. **Evidence grounding** — when the agent makes an external claim ("magnesium may improve sleep latency"), back it with a source and a strength rating, not a vibe.
2. **Hypothesis formation** — combine the user's own data with the evidence base to propose *testable* hypotheses tied to the user's stated goals.

## Evidence sources

| Source | Content | Notes |
|---|---|---|
| **Bundled guideline corpus** | Clinical practice guidelines (AHA, ADA, USPSTF, etc.) | Already referenced by `search_guidelines` in the [agent loop](agent-loop.md); ships with the install for offline use |
| **Literature index** | Abstracts / systematic reviews / meta-analyses | Sourcing and licensing TBD; may require a cloud fetch → PII-gated |
| **Curated intervention library** | Structured entries for interventions with linked evidence | Specced as [The Healthspan Model](healthspan-model.md) — a typed graph of systems, functions, interventions, markers, and modifiers. The highest-signal source for hypothesis formation |

## Strength-of-evidence labeling

The [agent loop](agent-loop.md) already labels claims as `SOURCE-BACKED` / `INFERRED` / `SPECULATIVE` for the user's own data. This component adds an **evidence-strength axis** for external claims, e.g. a GRADE-style ladder:

```
[claim] [EVIDENCE: HIGH — multiple RCTs / meta-analysis]
[claim] [EVIDENCE: MODERATE — single RCT or consistent observational]
[claim] [EVIDENCE: LOW — mechanistic / small / anecdotal]
[claim] [EVIDENCE: NONE — plausible but untested]
```

The point is to make the difference between "this is well-established" and "this is a plausible guess" impossible to miss.

## The hypothesis object

A hypothesis is a first-class, stored object:

| Field | Description |
|---|---|
| `statement` | The testable claim, e.g. "Magnesium glycinate 300mg before bed reduces my sleep-onset latency" |
| `goal` | Which user goal it serves (better sleep, lower ApoB, more HRV) |
| `rationale` | The user-data signal + the external evidence that motivate it |
| `evidence_strength` | Aggregate rating from the labels above |
| `proposed_intervention` | What the user would change |
| `expected_effect` | Direction and rough magnitude, if known |
| `confidence` | The agent's calibrated confidence, kept separate from evidence strength |
| `test_design_ref` | Link to an [experiment](experimentation.md) once the user decides to test it |

## Relationship to other components

- [Agent Loop](agent-loop.md) — invokes this component when a query needs external grounding; hypotheses can be surfaced proactively.
- [Health Literacy & Epistemics](epistemics.md) — the evidence-strength labels double as education entry points; the concept library explains the ladder to the user at the moment it matters.
- [The Healthspan Model](healthspan-model.md) — supplies the intervention library; hypotheses are formed by walking its `SUPPORTS` edges against the user's goals and measured gaps.
- [Experimentation & Validation](experimentation.md) — consumes hypotheses and turns them into n-of-1 experiments.
- [PII Gateway](pii-gateway.md) — any literature fetch that isn't in the local corpus is a cloud call and must be gated.
- [AI & ML Layer](ai-ml.md) — the medical extractor role (MedGemma) is relevant to parsing literature.

## Open questions

- [ ] What literature corpus can we ship and/or fetch within licensing constraints? (PubMed abstracts are open; full text mostly isn't.)
- [ ] Is the evidence-strength ladder GRADE, a simplified 4-tier scale, or something calibrated to biohacker interventions specifically?
- [ ] Should hypotheses be agent-proposed proactively, user-authored, or both?
- [ ] How do we prevent the confident-but-wrong failure mode — an eloquent hypothesis with `EVIDENCE: NONE` that reads as authoritative?
- [ ] Where do hypotheses live — Postgres, or FHIR (there's no clean R4 resource for "personal hypothesis")?
- [ ] How is `confidence` calibrated and kept distinct from `evidence_strength`?
