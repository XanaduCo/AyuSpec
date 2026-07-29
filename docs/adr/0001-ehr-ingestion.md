# ADR-0001: EHR ingestion strategy

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-29 |
| **Supersedes** | The "fork Fasten Health as an isolated GPL service" decision in `CLAUDE.md` and the original `docs/ingestion/ehr.md` |

!!! info "Per-service detail"
    The findings behind this decision are recorded per service in
    [Service Evaluations](../evaluations/index.md) — see
    [Apple Health](../evaluations/apple-health.md),
    [Epic direct](../evaluations/epic-direct.md),
    [Fasten](../evaluations/fasten.md), and
    [Oracle Health / Cerner](../evaluations/oracle-cerner.md).

## Context

The original plan was to fork [Fasten Health](https://github.com/fastenhealth/fasten-onprem)
and run it as an isolated Go service behind a REST/FHIR boundary, using its SMART-on-FHIR
connector catalog as the EHR spine. That plan is dead:

> **"Effective immediately, Fasten Onprem will no longer support direct medical record
> retrieval from EHR systems."** — [fasten-onprem#629](https://github.com/fastenhealth/fasten-onprem/issues/629), 2026-02-07

The repository was **archived by its owner on 2026-07-18** and is read-only. Retrieval moved
exclusively to **Fasten Connect**, a hosted commercial product. No community fork continues
EHR retrieval — all 100 newest forks sit at the archive-point commit with no divergent
activity.

Forking an archived connector layer would invert the project's own stated mitigation in
`CLAUDE.md` — *"lean on upstream OSS for connector maintenance; don't rebuild what already
exists"* — and hand us the connector-rot burden identified as the thing that kills projects
like this.

Three findings from the replacement research reshaped the options:

1. **The Apple Health manual export contains raw provider FHIR JSON**, not PDFs and not
   only CDA. Verified against Apple's own DTD embedded in `export.xml`: each
   `<ClinicalRecord>` stub carries `fhirVersion` and a `resourceFilePath` pointing into a
   `clinical-records/` folder holding one FHIR resource per file. The free path is a zip
   parser, not a connector.
2. **Direct Epic access is free and self-service, with no per-health-system activation** for
   qualifying patient-facing apps, via Epic's Automatic Client ID Distribution. Epic:
   *"All US provider organizations currently receive client IDs that meet the automatic
   distribution criteria."*
3. **Since 2026-01-01 this is regulator-backed**, not a vendor favor. 45 CFR 170.215 now
   mandates SMART App Launch 2.0.0, requiring `client-public`, `permission-offline`, and
   PKCE S256 — so a public-client local app is a first-class path.

## Decision

EHR ingestion is **tiered**, mirroring the [Open Wearables / Terra Bridge](../open-wearables.md)
pattern already established for devices: free, zero-egress paths are the default; a paid
add-on that transits a third party exists for breadth and requires explicit consent.

| Tier | Path | Coverage | Egress | Priority |
|---|---|---|---|---|
| **1 — Base** | [Apple Health export](../ingestion/apple-health.md) zip parse | ~450 real multi-site US systems; **no clinical note text** | **Zero** | MVP |
| **2 — Direct** | Epic SMART-on-FHIR, auto-distributed | ~800 Epic orgs, **including note content** and Outside Records | Direct to Epic only | P1 |
| **3 — Live** | iOS companion app (HealthKit) | Apple sources + incremental sync | Zero (local network) | P1 |
| **4 — Premium** | **Fasten Connect** (paid add-on) | Cerner, Meditech, athenahealth, eClinicalWorks, payers — **breadth beyond Epic** | **Transits Fasten**, 24h retention | P2 |

**We do not fork Fasten.** Fasten Connect is consumed as a hosted API behind an adapter
interface — one implementation among several, never the interface itself.

### Why Fasten Connect is the premium tier and not the base

Wide record access is a real user need, and Fasten is the only realistic way to reach
non-Epic, non-Apple providers without maintaining connectors ourselves. Its terms are
unusually good for this role:

- **FHIR R4 as NDJSON** — not a proprietary schema
- **24-hour retention, then automatic deletion**: *"the system deletes the cached copy
  automatically"*
- *"We don't sell your personal information, ever"* and *"We do not currently anonymize or
  de-identify your Personal Information"*, with a change-notification commitment
- No AI/ML training clause; CARIN Alliance Code of Conduct signatory
- **Polling is supported** as an alternative to webhooks — so no inbound ports and no tunnel
  on a home machine
- Fasten's own docs name Medplum as a recommended landing store

But it is paid, closed, and hosted, so it cannot be the default in a zero-egress product.

### Consent requirement

Enabling Fasten Connect requires **explicit per-provider consent**, surfacing that records
transit Fasten's infrastructure. This is the same consent gate as Terra Bridge. Additionally,
CARIN obligations flow down to us as a Fasten customer — including that **use of data for AI
or ML must be clearly disclosed**, which our local LLM reasoning arguably constitutes.

## Consequences

**Positive**

- **The GPL process boundary disappears.** It existed solely to isolate the GPL-3.0 Fasten
  fork from the core. With no fork, there is no GPL code in the process map — one fewer
  service, one fewer license hazard, one fewer thing to explain.
- The MVP path needs **no external approvals at all**: no Apple Developer account, no Epic
  registration, no hospital involvement.
- Epic direct is **$0** — registration, production, and auto-distribution are free. The
  $500 Connection Hub listing and Vendor Services fees are optional marketplace products.

**Negative / accepted costs**

- **We own the Apple Health export parser.** Neither Fasten nor Medplum has one
  ([fasten-onprem#479](https://github.com/fastenhealth/fasten-onprem/issues/479) open since
  June 2024). It is net-new code — but a zip parser, not a connector to maintain.
- **No single path covers a typical user's providers.** ~450 Apple systems vs ~800 Epic orgs
  vs Fasten's wider catalog; the tiers are complementary, not redundant. Users with multiple
  providers will need more than one.
- **Vendor concentration risk on Fasten.** They killed the free path once already, this year,
  for stated sustainability reasons. Mitigated by the adapter interface.
- **macOS cannot read HealthKit.** `isHealthDataAvailable()` returns false on macOS, so a
  Mac Mini deployment genuinely requires the manual export or the iOS companion. Not
  optional.

### Traps that must be respected in implementation

!!! danger "Epic's production marking is a one-way door"
    Epic, verbatim: *"Neither you nor Epic can make updates to an app once it has been
    marked Ready for Production… all technical changes will require you to build a new
    app."* The API and scope list is **frozen forever** at production-marking; only
    redirect URIs and JWK Set URLs stay editable.

    Adding one FHIR resource later means a new client ID and re-distribution from scratch.
    **Select the full USCDI v3 resource set correctly the first time.**

!!! warning "Apple export gotchas"
    - **Provenance requires a join.** The FHIR files do not carry the institution name;
      `sourceName` lives only on the `<ClinicalRecord>` stub in a multi-GB `export.xml`
      that must be SAX-streamed.
    - **DSTU2 and R4 coexist in the same export**, per record. Apple has published no DSTU2
      deprecation date.
    - **Clinical notes are absent.** An audit of a real multi-institution export found 463
      `DocumentReference` files, zero with inline data, 462 pointing at `Binary/<id>` — and
      zero `Binary` files present. Treat them as a coverage manifest, not content.

## The unresolved fork: refresh tokens

Epic's auto-distribution requires the app *"does not use refresh tokens **OR** uses refresh
tokens and has a client credential uploaded by the vendor for that community member."*

| Option | Consequence |
|---|---|
| **No refresh tokens** | True zero-touch distribution to all ~800 orgs. User re-authenticates through MyChart on every sync. For an occasional *"what changed in my last 90 days?"* workflow this is likely acceptable. |
| **Refresh via device-local dynamic client registration** | Architecturally ideal for zero-egress — RFC 7591 at `POST {base}/oauth2/register`, keypair generated **on the user's device**, no shared secret ever leaves the machine. But may land in the per-org credential lane: ~500 orgs × a 7-click modal each, [documented first-hand](https://github.com/jmandel/health-skillz/blob/main/blog/epic/2026-02-11-epic-activation-journal.md). |

**Epic's documentation does not say whether dynamic client registration trips the
"uses refresh tokens" condition.** This is the highest-value unknown in the whole EHR path
and must be settled empirically against the sandbox — not by further reading.

Note also that refresh-token lifetime is **not under our control**: patients choose the
persistent-access period in MyChart from options the org configures.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| **Fork Fasten Onprem anyway** | Upstream archived and retrieval-disabled; we would own the connectors — the exact burden the project set out to avoid. |
| **Fasten Connect as the base tier** | Paid, closed, hosted. Cannot be the default in a zero-egress product. |
| **Build our own SMART-on-FHIR connector catalog** | This is what Fasten just abandoned as unsustainable, with more resources than we have. |
| **Oracle Health / Cerner direct as a P1 peer to Epic** | No documented auto-distribution equivalent; per-tenant service requests appear to be required, 10-minute access tokens, no dynamic client registration. Second-tier target. |
| **Android Health Connect as an Apple-export analogue** | Medical Records API still `@ExperimentalPersonalHealthRecordApi` 15 months on; Google operates no provider connections into it; **health records are explicitly excluded from its export**. No Android analogue exists. |

## Follow-up actions

- [ ] **Empirically test** whether Epic dynamic client registration trips the refresh-token auto-distribution condition (sandbox).
- [ ] Email `support@fastenhealth.com`: (a) can a solo developer obtain **live-mode** credentials, (b) what is the billing unit and minimum for non-TEFCA portal connections, (c) is there an individual/hobbyist tier. **No pricing is published and community questions about an individual tier went unanswered** — this could make the premium tier unviable for our target users.
- [ ] Pull Fasten's [public catalog](https://www.fastenhealth.com/directory) and confirm the two MVP users' actual health systems are covered.
- [ ] Finalize the USCDI v3 resource list **before** marking any Epic app production-ready.
- [ ] Confirm which US Core version Epic asserts (3.1.1's adoption expired 2026-01-01; 6.1.0 is now operative).
