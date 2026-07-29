# Fasten Health — Onprem and Connect

| | |
|---|---|
| **Verdict** | ❌ **Onprem: dead** · ✅ **Connect: adopted as Tier 4 premium** |
| **Decision** | [ADR-0001](../adr/0001-ehr-ingestion.md) |

Two different products with the same brand. The original plan depended on the first; the
current plan uses the second in a much narrower role.

---

## Fasten Onprem — ❌ dead

**Was:** the EHR spine of the project. The plan was to fork it, run it as an isolated Go
service behind a REST/FHIR boundary, and inherit its SMART-on-FHIR connector catalog.

**What happened:**

> **"Effective immediately, Fasten Onprem will no longer support direct medical record
> retrieval from EHR systems."**
> — [fasten-onprem#629](https://github.com/fastenhealth/fasten-onprem/issues/629), 2026-02-07

- **Archived by its owner 2026-07-18.** Read-only. 2,792 stars, GPL-3.0.
- Stated rationale: two divergent infrastructure stacks (Onprem + Lighthouse vs. Connect)
  sharing one institution catalog, unsustainable to maintain both.
- README now reads: *"Fasten OnPrem is a PHR to manage and view patient's medical data,
  **it does not integrate with EHRs directly**."*
- **No community fork continues retrieval.** All 100 newest forks enumerated via the GitHub
  API sit at the archive-point commit with 0 stars and no divergent activity. A maintainer
  offer to help in the thread went unanswered.

**Why forking anyway was rejected:** it would invert the project's own stated mitigation in
`CLAUDE.md` — *"lean on upstream OSS for connector maintenance; don't rebuild what already
exists"* — and hand us the connector-rot burden identified as what kills projects like this.

!!! warning "The lesson, not just the fact"
    This is why every external ingestion dependency now sits behind an **adapter interface**.
    A dependency chosen for maintenance-sharing disappeared mid-project, and no vendor should
    ever be the interface itself.

**Still alive, for reference:** [`fastenhealth/gofhir-models`](https://github.com/fastenhealth/gofhir-models)
(Apache-2.0, active 2026-06) — so the Go model layer isn't orphaned, though ayuOS doesn't use it.

**Prior art worth knowing:** [`cfu288/mere-medical`](https://github.com/cfu288/mere-medical)
— 289 stars, active — is the one live self-hosted project still doing its own direct
patient-portal connections. Useful evidence on whether DIY SMART-on-FHIR registration is
survivable, since it's the path Fasten just abandoned.

---

## Fasten Connect — ✅ adopted as Tier 4 (premium)

**Role:** the paid add-on for **wide record access** — Cerner, Meditech, athenahealth,
eClinicalWorks, NextGen, plus payers (Aetna, Anthem, Cigna, Humana, Kaiser, Medicare Blue
Button, VA). The providers [Epic direct](epic-direct.md) and [Apple Health](apple-health.md)
cannot reach.

### What it is

A hosted SaaS API plus an embeddable widget — **not self-hostable**.

- **Fasten Stitch** — a web component (`<fasten-stitch-element>`), plus React/React Native
  SDKs. Renders a health-system picker, redirects to the portal login, returns an
  `org_connection_id`.
- **Connect API** — `https://api.connect.fastenhealth.com/v1/`, HTTP Basic auth. Core call is
  `POST /v1/bridge/fhir/ehi-export`; async, then download.

### Why it fits the pattern

| Criterion | Finding |
|---|---|
| **Format** | **FHIR R4 as JSONL/NDJSON** (`application/fhir+ndjson`) — not proprietary |
| **Delivery to a local box** | **Polling is supported** (`GET /bridge/fhir/ehi-export/{id}`) as a documented alternative to webhooks → **no tunnel, no inbound ports.** Download 302s to a short-lived S3 URL your machine pulls directly. |
| **Retention** | **24 hours, then automatic deletion** — *"Once the 24 hour window elapses, the system deletes the cached copy automatically."* A transient pipe, not a data lake. |
| **Data usage** | *"We don't sell your personal information, ever."* And: *"We do not currently anonymize or de-identify your Personal Information"* — with a commitment to update the policy first if that changes. **No AI/ML training clause.** CARIN Alliance Code of Conduct signatory. SOC2 claimed. |
| **Mechanism** | SMART-on-FHIR patient access under the hood, riding Cures Act right-of-access — which is why it can serve non-treatment use cases |
| **Landing store** | Fasten's own docs **name Medplum** as a recommended sink |

Structurally this is Terra-for-EHR, with a **better retention story than Terra offers**.

⚠️ Caveat: only the *clinical payload* is 24h. Account metadata, connection records, and the
OAuth grant persist indefinitely.

### Costs and risks

**🚨 Commercial fit is unverified — this is the live risk.**

- **No published pricing.** `fastenhealth.com/pricing` 404s; the docs corpus has no rate card.
- **No known individual tier.** In the Onprem shutdown thread, two users asked directly
  whether Connect would be priced for a consumer and whether an individuals tier would exist.
  **The maintainer answered adjacent questions and left both unanswered.**
- Sales motion is enterprise-shaped: BAAs and SLAs are *"available for customers on upgraded
  plans"*; TEFCA mode explicitly carries *"additional fees"*.
- ⚠️ **Unverified:** whether a solo developer can obtain **live-mode** credentials without a
  company or contract. Sandbox signup is self-serve.

This could make Tier 4 unviable for ayuOS's target users. It is the first
[follow-up action](../adr/0001-ehr-ingestion.md#follow-up-actions) in ADR-0001.

**Other costs:**

- **No bring-your-own-credentials.** Fasten holds the OAuth relationship with every health
  system — that is the product. You hold only an `org_connection_id`. (The docs page named
  *"Bring Your Own Identity"* is a false friend — it concerns TEFCA IAL2 identity proofing,
  not OAuth credentials.)
- **CARIN obligations flow down to us** as a customer: consent-only use, easy revocation, and
  notably **clear disclosure of AI/ML use of the data** — which local LLM reasoning over
  records arguably constitutes. Belongs in the consent copy.
- **Vendor concentration.** They killed the free path once already, this year. Mitigated by
  the adapter interface.
- File sizes range from ~30 MB/500 resources to **3 GB/5,000 resources** (attachments
  dominate) — size local ingest accordingly.
- ⚠️ **No public customer ToS/MSA.** `policy.fastenhealth.com/connect/terms.html` 404s; the
  posted terms are the open-source app's. The commercial contract is behind signup or sales.

### Coverage

Marketing claims **70,000+ US organizations** (the archived Onprem README said 50,000+ —
⚠️ inconsistent, and methodology unverified: organizations ≠ endpoints ≠ portals).

**Verifiable before paying:** there is a public catalog API (`POST /v1/bridge/catalog/search`,
plus a bulk export returning `brands.json` / `portals.json`) and a browsable
[directory](https://www.fastenhealth.com/directory). Confirm the MVP users' actual health
systems before committing.

## Sources

[fasten-onprem (archived)](https://github.com/fastenhealth/fasten-onprem) ·
[issue #629](https://github.com/fastenhealth/fasten-onprem/issues/629) ·
[Connect quickstart](https://docs.connect.fastenhealth.com/quickstart) ·
[caching strategy](https://docs.connect.fastenhealth.com/guides/caching-strategy) ·
[Connect privacy policy](https://policy.fastenhealth.com/connect/privacy_policy.html)
