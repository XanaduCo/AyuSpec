# Epic — direct SMART-on-FHIR

| | |
|---|---|
| **Verdict** | ✅ **Adopted** — Tier 2 |
| **Decision** | [ADR-0001](../adr/0001-ehr-ingestion.md) |
| **Cost** | **$0** |

## The finding that made this viable

Direct Epic access was initially assumed to require per-health-system activation taking
"weeks to months" — the hardest external gate in the project. That is **wrong for
patient-facing apps**.

Epic operates **Automatic Client ID Distribution**. A qualifying app is pushed to all
eligible community members within ~12 hours, with **no action from any hospital's IT staff**.

Epic, verbatim:

> *"All US provider organizations currently receive client IDs that meet the automatic
> distribution criteria that are activated through Epic on FHIR. Client ID registration steps
> are **self-service** to app developers."*

And: *"Epic is vendor-neutral, and no special relationship is required to develop or deploy an
app… **all without needing Epic's involvement**."*

## Qualifying conditions (all required)

- Uses **only USCDI v3** FHIR APIs (v1 for Epic May 2024 and earlier)
- **Only reads data from Epic** — any write API disqualifies
- **Is patient-facing**
- **Does not use refresh tokens**, OR uses them and has a client credential uploaded per community member
- "Enable Auto-download" + USCDI version selected at app creation
- Marked Ready for Production (after 2020-09-03)

Community member side: must have USCDI APIs in their open.epic licensing agreement and must
not have disabled auto-download.

## Cost: genuinely free

| Thing | Cost |
|---|---|
| fhir.epic.com account, app registration, client IDs | **Free** |
| Production marking + auto-distribution | **Free** |
| Connection Hub listing (marketplace visibility) | $500/product/year — **optional** |
| Vendor Services (expanded sandbox, Epic support) | ⚠️ Not published; third-party figures ~$1.7–1.9k/yr **unverified** — optional |

Epic: *"a listing is **not required** for you to connect your software to organizations using
Epic. You can facilitate downloads of your application **at no cost**."*

Note who pays for API licensing: *"Epic's industry-standard and Public APIs are licensed
directly to healthcare organizations (not to app developers)."*

Regulatory backstop: 45 CFR 170.404(a)(3) prohibits fees not explicitly permitted, and
170.404(a)(4)(ii)(B) forbids conditioning API access on licence fees or vendor-specific
certification.

## Why it's regulator-backed, not a vendor favour

Since **2026-01-01**, 45 CFR 170.215 mandates **SMART App Launch 2.0.0**, requiring *all*
capabilities except `permission-online` — so a certified server must support `client-public`,
`client-confidential-asymmetric`, `permission-offline`, `permission-v2`, and
`context-standalone-patient`, with **PKCE S256 mandatory**.

Verified live against both the Epic sandbox and a production org (UW Health) — identical
capability sets, `code_challenge_methods_supported: ["S256"]`.

US Core 3.1.1's adoption also expired 2026-01-01; **6.1.0** is operative. ⚠️ Which version
Epic asserts could not be confirmed from reachable docs.

## What it uniquely provides

**Clinical note content** — `Binary` (Clinical Notes / Generated CCDA / Labs) and
`DocumentReference` are in USCDI v1. This is the gap the [Apple Health export](apple-health.md)
cannot fill.

Plus the USCDI v3 **Outside Record** family — externally-sourced records surfaced through the
Epic org, valuable for an aggregator.

`Binary.Read (Generated CCDA)` returns a whole C-CDA in one call — often the cheapest way to
bootstrap a longitudinal record before fanning out to discrete resources.

## 🚨 The one-way door

Epic, verbatim:

> **"IMPORTANT!** Neither you nor Epic can make updates to an app once it has been marked
> Ready for Production. With the exception of adding redirect URIs and modifying your JWK Set
> URLs, all technical changes will require you to build a new app."

The API and scope list is **frozen permanently**. Adding one FHIR resource later means a new
client ID and re-distribution from scratch. Register early for the sandbox; finalize the
USCDI v3 resource list before marking production.

## The unresolved refresh-token fork

| Option | Consequence |
|---|---|
| **No refresh tokens** | True zero-touch distribution to all ~800 orgs. User re-authenticates via MyChart each sync. For an occasional *"what changed in 90 days?"* run, likely acceptable. |
| **Device-local dynamic client registration** | Epic documents RFC 7591 at `POST {base}/oauth2/register` explicitly for native apps: keypair generated **on the user's device**, stored locally, JWKS posted, per-device `client_id` returned. **No shared secret ever leaves the machine** — ideal for zero-egress. |

**The catch:** refresh tokens put you in the per-org credential lane. [Josh Mandel documented
this first-hand](https://github.com/jmandel/health-skillz/blob/main/blog/epic/2026-02-11-epic-activation-journal.md)
in Feb 2026 — ~500 orgs auto-appeared, but each needed a 7-click modal (~3,510 clicks),
automated via the undocumented `POST /Developer/ApproveDownload`. He also found the
"recommended" JWK Set URL option **silently fails at ~20% of orgs** with restrictive outbound
policies, and 60 orgs appeared on the management page with no entry in the public Brands
directory.

⚠️ **Epic's docs do not say whether dynamic client registration trips the "uses refresh
tokens" condition.** Highest-value unknown in the EHR path — must be settled empirically
against the sandbox. Note also `registration_endpoint` is **not advertised** in the
`.well-known` document despite being documented.

⚠️ **Refresh-token lifetime is not under our control.** Patients pick the persistent-access
period in MyChart from options the org configures (*"1 hour, 1 day, 1 week…"*). This appears
in tension with 45 CFR 170.315(g)(10)(v)(A)(1), which requires ≥3 months for native apps
capable of securing a refresh token — unverified which options a real MyChart offers.

## Endpoint discovery

Download `https://open.epic.com/Endpoints/Brands` weekly and re-host locally — verified live:
**92.4 MB, 95,106 entries (813 Endpoint + 94,293 Organization)**, updated daily, in SMART
"User-access Brands" format with NPI identifiers and brand hierarchy for a health-system picker.

Epic explicitly instructs: *"Applications SHOULD NOT perform runtime queries for endpoint data
hosted on open.epic.com… Epic provides no service level agreement or uptime guarantees."*

## Not available

**No `Patient/$export`.** Bulk export is `Group/{id}/$export` only and requires per-org
coordination on a Group FHIR ID — a provider/population workflow. Patient apps do per-resource
read/search.

## Portal naming (2026)

App Orchard is **dead** (retired end of 2022). Current: **fhir.epic.com** (dev portal, free),
**open.epic.com** (public specs + endpoints, free), **Showroom** (marketplace; Connection Hub
inside it). ⚠️ Apple's docs still link `open.epic.com/Home/AppleHealth`, which 404s.

## Sources

[patient-facing apps](https://fhir.epic.com/Documentation?docId=patientfacingfhirapps) ·
[request process](https://fhir.epic.com/Documentation?docId=epiconfhirrequestprocess) ·
[open.epic developer resources](https://open.epic.com/DeveloperResources) ·
[activation journal, Feb 2026](https://github.com/jmandel/health-skillz/blob/main/blog/epic/2026-02-11-epic-activation-journal.md) ·
[45 CFR 170.404](https://www.ecfr.gov/current/title-45/section-170.404)
