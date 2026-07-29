# ADR-0002: Clinical data store

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-29 |
| **Related** | [ADR-0001](0001-ehr-ingestion.md) · [Storage spec](../storage.md) |

!!! info "Per-service detail"
    [Medplum](../evaluations/medplum.md) · [Roll your own](../evaluations/roll-your-own.md) ·
    [Blaze](../evaluations/blaze.md) · [HAPI](../evaluations/hapi-fhir.md) ·
    [Aidbox](../evaluations/aidbox.md) · [Rejected servers](../evaluations/rejected-fhir-servers.md)

## Context

The question was whether to keep Medplum as the FHIR store or build our own. Two objections
drove it; only one survived investigation.

**Disproven — "Medplum is a complex beast; you have to run an entire cluster."** The stack was
run and measured on Apple Silicon: **4 containers** (3 if we ship our own UI), **~600 MB RAM
idle**, ~0% CPU, native arm64, up in ~90 seconds. Medplum's own docs explicitly bless
*"a lightweight instance running on a small machine"* — the alarming self-hosting warnings are
scoped to at-scale multi-tenant deployments. Weight is not a reason to move.

**Survived — the data model is the real constraint.** Three concrete problems:

1. **FHIR search cannot express cross-resource joins.** `_include` only walks references.
   *"Show progress toward my ApoB goal, joined against the experiment window and the wearable
   baseline"* is not expressible.
2. **Polymorphic metric references.** A [goal](../experimentation.md)'s tracking metric may be
   a biomarker (`Observation` in Medplum) one cycle and a wearable metric (`SeriesType` in
   Open Wearables) the next — a soft reference into two stores with no FK and no type safety.
3. **Some objects have no honest FHIR home.** A nutrition plan with trigger points and
   rationale is not `NutritionOrder` (inpatient meal ordering) or `PlanDefinition` (clinical
   decision support).

And the escape hatch is closed: Medplum documents its Postgres schema as **"an internal detail
subject to change"**, so the SQL join that would solve this is precisely the query we are not
supposed to write.

A separate finding reopened the build-our-own option: **`@medplum/core` and
`@medplum/definitions` work standalone** — Apache-2.0, zero runtime dependencies, no server
required — shipping a FHIRPath engine, the SearchParameter registry, write-time index
extractors, and a validator that evaluates FHIR invariants. Building our own store is
materially cheaper than assumed.

## Decision

**Medplum remains the system of record for clinical FHIR resources. ayuOS owns the read
model.**

- **Writes go through the Medplum FHIR API.** Ingestion adapters never write SQL directly.
  This is what buys version history, conditional create, transaction bundles, and validation.
- **A projection layer maintains ayuOS-owned SQL tables**, populated *via the FHIR API* —
  search and Subscriptions — never by reading Medplum's internal tables.
- **The agent queries the projections and the `ayuos` schema**, joined with ordinary SQL.
  Cross-cutting queries are native.
- **Projections are derived, disposable, and rebuildable** from Medplum at any time. They are
  a cache, not a second source of truth.

The existing `time_series_cache` — already specified as *"populated by a sync job from
Medplum"* — is the first instance of this pattern. This ADR generalizes it into the standard
read path.

```
Ingestion adapters ──FHIR API──► Medplum (system of record)
                                    │
                                    │ FHIR search / Subscriptions
                                    ▼
                          ayuOS projection tables ◄──── joins ────► ayuos schema
                                    │                                (goals, hypotheses,
                                    ▼                                 experiments, plans)
                              Agent queries (SQL)
```

### Why this rather than the alternatives

It delivers the actual requirement — owned models and fast cross-cutting queries — **without
rebuilding FHIR's correctness guarantees.** Two of those matter concretely here:

- **Idempotent ingest.** Apple Health exports are **cumulative full dumps**; every re-export
  re-imports everything. Conditional create (`ifNoneExist`) makes re-import safe. Without it
  we hand-roll dedup across ~1,300 Observations per import.
- **Version history.** Cannot be retrofitted — you cannot reconstruct versions never written —
  and *"what changed in my last 90 days?"* is the anchor workflow.

It is also **reversible**. If the projections end up carrying everything the agent needs,
migrating to a fully-owned store later is far easier than the reverse.

## Consequences

**Positive**

- Cross-cutting queries become ordinary SQL over tables we designed
- **No coupling to Medplum's internal schema** — we read through the supported API, so their
  "subject to change" caveat never bites
- Application objects ([hypotheses](../evidence.md), experiments, plans) join to clinical data
  with real SQL rather than soft references resolved in application code
- Medplum's upgrade treadmill affects only the write path; projections are rebuilt, not migrated

**Negative / accepted**

- **Projection lag.** Reads are eventually consistent with Medplum. Acceptable for a personal
  health agent; must be explicit in the UI for anything time-sensitive.
- **Double storage** of projected fields
- **Sync logic is ours to maintain** — including the rebuild path, which must be exercised in
  CI rather than assumed to work
- Medplum's operational costs remain: 3–4 containers, mandatory OAuth2, required Redis, and
  **no-skip-minor upgrades** (which becomes ayuOS's support burden at 1,000 self-hosters —
  budget a stepped-upgrade tool in the updater)

**Required regardless of this ADR** — Medplum's stock configuration is **not zero-egress**.
Account-creation paths call Google reCAPTCHA and Have I Been Pwned. Steady-state FHIR
operation is genuinely offline (verified), but the hardening in
[the Medplum evaluation](../evaluations/medplum.md#required-hardening-for-ayuos) is mandatory:
blank the reCAPTCHA and Google keys, seed the admin via config rather than registration, add a
volume for binary storage, pin image tags, bind ports to loopback.

## Consistency with the Open Wearables boundary

This confirms the resolution proposed in [Storage](../storage.md#the-open-wearables-medplum-boundary):
Open Wearables remains the system of record for raw device streams; clinically meaningful
metrics are projected into Medplum as LOINC-coded `Observation`s, and from there into the read
model. The agent queries one surface.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| **Keep Medplum as-is** (agent reads the FHIR API directly) | Cheapest and lowest-risk, but leaves the cross-cutting-query objection entirely unaddressed — the actual problem. |
| **Own the store entirely** (FHIR-as-JSONB + `@medplum/core`) | Genuinely viable and materially cheaper than assumed, but pays a ~85% search-fidelity ceiling, requires history and date-range design to be right on day one, and locks the storage layer to TypeScript (Python dropped R4 at v7.0.0; Rust has no R4 models at all). WSO2's *funded team* built this exact design and shipped after ~1 month with `_sort` silently ignored and no chaining. Not worth it while a projection layer solves the requirement. |
| **Blaze** | Lightest option — one process, embedded RocksDB — and therefore the **worst** fit: the clinical store becomes an opaque KV blob that cannot be joined against pgvector at all. |
| **HAPI FHIR** | No advantage over Medplum for the store role; adds a JVM. Retained as the fallback if Medplum's ops burden proves untenable, and worth adopting **separately** as a validation sidecar if US Core conformance matters. |
| **Aidbox** | Disqualified: free tier **prohibits PHI**, and instances **ping a licence portal every ~30 minutes**. |

## What would flip this

- Projection lag proving unacceptable for a core workflow
- The projection layer growing to the point that Medplum is only a write buffer — at which
  point the fully-owned store becomes the simpler system, and the migration is already half done
- Medplum's no-skip-minor upgrade policy becoming a genuine support burden across self-hosters
- A Medplum licence change (currently Apache-2.0)

## Open questions

- [ ] Which resources and fields get projected, and at what granularity?
- [ ] Projection freshness mechanism — Medplum **Subscriptions** (push) or polled search (pull)? Subscriptions are supported and would minimize lag.
- [ ] How is a full projection rebuild triggered and tested? (Must be a first-class, CI-exercised operation.)
- [ ] Does the `ayuos` schema share the Medplum Postgres instance, or get its own? Sharing enables single-query joins; separating cleans the upgrade story.
- [ ] The two [deferred decisions](../storage.md#deferred-decisions) are unchanged by this ADR — but note it **tips self-feedback toward FHIR `Observation`**, since anything in Medplum flows into the read model and joins for free.
