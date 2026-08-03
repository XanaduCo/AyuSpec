# Data Sharing & Consent (Slivers)

!!! note "Status: draft stub"
    Scope is defined; internal design (consent schema, delivery mechanisms) is still open. See [Open questions](#open-questions).

## Overview

A **sliver** is a scoped, purpose-built, consent-controlled view of a user's record, assembled for a specific recipient and purpose. Slivers range from a full doctor-ready brief down to a single-metric slice for one provider.

Sharing is the **outbound** counterpart to [ingestion](ingestion/index.md): ingestion pulls the world's data about the user *in*; sharing lets the user push a deliberately narrow slice *out*, on their terms. The default posture is minimal disclosure — the user decides exactly what each sliver contains and who receives it. Never all-or-nothing.

This capability serves user job #2 in the [vision](vision.md#what-users-want-to-do).

## What a sliver is

A sliver is defined by five things:

| Dimension | Description |
|---|---|
| **Scope** | Which resources, metrics, and time range are included (e.g. "lipids + HRV, last 12 months") |
| **Purpose** | Why it's being shared (e.g. "cardiology consult 2026-08") — recorded, not just implied |
| **Recipient** | Who receives it (a named provider, a role, or "unspecified / user-held") |
| **Format** | How it's rendered — FHIR bundle, PDF brief, structured summary (see [Delivery formats](#delivery-formats)) |
| **Consent record** | An append-only entry capturing all of the above, plus creation time and any expiry/revocation |

## Composition model

Slivers are composed, not exported wholesale. A user (or the agent, on request) selects:

- **By domain** — cardiac, metabolic, sleep, mental health, reproductive, genomic, etc. Including
  genomic content is allowed but off by default; because a genome cannot be de-identified, the
  composer warns that the sliver will be identifiable before it is produced (see [PII Gateway](pii-gateway.md#genomic-data)).
- **By source** — labs only, wearables only, clinical notes only
- **By time window** — last 90 days, since a given event, all-time
- **By resource type** — Observations, DiagnosticReports, Conditions, Medications

The agent can propose a sliver from a natural-language request ("put together what my new PCP needs") and show the user exactly what's in and out **before** anything is produced.

## Consent & audit

Every sliver produces a **consent record** in an append-only local log:

| Field | Value |
|---|---|
| `sliver_id` | |
| `created_at` | |
| `purpose` | Free text, required |
| `recipient` | Named recipient or role |
| `scope` | Serialized description of included resources/metrics/window |
| `format` | Delivery format |
| `expiry` | Optional — when the sliver should be considered stale/revoked |
| `revoked_at` | Set if the user revokes |

Revocation is meaningful only for hosted/link-based delivery (see below). A file the user has already handed to someone cannot be un-shared — the UI must make this distinction explicit.

## Delivery formats

| Format | Mechanism | Egress |
|---|---|---|
| **Doctor packet** | PDF generated locally | None — user transmits the file themselves |
| **FHIR bundle** | JSON file, importable into another FHIR system | None — local file |
| **Structured summary** | Markdown/PDF human-readable brief | None — local file |
| **Time-boxed share link** | Hosted endpoint serving the sliver to a recipient | **Transits ayuOS Cloud** — opt-in, cloud tier only |

## Relationship to egress posture

Critical design constraint: **the default sharing mechanism produces a file, not a network call.** In the self-hosted default, a sliver is an artifact generated locally that the user then transmits by whatever channel they choose. ayuOS makes no outbound call to share it, consistent with the [egress posture](security.md#egress-posture-is-a-configuration-not-a-fixed-property) of that configuration.

The hosted "share link" — where a recipient fetches the sliver from an ayuOS-operated endpoint — necessarily transits the cloud and is therefore **opt-in, disclosed, and cloud-tier only**. It is never implied or silently available in the self-hosted path.

Both paths produce the same sliver content. The link tier buys delivery convenience and revocability; it does not unlock a richer export. A self-hosted user gives up nothing but the hosting — which is the [general rule across tiers](tiers.md#what-every-tier-shares).

## Relationship to other components

- [Agent Loop](agent-loop.md) — `generate_doctor_packet` is the first, coarsest sliver generator; slivers generalize it.
- [Frontend & UI](frontend.md) — the sliver composer (pick scope, preview, confirm) lives here.
- [PII Gateway](pii-gateway.md) — a sliver delivered via a cloud link is a cloud egress and must pass the gateway.
- [Security & Privacy](security.md) — consent log and per-tier egress posture.
- [Tiers & Fallbacks](tiers.md) — why the hosted link tier exists and what it falls back to.

## Open questions

- [ ] What is the consent-record schema, and does it live in Postgres, the FHIR store (as `Consent` resources), or a dedicated append-only log?
- [ ] Should slivers be re-generatable (a saved definition that re-runs against current data) or always point-in-time snapshots?
- [ ] For the cloud share-link path: authentication of the recipient, link expiry defaults, and what the recipient sees.
- [ ] Do we model the disclosure trail on FHIR `Consent` + `Provenance` semantics — so a recipient system could read it, since we generate FHIR at the export boundary anyway — or keep a bespoke `ayuos.slivers` log? ⏸ [Deferred](storage.md#deferred-decisions).
- [ ] Redaction depth — can a sliver include a lab value but strip the ordering provider's identity? What's the minimum viable redaction unit?
- [ ] How does revocation surface to a recipient who already fetched a hosted sliver?
