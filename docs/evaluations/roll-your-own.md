# Roll your own — FHIR on Postgres JSONB

| | |
|---|---|
| **Verdict** | 🔄 Live option for [ADR-0002](../adr/index.md) — materially cheaper than first assumed |
| **Role** | Alternative to running a FHIR server: own the schema, keep FHIR as the interchange format |

## Why this is on the table

The objection to Medplum is not weight — it's **being boxed in on data modelling**:

- A goal's tracking metric is polymorphic (a biomarker `Observation` one cycle, a wearable
  `SeriesType` the next), so it becomes a soft reference into two different stores with no FK.
- A nutrition plan — trigger points, what to eat, why — has no honest FHIR home.
  `NutritionOrder` is inpatient meal ordering; `PlanDefinition` is clinical decision support.
- **FHIR search cannot express cross-resource joins.** `_include` only walks references. The
  cross-cutting queries a personal health agent needs require dropping to SQL — and Medplum
  documents its schema as *"an internal detail subject to change."*

## The finding that changed the cost estimate

**`@medplum/core` and `@medplum/definitions` work standalone — Apache-2.0, zero runtime
dependencies, no Medplum server required.** Verified by installing into an empty project and
running offline:

```
missing required status        → INVALID ✅
valueQuantity + valueString    → INVALID: Conflicting choice of type ✅
obs-6 invariant violation      → INVALID ✅
unknown property               → INVALID ✅
status: 'bogus'                → passes ❌ (no terminology binding)
```

That `obs-6` line matters: it evaluates FHIR **invariants** (FHIRPath `constraint`
expressions), which JSON Schema structurally cannot. It is the only fully-offline JS validator
found that does.

What you get without running a server:

| Need | Exported function |
|---|---|
| FHIRPath | `parseFhirPath`, `evalFhirPath`, `evalFhirPathTyped` |
| SearchParameter registry | `getSearchParameter(s)`, `getSearchParameterDetails`, `indexSearchParameterBundle` |
| **Write-time index extraction** | `convertToSearchableTokens` / `Dates` / `Quantities` / `References` / `Strings` / `Uris` / `Numbers` |
| Validation | `validateResource(resource, options)` |
| In-memory search matching | `matchesSearchRequest`, `parseSearchRequest` |

Cost: **93 MB** of `@medplum/definitions`, 242 ms startup indexing.

This is the hard, spec-fiddly part available as a library. **You supply only the SQL and your
own schema.**

## The scope is smaller than it looks

Counted against the actual R4 registry, scoped to the 16 resource types a personal health app
touches:

- **295** relevant `(resourceType, code)` SearchParameters
- **76% are token or reference** (114 token, 108 reference); date is only 26
- The *"what changed in my last 90 days"* anchor workflow needs **~28**, all standard
- FHIRPath features required across all 1,372 R4 expressions: `|` union (83), `.where()` (77,
  only 8 distinct argument shapes), `as` (69), `is` (28), `resolve()` (50), `.exists()` (1) —
  and **zero** uses of `.ofType()`, `.extension()`, `%resource`, `descendants()`, `iif()`

**`resolve()` is the single blocker**, and all 50 occurrences are the identical form
`.where(resolve() is Patient)` — special-case-able.

> Token + reference + a correct date-range implementation gets you **~85%** of what ayuOS needs.

## The design consensus to follow

HAPI, Medplum, Aidbox, and WSO2 converged independently on the same shape:

**JSONB resource blob + per-type shadow index columns/tables + `low`/`high` range columns +
a separate scalar sort column.** Postgres 16's native `tstzrange`/`tstzmultirange` + GiST
gives you this nearly free.

Two spec facts drive the difficulty:

- **Date prefixes are interval operators, not scalar comparisons.** `eq` means "range fully
  contains search range"; `2013-01-14` is itself the range `[00:00, next-day 00:00)`; and the
  stored `Observation.effective` may be a `Period`. All four reference implementations solved
  this with low/high columns — and all four carry a **separate sort column, because ranges
  are not orderable**.
- **Token search has three forms**, one counterintuitive: `code` matches any system,
  `system|code` is exact, and **`|code` matches only where there is NO system**. HAPI uses
  three precomputed hashes; Medplum uses delimited `text[]` with a null-system sentinel.

## Two things that must be day-one decisions

Both are cheap now and **irrecoverable later**:

1. **Append-only version history.** One extra table, one INSERT per write. You cannot
   reconstruct versions you never wrote — and *"what changed"* is the anchor workflow.
2. **Date range + separate sort columns.** Retrofitting means reindexing everything.

Also note the dependency chain: FHIR defines **conditional create/update** as *"performs a
search using its standard search facilities"*, and transaction Bundles may carry search-URI
references servers SHALL resolve. So idempotent ingest and transaction processing are
*downstream of search* — nearly free once search exists, impossible before.

## The honest counterweight

- Medplum's search implementation is **~5,650 lines** (`search.ts` 1,916 · `sql.ts` 1,457 ·
  `token-column.ts` 524 · `range-column.ts` 390 · lookups ~1,084) plus `repo.ts` at 2,649 for
  CRUD/history — and they are on **schema migration v110**.
- **`wso2/fhir-server`** is a funded team building this exact design. Its own README, after
  ~1 month, documents: `_sort` **silently ignored**, `quantity`/`uri` indexed but not
  queryable, `sa`/`eb` "parse but fall back to `eq`", no chaining or `_has` at all.

The 85% version is achievable. Full fidelity is a multi-year artifact.

## Language constraint (unexpected)

If you own the store, **you write it in TypeScript**:

| Language | Blocker |
|---|---|
| **Python** | `fhir.resources` **dropped R4 at v7.0.0**. Options are R4B (a semantic compromise) or pinning 6.5.0 — pydantic v1, unmaintained since Jan 2023. |
| **Rust** | **No R4 models exist anywhere.** `fhir-sdk` ships stu3/r4b/r5 only, with FHIRPath and validation explicitly unimplemented. |
| **Go** | `fhir-toolbox-go` is genuinely good (real FHIRPath v2.0.0 with UCUM) but is **v0.0.4**. |

See [FHIR libraries](fhir-libraries.md) for the full survey.

## What you lose, ranked by retrofit difficulty

| | Loss | Note |
|---|---|---|
| **Hard** | Version history / `_history` / vread | Must be in the write path from day one |
| **Hard** | Conditional create + transaction Bundles | Downstream of search; breaks ingest without it |
| **Moderate** | `_include`/`_revinclude`, chaining, CapabilityStatement, Subscriptions | Bolt on later |
| **Cheap** | AccessPolicy / compartments | Near-irrelevant at n=1; and `compartmentdefinition-patient.json` hands you `$everything` as data (145 resource types, 66 with linking params) |
| **Cheap** | Terminology / `$validate` / ValueSet expansion | Never part of a FHIR *store*; delegate |

## Reference implementations

- **Medplum's schema is the best documented** — [search architecture](https://www.medplum.com/docs/contributing/search-architecture). Four strategies: `COLUMN`, `TOKEN_COLUMN`, `RANGE_COLUMN` (native `TSTZMULTIRANGE`/`NUMMULTIRANGE` + `__xxxSort` scalars), `LOOKUP_TABLE`.
- **[wso2/fhir-server](https://github.com/wso2/fhir-server)** (Go + Postgres, Apache-2.0) — closest to this exact design; its honest limitations list is the best available cost estimate. ⚠️ Created 2026-06-17, 7 stars.
- **FHIRbase is dead and never had search.** Frozen ("*untill new hero will support it*"), and the shipped SQL has six CRUD functions, zero `CREATE INDEX`, and the word "search" appears zero times. Readable as a design reference only.

## What would change this

Adopt if [ADR-0002](../adr/index.md) concludes that owning the models is worth ~85% FHIR
search fidelity. Reject if the anchor workflows turn out to need chaining, `_has`, or
conformance-grade validation — or if the team is not writing TypeScript.
