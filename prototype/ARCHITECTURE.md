# `knowledge` schema — architecture

Concrete storage design for [The Healthspan Model](../docs/healthspan-model.md). DDL in [`schema.sql`](schema.sql).
Scope: single-user local Postgres 16; bundled read-only content replaced wholesale on update.

## Decisions at a glance

| Decision | Choice | Why |
|---|---|---|
| Edge payload | Hybrid — typed columns + `attrs JSONB` | FKs and ordinality cannot live in JSONB; undecided shape should not become a column |
| Ordinal axes | Native ENUMs, declaration order = ordering | `ORDER BY effect_size DESC` is correct without a rank table, and no integer exists to multiply |
| Primary keys | Authored slugs, no sequences | `ayuos` rows soft-reference the graph; a content swap must not renumber |
| System hierarchy | Adjacency list (`PART_OF` edges) | Depth ≤ 3; closure table is redundant, not expensive |
| Citation rule | Deferred constraint trigger, checked at COMMIT | An uncited bundle fails to install, not just fails CI |
| Modifier resolution | Collection in SQL, resolution in application code | Output is a provenance tree; precedence is a stateful fold |
| Ranking | Pareto tiers over (effect_size, evidence_strength) | Any scalar score requires weights, which is the prescription the project refuses |
| Content versioning | Atomic schema swap + change ledger; no cross-schema FKs | A content update must be unable to touch user data |

## Tables

| Table | Role |
|---|---|
| `nodes` | All seven node types. `UNIQUE (id, node_type)` exists solely to back the endpoint-type FKs on `edges` |
| `marker_props` | Marker-only attributes (`noise`, `cost`, `invasiveness`, `min_useful_interval`, `ingestible_via`) — the one node type with its own query surface |
| `edges` | All twelve edge types, one row each, hybrid payload |
| `citations` + `node_citations` / `edge_citations` | Sources, with per-claim locator |
| `edge_precedence` | `BLOCK > REQUIRES > ADJUST > CAUTION > ELEVATE` as data, so SQL, resolver, and tests read one source |
| `model_version` | Append-only install ledger; one `is_current` row |
| `change_log` | Per-entity diff between bundles; drives "advice you acted on has changed" |

## Typed columns vs. JSONB

A field earns a typed column if any holds:

1. **It is a graph reference.** `REQUIRES.prerequisite_node_id` and `SUBSTITUTES.serves_function_id` are dereferenced during resolution. You cannot put a foreign key inside JSONB, and a dangling node ref in bundled content is precisely what the citation rule exists to prevent.
2. **The resolver filters or sorts on it.** `attrs->>'effect_size'` is text, so it sorts alphabetically — `large < moderate < none < small`. Ordinality would move from the type system into application string constants.
3. **It is a fixed axis of the [comparison frame](../docs/epistemics.md#the-comparison-frame).** A missing cell must be a visible NULL, not an absent JSON key.

Everything else — dose-response detail, equipment lists, acclimatisation windows, escalation thresholds, regional variants — stays in `attrs` with a GIN index. Note that the fields left in `attrs` are exactly the [spec's open questions](../docs/healthspan-model.md#open-questions): JSONB is where undecided shape belongs, and promoting a field later is a migration a wholesale-reload schema can afford.

The cost is ~15 mostly-NULL columns over a few thousand rows: a null bitmap, not storage. `edges_payload_by_type` is what keeps the hybrid honest — a typed column optional for every edge type is a JSONB key with extra syntax.

## Keys, versioning, and the user-data boundary

| Rule | |
|---|---|
| No FK crosses the schema boundary in either direction | A content swap must never cascade into user data; user tables must never block a swap |
| User rows store a snapshot triple | `(entity_id, model_version, content_hash)` recorded when the advice was given |
| Swap is atomic | Load into `knowledge_next`, `ALTER SCHEMA … RENAME` both ways in one transaction. Rollback is a rename |
| Only current content is stored | Prior graphs live in git. The database keeps the ledger and the diff, not the history |
| `change_log` answers the recall question | Join snapshot triples against it to surface reversed advice |

Dangling references after a swap are expected and are the point: a removed node is exactly the case the user must be told about. The UI resolves a snapshot triple to *present & unchanged* / *present & changed* / *removed*.

Consequence of stable keys: edge ids are `<from>|<TYPE>|<to>|<qualifier>`, composed by the compiler. An identity sequence would renumber on every reload and silently repoint every stored citation.

## Adjacency list, not closure

| | Adjacency (chosen) | Closure table |
|---|---|---|
| Depth at v0 | System → Function, ≤ 3 with sub-systems | — |
| Cost of the recursive CTE | Sub-millisecond; whole graph fits in shared_buffers | — |
| Maintenance | None | Also none — content is immutable at runtime |
| Real objection | — | A second source of truth and a build-time invariant to keep |

Because content is read-only, the usual argument (closure tables are expensive to maintain) does not apply. The argument that does: it is redundant. `schema.sql` carries a commented materialized-view skeleton; adopt it if `query_health_model` p95 exceeds ~5 ms or the spine grows past ~5 levels.

## Modifier resolution

### Inputs

The **fact set** — one row per active user fact:

| Field | |
|---|---|
| `node_id` | A `Modifier` or `RiskFactor` node |
| `source` | `coded` (clinical store) · `confirmed` (user said yes) · `environment` (device/location/season) · `inferred` |
| `confidence` | high / moderate / low |
| `valid_from`, `valid_until` | Plantar fasciitis resolves; a night-shift rotation ends |

Plus a target `Function`, and the candidate set (interventions with a `SUPPORTS` edge into it).

**Admission gate.** Expired facts are dropped. `inferred` facts may fire `ADJUSTS` / `CAUTIONS` / `ELEVATES` but never `BLOCKS` or `REQUIRES` — inferring "chronic back pain" from a single coded encounter is fragile, and a false block removes an option silently. An inferred fact that would have blocked becomes a **confirmation prompt**, not a block. One exception: red-flag blocks fire on any admitted fact at any confidence. The cost asymmetry justifies it.

### Phases

| # | Step | Where |
|---|---|---|
| 0 | Admit facts | app |
| 1 | Collect candidates and every applicable modifier edge, with citations | SQL — patterns (a), (b) |
| 2 | Evaluate `applies_when`; apply `escalates_to` where `escalation_when` holds | app |
| 3 | Group per intervention, ordered by `edge_precedence.rank` | SQL `ORDER BY`, consumed as-is |
| 4 | Fold per intervention | app |
| 5 | For blocked interventions, fetch substitutes, then re-run 1–4 over them **once** | SQL (c) + app |
| 6 | Rank survivors; apply `ELEVATES` as tier promotion | app |

A substitute-of-a-substitute is not pursued. Unbounded recursion here is a content smell, not a feature.

### Precedence is not "first rule wins"

`BLOCK > REQUIRES > ADJUST > CAUTION > ELEVATE` fixes three things: which **state label** an intervention gets, the **order effects apply and render**, and which edge's `resolution_text` **leads the explanation**. `REQUIRES`, `ADJUSTS`, and `CAUTIONS` are cumulative — all of them apply. Only `BLOCKS` is terminal.

State ∈ `available | adjusted | cautioned | sequenced | blocked` — display grouping only; a sequenced intervention may also carry adjustments and caveats.

### Conflicts on one intervention

| Case | Rule |
|---|---|
| Two `BLOCKS` | Both in the trail. A red flag wins routing, suppresses substitutes, and halts plan generation for the whole request |
| `BLOCKS` + anything lower | Block sets the state; lower-precedence edges are recorded in the trail but not rendered as actionable |
| Two `REQUIRES` | Union of prerequisites, deduped by node id, topologically ordered. A cycle is a load-time CI failure |
| Two `ADJUSTS`, same dimension, ordinal value | Most restrictive wins (lower cap, lower intensity); both modifiers attributed |
| Two `ADJUSTS`, same dimension, prose only | Both kept, flagged `conflict: unresolved`, both shown. Never merge prose, never pick silently |
| Two `ADJUSTS`, different dimensions | Both apply; order by `severity DESC`, then modifier id |
| Two `CAUTIONS` | Both attach; dedupe only on identical `resolution_text` |
| Two `ELEVATES` | `max(priority_delta)`, never a sum — summing invents a magnitude no citation supports |
| `ELEVATES` + `CAUTIONS` | Both. Elevation never cancels a caveat |

Every ordering is fully specified down to a node-id tiebreak: identical inputs produce byte-identical output.

### The explanation trail

Per surviving intervention, an ordered list of:

```
{ edge_id, edge_type, effective_edge_type, escalated_from?,
  modifier_node_id, modifier_title,
  fact:        { source, confidence },
  applies_when:{ predicate, result },
  effect:      { field, before, after },
  text:        <resolution_text | adjustment, verbatim>,
  citations:   [ { citation_id, locator, title, year } ] }
```

**Invariant, and it is a test, not a convention:** diff the unmodified baseline against the resolved output; every differing field must be named by at least one trail entry's `effect.field`. A resolver change that modifies output without emitting a trail entry fails the suite. This is the structural form of "modifications are never hidden."

`resolution_text` and `adjustment` are authored strings rendered verbatim. The model may summarise them; the trail always carries the original, with citations attached in the same query that fetched the edge — so a modification can never be rendered before its sources are available.

## Ranking without a hidden score

"Effect size × evidence strength" is the **product order**, not multiplication.

- A dominates B iff `effect(A) ≥ effect(B)` and `evidence(A) ≥ evidence(B)`, strict on at least one.
- Tier 1 = the non-dominated set. Remove it, repeat. Tiers are maximal antichains.
- Members of a tier are **incomparable**, not equal. They render side by side with every axis visible, and the payload says so; the UI does not imply an ordering the data does not support.
- Within-tier display order — `certainty DESC, adherence_realism DESC, effort ASC, risk ASC, id` — is labelled `display_order` in the tool payload, distinct from `tier`.
- `ELEVATES` promotes by at most one tier per distinct RiskFactor, never past tier 1, always labelled: *"swimming moved up because of your knee osteoarthritis."*
- Nothing anywhere assigns a number to an ordinal. The opt-in [preference model](../docs/epistemics.md#the-preference-model-simplify-this-for-me) is the only path permitted to collapse tiers into a total order, and it must display its weights.

Why not a score: any scalar needs weights on effect vs. evidence vs. cost vs. effort. That weighting *is* the prescription. Pareto tiers order where the data supports ordering and refuse where it does not.

## Where resolution runs

**Collection in SQL, resolution in application code.**

The case for SQL is real: one source of truth, no round trips, and pattern (b) already returns a precedence-sorted list. It loses on four counts.

| | |
|---|---|
| Shape | The output is a tree — intervention → modifications → trail → citations. SQL returns relations; the tree gets assembled in the app regardless |
| Provenance | Every step must carry the causing edge forward. In SQL that means each phase is a lateral join accumulating arrays, and the explainability invariant above stops being checkable |
| Churn | These are clinical policy rules. Policy that changes faster than the schema does not belong in migrations |
| Testability | ~200 fixture cases (fact set → expected trail) must run in CI without a Postgres instance |

Cost accepted: two places know about ordering. Mitigated by making the collection query's `ORDER BY` explicitly a *display* order in the schema comments, and by routing every consumer through `resolve_modifiers` — nothing else may re-derive a resolved set.

## Not designed for

Multi-tenancy, row-level security, concurrent writers, partitioning, runtime mutation. There is no `user_id` column in this schema and none should be added; a second user gets a second install.

## Open

- Structured dose-response (`intensity × duration × frequency`) vs. prose — lives in `attrs` until decided.
- Regional variants: an `attrs` key, a `region` qualifier on edges, or one shipped variant.
- How the fact set is assembled from the clinical store, and the confidence floor for `coded` facts.
- Whether `PART_OF` stays exempt from the citation rule if sub-system nesting grows.
