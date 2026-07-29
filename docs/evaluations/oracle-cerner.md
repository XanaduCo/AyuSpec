# Oracle Health / Cerner — direct SMART-on-FHIR

| | |
|---|---|
| **Verdict** | ⏸ **Deferred** — second-tier target; reachable via [Fasten Connect](fasten.md) (Tier 4) |
| **Decision** | [ADR-0001](../adr/0001-ehr-ingestion.md) |

## Why deferred rather than adopted

Cerner is the obvious peer to [Epic](epic-direct.md) by market share, but the developer
experience is meaningfully worse on the exact axis that made Epic viable: **there is no
documented auto-distribution equivalent.**

Registration itself is fine — free CernerCare account → [code Console](https://code-console.cerner.com)
→ register app, pick type and privacy (public/confidential/system).

## The per-org activation question

Evidence points both ways and could not be fully resolved.

**Toward per-org activation being required:**

> *"Once registered, a client ID is provided… Oracle Health customers **may then enable**
> client applications to access their protected resources."*

The provisioning guides describe a **service-request-per-customer** flow: the customer files
an SR against "Cerner Ignite APIs for Millennium" to provision your app against their tenant.
Self-service provisioning explicitly *"does not apply to CommunityWorks, PowerWorks, or
Continuum customers."*

**Toward patient-facing being exempt:**

> *"At a high level, **provider-facing** applications must receive the following
> authorizations…"* — and explicitly: *"Oracle Health **does not validate** the use of FHIR
> resources for direct-to-consumer applications."*

Combined with the published patient endpoint list and the (g)(10) obligation, a patient
standalone app plausibly works against tenants with patient access enabled without an SR.

⚠️ **Unverified.** No Oracle statement equivalent to Epic's *"All US provider organizations
currently receive client IDs that meet the automatic distribution criteria"* could be found.
Treat "no per-org activation on Oracle" as unconfirmed.

## Technical evaluation

Verified live against a production patient endpoint (`fhir-myrecord.cerner.com/r4/{tenant}`):

| Criterion | Finding |
|---|---|
| **PKCE** | ✅ `code_challenge_methods_supported: ["S256"]` — **supported today**. ⚠️ Sources conflict: Cerner's `authorization.md` (last modified 2023-06-26) says *"does not currently implement PKCE"*; Oracle's current doc narrows that to the implicit grant only. **The live discovery document settles it.** |
| **Capabilities** | `client-public`, `permission-offline`, `permission-online`, `permission-v2`, `health-cards` |
| **Dynamic client registration** | ❌ **No `registration_endpoint`** — so Epic's device-local keypair path has no Cerner equivalent |
| **Access token lifetime** | **570 seconds (~10 min)** — much shorter than Epic's ~54 min |
| **`offline_access`** | Tokens work *"in perpetuity"* but are **revoked automatically if unused for more than three months**; refresh does **not** rotate the refresh token. App is auto-suspended if your TLS cert or DNS changes. |
| **Scopes** | 145 `patient/*` advertised, both `.read` (v1) and `.rs` (v2) |
| **OpenID** | ⚠️ *"does not support the stand-alone OpenID workflow for patient application use cases"* |

## Endpoint discovery

[`oracle-samples/ignite-endpoints`](https://github.com/oracle-samples/ignite-endpoints)
(formerly `cerner/ignite-endpoints`) — verified live: **2,646 patient-access R4 endpoints** in
`millennium_patient_r4_endpoints.json`, plus provider and Soarian variants.

## What would change this

Promote to a direct tier if either: (a) Oracle publishes or confirms an auto-distribution
equivalent, or (b) MVP users turn out to be on Cerner systems and Fasten Connect proves
commercially unviable. Otherwise the cost/benefit favours reaching Cerner through Tier 4.

The two blockers to solve first would be the **10-minute access token** (frequent refresh
against a locally-stored token) and the **absence of dynamic client registration** (no clean
way to hold credentials on-device).

## Sources

[FHIR authorization framework](https://docs.oracle.com/en/industries/health/millennium-platform-apis/fhir-authorization-framework/) ·
[SMART developer overview](https://docs.oracle.com/en/industries/health/millennium-platform-apis/smart-developer-overview/) ·
[app provisioning](https://docs.oracle.com/en/industries/health/millennium-platform-apis/fhir-app-provisioning/) ·
[ignite-endpoints](https://github.com/oracle-samples/ignite-endpoints)
