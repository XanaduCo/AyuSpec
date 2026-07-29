# FHIR servers surveyed and rejected

Servers evaluated for the clinical store role and rejected quickly enough not to warrant
their own page. Each entry states the disqualifier. Grouped as a single file so the
[evaluations index](index.md) stays readable.

The ones that got full evaluations: [Medplum](medplum.md), [Blaze](blaze.md),
[HAPI](hapi-fhir.md), [Aidbox](aidbox.md).

| Server | Language | License | Disqualifier |
|---|---|---|---|
| LinuxForHealth / IBM FHIR | Java 11 | Apache-2.0 | **Dead + amd64-only** |
| Firely Spark | C# / .NET | BSD-3 | **Silently returns wrong answers**; MongoDB |
| Microsoft `fhir-server` | C# / .NET | MIT | **Database cannot run on Apple Silicon** |
| Firely Server (ex-Vonk) | JVM | Proprietary | Per-instance licence; 30-day time bomb |
| fhir-candle | .NET | MIT | Explicitly not for production; in-memory |
| HeliosSoftware/hfs | Rust | MIT | v0.2.1, 41 stars, no validation engine |
| HasteHealth | Rust | Apache-2.0 | Search documentation is literally blank |
| wso2/fhir-server | Go | Apache-2.0 | Six weeks old — but see note |

---

## LinuxForHealth / IBM FHIR Server — dead, and amd64-only

**The tragedy of the survey.** Its R4 search conformance is arguably the best of any OSS
server — all param types including composite and special, full chaining **and** `_has`,
`_include`/`_revinclude` with `:iterate`, token modifiers `:in`/`:not-in`/`:above`/`:below`,
Touchstone-tested. A superset of Microsoft's.

All moot:

- **Last release 5.1.1, 2022-12-16.** Last commit on `main` **2023-05-17**. Zero commits since
  2024-01-01. 370 open issues. Not formally archived — the README still claims *"under active
  development"* — but that statement is stale. ⚠️ *No official deprecation notice exists; this
  conclusion rests on verified commit and release timestamps.*
- **No arm64 image on any registry.** `ghcr.io/linuxforhealth/fhir-server:latest` and `:5.1.1`
  are **single manifests, not manifest lists**, reporting `architecture=amd64`. The legacy
  Docker Hub repo has 35 tags, all amd64, newest 2022-09-13, no 5.x.
- Java 11 on Open Liberty 22.0.0.12 in mid-2026 is a security liability on its own.

⚠️ Unverified: whether the amd64 image runs acceptably under Rosetta/QEMU (OpenJ9 under
emulation is historically fragile), or whether a native arm64 build from source works.

## Firely Spark — alive, but silently wrong

Maintenance is genuinely healthy (Incendi took over from Firely; v3.1.0 released 2026-07-27,
~422 commits in 52 weeks). Rejected anyway, on three counts.

**The disqualifier, and it is severe: unsupported search parameters are dropped and the query
runs unfiltered, with no warning.** Tested empirically against their live reference server:

```
Patient?gender=male            → 204 results
Patient?_filter=gender eq male → 815 results   ← the full unfiltered count, silently
```

For an agent whose entire value proposition is grounded, evidence-labeled answers, a store
that silently returns *"everything"* when it doesn't understand a filter is disqualifying.

Also: `_has` unsupported since [#322](https://github.com/FirelyTeam/spark/issues/322) (open
since 2020); `Bundle.entry.search.mode` **not populated**, so you cannot distinguish matched
resources from `_include`d ones; **no authorization on the FHIR API at all**; and their own
README says *"should never be used as is in a production environment."*

Plus **MongoDB only** — a second database engine, unjoinable against pgvector.

## Microsoft / Azure `fhir-server` — the DB can't run on this hardware

Excellent maintenance (26 commits in 30 days, weekly releases). The **app image has arm64**.
Its **database does not**.

Microsoft ships no arm64 SQL Server image — the manifests are single, `amd64`. And they
explicitly disclaim emulation, repeated four times in the quickstart:

> *"SQL Server container images are supported only on Linux hosts running on Intel and AMD
> x86-64 CPUs. Emulation or translation environments (for example, Rosetta 2, Prism, or QEMU)
> aren't tested or supported."*

Azure SQL Edge, the old arm64 escape hatch, **retired 2025-09-30**. You would be emulating the
most latency-sensitive component, on an unpatched retired database, for personal health data.

Also: **no PostgreSQL provider**, self-described search support of **"Partial"** (76 fully
unsupported and 16 partially supported R4 search parameters in their own
`unsupported-search-parameters.json`), `_count` capped at 1,000, and **Cosmos support ends
2026-09-30**.

## Firely Server (ex-Vonk) — licence model is structurally incompatible

Proprietary. No free production tier — a 30-day evaluation licence renewed by emailing
`server@fire.ly`. Pricing not published.

The structural problem: *"a flat fee annual license for one (1) base instance"* and
*"A production instance is necessary for each unique database."* **Every ayuOS user's Mac Mini
would be a separate licensed production instance.** That cannot work for a self-hosted
per-user product.

⚠️ Unverified whether it phones home. The licence format (a `ValidUntil` date + signature,
deliverable via env var) has the shape of offline verification, and no telemetry setting
appears in the settings reference — but **Firely nowhere states validation is offline**. Moot
regardless: the 30-day expiry is a time bomb.

*(Note: the **Firely .NET SDK** is a different product — BSD-3-Clause and free. See
[FHIR libraries](fhir-libraries.md).)*

## fhir-candle — a test fixture, correctly labelled

MIT, .NET, actively maintained. Its README is explicit: *"NOT intended to be used for
production workloads."* In-memory only.

**Genuinely useful in one role:** a conformance/test fixture in CI. Not a store.

## HeliosSoftware/hfs — watch, don't build on

Rust, MIT, SQLite/Postgres/Mongo backends, multi-arch arm64, candid ROADMAP. Claims
R4/R4B/R5/R6, chained search, transactions, bulk export, SMART on FHIR, terminology, and a
FHIRPath engine.

Rejected on maturity, not design: **v0.2.1, 41 stars, created 2025-01-04**, no cited
third-party deployments — and its own ROADMAP lists **"FHIR Validation engine — 🟡 In
progress"**, i.e. there is none today. Betting a health-records project on it is unjustified.

## HasteHealth — marketing ahead of documentation

Rust, Apache-2.0, 77 stars, 100+ releases, real code volume (9.1 MB of Rust; crates for
search, FHIRPath, profiling, terminology, subscriptions). Site claims *"Production-Ready"* and
*"<100MB"* memory.

**Rejected because none of it is verifiable.** The README is 66 lines and `search.md` is an
**empty heading** — chaining, `_has`, `_include`, and validation cannot be confirmed from any
source. Also amd64-only: arm64 is **commented out in CI**.

## wso2/fhir-server — too young, but the most useful reference

Go + Postgres, Apache-2.0, arm64 ✅, corporate-backed, R4 4.0.1. **Created 2026-06-17, 7
stars** — six weeks old at evaluation. Not adoptable.

**But it is the single most valuable reference for the [roll-your-own](roll-your-own.md)
option**, because it implements exactly that design and documents its own gaps honestly: an
11-table schema (`resources` jsonb + tsvector, `resource_history`, `sp_string`/`sp_token`/
`sp_date`/`sp_number`/`sp_quantity`/`sp_uri`/`sp_reference`/`sp_coords`,
`search_param_definitions` storing FHIRPath per param).

Its self-reported limitations after ~1 month of a funded team are the best available cost
estimate for building this yourself. See [roll-your-own](roll-your-own.md#the-honest-counterweight).

## Also checked and dead

`intervention-engine/fhir` (*"not under active development"*, DSTU2, 2018) · `gofhir`
(archived 2017) · `fhirbase` (*"frozen untill new hero will support it"*; never had search)
· `aws-solutions/fhir-works-on-aws` (**archived**, EOL 2024-01-31) · `SanteonNL` (publishes
no server) · `bluehalo/node-fhir-server-core` (*"You must implement your own data persistence
layer"*) · `canvas-medical/fhirstarter` (no persistence; **no R4 4.0.1**)

**Go's entire FHIR server heritage is dead** — every well-known project stopped between 2016
and 2018 and none were ever R4. **There is no mature lightweight FHIR server in Python.**
