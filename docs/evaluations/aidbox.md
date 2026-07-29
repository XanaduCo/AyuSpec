# Aidbox

| | |
|---|---|
| **Verdict** | ❌ **Disqualified** — on architecture and licence, not on capability |
| **Role considered** | Clinical FHIR store |
| **License** | **Proprietary**, closed source (Health Samurai) |
| **Version at evaluation** | 2606, released 2026-07-14 |

## Why it was disqualified

Two independent blockers, either one fatal.

### 1. The free tier explicitly prohibits real health data

From [Licensing and Support](https://www.health-samurai.io/docs/aidbox/overview/licensing-and-support), verbatim:

> *"intended exclusively for development, testing, and demonstration purposes"*
>
> *"Users must **not load real healthcare data or Protected Health Information (PHI)** into
> any Aidbox instance operating under a Development license."*
>
> *"The Development license permits storage of up to 5 GB of data in your database."*

ayuOS's entire purpose is real personal health data. That clause ends the evaluation on its
own.

### 2. A running instance phones home — incompatible with zero-egress

From the same page:

> *"The instance count is observed by the Aidbox license portal, which the running instances
> **ping on a heartbeat (~30 minutes** for production licenses)."*

Required outbound HTTPS per their FAQ network table: `aidbox.app` (license portal),
`tx.health-samurai.io` (terminology), `storage.googleapis.com/fhir-schema-registry/`,
`fs.get-ig.org/pkgs` (IG packages).

Their mitigation — *"Only the JWT license token is sent… No customer data is transmitted"* —
is true and **irrelevant**. Zero-egress means there is no network call to make. A store that
must reach a vendor's licence server every 30 minutes cannot be the storage layer of a
sovereignty-tier product.

Activation also requires an online account: the local Docker quickstart instructs you to
*"Click 'Continue with Aidbox account' and create a free Aidbox account"* before the instance
will run.

### 3. Licence incompatibility, independently

You cannot ship a proprietary, account-gated server as the storage layer of an AGPL-3.0
self-hosted product that users are meant to run themselves.

## For the record — it is otherwise very good

None of this is a capability judgement:

- **Best FHIR search of anything evaluated.** All 8 param types plus special, forward
  chaining, `_has`, `_include`/`_revinclude` with `:iterate`/`:recurse`, `_filter`. FHIR
  R4/R5/R6.
- arm64 verified (`healthsamurai/aidboxone`, `healthsamurai/aidboxdb`, both multi-arch)
- Its **Postgres schema design is worth stealing** — same lineage as FHIRbase: per-type table
  + `_history` table, columns `id / txid / ts / resource_type / status / resource jsonb`.
  Notably it does *not* precompute search-parameter columns, relying instead on manually
  created GIN expression indexes via `knife_extract_*` helpers. Documented at
  [database overview](https://www.health-samurai.io/docs/aidbox/database/overview).
- Documented gaps: `value-quantity` with inline unit returns 400, `:below` on url params
  500s, component-level composites incomplete.

One further practical consequence had it been viable: it requires their custom `aidboxdb`
image with Health-Samurai-managed extensions, so it **could not share the pgvector instance**.

## Unverified

- ⚠️ Whether an **offline/air-gapped licence actually exists.** "Air-gapped" is listed as a
  supported deployment option in the FAQ with **no linked page, no technical detail, and zero
  release-note entries** across 2025–2026. Would require contacting sales.
- ⚠️ What an instance does when it **cannot reach the licence portal**. Undocumented.
- ⚠️ Paid pricing — not published; sales contact required.

Even resolved favourably, blocker #1 stands.

## What would change this

Effectively nothing within the product's constraints. It would require Health Samurai to
offer a free, offline-licensed, PHI-permitted tier for self-hosted personal use — a different
business.
