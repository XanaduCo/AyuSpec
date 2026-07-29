# Storage

## Overview

ayuOS uses two storage systems that serve different purposes but live in the same Postgres 16 instance:

| System | Purpose |
|---|---|
| **Medplum** (self-hosted) | Canonical FHIR R4 store — all health resources |
| **pgvector** (extension) | Embeddings for RAG, time-series query optimization |

There is no separate time-series database. Postgres handles it.

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
