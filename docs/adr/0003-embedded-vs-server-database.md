# ADR-0003: Embedded (SQLite) vs. server (Postgres) for the store

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-03 |
| **Related** | [ADR-0002](0002-clinical-data-store.md) · [Storage spec](../storage.md) · [Deployment](../deployment.md) |

!!! note "Why this ADR exists"
    [ADR-0002](0002-clinical-data-store.md) decided ayuOS owns its database rather than running
    a FHIR server, and named **Postgres**. But every alternative it weighed was a *FHIR server*
    (Medplum, Blaze, HAPI, Aidbox). It never examined the **embedded-vs-server** axis — SQLite
    was not on the table. That is a real gap: for a local-first, single-user default, an
    embedded engine is the more obvious starting point, not the less. This ADR evaluates it
    honestly and can revise ADR-0002's "one Postgres instance" if accepted.

## Decision

**Postgres remains the single storage engine (Option A).**

SQLite was genuinely evaluated — see below — and is viable for a single-user local install,
per-second heart rate included. It is rejected anyway, for two reasons that outrank the
ergonomic win:

1. Shipping a second backend alongside Postgres doubles the maintenance surface — two SQL
   dialects, two index strategies, a doubled test matrix — on the team that
   [governance](../governance.md) names maintainer burnout as the risk to.
2. A single engine that must *also* run the managed multi-user tier can only be Postgres, which
   keeps "[the cloud runs the same core](../tiers.md#the-fallback-guarantee)" literally true at
   the storage layer.

Two commitments come with the decision:

- **Keep the schema portable** — prefer standard SQL and isolate Postgres-only features
  (declarative partitioning, `pgvector` operators) behind a thin data-access layer — so an
  embedded SQLite profile stays *cheap to add later* rather than a rewrite.
- **Explicit revisit trigger:** if a packaged single-user distribution becomes a priority, or
  the Postgres dependency is *measured* to cost adoption, write a follow-up ADR for an embedded
  SQLite profile — gated on that evidence, not on taste.

The full evaluation that led here is preserved below, because the reasoning is the point.

## Context — why this is a genuine question, not a settled one

The whole product ethos points at SQLite. The default install is **single-user, self-hosted,
local-first**, and [Deployment](../deployment.md) works to keep the footprint small and Docker
optional. An embedded engine — one file, zero configuration, no separate process — is the
maximal expression of that: nothing to run, nothing to operate, a database the user can copy,
back up, or delete as a single artifact. Sovereignty is easier to reason about when the store
is a file you hold.

So the question is not "why would anyone use SQLite" — it is "**why should the default carry a
Postgres server at all**." ADR-0002 assumed the server without arguing against the embedded
option. Here is that argument, on both sides.

## The query surface each engine must serve

| Requirement (from ADR-0002 / RAG design) | Postgres | SQLite |
|---|---|---|
| **Vector / ANN search** over embeddings (documents, notes, imaging, genomes) | `pgvector`, mature HNSW indexing | `sqlite-vec` — real, but younger; ANN indexing is less proven, closer to brute-force at scale |
| **FHIR-shaped JSONB + extracted index columns** | JSONB with GIN, expression, and partial indexes | JSON + generated columns + btree — works, but a narrower indexing toolkit |
| **High-frequency time-series** (per-second HR ≈ 30M+ rows/yr per stream) | Declarative partitioning, BRIN, O(1) partition-drop for retention | A narrow indexed table handles 100M+ rows fine; the gap is *retention/rollup* (no partition-drop), not viability |
| **Concurrent background ingestion + interactive agent reads** | MVCC; ingestion writes while the agent queries | **Single writer** — WAL gives many readers but serializes writers; a long ingest can block a write |
| **Full-text** | `tsvector` | FTS5 (excellent) |
| **Managed multi-user tier** (ayuOS Cloud) | Designed for it | Not designed for it |

On inspection, only **one** row is a genuine capability gap for a single user:
**vector-index maturity** (`pgvector`'s HNSW vs the younger `sqlite-vec`). The concurrency row
looks decisive but mostly is not here — wearable ingestion is bursty batch, so there is
effectively one writer (the ingest job) plus a read-only agent, which is SQLite's happy path
(WAL keeps reads live even during a large backfill).

### Does per-second heart rate force Postgres? No.

This was the specific worry, so it is worth settling. 1 Hz HR is ~86,400 samples/day ≈ **31.5M
rows/year** per stream; a few continuous streams put it at 50–100M rows/year. In a **narrow**
table — `(ts, stream_id, value)`, ~20–30 bytes/row — that is a couple of GB, and SQLite is
comfortable at hundreds of millions of narrow rows with a `(stream_id, ts)` index. Range
aggregations ("mean HR over 90 days") are btree range scans.

- **The single-writer limit does not bite.** Ingestion is bursty batch, not real-time
  streaming; a day of HR inserts in well under a second in one transaction, and WAL lets the
  agent keep reading throughout — even during an initial Apple Health backfill of tens of
  millions of rows.
- **The 20–40× argument does not apply.** That was about storing samples as FHIR JSONB
  *Observations*; a narrow table is cheap in **both** engines, so it does not favour Postgres.

Where per-second HR *does* favour Postgres is **operational, not correctness**: automated
retention via partition-drop (in SQLite, `DELETE` + `VACUUM` rewrites) and maintained rollups.
A single user can defer both. So per-second HR is **not** a reason the default must be Postgres.

## The two coherent options

There is no third: either one engine serves both ends, or the ends are served by different
engines. "Use whichever" is not a design — it is two backends without saying so.

### Option A — One engine, Postgres (reaffirm ADR-0002)

- **For:** A single code path, one SQL dialect, one index strategy, one test matrix. It is also
  the *only* single engine that can also run the managed multi-user tier, which keeps
  "[the cloud runs the same core](../tiers.md#the-fallback-guarantee)" literally true at the
  storage layer.
- **Against:** A self-hosted single-user install carries a Postgres process (~2 GB working set
  per [Deployment](../deployment.md)) and the ops that implies — more than a file. For a casual
  user, that is real friction, and adoption is the thing the [governance model](../governance.md#why-mit)
  optimizes for.

### Option B — Tiered default: SQLite local, Postgres for scale and managed

- **For:** Zero-ops, single-file, minimal footprint for the common single-user case; maximal
  sovereignty. Postgres is required only when a user crosses into high-frequency continuous
  streams at scale or onto the managed tier, with a one-command migration at that threshold.
- **Against:** **Two backends is the maintenance tax this project explicitly says kills it.**
  [CLAUDE-level risk framing](../governance.md) names maintainer burnout — not commercial
  capture — as the failure mode; two SQL dialects, two index strategies, and a doubled test
  surface land squarely on the smallest team least able to pay it. It also softens the "same
  core" claim: the default local install would run a *different storage engine* than the cloud.

## Recommendation

!!! note "Resolution — 2026-08-03, after examining per-second HR"
    The per-second-HR analysis above removed the time-series volume argument and most of the
    concurrency argument for a single user, leaving `sqlite-vec`'s ANN maturity as the only
    surviving capability gap. So the A-vs-B call came down to a values judgment —
    **two-backend maintenance tax (favours A)** vs **local simplicity and adoption (favours
    B)** — with per-second HR *not* a deciding factor either way. **Decided: Option A.** The
    maintenance tax and the single-engine/managed-tier parity outweigh the local-ergonomics
    win; the managed tier's use of Postgres is not, on its own, enough to justify a different
    engine locally. See the [Decision](#decision) at the top. The text below is the reasoning
    trail.

**Original recommendation — reaffirm Option A — Postgres as the single engine — on an explicit,
narrower reason than ADR-0002 gave.** The capability gaps (concurrency, `pgvector`) are real but not, by themselves,
disqualifying for a single user. The decider is the project's own stated failure mode: a
two-backend store is a standing tax on maintenance, and a single engine that must *also* run
the managed tier can only be Postgres. SQLite loses not because it is weak, but because
shipping it *alongside* Postgres doubles the surface, and shipping it *instead* of Postgres
abandons the managed tier.

Concretely:

1. Keep Postgres as the sole store; document SQLite honestly (this ADR) so the choice is on the
   record rather than accidental.
2. Keep the schema **portable** — prefer standard SQL and isolate Postgres-only features
   (partitioning, `pgvector` operators) behind a thin data-access layer — so an embedded
   profile stays *cheap to add later* without a rewrite.
3. Make the revisit trigger explicit (below). Do not build a second backend speculatively.

**Revisit trigger:** if a packaged single-user distribution becomes a priority, *or* the
Postgres dependency is measured to cost adoption, write a follow-up ADR for an embedded SQLite
profile — gated on that evidence, not on taste.

## If Option B is chosen instead

For completeness, accepting the tiered default would require, at minimum:

- ADR-0002's "**one Postgres instance**" → "Postgres *or* SQLite, by deployment profile."
- [storage.md](../storage.md): schema documented as portable; partitioning/BRIN marked
  Postgres-profile-only.
- [deployment.md](../deployment.md): the single-user default drops the Postgres process.
- A **SQLite→Postgres migration tool** becomes a day-one commitment (the tier promise is only
  credible if crossing the threshold is one command).
- The "same core" wording in [tiers.md](../tiers.md) and [governance.md](../governance.md)
  reworded to acknowledge a storage-engine difference between the default local install and the
  managed tier.

## Consequences (of the recommended Option A)

- Postgres remains a hard dependency of a self-hosted install. Mitigation: the `ayu` launcher
  starts and health-checks it ([Deployment](../deployment.md)); a bundled setup hides the ops.
- The SQLite decision is now **documented, not accidental** — the original ADR-0002 omission is
  closed.
- Schema work inherits a soft constraint: stay portable enough that the embedded profile is a
  future ADR, not a rewrite.

## Open questions

- [ ] Is the Postgres footprint on a single-user Mac Mini actually a *measured* adoption
      barrier? This is the evidence the revisit trigger waits on.
- [ ] Could the managed tier run Postgres while local runs SQLite, accepting a softer "same
      core" claim? This is the real crux of Option B and deserves a straight yes/no from the
      maintainers.
- [ ] How much of the query surface can stay engine-neutral behind the data-access layer, and
      what is the cost of that abstraction versus using Postgres features directly?
