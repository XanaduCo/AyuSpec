# Context Assembly

Between *"the user asked something"* and *"a model was given a prompt"* sits the step that decides
what the answer can possibly contain. This page specifies it: how the boundary around a question is
drawn, what is disclosed about that boundary, and what the user can do to move it.

It is the retrieval half of the [agent loop](agent-loop.md). The loop's execution flow, the
clarifying turn, evidence labelling and the audit log stay there.

## The governing principle

!!! abstract "Useful to the client, as privately as possible — and where those trade off, the client decides"
    Both halves are real goals, and they genuinely conflict: a better answer is frequently a
    larger payload. ayuOS does not resolve that conflict on the user's behalf by picking a
    constant. It resolves it by making the trade-off **a setting with a default and a visible
    position**, and by defaulting conservatively.

    **The bar moves over time.** A person's trust, literacy, and stakes all change — someone
    chasing a frightening lab result wants a different trade than the same person six months
    later. A design that hardcodes today's answer will be wrong for the same user later.

    Three consequences that bind everything below:

    1. **No privacy/utility trade-off is a constant.** Every one is a dial with a stated default.
    2. **Every dial shows its current position and what moving it would buy.** A trade the user
       cannot see is a trade they did not make.
    3. **Defaults are conservative; the ceiling is high.** The out-of-box configuration sends
       less; a user who wants more advice can have it, deliberately and on the record.

This is the same posture as [tiers](tiers.md) and the [PII gateway](pii-gateway.md) review modes,
applied to retrieval. It is worth promoting to a project-level principle alongside the copy rules
in `CLAUDE.md`.

## Two determinisms — only one is achievable

Retrieval is often described as wanting to be "deterministic". That word covers two different
guarantees, and conflating them promises something the system cannot deliver.

| | Guarantee | Achievable? |
|---|---|---|
| **Planning determinism** | The same question always produces the same scope | **No.** Relevance depends on an authored knowledge graph with incomplete coverage, a semantic index, and a goal term that may be inferred. None of that is stable enough to promise |
| **Replay determinism** | A given [scope record](#the-scope-record) always produces the same payload, and re-running it reproduces the answer | **Yes**, provided the store and graph versions are pinned in the record |

!!! warning "Say the achievable one"
    The user-facing claim is: *this is the boundary that was drawn, here is the rule behind it,
    here is what would move it, and re-running it gives you the same thing.* It is **not**: this
    boundary was inevitable. The second claim is what a "deterministic retriever" implies, and it
    is false.

## Why the accounting must be of the rule, not the omissions

The intuitive transparency surface is a list of what was excluded, with a reason each. It cannot
work, at any sweep width.

The set of things not looked at is unbounded — the store holds ~62,000 rows across ~200 retrievable
units, plus 4.7M called variants — so enumerating non-selection is not a completeness problem to be
engineered away, it is a category error. Worse, a list that *looks* complete invites the inference
that it *is* complete, which is the exact false confidence the surface exists to prevent.

So:

- **The predicate is disclosed completely and verbatim.** It is a rule, it is short, and it is the
  thing that actually decided the answer.
- **Exclusions are disclosed as a sample under that rule**, with counts, explicitly labelled as
  illustrative rather than exhaustive.
- **What would move the boundary is disclosed alongside it** — see
  [the boundary interface](#the-boundary-interface).

## The retrieval anchor

Every question is anchored on something: the object whose neighbourhood defines what could possibly
be relevant. The anchor decides which predicate applies and which vocabulary the result is explained
in.

The anchor is not always a window. Five shapes cover the question set this spec works from:

| Shape | Anchored on | A record earns its place by | Example |
|---|---|---|---|
| **Change** | A window | Moving further than its own noise floor | *What changed in my last 90 days?* |
| **Explain** | A named object | Belonging to it, or setting how it is read | *Explain my lipid panel* |
| **Attribution** | A target metric | Co-moving with the target — or failing to, which rules a cause out | *Why is my HRV trending down?* |
| **Interpretation** | A result and its test characteristics | Setting the prior the result updates, or bounding what the test can see | *Is my Galleri result a clean bill of health?* |
| **Intervention** | A node in the [healthspan model](healthspan-model.md) | Having a cited edge path to the candidate | *Should I take NMN?* |

!!! danger "Change-shaped retrieval is not a general retriever"
    The change shape's vocabulary — `change-point`, `baseline`, `predates the window` — is built for
    a window anchor. When another shape borrows it, relevance quietly becomes *recency of movement*.

    The tell is a selection that **cannot explain its own omissions**. Asked *"Should I take NMN?"*,
    a window-anchored sweep drops ApoB — the most consequential thing in Ravi's record — under
    `peripheral to the question`. That is not why it was dropped. It was dropped because NMN has no
    cited edge to anything ApoB proxies: a good reason, a different reason, and one that vocabulary
    cannot express.

Shapes compose. *"What changed, and should I do anything about it?"* is both, and resolves as a
change pass whose output becomes the anchor of an intervention pass.

## The predicate

A record reaches the model through exactly one of three tiers. The tier is recorded per record, and
it determines what the answer is allowed to do with it.

| Tier | Fills by | Relevance test | What a claim built on it may assert |
|---|---|---|---|
| **0 · Unconditional** | Policy | **None.** Included for every question of this shape | Anything its own evidence supports |
| **1 · Cited edge** | The healthspan graph | A cited edge path from the record to the anchor | Anything its own evidence supports |
| **2 · Similarity** | The vector index | Semantic proximity to the anchor's mechanism and literature description | **Nothing on its own.** Enters labelled `no cited edge`; a claim leaning on it carries `EVIDENCE: NONE` |

!!! abstract "Why tier 2 exists — the silent-omission problem"
    A pure cited-edge predicate is only as complete as the graph, and **its failure mode is
    silent**. If the graph lacks an NMN → bone-metabolism edge — new research, thin coverage, an
    author who did not think of it — then bone density is confidently excluded and the panel reports
    `no cited path`. True about our graph, misleading about the world. The system cannot distinguish
    *"no path exists"* from *"no path exists in our copy"*, and the omission wears the costume of
    rigour.

    Tier 2 attacks that with recall. It is safe because **retrieving on similarity is not asserting
    on similarity**: the record enters context with a weak label, and the existing
    [evidence labelling](agent-loop.md#evidence-labeling-in-the-prompt) machinery refuses to let it
    carry a claim by itself. It buys recall without buying unearned confidence.

    This is also the [content-rot risk](healthspan-model.md#authoring-maintenance) in its sharpest
    form. Tier 2 mitigates it; only authoring fixes it.

### Coverage is disclosed, not assumed

Because tier 1 is bounded by graph coverage, every scope record states the anchor's density:

> **NMN** — 4 cited edges across 2 functions · last reviewed 2026-03 · comparable nodes in this
> tier carry a median of 11.

A thin node is a fact about how much the boundary should be trusted, and it costs almost nothing to
compute. It is what lets a user calibrate an answer instead of taking it on faith.

## Pipeline stages

The predicate decides *what may be considered*. These stages decide *what survives*. The boundary
between the first two is load-bearing: a mechanistic pass that finds candidates, then a model pass
that judges what matters. Collapsing them is the failure mode — a model handed the raw store will
find changes that aren't there, and a filter handed the salience job will rank by magnitude, which
is not the same as importance.

### Stage 1 — mechanistic change detection (no model)

Deterministic, reproducible, cheap enough to run over the entire store. It answers exactly one
question — *what moved?* — and is structurally incapable of answering *what matters?* It is the
**candidate generator for the change shape**; in every other shape it still runs, but its output
[annotates slot fills rather than choosing them](#change-is-a-modifier-outside-the-change-shape).

The gate that makes this stage useful is the **noise floor**. A delta becomes a candidate only if it
exceeds the marker's own variability — `noise` and `min_useful_interval` from the
[healthspan model](healthspan-model.md#measurement-quality-tiers), plus the assay's test–retest band.

!!! warning "ApoB 4.6 → 4.5 mmol/L is not a change. It is the assay."
    A model shown a table of deltas will narrate every row in it, because narrating rows is what
    models do. So sub-noise movement must be discarded **before** any model sees it, not flagged as
    weak afterwards. This is the single highest-leverage filter in the loop: most of what a 90-day
    sweep surfaces is measurement noise wearing the costume of a finding.

Each surviving candidate carries the reason it survived, and each rejection carries the reason it was
dropped, from [the change shape's vocabulary](#change-shape). Drops are surfaced as a labelled
sample, not silently — but see [why the accounting is of the rule](#why-the-accounting-must-be-of-the-rule-not-the-omissions),
because a sample presented as an inventory is its own dishonesty.

### Stage 2 — salience (model)

The candidate set goes to the model with one job: *which of these matters, given what this person is
trying to do?* Its inputs are the candidates and their reasons, the user's goal, and standing
context — conditions, medications, family history, active [experiments](experimentation.md), and the
`Function → Marker` edges from the [healthspan model](healthspan-model.md) that say which markers
proxy the thing the user actually cares about.

!!! abstract "Salience is a function of change × goal. Without a goal term it is undefined."
    Magnitude is not importance. A 30% HRV swing in someone tracking sleep debt and a 4 mg/dL ApoB
    drift in someone with a father's MI at 62 are not comparable on size, and no amount of model
    quality fixes a prompt that never said which one the person came for.

### The goal term

Two shapes fail without a goal term, in ways that look different and are the same defect: **an anchor
the question does not fully determine.**

| Shape | What the question supplies | What is still undetermined |
|---|---|---|
| **Change** | A window | No basis to **rank** — eleven markers moved and nothing says which matters |
| **Intervention** | A named node | No basis to **scope** — NMN carries edges to more than one function, so the comparator set and the target-marker set are both undefined until one is chosen |

"NMN for metabolic health" and "NMN for biological ageing" retrieve different comparators, different
markers, and different literature. The resolution path is the same in both cases: infer the goal from
standing context and **declare the inference**, or return a
[clarifying turn](agent-loop.md#the-clarifying-turn) that carries what it found. The trigger
generalises to: **ask when the anchor is underdetermined — not when the question is vague.**

!!! note "Worked case — whether ApoB belongs in an NMN answer"
    It depends entirely on how the goal resolves, which is the practical argument for resolving it.
    Scoped to *metabolic function* — HbA1c, insulin, HOMA-IR — ApoB has no cited path and is
    correctly dropped. Scoped to *healthspan* generically, cardiac interventions carry edges to the
    same goal, so ApoB enters through the **comparator** slot: the marker attached to the
    higher-evidence option competing for the same attention and the same monthly spend.

    Note what that is *not*. The frame does not say to fix ApoB instead — that is the editorialising
    [the comparison frame forbids](epistemics.md#the-comparison-frame). It fills a row and stops. But
    a frame scoped broadly enough to admit cardiac options, which then silently omits the user's one
    out-of-range cardiac marker, is not neutral either. It is a frame with a hole in it.

### Stage 3 — budget, policy, and the gateway

Selected records are ordered, then fitted to a token budget, with pinned slots exempt. The budget is
deliberately **smaller for a cloud destination than a local one** — the cloud model's window is
larger, so this is a policy limit, not a capability limit. Every token sent off-device is a token
that left.

Three exclusions are applied and reported **separately**, because collapsing them is exactly the
confusion the surface exists to prevent:

| Kind | Rule | Shown as |
|---|---|---|
| **Relevance** | Did not satisfy the predicate | Neutral, as a labelled sample with a count |
| **Policy** | May not leave the device — genome by default (reversible, per-call opt-in); imaging pixels and raw source documents always (not reversible) | Red |
| **Budget** | Did not fit | Neutral, with a token count |

The [PII gateway](pii-gateway.md) then strips identifiers from what remains. That is a *transform*,
not an omission — amber, because it left in altered form.

## The scope record

The central artifact. One object per question, produced by the [planning loop](#the-local-planning-loop),
which is: rendered to the user, written to the [audit log](agent-loop.md#audit-log), and replayable.

It is the interface between a **messy planning process** and a **strict disclosure process**. That
separation is the whole design: planning may be iterative, model-driven and non-reproducible;
disclosure must be declarative, complete and reproducible. The scope record is where one becomes the
other.

```ts
interface ScopeRecord {
  id: string
  question: string
  asked_at: string

  shape: 'change' | 'explain' | 'attribution' | 'interpretation' | 'intervention'
  shape_confidence: number          // low confidence is a disclosed fact, not a silent guess

  anchor: {
    kind: 'window' | 'object' | 'metric' | 'result' | 'graph-node'
    ref: string                     // graph node id, LOINC code, window spec, …
    label: string
  }

  goal: {
    term: string | null
    source: 'stated' | 'carried' | 'inferred' | 'unresolved'
    declared_as: string | null      // the sentence shown when inferred — never silent
  }

  // THE disclosed artifact. Short, human-readable, complete.
  predicate: {
    rule: string                    // "records with a cited edge path to NMN's claimed
                                    //  functions, plus safety and interaction slots
                                    //  unconditionally"
    tiers: Array<{ tier: 0 | 1 | 2; enabled: boolean; matched: number }>
  }

  slots: Array<{
    name: string
    fill_mode: 'policy' | 'graph' | 'similarity'
    required: boolean
    pinned: boolean                 // exempt from budget eviction
    items: Array<{ unit_id: string; tier: 0 | 1 | 2; reason: string; note?: string }>
    unfilled_reason: string | null  // an unfillable slot is a STATED GAP, never silence
  }>

  coverage: {
    anchor_edges: number
    anchor_last_reviewed: string
    peer_median_edges: number
    gaps: string[]                  // "nothing in the record measures NAD+ or its metabolites"
  }

  excluded: {
    by_policy: Array<{ unit_id: string; rule: string }>
    by_budget: Array<{ unit_id: string; tokens: number }>
    by_predicate_count: number      // the honest total
    by_predicate_sample: Array<{ unit_id: string; reason: string }>  // ILLUSTRATIVE, labelled so
  }

  budget: { destination: 'local' | 'cloud'; cap: number; used: number; overhead: number }

  // One entry per EGRESS EVENT. Multi-round answers have several.
  disclosure: Array<{
    seq: number
    kind: 'initial' | 'followup'
    requested_by: 'planner' | 'reasoner'
    rationale: string | null        // the reasoner's stated reason for needing more
    payload_tokens: number
    consented_at: string | null     // null when the destination is local
    ledger_id: string
  }>

  replay: {
    store_version: string
    graph_version: string           // pinned — the graph changes, so replay must name its version
    predicate_version: string
  }
}
```

!!! note "Replay pins the graph version"
    Replay determinism is only real if the thing that defined relevance is versioned. A scope record
    replayed a month later against a re-authored graph is a different query wearing the same id.

## The slot contract

Change-shape selection is a **ranked bag** — candidates score, sort, and fill a budget until it runs
out. That is the wrong structure for questions with parts they cannot be missing. A comparison frame
with one row is a recommendation wearing a table's clothes; an answer that never saw the medication
list is unsafe however well it scored.

So retrieval fills **slots**. Each is filled independently, and an unfillable slot becomes a stated
gap rather than silence.

The intervention shape's slots, which is where the contract is most load-bearing:

| Slot | Fill mode | What goes in it | If it cannot be filled |
|---|---|---|---|
| **Candidate** | graph | The intervention node — claimed functions, evidence tier, cost, effort, reversibility, citations | The question cannot be answered from the graph. Say so and stop |
| **Safety & interaction** ⚑ | **policy** | Active medications and supplements, **allergies and intolerances**, conditions, and any [locked safety edge](healthspan-model.md#the-safety-floor-is-not-editable) | Never empty. An empty allergy list is *asserted*, never assumed |
| **Comparators** | graph | Every intervention with a cited edge to the same function, at any evidence tier | State that this is the only option the model knows for that function — a finding about graph coverage, not about the intervention |
| **Target markers** | graph | The markers the claimed functions are proxied by, at current value with distance from target — **whether or not they moved** | The record cannot show an effect. Say what would need measuring ([`suggest_markers`](healthspan-model.md#agent-integration)) |
| **In-flight** | policy | Interventions already running — active [experiments](experimentation.md), the current supplement stack, training blocks | Nothing running; no note needed |
| **Evidence base** | graph + corpus | Retrieved guideline and trial statements, **including their absence** | Absence *is* the fill. `EVIDENCE: NONE` is a result, not a retrieval failure |
| **Recall sweep** | similarity | Tier-2 hits the graph cannot explain | No note needed |
| **Preference weights** | policy | The [preference model](epistemics.md#the-preference-model-simplify-this-for-me) attributes — only when a ranking was asked for | Render the frame unranked. Do not infer a weighting |

⚑ **Pinned.** Safety and interaction are filled before the budget is computed and are never
eligible for eviction. A budget that can evict the interaction check is a budget that can produce an
unsafe answer. If the remainder does not fit, the answer narrows elsewhere.

!!! tip "Policy-filled slots are the cheapest reliability win available"
    You do not ask the graph whether allergies are relevant to NMN. You include them for **every**
    intervention question, unconditionally, because the cost of missing one is unbounded and the
    cost of carrying them is a few hundred tokens. Same for the med list, conditions, and the active
    stack.

    Note the current gap: `AllergyIntolerance` is [ingested from Epic](ingestion/ehr.md) and appears
    nowhere in the retrieval layer. Wiring it into this slot is a small, high-value fix.

### Change is a modifier outside the change shape

The mechanistic sweep still runs everywhere — it is cheap and it is the same code. Outside the change
shape its output **annotates slot fills instead of choosing them**:

- A target marker that moved is promoted, and carries its delta.
- A marker that moved but has no edge to the candidate is dropped as `no cited path`, not as
  `peripheral to the question`.
- A target marker that did *not* move is still selected. For an intervention question that is
  frequently the whole answer: Ravi's hs-CRP at 0.8 mg/L is not an unremarkable null, it is the
  reason NMN has nowhere visible to work in his record.

!!! warning "`checked, unremarkable` is the wrong label for a target marker"
    In the change shape, a flat in-range marker earns the lowest-weight reason there is — included
    only so the answer can say it looked. In the intervention shape the identical record is
    load-bearing, because *"the thing it claims to move is already where you want it"* is the
    strongest evidence-free answer available. Scored as `checked, unremarkable` it evicts first
    under budget pressure, which is precisely backwards.

## The local planning loop

Retrieval planning is **iterative, model-driven, and runs entirely on-device**. It is allowed to be
non-reproducible because it crosses no boundary: the [tool-caller](ai-ml.md#model-roles) runs locally
by default, on-device iteration costs nothing that matters, and nothing it does is disclosed
individually.

```
question
  │
  ▼
classify shape · resolve anchor · establish goal term        ← may consult the local model
  │
  ▼
┌─ loop, locally, until slots are filled or the round cap is hit ─┐
│   expand the concept net · walk graph edges · run tier-2       │
│   recall · pull, inspect, discard · re-plan                    │
└────────────────────────────────────────────────────────────────┘
  │
  ▼
emit ONE ScopeRecord                                          ← the interface
  │
  ▼
budget · policy exclusions · PII gateway · consent            ← the strict half
  │
  ▼
one disclosed egress event
```

The loop is free to be as agentic as it likes. What leaves the machine is one declarative object.
This is what makes an iterative planner compatible with a pre-send consent screen — a promise that
[AI transparency](ai-transparency.md) makes and that per-pass egress would break.

!!! danger "The loop belongs on the local side of the chokepoint"
    Every objection to a multi-pass retriever — multiplied egress, an unrenderable consent screen, a
    scope decision that is emergent rather than declared — is an objection to **passes that cross the
    boundary**, not to iteration. Putting the loop on-device answers all three at once.

## Progressive disclosure: the reasoner may ask for more

**Decided: yes.** A reasoner that has read the context and can state what it is missing produces a
better answer, and under [the governing principle](#the-governing-principle) a better answer is the
point — with the client, not the architecture, deciding what it costs.

This is a genuine departure from the single-disclosure model, so its mechanics are specified tightly.

**The request is structured, not free-form.** The reasoner returns a follow-up request naming the
slot, what is missing, and why it changes the answer. A request it cannot justify is not granted.

**What happens next depends only on the destination:**

| Destination | Behaviour | Consent | Cost |
|---|---|---|---|
| **Local reasoner** | Granted automatically, up to the round cap | None needed — nothing leaves | Latency only |
| **Cloud reasoner** | A **second egress event**, subject to the same gateway and ledger as the first | Governed by the user's [review mode](ai-transparency.md#3-call-ledger) — `every_call` confirms each round, `new_shape` confirms when the request reaches a new data class, `off` grants silently and logs | Real, and shown |

**The consent screen for round *n* shows only what is newly added**, with a running total. Re-showing
the whole payload trains people to dismiss it.

**Rounds are capped and the cap is a dial.** The default is deliberately low; a user who wants deeper
answers raises it and sees what it costs. This is the governing principle made concrete — the same
mechanism, dialled by preference, with the position visible.

**The answer discloses its round count.** A four-round answer sent more than a one-round answer, and
the user is entitled to know that without opening the ledger. One line under the answer, with the
total tokens that left.

!!! warning "The failure mode to watch is a reasoner that always asks"
    A model rewarded for thoroughness will request more every time, and the round cap becomes the de
    facto payload size. Two guards: the request must name a slot and a reason, and requests that did
    not change the answer are tracked. A reasoner whose follow-ups rarely move the conclusion is a
    reasoner whose cap should come down — that measurement should feed the
    [re-benchmarking cadence](ai-ml.md#open-questions).

## The boundary interface

The user-facing counterpart to the predicate: not a list of what was excluded, but **controls that
move the boundary and show the answer-delta**.

The demo already has three of these — include the genome, widen the window, send raw instead of
summarised. That pattern generalises: every predicate tier, every slot, and every dial named in this
document is a boundary control.

| Control | Moves | Shows |
|---|---|---|
| Predicate tier 2 on/off | Recall vs. precision | What similarity surfaced that the graph could not explain |
| Widen the window | The change shape's anchor | Whether the finding is a blip or a trajectory |
| Include the genome | A policy exclusion | The addendum it would have added — or that nothing in it is relevant, which is a better reason to exclude it than policy |
| Send raw vs. summarised | Aggregation | Exactly what the summary flattened |
| Round cap | Progressive disclosure depth | Tokens spent vs. answer changed |
| Goal term | The intervention shape's scope | A different comparator set entirely |

Two rules hold across all of them:

1. **An addendum only appears if the data behind it actually reached the model.** A counterfactual
   claiming a finding from a payload the budget refused is the precise dishonesty this surface exists
   to make impossible.
2. **Every control states its cost before it is used**, in tokens and in what leaves.

## Vocabulary

Selection reasons are **per shape**. Rendering is hue-free by construction: these are epistemic
labels, not privacy signals, and must never borrow the green/amber egress language
([design system](design-system.md#interaction-laws)).

### Change shape

| Kept because | Meaning |
|---|---|
| `change-point` | Moved further than its own historical variability |
| `out of range` | Outside its reference range, or outside its own two-year history |
| `guideline-cited` | A retrieved guideline statement names this marker by code |
| `only one of its kind` | The single measurement of its type — nothing to average against |
| `disconfirms` | Argues *against* the emerging answer. Retrieving only confirming records is how a retriever lies |
| `baseline` | Pulled from outside the window deliberately — a delta needs a denominator |
| `measurement quality` | Two sources disagree; the higher-quality one is pulled so the answer can say which it quotes |
| `co-moves` | Covaries with the metric in question above threshold |
| `aggregated` | A large series summarised on the way in rather than sent row by row |
| `coverage gap` | A hole in the data, retrieved because it changes what can be claimed |
| `checked, unremarkable` | In range and unmoved — included so the answer can say it looked |

| Dropped because | Meaning |
|---|---|
| `in range, unmoved` | Inside its reference range and within its noise since the prior draw |
| `summarised instead` | A derived summary was selected, so the raw rows are redundant |
| `peripheral to the question` | Matched the concept net on one distant tag only |
| `predates the window` | Newest value is older than the window the question implies |
| `covered by a selection` | Another selected record already carries this information |

### Intervention shape

These outrank movement, because what the candidate *claims to move* matters more than what happened
to move.

| Kept because | Meaning |
|---|---|
| `safety edge` | A locked contraindication or [red-flag route](healthspan-model.md#red-flag-routing). Not evictable, not overridable |
| `checked against what you take` | An active medication, supplement, or allergy the candidate could interact with. Not evictable |
| `what it claims to move` | A marker the candidate's cited edges target. Selected at current value whether or not it moved |
| `same function, different option` | A comparator — another intervention with a cited edge to the same function |
| `already running` | An intervention already in flight — an experiment, a stack item, a training block |
| `no cited edge` | Tier 2. Surfaced by similarity; cannot support a claim on its own |
| `your stated weighting` | A preference-model attribute, present only when a ranking was requested |

| Dropped because | Meaning |
|---|---|
| `no cited path` | Nothing connects this record to anything the candidate claims to affect. The record may be significant — it is not significant *to this question* |

`no cited path` is deliberately narrow and deliberately checkable: it is a claim about the graph, so
it is falsifiable by pointing at an edge, which `peripheral to the question` never was.

## Implementation notes

### Build order

| Phase | Scope |
|---|---|
| **1** | The `ScopeRecord` type and emitting it from the existing assembler. Nothing user-visible; everything downstream depends on it |
| **2** | Policy-filled slots, including wiring `AllergyIntolerance` through. Highest safety value, lowest effort |
| **3** | Shape dispatch + per-shape vocabulary. Relabel exclusions as sampled, with counts |
| **4** | Tier-2 recall pass and coverage disclosure |
| **5** | The local planning loop (replacing authored plans with computed ones) |
| **6** | Progressive disclosure with round caps and per-round consent |
| **7** | Boundary controls generalised beyond the demo's three |

### Where the demo already stands

`app/src/context/assemble.js` returns most of the scope record's shape already — `plan`,
`considered`, `selected`, `dropped`, `policy`, `budget`, `caveats`, `counterfactuals`. What it lacks
is the `predicate`, `coverage`, `disclosure[]` and `replay` fields, and it presents `dropped` as
exhaustive when it is a sample.

One known limitation to resolve in phase 3: the candidate sweep in `context/store.js` is gated on
tag intersection, so a record with no shared tag is **invisible** rather than explained — on an NMN
question that hides the entire wearable domain while ApoB is correctly shown as `no cited path`.
Under this document's framing the fix is not "sweep wider" but "state the rule": the predicate is
disclosed, and exclusions are a sample under it. Tag gating then becomes a performance detail rather
than an honesty problem, though tier 2 should not be tag-gated at all.

## Open questions

- [ ] **How is the goal term established when the user doesn't supply one?** Inferred from standing
  context, asked for without blocking, or offered as a sharpened re-ask alongside the literal answer?
  The largest open question in retrieval — see the
  [anchor workflow](agent-loop.md#the-anchor-workflow-what-changed-in-my-last-90-days) and
  [the goal term](#the-goal-term), which are the same question in two costumes.
- [ ] **Who classifies the question shape, and what happens when confidence is low?** Shape dispatch
  decides the whole vocabulary, so a misclassification produces a confidently mis-explained
  selection. A cheap tool-caller classification is the obvious implementation; the low-confidence
  fallback is unspecified.
- [ ] **Are slot contracts worth writing for the other three shapes?** Intervention has one because
  it was demonstrably broken without it. Explain, attribution and interpretation may be adequately
  served by a ranked bag with a shape-specific vocabulary.
- [ ] Where does the comparator set stop? Every intervention with an edge to the function is the
  rule, but a well-populated graph makes that dozens of rows, and a frame nobody reads is not a frame.
- [ ] What is the tier-2 similarity threshold, and does it adapt to graph coverage — should a thin
  anchor node automatically widen recall to compensate?
- [ ] What is the default round cap, and does it differ by destination beyond the consent difference?
- [ ] How is "the follow-up didn't change the answer" measured well enough to tune the cap?
- [ ] Does the scope record belong in the `ayuos` schema as a first-class queryable object, or as a
  payload on the audit-log row? Being able to ask *"show me every answer that never saw my genome"*
  argues for the former.

## See also

- [Agent Loop](agent-loop.md) — execution flow, the clarifying turn, evidence labelling, audit log
- [The Healthspan Model](healthspan-model.md) — the graph the tier-1 predicate walks
- [AI Transparency](ai-transparency.md) — the call ledger and review modes this page reuses
- [PII Gateway](pii-gateway.md) — the egress chokepoint the planning loop sits behind
- [Health Literacy & Epistemics](epistemics.md) — the comparison frame the intervention slots feed
