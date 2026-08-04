# Journey 05 — Connect an EHR directly — Epic SMART-on-FHIR

> **Who:** Ravi Mehta, 45 (he/him) — the pragmatic optimizer · **Intent:** pull live clinical
> records, especially the clinical *notes* the Apple Health export never carries, straight from his
> hospital with nothing transiting a third party · **Entry surface:** Data sources → EHR ·
> **Egress posture:** 🟢 green — Direct tier, zero third-party transit · **Primary modality:**
> connector card + a SMART-on-FHIR login in his own browser.

## The intent

Ravi already has a base record — his Apple Health export loaded years of labs and conditions
([Journey 03](03-apple-health-bootstrap.md)-style bootstrap, done during install). But that export
has a known hole: **no clinical note text.** The `DocumentReference` entries in it point at
`Binary/<id>` files Apple never includes, so his cardiology visit summaries, the reasoning behind
his lisinopril, and the interpretation attached to his last lipid panel are all missing. He wants
the *content*, and he wants it pulled **directly** — his machine talking to his hospital, no
aggregator holding a copy. His hospital runs **Epic**, which is the one path that gives both.

## Preconditions

- ayuOS installed and running self-hosted; app open at `http://localhost:4000`
  ([Journey 01](01-install-self-hosted.md)).
- A base record already exists from the Apple Health export — so this journey *enriches* rather
  than bootstraps, and dedup has something to reconcile against
  ([Journey 03](03-apple-health-bootstrap.md), [storage](../storage.md)).
- Ravi has an active **MyChart** account at his Epic hospital (his patient-portal credentials).
- Posture is unchanged from install: three green roles in the header. **This journey adds no model
  call and no egress** — connecting an EHR is data ingestion, not inference.

!!! abstract "Where this sits in the four-tier EHR model"
    This is **Tier 2 — Direct**, the free zero-transit connector. It sits **above** the Tier 1
    Apple Health *Base* export ([Journey 03](03-apple-health-bootstrap.md)) and **below** the paid
    Tier 4 *Fasten Connect* bridge ([Journey 07](07-add-bridged-connector.md)). The tiers are
    complementary, not redundant — no single one covers a typical user's providers. See
    [EHR ingestion](../ingestion/ehr.md) and [ADR-0001](../adr/0001-ehr-ingestion.md).

## Walkthrough

### Step 1 — Start an EHR connection

- **User intent here:** get live clinical records, above all the notes his export can't carry.
- **User does:** opens **Data sources**, clicks **Connect a health system**, picks **EHR (direct)**.
- **System does:** presents the Direct-tier card with an explicit, plain-language contract before
  any login: *"Your machine talks to your hospital's Epic server directly. Records land on this
  disk. Nothing transits ayuOS or any third party."* Beside it, the fallback is named up front:
  *"Not on Epic? Use your [Apple Health export](03-apple-health-bootstrap.md) or the paid
  [Fasten bridge](07-add-bridged-connector.md)."*
- **Value returned this step:** before he does any work he knows exactly what this path is and what
  it is not — and that his providers who *aren't* on Epic still have a route ([Law 6](../design-system.md#interaction-laws)).
- **Modality:** connector card (tap).
- **UX constraints / laws:** the card carries a **green Direct badge** — direct = zero-transit
  ([Law 1](../design-system.md#interaction-laws), color language). The tier is never shown without
  its fallback ([Law 6](../design-system.md#interaction-laws)).

### Step 2 — Find his health system

- **User intent here:** select the specific hospital where his records live.
- **User does:** types his hospital's name into the health-system picker.
- **System does:** searches a **locally re-hosted copy** of Epic's endpoint directory
  (`open.epic.com/Endpoints/Brands`, refreshed on a background weekly cron — Epic asks apps not to
  query it at runtime). Matches resolve against the ~800 auto-distributed Epic orgs; he selects his
  hospital and its FHIR base URL is filled in for him.
- **Value returned this step:** he never has to find or paste an endpoint URL — one search off a
  list already on his disk. If his system isn't in the list, the empty state routes him straight to
  the two fallbacks rather than dead-ending.
- **Modality:** search + select.
- **UX constraints / laws:** offline-tolerant — the picker works from the cached Brands file, not a
  live lookup. Empty state offers the next best action, never a dead end.

### Step 3 — Log in at Epic — the password goes to Epic, not to ayuOS

- **User intent here:** authorize ayuOS to read his records — without handing his portal password to
  a new app.
- **User does:** ayuOS opens his **system browser at his hospital's own MyChart / Epic login page**.
  He enters his **portal credentials into Epic's page**, then reviews and approves the requested
  read scopes on Epic's consent screen.
- **System does:** runs **SMART App Launch 2.0.0** as a public client with **PKCE `S256`** — the
  redirect lands back on `http://localhost:4000`, and only an authorization *code* is exchanged for
  a token. **ayuOS never sees his password.** The credential is entered into Epic and stays with
  Epic; ayuOS receives a scoped, read-only access token and nothing more. Requested scopes are
  read-only USCDI resources — any write scope would disqualify the app from auto-distribution, so
  there are none to grant.
- **Value returned this step:** he authorizes access without trusting ayuOS with his hospital
  password — the trust boundary is Epic's login, exactly where it belongs. The scope screen shows
  him precisely what he's granting (labs, conditions, meds, notes) and nothing to write.
- **Modality:** browser-based OAuth (SMART-on-FHIR).
- **UX constraints / laws:** this is the correctness crux — **credentials to Epic, never to ayuOS.**
  Read-only, patient-facing, PKCE-protected ([Epic direct evaluation](../evaluations/epic-direct.md)).

!!! note "No FHIR server, no Fasten fork — Epic is one adapter"
    ayuOS does **not** run a FHIR server, and it does **not** fork Fasten (Fasten Onprem was
    archived mid-2026). Epic is a single **adapter behind the ingestion interface** — one
    implementation among several, never the interface itself. `@medplum/core` is used as a *library*
    (FHIRPath, validation, the SearchParameter registry), not as a server. See
    [ADR-0001](../adr/0001-ehr-ingestion.md) and [storage](../storage.md).

### Step 4 — Records land locally, in the green

- **User intent here:** get his actual clinical history onto his machine.
- **User does:** waits while the first pull runs (a `Binary.Read` Generated C-CDA to bootstrap the
  longitudinal record, then a fan-out over discrete resources).
- **System does:** pulls **labs with history** (`Observation` / `DiagnosticReport`), **conditions**
  (`Condition`), **medications** (`MedicationRequest` / `MedicationStatement`), and — the reason he's
  here — **clinical note content** (`Binary` + `DocumentReference`), plus the USCDI v3 *Outside
  Record* family. Everything is stored as received into the `clinical` schema as FHIR-shaped JSONB
  with extracted index columns. Records that overlap his Apple export are **de-duplicated** on
  `(source, source_resource_id)` with the structured EHR resource taking precedence over the export
  copy. The connector card flips to **green · Direct · last synced now**, with per-resource counts.
- **Value returned this step:** his record just gained the layer the export couldn't reach — actual
  note text alongside the labs — and the card proves it landed directly, nothing transiting a third
  party.
- **Modality:** background sync + live connector card.
- **UX constraints / laws:** **green throughout** — direct = zero third-party transit
  ([Law 1](../design-system.md#interaction-laws)). Connectors **fail loudly and degrade
  gracefully**: any resource type the org's API doesn't expose is logged and skipped, and the rest
  still lands. Latency is stated up front — a first pull of a multi-year record streams over a
  while, not instantly.

### Step 5 — First value: a note explains a number

- **User intent here:** get something the wearables and the export together could not answer.
- **User does:** opens the **Timeline**, sees new note events threaded alongside his lab tracks, then
  asks on **Ask**: *"What did cardiology say last visit, and how does it line up with my ApoB
  trend?"*
- **System does:** the newly-arrived notes enrich the Timeline immediately. The agent — reasoning
  **locally** (green) — retrieves the visit note via RAG over the `vectors` schema and reads it
  next to his ApoB series (latest `95 mg/dL`, elevated), returning a grounded answer with the note
  and each lab value as **tappable source cards** that open the underlying FHIR resource. Every
  claim carries an evidence label.
- **Value returned this step:** the number finally has context — the clinician's own words explaining
  the lipid picture, something no wearable stream or note-less export could provide, answered
  entirely on his machine.
- **Modality:** Timeline + Ask (text or voice), local synthesis.
- **UX constraints / laws:** fast to the first question ([Law 5](../design-system.md#interaction-laws));
  every claim carries a label ([Law 3](../design-system.md#interaction-laws)); source cards open the
  real FHIR resource ([Law 8](../design-system.md#interaction-laws) — the record is the subject). No
  egress: the header stays three greens.

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Choose the EHR-direct connector | A plain contract (direct, zero-transit) **and** the named fallback if he's not on Epic |
| 2 | Type his hospital name | One search off a local list — no endpoint URL to hunt down or paste |
| 3 | Log in at Epic and approve scopes | Access granted **without** handing his portal password to ayuOS; a scope screen showing exactly what's read-only |
| 4 | Wait for the first pull | Notes + labs-with-history + conditions + meds land locally, de-duped against his export, proven green |
| 5 | Ask one question | A clinician's own words placed against his ApoB trend — answered offline, fully sourced |

## UX & modality constraints

- **Input modalities:** connector card taps · a browser OAuth handoff for login · Timeline
  navigation · text **or** voice on Ask.
- **Color semantics that bind here:** **green** dominates — the Direct connector, the on-device
  synthesis, and every source-backed fact are all zero-transit. No amber appears anywhere in this
  journey; if it did, something would be crossing the device boundary, and it is not.
- **Latency / offline:** the health-system picker works offline from the cached Brands file. The
  OAuth step needs the network (it talks to Epic). The first record pull streams over time for a
  multi-year history; re-syncs are incremental. Local synthesis in Step 5 streams over seconds.
- **Empty / error states:** a health system absent from the picker routes to the two fallbacks. A
  resource type the org doesn't expose is skipped with a logged, visible note rather than a silent
  gap. A failed sync leaves the last-good record intact and the agent still answers over it.
- **Interaction laws in force:** [Law 1](../design-system.md#interaction-laws) (posture on screen,
  green), [Law 3](../design-system.md#interaction-laws) (evidence labels),
  [Law 5](../design-system.md#interaction-laws) (fast to first question),
  [Law 6](../design-system.md#interaction-laws) (a tier shown with its fallback),
  [Law 8](../design-system.md#interaction-laws) (data over chrome — source cards open real FHIR).

## Where it can break (and the fallback)

!!! warning "His health system isn't on Epic"
    Only ~800 orgs are Epic-direct. If his hospital runs something else, the Direct tier simply
    can't reach it. **Fallback (Law 6):** the [Apple Health export](03-apple-health-bootstrap.md)
    still covers ~450 multi-site systems for structured records (no notes), and the paid
    [Fasten bridge](07-add-bridged-connector.md) reaches Cerner, Meditech, athenahealth and
    payers — the case that matters for his **cardiologist on a non-Epic (Cerner) system**. The
    connector card names both routes rather than dead-ending.

!!! note "OAuth token expiry → re-authenticate"
    Tier 2 ships on the **no-refresh-tokens floor** — the price of true zero-touch distribution to
    all ~800 orgs is that the token isn't persistent. When it expires, the next sync prompts him to
    **re-authenticate through MyChart** (the same Step 3 login). For a *"what changed in 90 days?"*
    cadence this is entirely acceptable — EHR data isn't polled hourly. Persistent background sync
    is only ever a per-org *upgrade* over this floor, never a dependency
    ([ADR-0001](../adr/0001-ehr-ingestion.md)).

!!! warning "A note type the org's API doesn't expose"
    Some orgs surface `DocumentReference` entries but don't enable the underlying `Binary` note
    content, or restrict certain note types. The connector logs exactly which resource types came
    back empty and imports everything else — a visible manifest of the gap, never a silent one. What
    landed still enriches the record; what didn't is named so he knows to look elsewhere.

!!! danger "Losing this tier costs breadth, never history"
    If Epic direct ever became unavailable, everything already pulled **stays on his disk** — the
    stored record is his. He'd lose *future* live syncs and note freshness, not his history. Losing a
    tier costs breadth or convenience, never the system or the stored record
    ([Journey 08](08-switch-connectors.md), [tiers](../tiers.md)).

## What good looks like

- The connector card reads **green · Direct · synced**, and Ravi can point to it and say *"my
  hospital talked to my laptop; no company sat in the middle."*
- A cardiology **visit note** now appears on his Timeline next to his lipid track — content his
  Apple export never carried.
- Asked to explain his ApoB `95 mg/dL` in context, the agent quotes the clinician's own words, cites
  the note and each lab as openable FHIR source cards, and does it **fully offline** (three greens).
- The notes and trending labs that just landed are exactly what later feeds his cardiology
  **doctor packet** ([Journey 13](13-share-doctor-packet.md)) — better than a shoebox of PDFs.

## Related

- [EHR ingestion — the four tiers](../ingestion/ehr.md) · [ADR-0001: EHR ingestion strategy](../adr/0001-ehr-ingestion.md)
- [Epic — direct SMART-on-FHIR evaluation](../evaluations/epic-direct.md)
- [Storage — the `clinical` schema, dedup, provenance](../storage.md) · [PII gateway](../pii-gateway.md) (why this journey stays green: no model call leaves the device)
- [Tiers & fallbacks](../tiers.md)
- Adjacent journeys: [03 — Apple Health bootstrap (the Base tier / notes-less fallback)](03-apple-health-bootstrap.md) · [07 — bridged connector via Fasten (the Premium tier for his Cerner cardiologist)](07-add-bridged-connector.md) · [08 — switch, swap & lose a connector](08-switch-connectors.md) · [09 — the anchor query](09-anchor-query.md) · [13 — share a doctor packet](13-share-doctor-packet.md)
