# Blaze

| | |
|---|---|
| **Verdict** | ⚠️ Documented fallback — not adopted |
| **Role considered** | Lightweight replacement for Medplum as the clinical store |
| **License** | Apache-2.0 |
| **Version at evaluation** | v1.10.1, released 2026-07-02; commits landing daily |

## What it is

A FHIR R4 server in Clojure with **embedded RocksDB storage** — a single process, no external
database. [samply/blaze](https://github.com/samply/blaze), 226 stars.

Production-grade. README: *"Blaze is stable and widely used in
the Medical Informatics Initiative in Germany and in Biobanks across Europe."* Peer-reviewed:
Kiel et al., *Stud Health Technol Inform* 336 (MIE 2026), [doi:10.3233/SHTI260455](https://doi.org/10.3233/SHTI260455).

## What makes it attractive

**One process.** `docker run -d -p 8080:8080 samply/blaze:latest` and you're done — versus
Medplum's four containers. This is the single biggest operational advantage of any option
evaluated.

- **arm64 verified directly against GHCR** — `ghcr.io/samply/blaze:latest` returns an OCI
  image index with both `linux/amd64` and `linux/arm64`. Images are cosign-signed.
- Search is strong: forward chaining (multi-hop, [#294](https://github.com/samply/blaze/issues/294)
  closed as completed), `_has` reverse chaining, `_include`/`_revinclude`, `_elements`,
  `_summary`, `_total=accurate`, `$everything`, transaction/batch, full `_history`/vread,
  GraphQL, CQL.

## Why it was not adopted

**RocksDB is the disqualifier, and it is specifically fatal for ayuOS's requirements.**

The clinical store becomes an **opaque key-value blob you cannot join against pgvector**. The
entire reason the storage question is open is the need for cross-cutting SQL queries linking
goals and plans to biomarkers and wearable metrics. Blaze makes those *impossible*, not merely
unsupported. It is the lightest option and the worst fit for the actual requirement.

It also doubles the backup surface — Postgres `pg_dump` plus a separate RocksDB snapshot.

The architecture doc says Postgres *"would be possible"* but it is **not implemented**.

Blaze's differentiator — CQL over millions of patients — is worth **exactly nothing at n=1**.

## Other costs

| Issue | Detail |
|---|---|
| **Silent-drop hazard** | *"By default, Blaze ignores unknown or unsupported search parameters."* If adopted, `Prefer: handling=strict` would be **mandatory on every agent-issued query** — a grounded evidence-labeling agent cannot silently receive unfiltered results. |
| **No `$validate`** | Enumerated `docs/api/operation/` — terminology validation only (`code-system-lookup`, `value-set-validate-code`), **no resource/profile validation operation**. Verified, not inferred. |
| `_sort` | Only `_id`, `_lastUpdated`, `-_lastUpdated` |
| No `_filter`, no `_contained` | Documented gaps |
| `_count` | Capped at 10,000 |
| **Opaque runtime** | A JVM/Clojure black box. Nobody on a TypeScript/Python team debugs Blaze internals. |

⚠️ **Unverified: single-user RAM footprint.** The [production sizing table](https://github.com/samply/blaze/blob/main/docs/production-configuration.md)
starts at **10k patients → 2 cores / 8 GiB / 100 GB SSD** — population-scale biobank numbers,
orders of magnitude above one person's lifetime record. Defaults are a 128 MiB block cache
with no `-Xmx` set (JVM takes ¼ of container memory), suggesting ~1 GB is plausible, but the
n=1 case is undocumented and would need measuring. The *"16 GB of RAM"* note in their docs
refers to the full demo stack (frontend + Keycloak + nginx), not the bare backend.

⚠️ Also unverified: whether Blaze supports `PATCH` — absent from its interaction docs.

## What would change this

Adopt only if Medplum's four-container footprint proves unworkable on a 16 GB Mac
Mini **and** the cross-cutting-query requirement is dropped or moved entirely into the
`ayuos` schema. If the store must be joinable, [HAPI](hapi-fhir.md) is the correct fallback
instead — it is heavier but Postgres-backed.

## Sources

[samply/blaze](https://github.com/samply/blaze) ·
[architecture](https://github.com/samply/blaze/blob/main/docs/architecture.md) ·
[search-type](https://github.com/samply/blaze/blob/main/docs/api/interaction/search-type.md) ·
[production config](https://github.com/samply/blaze/blob/main/docs/production-configuration.md)
