# EHR Ingestion

!!! info "Decision record"
    The tiering below is recorded in [ADR-0001: EHR ingestion strategy](../adr/0001-ehr-ingestion.md),
    which supersedes the earlier "fork Fasten Health as an isolated GPL service" plan.
    **Fasten Onprem was archived in July 2026 and no longer retrieves EHR records.**

## Four tiers

Free, zero-egress paths are the default. A paid add-on exists for breadth and requires
explicit per-provider consent — the same shape as [Open Wearables / Terra Bridge](../open-wearables.md)
for devices.

| Tier | Path | Coverage | Note text? | Egress | Priority |
|---|---|---|---|---|---|
| **1 — Base** | [Apple Health export](apple-health.md) | ~450 multi-site US systems | ❌ | **Zero** | MVP |
| **2 — Direct** | Epic SMART-on-FHIR | ~800 Epic orgs + Outside Records | ✅ | Epic only | P1 |
| **3 — Live** | iOS companion app | Apple sources, incremental | ❌ | Zero (LAN) | P1 |
| **4 — Premium** | Fasten Connect (paid) | Cerner, Meditech, athena, payers | ✅ | **Transits Fasten** | P2 |

No single tier covers a typical user's providers — they are complementary.

## Tier 1: Apple Health export (MVP)

The export zip contains **raw provider FHIR JSON**, one file per resource under
`clinical-records/`. This is not a PDF pile and not only CDA — verified against Apple's DTD
embedded in `export.xml`:

```
<!ATTLIST ClinicalRecord
  type CDATA #REQUIRED   identifier CDATA #REQUIRED   sourceName CDATA #REQUIRED
  sourceURL CDATA #REQUIRED   fhirVersion CDATA #REQUIRED   receivedDate CDATA #REQUIRED
  resourceFilePath CDATA #REQUIRED >
```

Real record: `sourceName="UCSF Health" fhirVersion="4.0.1" resourceFilePath="/clinical-records/Observation-UUID.json"`

**Why this is the base tier:** zero entitlement, zero App Review, zero Epic registration,
zero hospital involvement. It works today on a Mac Mini, where the HealthKit API is
unavailable. Typical volume: ~1,300 Observations, ~250 DiagnosticReports, ~115
MedicationRequests per user.

**What it costs:**

- **Manual and un-automatable** — no Shortcuts action; every export is a full cumulative dump
- **Provenance requires a join** — the FHIR files carry no institution name; `sourceName`
  lives only on the `<ClinicalRecord>` stub in a multi-GB `export.xml` you must SAX-stream
- **Mixed DSTU2 and R4** in the same export, per record
- **No clinical note text** — `DocumentReference` entries point at `Binary/<id>` and the
  Binary files are not in the export. Treat them as a coverage manifest.

!!! note "We own this parser"
    Neither Fasten nor Medplum ships an Apple Health importer
    ([fasten-onprem#479](https://github.com/fastenhealth/fasten-onprem/issues/479) has been
    open since June 2024). This is net-new code — but a zip parser, not a connector to
    maintain.

`export_cda.xml` is **not** provider records — it is a CCD Apple generates from your own
HealthKit vitals and results. Ignore it.

## Tier 2: Direct Epic SMART-on-FHIR (P1)

**Free, self-service, and no per-health-system activation** for qualifying apps, via Epic's
Automatic Client ID Distribution. Registration at `fhir.epic.com` issues production and
non-production client IDs immediately; there is no Epic approval gate.

Qualifying conditions (all required):

- Uses **only USCDI v3** FHIR APIs
- **Read-only** — any write API disqualifies
- **Patient-facing**
- Does not use refresh tokens, **or** uploads a client credential per organization
- "Enable Auto-download" + USCDI version selected at app creation
- Marked Ready for Production

Epic: *"All US provider organizations currently receive client IDs that meet the automatic
distribution criteria."* Since 2026-01-01 this is regulator-backed — 45 CFR 170.215 mandates
SMART App Launch 2.0.0, requiring `client-public`, `permission-offline`, and PKCE S256.

**Cost: $0.** Registration, production, and distribution are free. The $500/yr Connection Hub
listing and Vendor Services fees are optional marketplace products, not access fees.

**What it uniquely provides:** clinical note *content* (`Binary` and `DocumentReference`
under USCDI v1), plus the USCDI v3 **Outside Record** family — externally-sourced records
surfaced through the Epic org, valuable for an aggregator.

!!! danger "Production marking is a one-way door"
    Epic, verbatim: *"Neither you nor Epic can make updates to an app once it has been marked
    Ready for Production… all technical changes will require you to build a new app."*

    Only redirect URIs and JWK Set URLs stay editable. Adding one FHIR resource later means a
    new client ID and re-distribution from scratch. **Finalize the USCDI v3 resource list
    before marking production-ready.**

### The refresh-token fork (unresolved)

| Option | Consequence |
|---|---|
| **No refresh tokens** | Zero-touch distribution to all ~800 orgs; user re-authenticates via MyChart each sync. Likely fine for an occasional "what changed in 90 days?" run. |
| **Device-local dynamic client registration** | RFC 7591 at `POST {base}/oauth2/register` — keypair generated on the user's device, no shared secret ever leaves the machine. Ideal for zero-egress, but may require per-org credential upload across ~500 orgs. |

**Epic's docs do not say whether dynamic registration trips the refresh-token condition.**
This must be settled empirically against the sandbox. See
[ADR-0001](../adr/0001-ehr-ingestion.md#the-unresolved-fork-refresh-tokens).

### Endpoint discovery

Download `https://open.epic.com/Endpoints/Brands` (~92 MB, 813 endpoints, 94k organizations)
on a weekly cron and re-host locally for the health-system picker. Epic explicitly instructs:
*"Applications SHOULD NOT perform runtime queries for endpoint data hosted on open.epic.com."*

### Not available to patient apps

`$export` is **Group-level only** and requires per-org coordination. There is no
`Patient/$export`. Patient-facing apps do per-resource read/search. `Binary.Read (Generated
CCDA)` returns a whole C-CDA in one call — often the cheapest way to bootstrap a longitudinal
record before fanning out.

## Tier 3: iOS companion app (P1)

See [Apple Health ingestion](apple-health.md). Adds incremental sync over the local network.
`HKFHIRResource.data` exposes the **raw provider JSON** — Apple's words: *"the underlying
JSON, which contains the complete clinical data."* Requires the HealthKit clinical-records
entitlement, evaluated at App Review rather than in a separate queue.

## Tier 4: Fasten Connect (premium, paid)

The paid add-on for **wide record access** — the providers Epic direct and Apple Health
cannot reach: Cerner, Meditech, athenahealth, eClinicalWorks, NextGen, plus payers (Aetna,
Anthem, Cigna, Humana, Kaiser, Medicare Blue Button, VA).

**How it works:**

1. User enables Fasten Connect and authorizes their health system through Fasten's widget
2. Fasten pulls via SMART-on-FHIR patient access on the user's behalf
3. ayuOS **polls** `GET /bridge/fhir/ehi-export/{org_connection_id}` — no webhook, no tunnel,
   no inbound ports
4. Data downloads as **FHIR R4 NDJSON** to the local store

**What the user accepts:** records for Fasten-bridged providers transit Fasten's cloud.
Requires **explicit per-provider consent**, surfaced before enabling.

**Fasten's terms** (unusually good for a hosted intermediary):

- **24-hour retention, then automatic deletion** — *"the system deletes the cached copy automatically"*
- *"We don't sell your personal information, ever"*
- *"We do not currently anonymize or de-identify your Personal Information"* — with a change-notification commitment
- No AI/ML training clause; CARIN Alliance Code of Conduct signatory

!!! warning "CARIN obligations flow down to us"
    As a Fasten customer, ayuOS must honor consent-only use, easy revocation, and — notably —
    **clear disclosure of AI/ML use of the data**. Local LLM reasoning over records arguably
    qualifies. This belongs in the consent copy.

!!! warning "Commercial fit is unverified"
    Fasten publishes **no pricing** and has **no known individual tier**. Community questions
    about consumer pricing in the shutdown thread went unanswered, and the sales motion is
    enterprise-shaped. This may make the premium tier unviable for individual users — an open
    action in [ADR-0001](../adr/0001-ehr-ingestion.md#follow-up-actions).

**Architectural rule:** Fasten Connect is one adapter behind the EHR ingestion interface,
never the interface itself. They sunset the free path once already, in 2026.

## What is deliberately not built

| Rejected | Why |
|---|---|
| Forking Fasten Onprem | Upstream archived; we would own the connectors — the burden the project exists to avoid |
| Our own SMART-on-FHIR connector catalog | What Fasten just abandoned as unsustainable, with more resources than we have |
| Oracle Health / Cerner as a P1 peer to Epic | No auto-distribution equivalent; per-tenant service requests, 10-minute tokens, no dynamic registration. Reachable via Tier 4. |
| Android clinical-records path | Health Connect's Medical Records API is still experimental, Google operates no provider connections into it, and health records are excluded from its export |

## Deduplication with other sources

The same record may arrive through several tiers. Deduplication key:
`(patient, LOINC code, effective date/time)`. Precedence: **structured EHR resource >
Apple export resource > OCR-extracted** from a [lab PDF](labs.md).

## Data available

Across Epic USCDI v1 + v3: AllergyIntolerance, Binary (notes, CCDA, labs), CarePlan,
CareTeam, Condition, Coverage, Device, DiagnosticReport, DocumentReference, Encounter, Goal,
Immunization, Location, Medication, MedicationDispense, MedicationRequest, Observation (labs,
vitals, social history, assessments, study findings), Organization, Patient, Practitioner,
Procedure, Provenance, RelatedPerson, ServiceRequest, Specimen, and the Outside Record family.

## Open questions

- [ ] Does Epic dynamic client registration trip the refresh-token auto-distribution condition?
- [ ] Which US Core version does Epic assert? (3.1.1 expired 2026-01-01; 6.1.0 is operative.)
- [ ] Can a solo developer obtain Fasten Connect live-mode credentials, and at what price?
- [ ] How is DSTU2 → R4 conversion handled for older Apple export records?
- [ ] Does the HealthKit entitlement provision on a free personal team for sideloaded builds?
