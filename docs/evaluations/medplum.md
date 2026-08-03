# Medplum

| | |
|---|---|
| **Verdict** | ❌ **Server not adopted** · ✅ **`@medplum/core` adopted as a library** ([ADR-0002](../adr/0002-clinical-data-store.md)) |
| **Role considered** | Canonical FHIR R4 clinical store |
| **Role actually taken** | FHIRPath engine, SearchParameter registry, index extraction, validation — no server |
| **License** | Apache-2.0 (permissive; compatible with our MIT core, and runs as a separate process anyway) |
| **Version at evaluation** | v5.1.27, published 2026-07-24 |

## What it is

A self-hosted FHIR R4 server in TypeScript with a Postgres backend, plus an admin SPA, OAuth2
auth, subscriptions, and `AccessPolicy`. Actively maintained — 2,555 stars, releases roughly
weekly, last commit the day of evaluation.

## The "you have to run a cluster" claim — tested and false

This was the main objection, so an agent **ran the full stack on this Mac and measured it**
rather than reading docs.

| Phase | Total RAM, 4 containers |
|---|---|
| First boot (migrations) | ~1.16 GB |
| **Settled idle** | **~600 MB** *(measured)* |
| After write workload | ~793 MB |

- **4 containers:** `postgres:16`, `redis:7`, `medplum-server`, `medplum-app`. The app is a
  static SPA — **droppable** if ayuOS ships its own UI, leaving 3.
- **CPU at idle: 0.00–0.43%.** Disk: ~1.29 GB images + ~330 MB empty Postgres volume.
- Up in ~90 seconds from `docker compose up`.
- **Documented minimum is 4 GB RAM** — measured idle is far below that, but budget 3–4 GB
  alongside Ollama.

For scale: a single 7B model at rest outweighs the entire Medplum stack several times over.

**Medplum's own docs bless this use case**, which is worth quoting when someone raises the
scary self-hosting language:

> *"Low-connectivity or edge deployments… has modest data and storage needs… In these cases a
> minimal Medplum instance is sufficient, and the operational burden is correspondingly small."*

The "one week to one month of a dedicated engineer per upgrade" warnings are explicitly
scoped to *at scale*.

## Evaluation

| Criterion | Finding |
|---|---|
| **arm64 / Apple Silicon** | ✅ Native, verified at the registry — genuine per-arch builds, no emulation. Zero open arm64 issues. |
| **External services required** | **None.** Binary storage defaults to `file:./binary/` — no S3. Email defaults to `none` — no SES. Bots run in-process (`vmcontext`) — no Lambda. Postgres needs only stock extensions. |
| **Redis** | **Required**, not optional — `redis: MedplumRedisConfig` is non-optional in the config type; backs BullMQ. Costs 37 MB. |
| **FHIR R4 search** | Strongest of the practical options: chaining (capped at 3 links), `_has`, `_include`/`_revinclude`, `_filter`, `:not`/`:missing`/`:contains`, `_sort`, `_total`. Not available via GraphQL. |
| **Doctor-packet export** | `Patient/$everything` (ONC-certified) + Bulk Data Export to NDJSON — already built |
| **Postgres-native** | Table-per-resource-type, so joins against pgvector and an `ayuos` schema are physically possible in one instance |

## Problems found

**🚨 Zero-egress is achievable but is *not* the default.** Four issues in the stock compose,
all fixable by config:

1. **Phones home to Have I Been Pwned.** `pwnedPassword()` fires on every user creation and
   password change, with **no config flag to disable it**. Proven fatal offline by
   blackholing the host: registration returns HTTP 400 `"fetch failed"`. **Workaround:**
   `createSuperAdmin()` bypasses hibp entirely, so seed the user via
   `defaultSuperAdminEmail`/`Password` config and never use the registration endpoint. Login
   itself works fully offline (verified).
2. **Ships Medplum's public reCAPTCHA keys** — registration calls Google. Fix is one line:
   set `MEDPLUM_RECAPTCHA_SECRET_KEY: ''` and the check is skipped (verified: registration
   then returns 200).
3. **Binary storage is not persisted.** `docker inspect` returns **zero mounts** — binaries
   land in the container's writable layer and evaporate on `down` or upgrade. Severe for
   ayuOS: lab PDFs, DICOM, and genome files all land there. **Add a named volume.**
4. **Default super-admin credentials are live** (`admin@example.com` / `medplum_admin`) when
   `defaultSuperAdmin*` is unset, which the shipped compose leaves unset. Verified: login succeeds.

**⚠️ Upgrades cannot skip minor versions.** Medplum: *"Attempting to jump ahead (e.g., from
v3.1.2 directly to v4.3.4) will cause your server to fail to start."* You must walk every
intermediate minor. With ~2–3 minors a year this is manageable, but the shipped compose uses
`:latest` — **a footgun given the no-skip rule.** Pin the tag. At 1,000 self-hosters
upgrading sporadically, stepped upgrades become ayuOS's support burden.

**Other friction:** auth is mandatory (no documented no-auth local mode — a `ClientApplication`
with client-credentials is the pattern); hardened images have no shell, so debugging is
logs-only; first boot takes minutes with the healthcheck showing `starting` throughout.

## Why the server was not adopted

Not weight — that objection was tested and disproven above. The decision turned on **fit**,
per [ADR-0002](../adr/0002-clinical-data-store.md):

- **FHIR search answers 2 of the agent's 10 core queries.** The rest are aggregations,
  cross-domain joins, and vector search that FHIR search cannot express — and FHIR search
  exists for external clients ayuOS does not have.
- **Cross-resource joins would mean reading Medplum's Postgres schema**, which its docs call
  *"an internal detail subject to change."*
- **Wrong store for high-frequency wearable data** — continuous HR as FHIR `Observation`s
  costs 20–40× the storage of a narrow time-series row.
- The capabilities that genuinely mattered — **FHIR resource modelling and validation — are
  available as libraries**, without a server.

Four further arguments made for the server did not survive review (version history,
conditional-create idempotency, `$everything`, transaction bundles) — see
[ADR-0002](../adr/0002-clinical-data-store.md#why-the-case-for-medplum-did-not-hold).

## What *was* adopted

`@medplum/core` + `@medplum/definitions` as libraries — Apache-2.0, zero runtime
dependencies, no server. See
[roll your own](roll-your-own.md#the-finding-that-changed-the-cost-estimate) and
[FHIR libraries](fhir-libraries.md).

## What would change this

Adopting the server would require an external FHIR client to appear (a third-party system
needing to read ayuOS over FHIR), or the owned store proving unable to serve the query
catalogue. Neither is in prospect.

## Hardening notes (retained for reference)

Relevant only if the server is ever adopted — and a useful record of how much configuration
zero-egress required:

1. Pin image tags — never `latest`
2. Add a volume for `./binary/`
3. Blank `MEDPLUM_RECAPTCHA_SECRET_KEY` and `MEDPLUM_GOOGLE_CLIENT_ID`
4. Set `defaultSuperAdminEmail`/`Password`; seed at first boot, never via registration
5. Drop the `medplum-app` container
6. Bind ports to `127.0.0.1` — stock publishes Postgres and Redis on all interfaces with password `medplum`
7. Assert no outbound sockets in CI

## Sources

[Self-hosting considerations](https://www.medplum.com/docs/self-hosting/considerations) ·
[Full stack in Docker](https://www.medplum.com/docs/self-hosting/running-full-medplum-stack-in-docker) ·
[Upgrading](https://www.medplum.com/docs/self-hosting/upgrading-server) ·
[Search architecture](https://www.medplum.com/docs/contributing/search-architecture) ·
[docker-compose.full-stack.yml](https://github.com/medplum/medplum/blob/main/docker-compose.full-stack.yml)
