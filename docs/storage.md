# Storage

!!! info "Decision record"
    Storage architecture is set by [ADR-0002: ayuOS owns its database](adr/0002-clinical-data-store.md).
    ayuOS does not run a FHIR server. The engine is Postgres, reaffirmed against an embedded
    SQLite alternative in [ADR-0003](adr/0003-embedded-vs-server-database.md) — with a standing
    constraint to **keep the schema portable** (Postgres-only features behind the data-access
    layer) so an embedded profile stays a cheap future option. Schema details below are
    deliberately provisional and will be settled during implementation.

## Design principle

**FHIR is an interchange format at the boundaries, not the storage model.**

Records arrive as FHIR from [Epic, Apple Health, and Fasten Connect](ingestion/ehr.md); they
are stored faithfully as FHIR-shaped JSONB with extracted index columns; FHIR bundles are
generated on export. Between those boundaries the query surface is SQL we control — because
[8 of the agent's 10 core queries](adr/0002-clinical-data-store.md#the-evidence-that-decided-it)
are aggregations, cross-domain joins, or vector search that FHIR search cannot express.

## Overview

**One Postgres 16 instance. Four schemas, all ours.**

| Schema | Holds | Shape |
|---|---|---|
| `clinical` | FHIR resources from EHR, labs, imaging metadata, genomics | JSONB + extracted index columns |
| `timeseries` | Wearable and device metrics | Narrow partitioned rows |
| `ayuos` | Application objects — goals, hypotheses, experiments, plans | Native relational |
| `vectors` | Embeddings for RAG (`pgvector`) | Vector columns |
| *(local disk)* | Raw blobs — DICOM pixels, genome files, source PDFs | Filesystem, referenced by path |

They share one instance so the agent can join across them in a single query. That is the
entire point.

## Clinical resources

Stored as received, since ayuOS is predominantly a FHIR **consumer** — data arriving from Epic
and Apple is already valid FHIR, so the task is faithful storage and fast query, not
conformance-on-write.

Per resource type: a JSONB `resource` column holding the untouched payload, plus **extracted
index columns** for the search parameters we actually query. Extraction uses
[`@medplum/core`](evaluations/fhir-libraries.md)'s write-time extractors
(`convertToSearchableTokens`, `…Dates`, `…Quantities`, `…References`) driven from the R4
SearchParameter registry, so the indexer follows the spec rather than hand-written cases.

The index-column design is the one HAPI, Medplum, Aidbox, and WSO2 all converged on
independently:

| Param type | Columns |
|---|---|
| token | `system`, `code` (+ a null-system sentinel — `\|code` matches **only** where no system exists) |
| date | `value_low`, `value_high` **plus a separate scalar sort column** |
| reference | target type + id |
| quantity | value, unit, canonical value/unit |
| string | text, with `pg_trgm` for `:contains` |

!!! warning "Dates are intervals, not scalars"
    FHIR date prefixes are interval operators — `eq` means "range fully contains search
    range", and *both sides* are ranges (`2013-01-14` is `[00:00, next-day 00:00)`, while
    `Observation.effective` may itself be a `Period`). Postgres 16's native `tstzrange` +
    GiST gives this directly. Ranges are **not orderable**, hence the separate sort column.

**Scope:** ~85% FHIR search fidelity — token, reference, and correct date ranges cover the
queries we have. Chaining, `_has`, `_filter`, and composite params are out of scope until
something demands them.

## Time-series

Wearable and device metrics live in a narrow partitioned table, **not** as FHIR
`Observation`s.

The reason is volume: continuous Garmin HR is ~10k–86k samples/day. As FHIR Observations —
JSONB plus index columns, ~1–2 KB each — ten million samples is **10–20 GB**. As
`(user_id, metric_id, ts, value)` it is ~24 bytes a row: **~500 MB**. A 20–40× difference,
before JSONB parsing costs on every aggregation.

| Column | Notes |
|---|---|
| `user_id` | |
| `metric_id` | FK to a metric catalogue (LOINC where one exists, else an ayuOS code) |
| `ts` | timestamptz |
| `value` | numeric |
| `source` | `oura`, `whoop`, `garmin`, `apple-health`, … |
| `confidence` | `high` / `medium` / `low` |

**Engine: native Postgres declarative partitioning by time, plus a BRIN index on `ts`.** No
extension. At single-user scale — tens of millions of rows even for a heavy user — hypertables,
continuous aggregates, and compression are not load-bearing; they earn their keep at
multi-tenant scale. Revisit only if profiling says so.

Daily aggregates and raw samples co-locate here at different grain.

## Application objects

First-class tables with real foreign keys into clinical and time-series data — this is what
the owned-database decision buys. A goal's tracking metric can reference a biomarker one cycle
and a wearable metric the next, with referential integrity either way.

| Table | Purpose |
|---|---|
| `goals` | User health goals; hypotheses and capture prompts key to these |
| `hypotheses` | Per [the hypothesis object](evidence.md#the-hypothesis-object) |
| `experiments` | Per [the experiment object](experimentation.md#the-experiment-object); FK to `hypotheses` |
| `experiment_metrics` | Outcome signals; FK to the metric catalogue or a clinical resource |
| `interventions` | Manually-logged supplements, protocols, regimens with start/stop dates |
| `plans` | Nutrition and protocol plans — trigger points, actions, rationale |
| `self_reports` | ⏸ **DEFERRED** — EMA responses (energy, mood, symptoms) |
| `screening_schedule` | Computed due dates + nudge/snooze state |
| `slivers` | ⏸ **DEFERRED** — sliver definitions + append-only consent records |
| `evidence_corpus` | Guideline and literature documents; embeddings in `vectors` |
| `audit_log` | Append-only agent invocation log per [Agent Loop](agent-loop.md#audit-log) |
| `agent_memory` | Conversation history / prior-query recall |

Bundled knowledge content is deliberately **not** here either — [The Healthspan Model](healthspan-model.md)
gets its own `knowledge` schema so shipped, versioned content stays separable from user-owned data and a
content update never touches personal records.

Provider credentials are deliberately **not** here — OAuth tokens and PATs belong in a secrets
store (OS keychain or an encrypted file), not a queryable schema.

### Deferred decisions

!!! danger "⏸ Two open forks — do not implement these tables until resolved"

    Both got **simpler** under [ADR-0002](adr/0002-clinical-data-store.md) — there is no
    longer a two-store split to straddle — but neither is settled.

    **1. Consent records / slivers** — a plain `ayuos.slivers` table, or model the disclosure
    trail on FHIR `Consent` + `Provenance` semantics?

    The interop question survives the store decision: a recipient system could read a
    FHIR-shaped consent trail, and we generate FHIR at the export boundary anyway. The app
    table is simpler but keeps the disclosure record proprietary. See [Data Sharing](sharing.md).

    **2. Self-feedback** — a distinct `ayuos.self_reports` table, or store as clinical
    `Observation`s with a survey category?

    Modelling them as Observations puts mood/energy/symptoms on the same query surface as
    every other metric, so trends and correlations work for free. A separate table fits EMA
    prompt metadata better (which prompt fired, when, adherence). Possibly both: outcomes as
    observations, prompt metadata in `ayuos`. See
    [Experimentation](experimentation.md#capturing-the-inputs).

## Version history

**Append-only, from day one.** You cannot reconstruct versions you never wrote, and
*"what changed in my last 90 days?"* is the anchor workflow.

Mechanism is open — `temporal_tables`, a hand-rolled trigger writing to a parallel
`*_history` table, or an append-only design. Postgres has no native SQL:2011 system-versioned
tables. The cost is roughly one trigger and one extra table per versioned relation.

## Idempotency and provenance

Ingestion must be safely re-runnable: **Apple Health exports are cumulative full dumps**, so
every re-export re-imports everything.

Every ingested resource carries:

| Field | Purpose |
|---|---|
| `content_hash` | SHA-256 of the normalized payload — detects unchanged vs. modified |
| `source` | Which adapter and provider it came from |
| `source_resource_id` | The upstream id |
| `ingested_at` | |

Dedup key is `(source, source_resource_id)`; `content_hash` drives change detection. This is
one indexed lookup per resource — versus FHIR conditional create, which runs **a search per
resource** (~1,300 searches per Apple import).

## Vectors

`pgvector` for RAG retrieval over clinical documents, notes, and the evidence corpus.

#### `resource_embeddings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `source_table` | text | Which schema/table the row came from |
| `source_id` | text | Row id |
| `chunk_index` | int | For multi-chunk documents |
| `content` | text | The embedded text |
| `embedding` | vector(1536) | |
| `created_at` | timestamptz | |

Indexed with `ivfflat` for approximate nearest-neighbour search.

## Store-fit map

Where each captured data class lands. Derived from [Data Capture Strategy](data-capture.md).

| Data class | Schema | Notes |
|---|---|---|
| Wearables & home devices | `timeseries` | Raw samples + daily aggregates |
| Ambient environmental (UV, air quality, GPS) | `timeseries` | |
| Medical records (current & historical) | `clinical` | FHIR resources as received |
| Lab PDFs | disk + `clinical` | Blob on disk → `DocumentReference` + extracted Observations |
| Biomarkers & diagnostics | `clinical` | |
| Screening events | `clinical` + `ayuos.screening_schedule` | Events vs. computed due-dates |
| Family history | `clinical` | `FamilyMemberHistory` |
| Medications | `clinical` | `MedicationStatement` |
| Imaging, genomics | disk + `clinical` | Pixel data / genome files on disk |
| **Nutrition / meals / macros** | ⚠ gap | No source provides it yet — Terra nutrition payloads are dropped ([Terra contract](open-wearables.md#terra-bridge-ingestion-contract)) |
| Manually-logged interventions | `ayuos.interventions` | ✅ resolved by ADR-0002 |
| Nutrition & protocol plans | `ayuos.plans` | ✅ resolved by ADR-0002 |
| Self-feedback | ⏸ deferred | See above |
| **Consumer-test interpretations** | ⚠ gap | Source blob on disk; derived interpretation has no home |

## Encryption at rest

OS-level full-disk encryption (FileVault on macOS, LUKS on Linux). No application-level
encryption on top — the OS layer is sufficient for the local threat model.

## Backup

*To be specified.* Minimum: nightly `pg_dump` to an encrypted external drive. No cloud backup
in the default configuration. **One engine means one backup** — a direct benefit of ADR-0002.

## What is NOT in Postgres

- DICOM pixel data — local disk, referenced by path in `ImagingStudy`
- Raw source files (Apple Health export zips, lab PDFs, genome files) — local disk, referenced
  by `DocumentReference.content.attachment.url`
- Provider credentials — secrets store, not a queryable schema

## Open questions

- [ ] Which extracted index columns per resource type — generated from the SearchParameter registry, or hand-picked for the 10 queries?
- [ ] Does native partitioning hold at the largest realistic volume, or is a hypertable extension eventually needed? (Profile before adding a dependency.)
- [ ] Version history mechanism — `temporal_tables`, trigger, or append-only?
- [ ] Where do [Open Wearables](open-wearables.md) raw streams live — does OW keep its own database, or does ayuOS absorb the time-series directly? (Would collapse two Postgres instances into one.)
- [ ] Embedding dimensions — 1536 (OpenAI-compatible) or a local model's native size?
- [ ] Which local embedding model? `nomic-embed-text` via Ollama, `mxbai-embed-large`, or MedGemma's embedding output.
- [ ] Metric catalogue design — LOINC where available, ayuOS codes elsewhere; how do OW `SeriesType`s map in?
- [ ] ⏸ **DEFERRED** — self-feedback modelling (see [deferred decisions](#deferred-decisions))
- [ ] ⏸ **DEFERRED** — consent records / slivers (see [deferred decisions](#deferred-decisions))
