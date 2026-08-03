# ADR-0002: ayuOS owns its database

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-29 |
| **Related** | [ADR-0001](0001-ehr-ingestion.md) · [Storage spec](../storage.md) |

!!! note "Revised before implementation"
    An earlier same-day draft of this ADR kept Medplum as the system of record with an ayuOS
    read-projection layer. It was rewritten after the reasoning did not survive review — four
    of its five arguments for Medplum turned out not to hold. Nothing had been implemented
    against it. The refuted arguments are preserved in
    [Why the case for Medplum did not hold](#why-the-case-for-medplum-did-not-hold), because
    they are the substance of the decision.

!!! info "Per-service detail"
    [Roll your own](../evaluations/roll-your-own.md) · [Medplum](../evaluations/medplum.md) ·
    [Blaze](../evaluations/blaze.md) · [HAPI](../evaluations/hapi-fhir.md) ·
    [Aidbox](../evaluations/aidbox.md) · [Rejected servers](../evaluations/rejected-fhir-servers.md)

## Decision

**ayuOS owns its database — one Postgres instance, schemas we design.**

**FHIR is an interchange format at the boundaries, not the storage model.** Records arrive as
FHIR from Epic, Apple Health, and Fasten Connect; they are stored faithfully as FHIR-shaped
JSONB with extracted index columns; and FHIR bundles are generated on export. Between those
boundaries, the query surface is SQL we control.

**We do not run a FHIR server.** We use [`@medplum/core` and `@medplum/definitions` as
libraries](../evaluations/roll-your-own.md#the-finding-that-changed-the-cost-estimate) —
Apache-2.0, zero runtime dependencies, no server — for the FHIRPath engine, the
SearchParameter registry, write-time index extraction, and resource validation.

!!! note "Engine choice examined separately — ADR-0003"
    "One Postgres instance" was reaffirmed against an embedded SQLite alternative in
    [ADR-0003](0003-embedded-vs-server-database.md) (Accepted). SQLite is viable for a single
    user — per-second HR included — but is rejected to avoid a two-backend maintenance tax and
    to keep one engine that also serves the managed tier. Consequence for schema design:
    **keep it portable** — isolate Postgres-only features (partitioning, `pgvector`) behind the
    data-access layer — so an embedded profile stays a cheap future option.

## The evidence that decided it

The question was scoped by asking what the agent actually has to answer, rather than which
server is better in the abstract.

| # | Query the agent must answer | FHIR search? |
|---|---|---|
| 1 | Latest value of a biomarker | ✅ |
| 2 | Lipid panel over 5 years | ✅ |
| 3 | Average HRV by week over 6 months | ❌ no aggregation |
| 4 | Correlate sleep score with next-day glucose | ❌ no cross-resource join |
| 5 | Goal progress joined to experiment window + wearable baseline | ❌ not expressible |
| 6 | Notes semantically similar to a symptom description | ❌ vector search |
| 7 | Assemble the cardiac sliver for a named provider | ❌ custom assembly |
| 8 | What changed in my last 90 days, across every metric class | ❌ aggregation + deltas |
| 9 | Experiment baseline window vs. intervention window | ❌ windowed aggregation |
| 10 | Am I due for a screening, given age/sex/risk | ❌ rule evaluation |

**FHIR search answers two of ten.** The other eight are SQL, time-series, or vector work we
were going to write regardless.

This is not a defect in FHIR. **FHIR search exists so external clients can query a server in a
standard way — and ayuOS has no external FHIR clients.** The only consumer is our own agent,
running in-process. We were paying for an interop surface with no consumers.

## Storage classes — one size does not fit

The second decisive input: the data has genuinely different shapes, and forcing it all into
FHIR resources is wrong for most of it.

| Class | Store | Rationale |
|---|---|---|
| **Clinical resources** (Observation, Condition, DiagnosticReport…) | FHIR-shaped JSONB + extracted index columns | Arrives already-valid from Epic/Apple; store faithfully, query via extracted columns |
| **High-frequency wearable samples** (continuous HR, per-second streams) | Narrow time-series table, partitioned | See volume analysis below |
| **Daily/aggregate wearable metrics** | Same time-series table, coarser grain | Cheap to co-locate |
| **Documents, notes, imaging, genomes** | Blob on disk + `pgvector` embeddings | Content is not relational |
| **Application objects** (goals, hypotheses, experiments, plans) | Native relational tables | No honest FHIR representation — these are ayuOS concepts, not clinical ones |

### The wearable volume argument

Continuous Garmin HR runs roughly 10k–86k samples per day. Stored as FHIR `Observation`s —
each a JSONB document plus index columns, ~1–2 KB — ten million samples is **10–20 GB**. The
same data as `(user_id, metric_id, ts, value)` is ~24 bytes a row: **~500 MB**.

**A 20–40× storage difference**, before accounting for JSONB parsing on every aggregation.

High-frequency wearable data must never be FHIR Observations. And the consequence is
structural: **a purpose-built time-series store is required regardless of this decision**.
Once the architecture contains a non-FHIR store, adding FHIR-shaped tables beside it is a
smaller increment than operating a separate FHIR server beside it.

## Why the case for Medplum did not hold

Preserved deliberately — this is the reasoning, not just the outcome. Each of these was
offered as something expensive to rebuild. Four do not survive.

| Argument | Why it fails |
|---|---|
| **Version history** | Overweighted. A history table plus a trigger, or an append-only design, is ~50 lines. Postgres lacks native SQL:2011 system-versioned tables, but the `temporal_tables` extension or a hand-rolled trigger covers it. The real risk was *never writing versions at all* — which day-one design eliminates. |
| **Idempotent ingest** | Our own mechanism is **better** for this workload. FHIR conditional create (`ifNoneExist`) runs **a search per resource** — ~1,300 searches per Apple Health import. A content hash plus a `(source, source_resource_id)` provenance key is one indexed lookup and yields change detection for free. FHIR's mechanism is built for multi-writer clinical environments; ayuOS has one writer. |
| **`Patient/$everything` for doctor packets** | **Contradicts our own [sharing spec](../sharing.md)**, which is built on scoped, per-recipient, per-purpose slivers and states "never all-or-nothing." `$everything` is the shape the product deliberately rejects. Exports are purpose-built, not dumps. |
| **Transaction bundles** with `urn:uuid:` resolution | **No ingestion path sends them.** Apple Health export is individual resource files; Fasten Connect is NDJSON (one resource per line); Epic patient apps do per-resource read/search with no `Patient/$export`. Irrelevant. |
| **FHIR search** | Answers 2 of the 10 queries above, and exists for external clients we do not have. |

What genuinely remained — FHIR resource modelling and validation — **is available as a
library**, without a server.

One further point in favour: **ayuOS is predominantly a FHIR *consumer*, not an author.** Data
arriving from Epic and Apple is already valid FHIR. The task is to store and query it, not to
guarantee conformance on write. That is the cheaper half of the problem.

## Consequences

**Positive**

- **The agent's real queries become native.** Cross-domain joins, windowed aggregations, and
  correlations are ordinary SQL.
- **Right storage for each data class** — time-series data stops paying a 20–40× JSONB tax.
- **Application objects are now first-class.** Goals, hypotheses, experiments, and nutrition
  plans are real tables with real foreign keys into clinical and wearable data — not soft
  references resolved in application code across two stores.
- **One engine, one backup, one `pg_dump`.** No eventual consistency, no projection lag, no
  sync layer to maintain and rebuild.
- **No upgrade treadmill.** Medplum's no-skip-minor policy would have become ayuOS's support
  burden across self-hosters.
- **No stock-configuration egress to remediate** — Medplum's default compose reaches Google
  reCAPTCHA and Have I Been Pwned on account paths.

**Negative / accepted**

- **We own correctness.** Resource modelling, index extraction, and query semantics are ours.
- **A FHIR search-fidelity ceiling of roughly 85%** — token, reference, and correct date
  ranges cover what we need; chaining, `_has`, `_filter`, and composite params are out of
  scope until something demands them.
- **TypeScript lock-in for the storage layer.** Python dropped R4 at `fhir.resources` v7.0.0;
  Rust has no R4 models at all. See [FHIR libraries](../evaluations/fhir-libraries.md).
- **No external FHIR API for free.** If a third-party FHIR client ever needs to read ayuOS,
  that becomes work. No such requirement exists today.
- **Sobering precedent:** Medplum's search is ~5,650 lines across 110 schema migrations, and
  WSO2's funded team shipped this design after ~1 month with `_sort` silently ignored and no
  chaining. Scope discipline is the mitigation — we are targeting 10 queries, not the spec.

## Day-one commitments

Cheap now, irrecoverable or expensive later. These must be in the schema before any real data
lands:

1. **Append-only version history** — you cannot reconstruct versions never written, and
   *"what changed"* is the anchor workflow.
2. **Date range (`low`/`high`) columns plus a separate scalar sort column.** FHIR date
   prefixes are interval operators, not scalar comparisons, and ranges are not orderable.
   HAPI, Medplum, Aidbox, and WSO2 all converged on exactly this shape.
3. **Content-hash idempotency keys** plus `(source, source_resource_id)` provenance on every
   ingested resource.
4. **Partitioning strategy for the time-series table**, chosen before it grows — native
   Postgres declarative partitioning by time, no extension.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| **Medplum as system of record** | Its advantages reduce to two of ten queries plus capabilities available as libraries; and it is the wrong store for high-frequency wearable data. |
| **Medplum for writes + ayuOS read projections** (the earlier draft) | If the projections carry everything the agent queries, Medplum becomes a write buffer holding a second copy of the data and contributing eventual consistency for nothing. |
| **Blaze** | Lightest option, and the worst fit — embedded RocksDB makes the clinical store an opaque KV blob that cannot be joined at all. |
| **HAPI FHIR** | Adds a JVM with no advantage for the store role. Still worth adopting **separately** as a validation sidecar if US Core conformance on imported records ever matters. |
| **Aidbox** | Disqualified — free tier prohibits PHI; instances ping a licence portal every ~30 minutes. |

## Open questions

Schema details are deliberately deferred and will be settled during implementation.

- [ ] Which extracted index columns per resource type — driven from the SearchParameter registry, or hand-picked for the 10 queries?
- [ ] Does native Postgres partitioning hold at the largest realistic volume, or is a hypertable extension eventually warranted? (Default is native — no extension until profiling demands one.)
- [ ] Version history mechanism: `temporal_tables` extension vs. hand-rolled trigger vs. append-only.
- [ ] Do the clinical, time-series, and `ayuos` schemas share one Postgres instance? (Assumed yes — single-instance joins are the point.)
- [ ] Where do [Open Wearables](../open-wearables.md) raw streams live now — does OW keep its own database, or does ayuOS absorb the time-series directly?
- [ ] The two [deferred store-fit decisions](../storage.md#deferred-decisions) — self-feedback and consent records — are unchanged, but both get simpler: there is no longer a FHIR-vs-app-table split to straddle.
