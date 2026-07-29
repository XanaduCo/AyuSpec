# FHIR libraries by language

Reference survey of FHIR model, FHIRPath, and validation libraries — the toolkit available if
ayuOS [owns its store](roll-your-own.md), and the validation options regardless of that
decision.

**Headline: if you own the store, you write it in TypeScript.** Python's R4 support is broken,
Rust has no R4 at all, and Go has no FHIRPath in a maintained models library.

## Empirical results

Two FHIRPath engines were benchmarked by execution, not documentation:

| Test | fhirpath.js 5.0.0 | fhirpathpy 2.2.3 |
|---|---|---|
| Compile all 1,372 R4 SearchParameter expressions | **100%** | **100%** |
| Evaluate them | all except `resolve()` | all except `resolve()` |
| Official HL7 FHIRPath R4 suite (854 runnable) | **~94.8%** | **~88.6%** |

⚠️ The suite comparator was a naive string match, so some "failures" on both engines are
harness artifacts (timezone normalization, `%sct`/`%loinc` env vars the spec expects the host
to preload, 35 `invalid="semantic"` tests). **Directly comparable to each other; not citable
as conformance figures.**

**`resolve()` is the only blocker**, appearing in exactly 50 params, all of the identical form
`.where(resolve() is Patient)`.

## TypeScript / JavaScript — the viable path

| Package | Version | License | Role |
|---|---|---|---|
| **`@medplum/core`** | 5.1.27 (2026-07-24) | Apache-2.0 | **The toolkit.** Zero runtime deps, 365 exports |
| **`@medplum/definitions`** | 5.1.27 | Apache-2.0 | R4 bundles offline — **93 MB installed** |
| `@medplum/fhirtypes` | 5.1.27 | Apache-2.0 | R4 types |
| `fhirpath` (HL7) | 5.0.0 (2026-07-13) | custom BSD-like | Reference FHIRPath; ships R4 model files |
| `@types/fhir` | 0.0.44 (2026-06-09) | MIT | Types only, 5 FHIR versions |
| `fhir-kit-client` | 2.0.3 (2026-07-27) | MIT | REST client only |

**`@medplum/core` is the key finding** — it works standalone with no Medplum server. See
[roll-your-own](roll-your-own.md#the-finding-that-changed-the-cost-estimate) for the verified
validation behaviour, including that it evaluates **FHIR invariants** (the `obs-6` constraint),
which JSON Schema structurally cannot.

Two warts: structural errors **throw** `OperationOutcomeError` while choice-type conflicts
**return** an issues array (you need both try/catch and a return check); and
`@medplum/fhirtypes` mixes **Medplum-proprietary resources** (`AccessPolicy`, `Bot`, `Agent`)
into the same namespace as spec types.

**`fhirpath` (HL7) licence note:** GitHub reports `NOASSERTION` because it is a **custom
BSD-derived licence** (NLM/LHNCBC + Health Samurai), functionally BSD-3-equivalent but not an
OSI identifier. **Your licence scanner will flag it** — worth a dependency-policy note. You
must pass the R4 model explicitly (`require('fhirpath/fhir-context/r4')`) or `.as()`, choice
types, and date comparison silently degrade. `%resource` is **not auto-populated** — matters
for invariant validation, not for search params.

⚠️ **npm `fhir` is a trap** — stuck at 4.12.0 (2023-08-07). The project **renamed** to
[`fhir-tool`](https://www.npmjs.com/package/fhir-tool) (5.0.2, 2026-03-07). If `fhir` is in a
lockfile you are on a 3-year-old build.

## Python — R4 support is broken

**🚨 `fhir.resources` dropped R4 at v7.0.0.** README, verbatim: *"From `fhir.resources` version
7.0.0; there is no FHIR `R4` instead of `R4B` is available as sub-package."*

| Version | Date | Default | Pydantic |
|---|---|---|---|
| **6.5.0** — last with R4 | **2023-01-01** | R4 (4.0.1) | **v1** |
| 8.3.0 | 2026-07-03 | R5 | v2 |

So: pin 6.5.0 (unmaintained 3.5 years, pydantic v1 — a hard blocker in a modern stack) or use
**R4B**. The official R4 `observation-example.json` **does parse under `fhir.resources.R4B`**
(verified), and R4B is a near-superset for clinical resources — but that is a **semantic
compromise to record as a decision, not discover later**. ⚠️ HL7's
[Strategies for dealing with R4 and R4B](https://confluence.hl7.org/display/FHIR/Strategies+for+dealing+with+R4+and+R4B)
is the authority.

Performance: ~8,600 parse+validate/sec, roughly **6× the cost of plain JSON**. Fine for
wearable/lab ingest; not for a tight per-datapoint loop over years of Apple Health samples.

**`fhirpathpy` is not sufficient for anything beyond search indexing.** Beyond missing
`resolve()`, `memberOf()`, `sort()`, `%resource`, and `%terminologies.*`, it **crashes on
valid FHIRPath**:

```
6 days < 1 week        → TypeError: FP_Type.compare() takes 1 positional argument
(1 'g') > (500 'mg')   → TypeError: FP_Type.compare() ...
2.0 'cm' * 2.0 'm'     → TypeError: Object of type FP_Quantity is not JSON serializable
```

UCUM comparison is broken — there is no UCUM library, just a hardcoded time-unit map.
fhirpath.js gets all of these right via `@lhncbc/ucum-lhc`.

**Usable Python stack:** `fhirclient` (SMART on FHIR OAuth2 launch flows — the only lib that
gives you this) + `fhir.resources[R4B]` + `fhirpathpy` for indexing only.

⚠️ Do not confuse PyPI `fhirpath` (nazrulworld, **GPL-3.0**, abandoned 2020) with
`fhirpathpy` (MIT). GPL would be a licensing problem next to an AGPL core.

## Rust — not viable

**No R4 models exist anywhere in the ecosystem.** `fhir-sdk` 0.16.0 (MIT, maintained) ships
features `stu3`, `r4b`, `r5` only — no `r4` — and its README marks **FHIRPath and validation
as unimplemented**. `fhirbolt` is dormant since 2023-05-17. The `fhirpath` crate is 0.1.0 from
2024 with no repository link.

Fine for a performance-critical component treating FHIR as opaque JSON. Not for the
storage/validation layer.

## Go — models yes, FHIRPath mostly no

| Library | Version | Status |
|---|---|---|
| `DAMEDIC/fhir-toolbox-go` | v0.0.4 (2026-05-03) | **Best option** — real FHIRPath v2.0.0 with UCUM, R4/R4B/R5 |
| `fastenhealth/gofhir-models` | v0.1.1 (2026-06-18) | Active fork of samply; models only |
| `samply/golang-fhir-models` | v0.3.2 (**2022-12**) | Stale |
| `google/fhir` (Go module) | **2022-08** | Untagged since; protobuf-first |

`fhir-toolbox-go` is the standout outside JS — UCUM via `github.com/iimos/ucum`, decimals at
34 significant digits (spec floor is 18), `precision()`/`lowBoundary()`/`highBoundary()`
implemented. **v0.0.4 is the risk.** Explicitly missing `resolve()` and `conformsTo()`.
⚠️ It runs the official FHIRPath suite but **modifies the cases first**, so the green CI badge
is not a clean pass rate.

## Java and .NET — both usable as libraries

- **HAPI** — `hapi-fhir-structures-r4` and `hapi-fhir-validation` are **separate Maven
  artifacts** from the JPA server, both Apache-2.0. The only reference-grade R4 validator. See
  [HAPI evaluation](hapi-fhir.md#as-a-validator-genuinely-best-in-class).
- **Firely .NET SDK** — **BSD-3-Clause and free for commercial use**, verified three ways
  (repo LICENSE, NuGet `licenseExpression: BSD-3-Clause`, README). GitHub's `NOASSERTION` is a
  false alarm. **The paid product is Firely *Server*, a different thing** — see
  [rejected servers](rejected-fhir-servers.md#firely-server-ex-vonk-licence-model-is-structurally-incompatible).
  Breaking change: SDK 6.0 dropped `netstandard2.0`.

## JSON Schema — weaker than HL7's own table implies

HL7 publishes [`fhir.schema.json.zip`](https://hl7.org/fhir/R4/downloads.html) (3.4 MB,
draft-06, 680 definitions, frozen at 4.0.1 / 2019-11-01). Tested directly:

| Test | Caught? |
|---|---|
| `status: 'bogus'` (required-binding code) | ✅ |
| `birthDate: 'not-a-date'` (primitive regex) | ✅ |
| unknown property | ✅ |
| **missing required `Observation.status` (1..1)** | ❌ |
| **`valueQuantity` + `valueString` (choice violated)** | ❌ |
| **invariant `obs-6`** | ❌ |
| wrong Reference target type | ❌ |

Two undocumented gaps worse than the spec's table suggests:

1. **Cardinality is only partially enforced despite a ✅ in HL7's table.** `Observation.status`
   is 1..1 but `required` is only `["code", "resourceType"]` — **required elements of
   primitive type are systematically omitted**, necessarily, because FHIR permits a primitive
   to be represented solely by its `_status` sibling. And **`minItems`/`maxItems` appear zero
   times in the entire 3.4 MB file** — no array bounds at all.
2. **Choice types are unconstrained.** `"oneOf"` occurs exactly twice in the whole file, both
   at the top-level resource dispatch. A resource with both `valueQuantity` and `valueString`
   validates clean.

**Use it as a cheap first-pass ingest filter. Never treat a pass as "valid FHIR."** Layer
`@medplum/core` behind it, and HAPI as a sidecar where bindings/profiles matter.

## Machine-readable SearchParameters

Two forms, both verified by download:

1. [`search-parameters.json`](https://hl7.org/fhir/R4/search-parameters.json) — 2.2 MB Bundle,
   **1,375 entries, 1,372 with an `expression`**
2. `hl7.fhir.r4.core@4.0.1` npm package — 1,400 individual files (the extra ~25 are extension
   packs)

**Two gotchas confirmed by reading the JSON:**

- **Composite params carry a useless expression.** `Observation-code-value-quantity` has
  `"expression": "Observation"`. The real definition is in `component[]`.
- **Multi-base params share one giant expression.** `clinical-date` covers 17 resource types
  in a single `|`-union. **Evaluate per resource type, not blindly.**

The biggest leverage point for [roll-your-own](roll-your-own.md): you can **drive an indexer
from the spec** rather than hand-writing 205 cases.
