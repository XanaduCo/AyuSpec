# The Healthspan Model

!!! note "Status: draft"
    Structure is decided (typed graph, hierarchical navigation, modifier resolution, [layered provenance and user editability](#editability-provenance)). Content authoring, coverage targets, and clinical review process for the *default layer* are open. See [Open questions](#open-questions).

## Overview

The healthspan model is ayuOS's **bundled knowledge graph of the body**: every system, what is known to preserve its function with age, how to measure that function honestly, which interventions help and by how much, and how a person's own conditions, anatomy, and environment reshape those recommendations.

It is the substrate that makes the rest of the system concrete. [Evidence & Hypotheses](evidence.md) needs a curated intervention library to form hypotheses from; [Health Literacy & Epistemics](epistemics.md) needs real cells to fill its comparison frames with; [Experimentation](experimentation.md) needs to know which marker is worth measuring and how noisy it is. All three currently hand-wave that content. This is it.

**Framing: long-term optimization, not acute treatment.** Healthspan and lifespan aren't opposed — preserving function usually extends survival too; the distinction that matters is *time horizon*. Every node is organized around what compounds function over decades, not what resolves an acute complaint today. A recommendation earns its place by protecting the capacity to do things — walk up stairs at 80, think clearly, sleep, see, digest, recover.

### A typed graph, navigated hierarchically

Interventions, markers, and modifiers are shared across systems: walking serves cardiovascular *and* metabolic *and* musculoskeletal *and* neurocognitive function; chronic back pain reshapes running, rucking, rowing, and deadlifts all at once. So each of these is **one canonical node with typed edges to every system it touches** — a shared node has a single definition, reached from many places, rather than a separate copy wherever it appears.

**The body-systems hierarchy is the browsing spine** — what the user sees and navigates — but it is a view over the graph, not the structure itself. One canonical node per intervention, per marker, per modifier, reached from every system it serves.

## Node types

| Node | What it is | Examples |
|---|---|---|
| `System` | Top-level body system — the navigation spine | Cardiovascular, Metabolic, Musculoskeletal, Neurocognitive, Respiratory, Renal/Hepatic, Immune, Endocrine/Reproductive, Sensory (vision/hearing/oral), Integumentary |
| `Function` | The specific capacity that declines with age — what we're actually preserving | Aerobic capacity, vascular compliance, insulin sensitivity, lean mass, bone density, balance, executive function, sleep architecture |
| `Marker` | An observable that estimates a function, with an explicit [quality tier](#measurement-quality-tiers) | VO₂max, ApoB, CAC score, HbA1c, grip strength, DEXA lean mass, gait speed, wearable HRV |
| `Intervention` | Something the user can do | Zone 2 running, swimming, rucking, resistance training, post-meal walking, fibre intake, sleep-timing regularity, statin adherence, hearing protection |
| `Modifier` | Anything about the user that changes an intervention's suitability | Chronic low back pain, plantar fasciitis, flat feet, knee osteoarthritis, pre-diabetes, hot climate, no gym access, night-shift work, pregnancy, age band |
| `Outcome` | The healthspan-relevant endpoint a function protects | Independent mobility, cognitive independence, freedom from dialysis, preserved vision |
| `RiskFactor` | A user state that **sharpens** priorities rather than blocking an action | Elevated ApoB, family history of early CAD, low VO₂max percentile, visceral adiposity |

Every node carries `citations`, `last_reviewed`, and `review_status`. Uncited content does not ship (see [Authoring & maintenance](#authoring-maintenance)).

## Edge types

The edges are where the real knowledge lives.

| Edge | From → To | Payload |
|---|---|---|
| `PART_OF` | Function → System | The navigation spine |
| `PROTECTS` | Function → Outcome | Why this function matters for healthspan |
| `SUPPORTS` | Intervention → Function | `effect_size`, `evidence_strength`, `certainty`, `time_to_effect`, `dose_response` |
| `MEASURED_BY` | Function → Marker | `validity` (how well the marker proxies the function), `noise`, `quality_tier` |
| `BLOCKS` | Modifier → Intervention | Hard contraindication with reason and severity |
| `CAUTIONS` | Modifier → Intervention | Proceed with stated caveat |
| `REQUIRES` | Modifier → Intervention | Prerequisite that must come first (e.g. back pain → posterior-chain strengthening before running) |
| `ADJUSTS` | Modifier → Intervention | Dose, technique, equipment, or environment change — not a block |
| `SUBSTITUTES` | Intervention → Intervention | Alternative serving the same `Function` when the first is blocked, with the effectiveness delta |
| `RISK_OF` | Intervention → adverse event | Baseline incidence, severity, and which modifiers raise it |
| `ELEVATES` | RiskFactor **or Modifier** → Intervention/Function/**Marker** | Raises priority — the "sharpening" mechanism. A Modifier source covers preference and access ("I want to swim"), because adherence realism beats theoretical superiority. A Marker target is *measurement* sharpening: pre-diabetes promotes CGM over a Tier C proxy. Both widenings were forced by [prototype authoring](https://github.com/xanaduCo/AyuSpec/tree/main/prototype/NOTES.md) |
| `INTERACTS` | Intervention ↔ Intervention | Additive, redundant, or antagonistic; also drug/supplement interactions |

The critical property: `BLOCKS` / `CAUTIONS` / `REQUIRES` / `ADJUSTS` / `SUBSTITUTES` are edges from **modifiers**, authored once. Adding "chronic back pain" once reshapes every intervention it touches, everywhere in the graph.

## Measurement quality tiers

A first-class axis, because the difference between a CPET-measured VO₂max and a watch's estimate is the difference between a real answer and a plausible one. Every `MEASURED_BY` edge carries a tier:

| Tier | Meaning | Examples |
|---|---|---|
| **A — Reference** | Direct or gold-standard measurement; the thing itself | CPET VO₂max, DEXA body composition, CAC score, oral glucose tolerance test, polysomnography |
| **B — Strong proxy** | Validated clinical measure, well-characterised error | ApoB, HbA1c, blood pressure (proper technique), grip strength, gait speed, 1RM |
| **C — Consumer estimate** | Wearable/consumer-device derived; useful for *trends in one person*, unreliable in absolute terms and across devices | Watch VO₂max estimate, wearable HRV, sleep staging, step-derived activity, optical SpO₂ |
| **D — Self-report** | Subjective or recalled | Perceived energy, food recall, symptom scales, sleep quality rating |

Each marker also carries `noise` (typical within-person variability), `cost`, `invasiveness`, `min_useful_interval` (measuring ApoB weekly tells you nothing), and `ingestible_via` — a link into [ingestion](ingestion/index.md) saying whether ayuOS can actually get this automatically.

This is directly load-bearing elsewhere: [experimentation](experimentation.md#methodology-support) needs `noise` for its power/duration heuristics, and a Tier C marker with high noise should tell the user honestly that their planned two-week n-of-1 cannot detect the effect they're hoping for.

## Effectiveness ordering

Interventions serving the same `Function` are **ordinally ranked** — not scored. A single composite score would smuggle in exactly the prescriptive weighting this project refuses to make.

Each `SUPPORTS` edge carries the axes the [comparison frame](epistemics.md#the-comparison-frame) renders: effect size, evidence strength (the [existing ladder](evidence.md#strength-of-evidence-labeling)), certainty, time to effect, cost, risk, effort, reversibility, and adherence realism (the intervention people actually keep doing beats the theoretically superior one they abandon in three weeks).

The default ordering is by effect size × evidence strength, presented with all axes visible. Re-ranking against a user's own weights happens **only** through the opt-in [preference model](epistemics.md#the-preference-model-simplify-this-for-me), and always shows its work.

**This resolves an open question in [epistemics.md](epistemics.md#open-questions):** comparison-frame cells come from this graph — authored, cited, reviewed — not synthesized by the model at query time. No cited edge, no cell.

## Modifier resolution

The mechanism behind "if you have chronic back pain, running is trickier." Deterministic, inspectable, and explained to the user rather than applied silently.

```
User profile
  (conditions from the clinical store, anatomy, environment,
   equipment, constraints, life stage)
        │
        ▼
Candidate interventions for the target Function
        │
        ▼
Collect all modifier edges that apply
        │
        ▼
Resolve  ──►  BLOCK       — remove, state why, offer SUBSTITUTES
              REQUIRES    — show prerequisite first, sequenced
              ADJUST      — dose / technique / equipment / environment
              CAUTION     — keep, attach the caveat
              ELEVATE     — raise priority (risk-factor sharpening)
        │
        ▼
Re-ordered candidate set + every modification shown with its reason
```

Precedence: `BLOCK` > `REQUIRES` > `ADJUST` > `CAUTION` > `ELEVATE`. Modifications are never hidden — the user sees "swimming moved up because of your knee osteoarthritis," not a silently reordered list.

### Worked example — aerobic capacity, running, real bodies

Target function: **aerobic capacity** (`PART_OF` Cardiovascular; also `SUPPORTS`-linked from Metabolic and Neurocognitive). Candidate interventions include walking, rucking, hiking, cycling, swimming, rowing, running.

Modifier edges on **running**:

| Modifier | Edge | Resolution shown to the user |
|---|---|---|
| Chronic low back pain | `REQUIRES` | Posterior-chain and trunk strengthening first; return to running progressively. Rowing also cautioned (loaded flexion); swimming and cycling substitute cleanly. |
| Plantar fasciitis / heel pain | `ADJUSTS` | Footwear with adequate heel cushioning; reduce volume; calf and plantar loading work. Substitute cycling or pool running while symptomatic. |
| Flat feet / overpronation | `ADJUSTS` | Footwear selection; gradual volume progression. Evidence for orthotics is mixed — labelled as such rather than asserted. |
| Downhill-heavy routes | `CAUTIONS` | Eccentric load raises soreness and injury risk; introduce descent volume gradually. |
| Hot / humid conditions | `ADJUSTS` | Heat illness risk. Shift timing, cut intensity, hydrate, acclimatise over ~10–14 days. Escalates to `BLOCK` above thresholds combined with certain medications. |
| Knee osteoarthritis | `CAUTIONS` | Running is not contraindicated by default (contrary to popular belief — this is a citation-heavy node); load management and quadriceps strengthening. Cycling and swimming substitute. |
| Recent cardiac event / exertional chest pain | `BLOCK` | Routes to clinician — see [red-flag routing](#red-flag-routing). |

Note what the graph buys: **socks, shoes, terrain, and weather are all first-class modifiers**, not prose buried in an article. They can be asked about, matched against the user's actual context, and explained.

### Worked example — pre-diabetes as a sharpener

Pre-diabetes is a `RiskFactor`, so it *sharpens* rather than blocks. Its `ELEVATES` edges raise the priority of post-meal walking, resistance training, sleep regularity, fibre intake, and weight loss where applicable — and shift measurement toward Tier A/B markers (OGTT, HbA1c, fasting insulin, CGM-derived glycaemic variability) rather than the Tier C consumer signals that would otherwise be the default.

The user still sees the full comparison frame. Nothing is decided for them; the ordering just reflects that these interventions have larger expected effects *given this state*.

## Chronic condition coverage

In scope: common chronic conditions, as modifiers and sharpeners — hypertension, dyslipidaemia, pre-diabetes and type 2 diabetes, obesity, MASLD, early CKD, osteoarthritis, osteopenia/osteoporosis, chronic low back pain, obstructive sleep apnoea, asthma/COPD, GERD, IBS, migraine, hypothyroidism, PCOS, gout, atrial fibrillation, depression and anxiety.

Out of scope: treatment of acute disease, prescription drug selection or dosing, oncology treatment, anything requiring diagnosis. The model describes how a *known* condition reshapes lifestyle recommendations and measurement priorities. It does not diagnose and it does not treat.

### Red-flag routing

Some modifiers must not produce a plan at all. These are authored as `BLOCKS` edges with **no
target** — the halt is global, across every intervention, so naming them one at a time would be
both wrong and unmaintainable. Exertional chest pain, syncope, unexplained weight loss, neurological deficits, and similar patterns are authored as `BLOCK` edges whose resolution is "this warrants clinical evaluation" — full stop, no alternatives offered, no lifestyle substitute suggested. This is the one place the system is deliberately directive, and the direction is always *toward* a clinician.

## Storage & shipping

The **base layer** is **bundled content, not user data** — so it gets its own schema (`knowledge`), separate from the user's `clinical` / `timeseries` / `ayuos` schemas in [storage](storage.md). That separation means it can be versioned, replaced, and reviewed independently of anything the user owns, and **a model update never touches personal data** — a guarantee that the [overlay design](#editability-provenance) strengthens rather than weakens, because user edits never live in these tables.

| Table | Contents |
|---|---|
| `knowledge.nodes` | Typed nodes with content, citations, `last_reviewed`, `source` |
| `knowledge.edges` | Typed edges with their payloads and `source` |
| `knowledge.citations` | Source records, linked to the [evidence corpus](evidence.md#evidence-sources) |
| `knowledge.model_version` | Shipped version; user-visible, so a changed recommendation can be traced to a content update |

The base layer is read-only at runtime: authored as reviewable flat files (YAML per node/edge) in the repo, compiled into Postgres at install/update time, and embedded into `vectors` for semantic retrieval. Ships offline with the install, like the guideline corpus. User and expert edits live in a separate overlay — see [Editability & provenance](#editability-provenance).

## Editability & provenance

The model ships as a **default**, not a verdict. It is transparent and editable: a user can
override any recommendation, and — later — subscribe to a layer authored by a named expert.
Every cell the system renders is **attributed to its source**, so the user always sees *whose*
recommendation they are looking at.

This is not only a sovereignty feature. It is what makes the model's authoring burden and
editorial liability tractable (see [Authoring & maintenance](#authoring-maintenance)): instead
of ayuOS bearing sole liability for one authoritative graph, responsibility attaches along
**attribution lines** — the default layer to ayuOS's clinical reviewer, a `self` edit to the
user, an expert layer to that named expert.

### Layered, not edited in place

The base graph is never mutated. Edits are an **overlay**, composed with the base at query time —
the same way [modifier resolution](#modifier-resolution) already composes edges.

| Layer | Lives in | Source | Mutability |
|---|---|---|---|
| **Base** | `knowledge` schema (bundled, versioned) | `ayuos_default` | Read-only; replaced wholesale on model update |
| **Self** | User's `ayuos` schema (**personal data**) | `self` | User-authored and editable |
| **Expert / community** | Installable content pack, layered like the base | `expert:<id>` / `community:<id>` | Read-only once installed; the user chooses to subscribe |

Because self edits are personal data in the user's own schema, a base model update **cannot
clobber them** and never touches them — this is why the overlay *strengthens* the "a model
update never touches personal data" guarantee in [Storage & shipping](#storage-shipping).

### Provenance on every edge

Every node and edge carries a `source`, extending the existing `citations` / `last_reviewed` /
`review_status` fields:

- `source_type`: `ayuos_default` | `self` | `expert` | `community`
- `source_id`: e.g. `expert:some-named-clinician`
- `overrides`: an overlay edge names the base edge it supersedes, so the UI can show *"you
  changed this from the default."*

**Citations stay mandatory for every non-`self` source** — the CI gate in
[Authoring & maintenance](#authoring-maintenance) is unchanged for the base and for expert
packs. A `self` edge may be uncited, but it is then rendered through the existing
[epistemics](epistemics.md) labelling as `EVIDENCE: NONE — user-authored`, so a user never
mistakes their own assertion for evidence.

### The no-synthesis invariant survives, reframed

The [effectiveness-ordering](#effectiveness-ordering) rule — *"No cited edge, no cell; synthesis
is not permitted"* — becomes: **every cell traces to an edge with a declared source.** A
`self`-sourced cell is a legitimate, honestly-labelled case; what remains forbidden is the
*model* inventing a cell at query time. The [retrieve-don't-invent](#agent-integration) guard is
untouched — user editing adds a permitted non-default source, it does not open a synthesis path.

### The safety floor is not editable

[Red-flag routing](#red-flag-routing) edges — the `BLOCK`-with-no-target halts (exertional chest
pain, syncope, neurological deficits → clinician) — are **locked system edges**. No overlay,
`self` or expert, can override or remove them. This is the one place editability stops: a user
must not be able to edit away a safety halt.

### Resolution gains an authorship axis

When layers disagree, precedence composes with the existing
`BLOCK > REQUIRES > ADJUST > CAUTION > ELEVATE` ordering along an authorship axis:

```
locked safety edge  >  self edit  >  subscribed expert layer  >  ayuos_default
```

A user's own override wins for ranking and preference; a locked safety `BLOCK` always wins over
everything. Every override is shown with its reason and its source, never applied silently —
consistent with the rest of [modifier resolution](#modifier-resolution).

### Scope

- **Now:** build the provenance + overlay data model (cheap, and it future-proofs the rest).
- **Early:** expose `self` editing — the sovereignty story.
- **Deferred to [governance](governance.md):** the expert-publishing ecosystem — signing,
  vetting, and distribution of expert/community packs is a trust-and-distribution decision, not
  an MVP one.

## Agent integration

New [agent-loop](agent-loop.md) tools:

| Tool | Purpose |
|---|---|
| `query_health_model` | Traverse systems → functions → interventions/markers |
| `resolve_modifiers` | Given the user's profile and a candidate set, apply modifier resolution |
| `rank_interventions` | Ordered candidates with all comparison axes, optionally through the preference model |
| `suggest_markers` | What to measure for a function, by quality tier and what ayuOS can already ingest |

The agent **retrieves, it does not invent**. Any intervention claim in a response must trace to a graph edge with citations, or it carries `EVIDENCE: NONE` and the corresponding [epistemics](epistemics.md) concept. This is the strongest available guard against the confident-but-wrong failure mode, because the check is structural rather than a prompt instruction.

## Authoring & maintenance

The honest risk: **this is the largest content-maintenance burden in the project**, and content rot here is worse than code rot — a stale recommendation looks exactly like a current one.

This section governs the **default (`ayuos_default`) layer** and any **expert/community packs**. User `self` edits are personal data, uncited-but-labelled, and outside this gate — see [Editability & provenance](#editability-provenance). Distributing authorship across those layers is also what keeps editorial liability tractable: ayuOS owns review of the default it ships, not of every recommendation a user or expert authors on top.

Mitigations:

- **Citations are mandatory.** CI rejects any node or edge without a citation and a `last_reviewed` date. Non-negotiable.
- **Guideline-first sourcing.** Anchor to existing guideline bodies (ACSM, AHA/ACC, ADA, USPSTF, NICE, WHO) before reaching for individual trials. Pin the guideline version; a new guideline edition becomes a review task.
- **Staleness surfacing.** Nodes past their review horizon are flagged in the UI, not silently trusted.
- **Clinician-scientist review** as the gate for merge — the process the project is already standing up for [epistemics](epistemics.md) content.
- **Contribution model.** Community PRs are welcome and must carry citations; review authority stays with the clinical reviewer. This is a natural high-value contribution surface for [governance](governance.md).

### Build order

| Phase | Scope |
|---|---|
| **v0 (MVP)** | 3 systems deep rather than 10 shallow — Cardiovascular, Metabolic, Musculoskeletal. ~15 functions, ~60 markers, ~70 interventions, ~50 modifiers. Enough to make the anchor workflow and the comparison frame real. |
| **v1** | Neurocognitive, Respiratory, Sleep (cross-cutting), Renal/Hepatic. Full chronic-condition modifier set. |
| **v2** | Sensory, Immune, Endocrine/Reproductive, Integumentary. Interaction edges between interventions. |

Depth beats breadth in v0: a shallow node for every system reads as complete while being useless, which is the failure mode of every "wellness knowledge base" already on the market.

## Relationship to other components

- [Evidence & Hypotheses](evidence.md) — this **is** the curated intervention library that spec calls for; hypotheses are formed by walking `SUPPORTS` edges against the user's goals and gaps.
- [Health Literacy & Epistemics](epistemics.md) — supplies the comparison-frame cells and the modifier explanations; the graph is what makes the frame honest rather than generated.
- [Experimentation & Validation](experimentation.md) — `MEASURED_BY` noise and tier data drive marker selection and power/duration heuristics.
- [Agent Loop](agent-loop.md) — new retrieval tools; the no-uncited-claims rule.
- [Storage](storage.md) — new `knowledge` schema, versioned separately from user data.
- [Governance](governance.md) — clinical review gate and the contribution model.
- [Ingestion](ingestion/index.md) — `ingestible_via` links markers to whether ayuOS can actually collect them.

## Prototype

A working prototype lives in [`prototype/`](https://github.com/xanaduCo/AyuSpec/tree/main/prototype):
Postgres DDL, a 168-node / 522-edge seed graph authored against this spec, and a self-contained
UI that resolves modifiers from stated facts ("I want to swim", "I have heel pain") and renders
the comparison frame with its explanation trail. [`prototype/NOTES.md`](https://github.com/xanaduCo/AyuSpec/tree/main/prototype/NOTES.md)
records what building it forced this spec to change.

## Open questions

- [ ] Coverage target for v0 — are the numbers above right, and which three systems if not these?
- [ ] Where do effect sizes come from when guidelines report only direction? Do we author a coarse ordinal (small/moderate/large) rather than fake precision?
- [ ] How is the user's modifier profile assembled — inferred from the clinical store, explicitly confirmed by the user, or both? Inferring "chronic back pain" from a single coded encounter is fragile.
- [ ] Do we model dose-response as structured data (intensity × duration × frequency) or prose per edge?
- [ ] Interaction edges: worth the combinatorics in v1, or defer entirely to v2?
- [ ] Supplement coverage — the biohacker audience expects it, but it is the weakest-evidence, highest-noise region of the graph. Ship it labelled honestly, or scope it out of v0?
- [ ] Localisation and context: food, climate, and access assumptions are culturally specific. Does the graph carry regional variants, or ship one variant and accept the limitation?
- [ ] How do we version *user-visible* recommendations — if a v2 content update reverses advice the user acted on, do we surface that proactively? *(The [overlay's](#editability-provenance) `overrides` link and `model_version` make the diff computable — open question is the surfacing UX, especially when the reversed edge is one the user had overridden or subscribed to via an expert layer.)*
