# Architecture Decision Records

An ADR records a significant architectural decision: the context that forced it, what was
decided, and what it costs. The point is that a decision made once, with reasons written
down, does not get relitigated from memory six months later — and that when it *should* be
revisited, the trigger is explicit.

Each ADR is immutable once accepted. To change a decision, write a new ADR that supersedes
the old one; do not edit history.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-ehr-ingestion.md) | EHR ingestion strategy | Accepted |
| [0002](0002-clinical-data-store.md) | Clinical data store — Medplum writes, ayuOS owns the read model | Accepted |

## Related

Per-service findings live in [Service Evaluations](../evaluations/index.md). Evaluations
record what is true about a service; ADRs pick between them.

## Status values

| Status | Meaning |
|---|---|
| **Proposed** | Written, not yet decided |
| **Accepted** | Decided; implementation should follow it |
| **Superseded** | Replaced by a later ADR (which is linked) |
| **Open** | Known decision that still needs an ADR written |
