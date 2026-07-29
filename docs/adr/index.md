# Architecture Decision Records

An ADR records a significant architectural decision: the context that forced it, what was
decided, and what it costs. The point is that a decision made once, with reasons written
down, does not get relitigated from memory six months later — and that when it *should* be
revisited, the trigger is explicit.

Once an ADR has been implemented against, it is immutable — to change that decision, write a
new ADR that supersedes it. Before implementation, an ADR may be revised in place provided the
superseded reasoning is preserved inside it, since the reasoning is the point.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-ehr-ingestion.md) | EHR ingestion strategy | Accepted |
| [0002](0002-clinical-data-store.md) | ayuOS owns its database; FHIR is a boundary format | Accepted |

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
