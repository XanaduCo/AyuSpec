# HAPI FHIR

| | |
|---|---|
| **Verdict** | ⚠️ Conservative fallback — not adopted |
| **Role considered** | Replacement clinical store; **also usable as a validation library** |
| **License** | Apache-2.0 |
| **Version at evaluation** | Core v8.10.1 (2026-07-22); starter image v8.10.0-3 |

## What it is

The reference Java FHIR implementation, and **the most consistently maintained FHIR library
in any language** — `hapi-fhir-structures-r4` has 123 published versions. 2,367 stars, last
commit the day of evaluation.

Two distinct things worth separating:

1. **The JPA server** — a full FHIR R4 server, Postgres-backed, 2 processes (server + PG)
2. **The libraries** — `hapi-fhir-structures-r4` (models, `FhirContext`, parsers) and
   `hapi-fhir-validation` (`FhirInstanceValidator`), **separate Maven artifacts** from
   `hapi-fhir-jpaserver-base`. You can use these without running the server.

## As a store — the fallback, not the pick

**Most complete R4 search of any option evaluated.** Chaining, `_sort` on single chained
expressions, `_has`, uplifted refchains. Documented gaps: chains inside `_has` unsupported,
`_filter` only partial, `near` is a bounding box not a radius.

**arm64 verified** — `hapiproject/hapi` publishes arm64 (~435 MB).

Why not adopted over Medplum:

- **JVM in the process map** on a Mac Mini already running Ollama. Community consensus is
  ~2 GB RAM; ⚠️ **no official figure is published.**
- The starter README warns: *"no security implementation," "no enterprise logging."*
- No advantage over Medplum on the thing that actually matters — both are Postgres-backed and
  joinable; Medplum is lighter and TypeScript, matching the rest of the stack.

It is the **correct fallback** if Medplum's ops burden proves too high, because unlike
[Blaze](blaze.md) it keeps the store in Postgres and therefore joinable against pgvector.

## As a validator — best-in-class

This is the more likely near-term use. `hapi-fhir-validation` is **the only reference-grade
FHIR R4 validator** — the same code path as the `validator_cli.jar` HL7 uses to validate the
published spec examples.

| Validator | Structure | Cardinality | Bindings | Invariants | Profiles |
|---|:---:|:---:|:---:|:---:|:---:|
| `fhir.schema.json` + ajv | ✅ | partial | codes only | ❌ | ❌ |
| `@medplum/core` | ✅ | ✅ | ❌ | ✅ | ❌ |
| **HAPI `org.hl7.fhir.validation`** | ✅ | ✅ | ✅¹ | ✅ | ✅ |

¹ bindings require a terminology server

**Recommended pattern:** run it as a **JVM sidecar behind a small HTTP boundary** — the same
process-isolation shape the project already knows — and call it only for ingest-time
validation of imported EHR data (US Core conformance) and doctor-packet generation, keeping
`@medplum/core` on the hot path. This gets reference-grade conformance without a JVM in the
request path.

## What would change this

- Adopt the **store** if Medplum's upgrade treadmill or footprint becomes untenable and the
  store must stay Postgres-joinable.
- Adopt the **validator sidecar** independently of the store decision, if US Core conformance
  on imported records turns out to matter — it is orthogonal to [ADR-0002](../adr/index.md).

## Sources

[hapifhir/hapi-fhir](https://github.com/hapifhir/hapi-fhir) ·
[JPA search docs](https://hapifhir.io/hapi-fhir/docs/server_jpa/search.html) ·
[JPA schema](https://hapifhir.io/hapi-fhir/docs/server_jpa/schema.html) (states *"This page is a work in progress"* — design reference, not a stable contract) ·
[starter](https://github.com/hapifhir/hapi-fhir-jpaserver-starter)
