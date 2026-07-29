# Storage

## Overview

ayuOS stores data across four locations. Three are Postgres-backed; one is the filesystem.

| Store | Purpose | Backing |
|---|---|---|
| **Medplum** (self-hosted) | Canonical FHIR R4 store — all clinical health resources | Postgres 16 |
| **Open Wearables DB** | Raw device time-series keyed by `SeriesType` | Postgres (own instance/schema) |
| **pgvector** (extension) | Embeddings for RAG, time-series query cache, **ayuOS application tables** | Postgres 16 |
| **Local disk** | Raw blobs — DICOM pixels, genome files, source PDFs | Filesystem |

There is no separate time-series database. Postgres handles it.

!!! note "Fasten is a connector, not a store"
    The [Fasten fork](ingestion/ehr.md) is an ingestion service running as an isolated Go
    process behind a REST/FHIR boundary (for GPL license isolation). It *fetches* records;
    it does not hold them. Everything Fasten retrieves — and everything extracted from lab
    PDFs — is written to **Medplum**, which is the canonical store for medical records.

## Medplum

Medplum is a self-hosted FHIR R4 server written in TypeScript. It provides:
- A FHIR REST API (`GET /fhir/R4/Observation?patient=X&code=...`)
- A web admin UI for browsing resources
- Subscription support (webhooks on resource changes)
- Access control via FHIR `AccessPolicy`

ayuOS runs Medplum in Docker. All ingestion connectors write to Medplum's FHIR API; the agent loop reads from it.

### Configuration

- Single-user deployment; no multi-tenancy required for MVP
- Postgres as the backend (Medplum supports Postgres natively)
- All data stored locally; no Medplum cloud

## pgvector

The `pgvector` Postgres extension adds:
- Vector columns for embedding storage
- `<->` cosine distance operator for ANN search

### Tables

#### `resource_embeddings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `resource_type` | text | FHIR resource type |
| `resource_id` | text | Medplum resource ID |
| `chunk_index` | int | For multi-chunk resources |
| `content` | text | The text that was embedded |
| `embedding` | vector(1536) | Embedding vector |
| `created_at` | timestamptz | |

Indexed with `ivfflat` for approximate nearest-neighbor search.

#### `time_series_cache`

A denormalized cache of time-series observations for fast range queries, populated by a sync job from Medplum:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `patient_id` | text | |
| `loinc_code` | text | e.g., `8867-4` |
| `display` | text | Human-readable name |
| `value` | numeric | |
| `unit` | text | |
| `effective_at` | timestamptz | |
| `source` | text | `oura`, `whoop`, `apple-health`, `labcorp`, etc. |
| `confidence` | text | `high`, `medium`, `low` |

Indexed on `(patient_id, loinc_code, effective_at)`.

## Store-fit map

Every data class ayuOS captures, and where it lands. Derived from
[Data Capture Strategy](data-capture.md); rows marked **⚠ gap** have no defined home today
and are tracked in [Open questions](#open-questions).

### Health data

| Data class | Store | Resource / table |
|---|---|---|
| Wearables & home devices | OW DB → Medplum | `SeriesType` series → projected `Observation` (see [boundary](#the-open-wearables-medplum-boundary)) |
| Ambient environmental (UV, air quality, weather, GPS) | OW DB | Existing environmental `SeriesType`s |
| Current & historical medical records | Medplum | `Condition`, `Procedure`, `DiagnosticReport`, `Encounter` |
| Lab PDFs | Disk + Medplum | Blob on disk → `DocumentReference` + extracted `Observation`s |
| Biomarkers & diagnostics (panels, VO2max, DEXA, grip) | Medplum | `Observation`, `DiagnosticReport` |
| Screening events (colonoscopy, mammogram, vaccines) | Medplum | `Procedure`, `Immunization` |
| Family history | Medplum | `FamilyMemberHistory` |
| Medications | Medplum | `MedicationStatement` |
| Imaging | Disk + Medplum | Pixel data on disk → `ImagingStudy` |
| Genomics (raw files) | Disk + Medplum | Genome file on disk → `DocumentReference` |
| **Nutrition / meals / macros** | ⚠ gap | Not in OW `main` (only `hydration`); not clinical. Terra nutrition payloads **dropped today** — see [Terra contract](open-wearables.md#terra-bridge-ingestion-contract) |
| **Manually-logged interventions** (supplements, protocols) | ⚠ gap | `MedicationStatement` partially covers supplements; protocols and user-declared regimens have no home |
| **Self-feedback** (energy, mood, symptoms) | ⏸ **DEFERRED** | FHIR `Observation` (survey) / `QuestionnaireResponse` **vs.** `ayuos.self_reports` — see [deferred decisions](#deferred-decisions) |
| **Consumer-test interpretations** (genomic/microbiome, confidence-graded) | ⚠ gap | Source blob lands on disk; the derived interpretation has no home |

### Application objects

These are ayuOS's own objects — neither device data nor clinical resources. They are the
substrate of the product loop (*understand → hypothesize → act → measure → learn*) and
currently have **no defined store at all**. See
[ayuOS application tables](#ayuos-application-tables) for the proposed home.

| Object | Introduced in | FHIR fit |
|---|---|---|
| Hypotheses | [Evidence & Hypotheses](evidence.md) | None — no clean R4 resource |
| Experiments | [Experimentation](experimentation.md) | `ResearchStudy` / `ResearchSubject` — loose fit |
| Consent records / sliver definitions | [Data Sharing](sharing.md) | ⏸ **DEFERRED** — `Consent` + `Provenance` vs. `ayuos.slivers`; see [deferred decisions](#deferred-decisions) |
| Goals | [Vision](vision.md) | `Goal` exists but is unspecified in ayuOS |
| Screening due-date state (computed dates, nudge/snooze) | [Data Capture](data-capture.md) | None — app state |
| Evidence corpus (guidelines, literature index) | [Evidence & Hypotheses](evidence.md) | N/A — not user data |
| Audit log | [Agent Loop](agent-loop.md) | N/A — declared "append-only local", location unspecified |
| Agent conversation memory | [Agent Loop](agent-loop.md) | N/A — open question |
| Provider credentials (Oura PAT, Whoop/Terra OAuth) | [Wearables](ingestion/wearables.md) | N/A — needs a secrets store |

!!! warning "This is an MVP risk, not a cleanup task"
    The application objects above are not peripheral bookkeeping — they *are* the product
    loop. A hypothesis that can't be stored can't be tested; an experiment that can't be
    stored can't be validated. This group needs a schema decision before the loop is
    buildable, arguably ahead of closing the nutrition gap.

## ayuOS application tables

**Proposed:** a dedicated `ayuos` schema in the same Postgres instance, alongside pgvector.
Rationale: these objects are queried together with FHIR data but do not map to FHIR
resources; forcing them into loose-fit resources (`ResearchStudy` for an n-of-1 experiment)
buys interoperability nobody needs and costs modelling clarity.

Two rows in the table below are **not** settled by that rationale — both have a genuine FHIR
alternative with real interop consequences. They are marked ⏸ **DEFERRED** and listed under
[Deferred decisions](#deferred-decisions).

### Deferred decisions

!!! danger "⏸ Two open forks — do not implement these tables until resolved"

    **1. Consent records / slivers** — `ayuos.slivers` **vs.** native FHIR `Consent` + `Provenance`

    Sliver disclosure is precisely what `Consent` and `Provenance` model, and Medplum
    supports both natively. Choosing FHIR buys real interoperability (a recipient system
    could read the consent trail) at the cost of fitting ayuOS's sliver semantics into a
    clinical resource. The app table is simpler but keeps the disclosure record
    proprietary. See [Data Sharing](sharing.md).

    **2. Self-feedback** — `ayuos.self_reports` **vs.** FHIR `Observation` (survey) or `QuestionnaireResponse`

    Self-reported energy/mood/symptoms are legitimate `Observation`s with a survey
    category, which would put them on the same query surface as every other metric and
    make them usable in trends and correlations for free. An app table fits EMA prompt
    metadata better (which prompt fired, when, adherence) but splits outcome data away
    from Medplum. See [Experimentation](experimentation.md#capturing-the-inputs).

    Both are tracked in [Open questions](#store-fit-decisions). Everything else in the
    `ayuos` schema below is proposed and internally consistent; these two are the forks.

| Table | Purpose |
|---|---|
| `goals` | User health goals; the anchor hypotheses and capture prompts key to |
| `hypotheses` | Fields per [the hypothesis object](evidence.md#the-hypothesis-object) |
| `experiments` | Fields per [the experiment object](experimentation.md#the-experiment-object); FK to `hypotheses` |
| `experiment_metrics` | Which signals track an experiment's outcome; FK to source (`loinc_code` or `SeriesType`) |
| `self_reports` | ⏸ **DEFERRED** — EMA micro-prompt responses (energy, mood, symptoms); may become FHIR `Observation`s instead |
| `interventions` | Manually-logged supplements, protocols, regimens with start/stop dates |
| `screening_schedule` | Computed due dates + nudge/snooze state |
| `slivers` | ⏸ **DEFERRED** — sliver definitions + append-only consent records; may become FHIR `Consent` + `Provenance` instead |
| `evidence_corpus` | Guideline + literature documents; embeddings live in `resource_embeddings` |
| `audit_log` | Append-only agent invocation log per [Agent Loop](agent-loop.md#audit-log) |
| `agent_memory` | Conversation history / prior-query recall — pending the agent-memory open question |

Provider credentials are deliberately **not** a table here — OAuth tokens and PATs belong in
a secrets store (OS keychain or an encrypted credentials file), not in a queryable schema.

## The Open Wearables ↔ Medplum boundary

Two stores can hold the same wearable metric, and the spec has not said which wins.
`time_series_cache` is documented below as "populated by a sync job from Medplum," which
only makes sense if wearable data reaches Medplum first.

**Proposed resolution:**

- **Open Wearables DB is the system of record for raw device streams.** Full fidelity,
  native `SeriesType` granularity, including metrics with no clinical meaning.
- **A projection job writes clinically-meaningful metrics into Medplum as `Observation`s**
  (LOINC-coded, `source` retained), so the agent has a single query surface.
- **`time_series_cache` remains a denormalized read cache** populated from Medplum.

Consequence: the agent never queries the OW DB directly — it reads Medplum and the cache.
Raw-fidelity access to OW remains available for debugging and for metrics that never get a
LOINC projection. This needs confirming before implementation.

## Encryption at rest

Postgres data directory is encrypted using OS-level full-disk encryption (FileVault on macOS, LUKS on Linux). No application-level encryption is applied on top — the OS layer is sufficient for the local threat model.

## Backup

*To be specified.* Minimum: nightly `pg_dump` to an encrypted external drive. No cloud backup in the default configuration.

## What is NOT in Postgres

- DICOM pixel data — stored on local disk, referenced by path in `ImagingStudy`
- Raw source files (Apple Health exports, lab PDFs, genome files) — stored on local disk, referenced by `DocumentReference.content.attachment.url`

## Open questions

- [ ] Should embeddings use 1536 dimensions (OpenAI-compatible) or a local embedding model's native dimension?
- [ ] What embedding model runs locally? Options: `nomic-embed-text` via Ollama, `mxbai-embed-large`, or MedGemma's embedding output.
- [ ] Time-series cache sync frequency — on every ingestion write, or batch?

### Store-fit decisions

- [ ] **Confirm the [OW ↔ Medplum boundary](#the-open-wearables-medplum-boundary)** — is OW the system of record with a projection into Medplum, or does wearable data live only in one store? Determines whether the agent queries one surface or two.
- [ ] Which OW `SeriesType`s get a LOINC projection into Medplum, and which stay OW-only?
- [ ] **Nutrition:** where does it land — merge `coachboard-v2` and treat it as OW data, model it in the `ayuos` schema, or use FHIR `NutritionIntake`?
- [ ] ⏸ **DEFERRED — Self-feedback:** FHIR `Observation` (survey) / `QuestionnaireResponse`, or an `ayuos.self_reports` table? See [deferred decisions](#deferred-decisions).
- [ ] ⏸ **DEFERRED — Consent records:** native FHIR `Consent` + `Provenance` in Medplum, or `ayuos.slivers`? See [deferred decisions](#deferred-decisions).
- [ ] **Manually-logged interventions:** extend `MedicationStatement`, or a dedicated `ayuos.interventions` table? (Note the [liability warning](data-capture.md#lifestyle-interventions) — accuracy here is a safety concern.)
- [ ] Where do consumer-test *interpretations* (genomic/microbiome, confidence-graded) live, given the source blob is on disk?
- [ ] Which secrets store holds provider credentials — OS keychain, or an encrypted file?
- [ ] Does the `ayuos` schema share the Medplum Postgres instance, or get its own?
