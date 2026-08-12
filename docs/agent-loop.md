# Agent Loop

## Overview

The agent loop is the core reasoning engine. It takes a user query, orchestrates tool calls to retrieve relevant data, synthesizes a response with evidence labels, and returns it to the frontend.

## Tools available to the agent

| Tool | Description |
|---|---|
| `query_clinical` | Query clinical resources by type, code, patient, and date range |
| `get_time_series` | Retrieve time-series observations for a LOINC code over a time range |
| `search_records` | Semantic search over embedded records (pgvector) |
| `get_trend` | Compute change/trend for a metric over a period |
| `get_correlations` | Find metrics that co-vary over a time window |
| `get_imaging_summary` | Retrieve MedGemma-generated summary for an imaging study |
| `get_genomic_variants` | Query notable genomic variants and PRS scores |
| `generate_doctor_packet` | Trigger doctor-packet generation for a specified scope |
| `search_guidelines` | Search the bundled guideline corpus |
| `query_health_model` | Traverse the [healthspan model](healthspan-model.md) — systems → functions → interventions/markers |
| `resolve_modifiers` | Apply the user's conditions, anatomy, and environment to a candidate intervention set |
| `rank_interventions` | Ordered candidates with all comparison axes, optionally via the preference model |
| `suggest_markers` | What to measure for a function, by quality tier and ingestibility |

## Execution flow

```
User query
  │
  ▼
Classify shape · resolve anchor · establish goal term
  │
  ▼
┌─ local planning loop — iterative, on-device, undisclosed ──────────┐
│   tool execution (parallel where possible)                        │
│   Stage 1 · mechanistic change detection — no model, noise-gated  │
│            "what moved?" → candidates + kept/dropped reasons      │
│   Stage 2 · salience — model, needs a goal term                   │
│            "which of these matters, given what they came for?"    │
└───────────────────────────────────────────────────────────────────┘
  │
  ▼
ScopeRecord emitted  ← the interface between planning and disclosure
  │
  ▼
Stage 3 · budget · policy exclusions · PII gateway · consent
  │
  ▼
Reasoner: synthesize answer with evidence labeling
  │
  ├──▶ follow-up request? ──▶ local: granted, logged
  │                          cloud: second egress event, review mode applies
  ▼
Format response (markdown, citations, labels, rounds + tokens that left)
  │
  ▼
Audit log entry + call ledger rows
  │
  ▼
Frontend display
```

Everything inside the planning loop is specified in
[Context Assembly](context-assembly.md); the stages are named here so the flow reads end to end.

## Context assembly

Between "the user asked something" and "a model was given a prompt" sits the step that decides what
the answer can possibly contain — which question shape is in play, what the retrieval anchor is,
which predicate tier each record arrives through, and what is disclosed about that boundary.

**It is specified in full in [Context Assembly](context-assembly.md).** In summary:

- Retrieval is anchored on one of five **question shapes**, and the change shape's window anchor is
  not a general retriever.
- Records arrive through one of three **predicate tiers** — unconditional (policy), cited edge
  (graph), or similarity (labelled `no cited edge`, cannot carry a claim alone).
- Questions with parts they cannot be missing fill **slots**, not a ranked bag; safety and
  interaction slots are pinned and never evicted.
- Planning is an **iterative local loop**; it emits one declarative **scope record**, and that record
  is what is disclosed, consented to, and sent.
- The **reasoner may request more** mid-answer. Locally that is free; against a cloud destination it
  is a second egress event under the user's review mode.
- Transparency is of **the rule, not the omissions** — the predicate is disclosed completely,
  exclusions are a labelled sample with counts.

The rest of this page covers what the loop does with the assembled context.

## The anchor workflow: "What changed in my last 90 days?"

This is the most-cited query in the spec, and it is worth stating plainly that **it is a badly formed
question** — deliberately so, because it is the question users actually ask.

It names a window and nothing else. No goal, no system, no decision it is feeding. Answered
literally, it returns every delta the sweep found, ranked by nothing in particular, and the user
receives noise with a confident voice on top. The loop's job is therefore not to answer it as asked
but to **establish the missing goal term first** — either by inference it declares, or by a
clarifying turn that pays for itself by carrying the findings it is asking the user to choose
between.

Execution:

1. `get_time_series` over the tracked marker set for the window
2. `get_trend` per series against the prior-window baseline, **gated on each marker's noise floor**
3. `query_clinical` for lab results in the window, plus the prior draw as denominator
4. `get_correlations` — metric pairs whose co-movement clears threshold
5. `search_records` — recent notes, reports, imaging summaries
6. `search_guidelines` — thresholds for anything flagged, which is what promotes a marker to `guideline-cited`
7. **Salience pass** — the candidate set is weighed against a goal: stated in the question, carried
   from the conversation, or inferred from standing context (family history, conditions, active
   experiments) with the inference declared. Where no goal can be established, the loop returns the
   grouped candidate set as a clarifying turn rather than a ranked answer — see below.
8. Synthesis with [evidence labels](evidence.md) per claim, and the injection policy applied

!!! danger "There is no honest partial answer to a goal-free question"
    The tempting design is to answer what can be answered and sharpen afterwards. It does not
    survive contact with the data. Ravi's 90-day sweep clears eleven markers past their noise
    floors; rendered as a list, that answer fails three ways at once:

    - **A list asserts equivalence.** Mercury crossing a reference ceiling and REM falling seven
      minutes arrive as two bullets of equal weight. A goal-free answer is not entitled to say
      which matters, so the format claims they are comparable when they are not.
    - **The reader supplies the missing salience, badly.** Given eleven findings, nobody weighs
      them — they latch onto the scariest word. The answer does not merely fail to rank; it hands
      ranking to the user's anxiety.
    - **It can contain items that are not answers to the question at all.** That mercury result is
      a single draw with no prior comparator — `only one of its kind`, not `change-point`. It did
      not *change*; there is nothing to compare it against. Reporting it under "what changed" is a
      category error, not a wording problem.

    Partiality in health data is indistinguishable from prioritisation, and the user will read
    priority into whatever order we happened to pick.

### The clarifying turn

When the loop cannot establish a goal, it returns a clarifying turn. This is not a fallback for
when the system is stuck — it is sometimes the most useful thing the system can say, and it is
allowed to say that the question as asked would produce a worse answer. ayuOS is not a
people-pleaser; the goal is that the user understands their health, not that every utterance is
met with prose.

A clarifying turn is rungs 1–3 of the [question ladder](behavioural-flows.md#the-question-ladder)
executed in a single turn. It has **three parts, and is incomplete without any of them**:

| Part | What it does | Why it is required |
|---|---|---|
| **What was found** | The candidate set, grouped by system, with counts and the one-line finding behind each | This is what makes the turn pay for itself — the user learns something in the act of being asked (the journeys' reciprocity test) |
| **Why a straight answer would be worse** | The specific defect: no goal term, so no basis to rank; or a candidate that is not an answer to the question asked | This is the education. A question returned without its reason is an interrogation, and teaches the user nothing about why their question was hard |
| **The question** | What the user should decide, phrased as a choice between the groups already shown | Grouping, not ranking — [Law 2](design-system.md#interaction-laws) holds |

Worked example, on the anchor question:

> Eleven markers moved more than their own measurement noise in that window — but "what changed"
> has no target, so I have no basis for saying which of the eleven you should care about, and a
> list would imply they matter equally. They don't. Which of these is the question?
>
> - **Cardiac** — ApoB rose 88 → 95 mg/dL, crossing the threshold your family history makes
>   relevant *(3 markers)*
> - **Heavy metals** — blood mercury above its reference ceiling. One draw, no prior comparator,
>   so strictly this hasn't *changed* — there's nothing to compare it against *(1 marker)*
> - **Sleep architecture** — REM fell ~7 min/night while total sleep held *(2 markers)*
>
> Six others moved but stayed inside their reference ranges.

!!! warning "The threshold — most questions get answers"
    A system that answers every question with a question is worse than one that over-answers, and
    it fails the same reciprocity test it was meant to satisfy. A clarifying turn is warranted only
    when the candidate set spans systems that would be weighed differently against different goals,
    when a straight answer would require a ranking the loop cannot justify, or when answering as
    asked would commit a category error. It is **not** warranted when the goal is inferable and can
    be declared, when the candidate set is narrow enough that all of it is the answer, or when the
    loop has already asked once in this conversation. Clarifications do not stack.

    Like concept injection, this is **self-retiring**. A user who has been shown once why "what
    changed?" is underspecified starts supplying the goal term themselves, and the
    [literacy profile](epistemics.md#the-literacy-profile) should track that the same way it tracks
    concept fluency — the explanation retires, the grouping stays.

!!! note "Open design — establishing the goal term"
    A clarifying turn is **not** ruled out. [Law 5](design-system.md#interaction-laws) governs
    reaching the ask box, not what follows a question; [Law 7](design-system.md#interaction-laws)
    governs concept cards. The binding constraint is the journeys' reciprocity test — never ask for
    effort without returning value in the same step — and a clarifying question satisfies it when it
    **carries the finding instead of extracting from the user**. Grouping candidates by system, with
    counts and the one-line finding behind each, makes every option a result in itself: the user
    learns what moved in the act of choosing what to spend the answer on. Grouping is not ranking,
    so [Law 2](design-system.md#interaction-laws) holds.

    Where the goal *is* inferable with confidence from standing context — family history,
    conditions, an active experiment — the loop may proceed without asking, but must state the
    assumption it made. Inferring silently trades one invisible choice for another. The precise
    shape of both paths is specified in [Behavioural Flows](behavioural-flows.md) — the question
    ladder and the four-part answer contract; this note records the constraint set they must
    satisfy.

## Evidence labeling in the prompt

The R1 prompt instructs it to structure the response as:

```
[claim text] [SOURCE-BACKED: Observation/abc123, 2025-03-14]
[claim text] [INFERRED]
[claim text] [GUIDELINE-BACKED: AHA Lipid Guidelines 2023]
```

The frontend parses these annotations and renders them inline as tooltips. Labels are also the entry points for [Health Literacy & Epistemics](epistemics.md): the loop applies its injection policy to decide when a response should carry a just-in-time concept card (e.g. first `EVIDENCE: NONE`, a cross-tier comparison, a known self-deception trap).

## Audit log

Every agent invocation creates an audit log entry:

| Field | Value |
|---|---|
| `timestamp` | |
| `query` | User's original question |
| `tools_called` | List of tools and their arguments |
| `model_calls` | Foreign keys into the [call ledger](ai-transparency.md#3-call-ledger) — one row per model invocation |
| `any_left_device` | Boolean; true if any call in this query went off-device |
| `response_length` | Token count |

The audit log is append-only and stored locally. It records *what the agent did*; the call ledger records *what each model call contained* — including the full payload of every call, local or cloud. One query fans out into several ledger rows, which is why the payload detail lives there rather than being flattened into a single per-query field.

## Open questions

Retrieval-side questions — goal-term resolution, shape classification, predicate tiers, round caps —
live in [Context Assembly](context-assembly.md#open-questions).

- [ ] Should the agent have a memory of prior conversations? (e.g., "last week you asked about HRV — here's what changed since")
- [ ] How to handle tool failures gracefully — if `query_clinical` times out, does the reasoner proceed with partial context, and how is that disclosed?
- [ ] Should correlations be pre-computed on a schedule, or computed on demand?
- [ ] Does the salience pass run on the tool-caller or the reasoner? It is cheap and structured, which argues for the former; it needs standing context and judgment, which argues for the latter.
- [ ] What sets a marker's noise floor in practice — authored per-marker `noise` in the healthspan model, the assay's published test–retest band, or the user's own measured variance once enough draws exist?
