# Prototype findings

What the stress test surfaced. The point of building this was to break the spec while it is
still cheap to change — this file is the yield.

## Run it

```bash
cd prototype && node build.mjs && open ../docs/demo/index.html
```

`build.mjs` merges `seed/*.json`, validates the graph, emits `seed.sql`, and inlines the graph
into `docs/demo/index.html`. The UI is a single self-contained file: no server,
no dependencies.

It is written into `docs/` so MkDocs serves it as part of the spec site — `mkdocs serve` picks
it up at `/demo/`, same path as production. Run `build.mjs` before `mkdocs
build`: the nav entry points at that file and `--strict` fails when it is absent.

To load the database (Postgres 16):

```bash
psql -v ON_ERROR_STOP=1 -f schema.sql && psql -v ON_ERROR_STOP=1 -f seed.sql
```

Verified end to end against a throwaway Postgres 16 cluster: **168 nodes, 522 edges, 505
citations, 41 markers** load with every constraint, trigger, and CHECK active.

## Spec changes this forced

### 1. `ELEVATES` needed a wider contract — twice

[`healthspan-model.md`](../docs/healthspan-model.md) declared `ELEVATES` as *RiskFactor →
Intervention/Function*. Content authoring broke that in two directions, and both are right:

- **Modifier as source.** `md-prefers-swimming ELEVATES iv-swimming` is not a risk factor
  raising a priority — it is a *preference* doing so. This is the spec's own "adherence
  realism beats theoretical superiority" argument, and the type system forbade expressing it.
  70 of 113 ELEVATES edges originate from Modifiers.
- **Marker as target.** `rf-prediabetes ELEVATES mk-cgm-variability` is **measurement
  sharpening** — the behaviour healthspan-model.md describes in prose ("shift measurement
  toward Tier A/B markers") but had no edge type for.

Both widened in `schema.sql` and the docs. This is the single most useful thing the exercise
produced: the prose spec and the type contract disagreed, and only authoring found it.

### 2. Red flags have no target

Six red-flag modifiers (`md-exertional-chest-pain`, `md-cauda-equina-symptoms`, …) halt plan
generation across *every* intervention. Naming each one is wrong — the halt is global. Options
were a sentinel node (a fake Intervention polluting the graph) or a nullable `to_id`. Chose
nullable, guarded by `edges_global_block_is_red_flag`, so a null target can only ever be a
clinician-routed halt and never an authoring slip.

### 3. Two authors, one claim

Both content agents independently authored `iv-hiking RISK_OF out-adv-musculoskeletal-injury`.
The compiler keeps the first and warns. **This is a governance gap, not a build problem:** with
community PRs, two contributors will assert the same edge with different effect sizes and
different citations, and "first wins" is not an answer. Edge ownership needs an authoring rule
before contributions open.

### 4. Citations are prose, and shouldn't be

Authors wrote citations as free strings ("Ference et al. Eur Heart J 2017 — EAS consensus on
LDL causality"). `build.mjs` parses year and study kind out of them heuristically, which works
for a prototype and will not survive real content. Authors should cite by id against a curated
bibliography; the compiler should reject unknown ids. The current parser is a placeholder that
should not ship.

### 5. Multiple `REQUIRES` on one pair are legitimate

Chronic back pain requires *both* posterior-chain strengthening *and* trunk stability before
running. That is two distinct claims with distinct citations on the same (modifier,
intervention) pair, so the natural key needs `qualifier` to carry them. The resolver dedupes
prerequisites by node id and attributes each to its source.

## What the UI proves works

- **Modifier resolution is legible.** Stating back pain + heel pain + a swimming preference
  turns Zone 2 running from `available` into `sequenced`, with three prerequisites, two
  footwear/volume adjustments, and a six-entry explanation trail naming which fact caused each
  change and citing sources. Nothing changes silently.
- **Conflicts stay honest.** Two modifiers adjust running's `dose` dimension. The UI shows
  both, attributed, flagged as unmerged prose — never averaged into one instruction.
- **Blocking offers alternatives, except when it shouldn't.** No pool access blocks swimming
  and offers substitutes serving the same function. A red flag blocks everything, suppresses
  substitutes, and routes to a clinician.
- **Measurement sharpening is visible.** Pre-diabetes promotes CGM-derived glycaemic
  variability in the marker table, labelled with why.
- **Missing cells are visible holes.** An unauthored comparison axis renders as a dashed red
  `—`, not an absent row. (Zero holes in the current seed — every SUPPORTS edge is complete.)
- **No hidden score.** Ranking is Pareto tiers over (effect × evidence). Members of a tier are
  presented as incomparable rather than ordered, and promotion is always labelled
  *"moved up because of …"*.

## Content honesty spot-checks

The seed deliberately rates evidence below the popular position where they diverge, carrying
both in `attia_position` / `consensus_note` so the UI can show the gap:

| Claim | Rated | Why lower |
|---|---|---|
| VO₂max → mortality | training `high`, the *personal inference* flagged separately | cohorts measure fitness level, not fitness change; no trial has a mortality endpoint |
| Zone 2 privileged for mitochondria | `moderate` | intervals drive biogenesis at least as well per unit time; a counterweight edge says so |
| ApoB target < 60 (primary prevention) | causality `high`, the target `moderate` | Mendelian-randomisation extrapolation, never tested at that aggression |
| Fasting insulin | `moderate`, no action threshold | unharmonised assays, CV 20–30%, no validated cut-point |
| Protein 2.2 g/kg | rated at the ~1.6 g/kg plateau | that is where meta-analytic benefit flattens; "safe" ≠ "better" |
| Time-restricted eating | `small` / `low` | corrected *downward* against audience enthusiasm |

`iv-post-meal-walking SUPPORTS fn-aerobic-capacity` is authored `effect_size: none` — an
explicit "this doesn't do that job," which is a different claim from "nobody checked."

## Still open

- **Escalation predicates** (`applies_when`, `escalation_when`) are a DSL specified only by
  example. Hot-and-humid → BLOCKS above a WBGT threshold *combined with certain medications*
  needs a real grammar. Currently JSONB evaluated in app code, and unspecced.
- **Adverse events share the Outcome table** with protective outcomes, separated by a polarity
  flag. Works; means "independent mobility" and "stress fracture" are the same node type.
- **Prose adjustment conflicts are deliberately unresolved** — both shown, flagged. Honest, but
  it will look awkward in the UI the first time it matters. The fix is content curation.
- **44 modifiers is not enough.** Coverage of the chronic-condition list in the spec is partial,
  and the environment/access categories are thin.
- **No preference model yet.** The UI shows tiers and refuses to collapse them. The opt-in
  "simplify this for me" path from [epistemics.md](../docs/epistemics.md) is unbuilt.
