# Journey 07 — Add a bridged connector with consent (Terra / Fasten)

> **Who:** Maya (Garmin, gated) as the spine · Ravi (a Cerner cardiologist) in parallel · **Intent:** reach a source the direct path *cannot* — and know exactly what that costs · **Entry surface:** Data sources · **Egress posture:** 🟢 sovereign (Maya) / 🟢 hybrid (Ravi), both weighing their *first* bridged connection · **Primary modality:** connector cards + a per-provider consent screen

## The intent

Both users have hit the one wall the direct tier cannot climb. Maya owns a **Garmin**; Open Wearables has a complete Garmin integration but cannot get new API credentials — Garmin's developer program is closed to new applicants, and no amount of local compute reaches it. Ravi's **cardiologist runs on Cerner**, which the Epic SMART-on-FHIR path does not serve. Neither wants a bridge on principle. Each wants to see, precisely, what a bridge would give them and what it would cost their guarantee — and then decide. This journey is the *legibility of that trade*, not the data behind it.

!!! abstract "The one rule this journey rests on"
    A bridge is only ever offered **where the direct path is closed** — never as an upsell over a source you could reach for free. It is opt-in per provider, off by default, states plainly that records transit a third party, and falls back to the direct tier if it vanishes ([Journey 08](08-switch-connectors.md)). The value ayuOS returns here is the *legibility of the trade*, so the user can decline with the same confidence as they accept.

## Preconditions

- ayuOS installed and running self-hosted ([Journey 01](01-install-self-hosted.md)).
- Maya has bootstrapped her record from an Apple Health export ([Journey 03](03-apple-health-bootstrap.md)) and connected direct wearables where possible ([Journey 04](04-connect-wearables.md)). Her Apple Watch is already flowing; her Garmin is the gap.
- Ravi has connected his Epic hospital directly ([Journey 05](05-connect-ehr-epic.md)) and uploaded files ([Journey 06](06-upload-files.md)). His Epic labs, notes, and Outside Records are in the store; his Cerner cardiologist is the gap.
- Both understand the three axes — this journey moves only **Axis 3 (Connections)**, from direct to bridged, and touches nothing about deployment or inference ([Tiers](../tiers.md)).

---

## Walkthrough

The two cases share one shape: *hit the wall → see the bridge beside its fallback → read the consent → decide*. Maya's arc runs first (steps 1–5, she declines); Ravi's parallel arc is steps 6–8 (he accepts for one provider). Step 5 shows the accept-branch for a Maya-shaped user too, so both outcomes are on the page.

### Step 1 — Maya looks for Garmin and hits the wall

- **User intent here:** Add her Garmin so its readiness, body battery, and HRV join the record.
- **User does:** Opens **Data sources**, taps *Add a source*, types "Garmin".
- **System does:** Shows a Garmin card marked **not reachable directly** — Open Wearables has the integration built, but Garmin's developer program is closed to new applicants, so a self-hosted install cannot obtain credentials. The card does **not** dead-end: it names the only path that reaches Garmin (Terra Bridge, 🟠 bridged) and, in the same card, what she keeps without it.
- **Value returned this step:** The answer in one step — *why* the free path fails (a developer-agreement wall, not a bug), stated without burying it or pretending the direct path can do it.
- **Modality:** Connector search + card in Data sources.
- **UX constraints / laws:** Connectors **fail loudly, never silently** — the wall is stated, not hidden. Amber marks the bridged option the instant it appears (color is a language, not decoration).

### Step 2 — The bridge is shown *beside its fallback* (Law 6)

- **User intent here:** Understand what she'd gain and what she'd lose before touching consent.
- **User does:** Reads the Garmin card. Two columns, fixed axes.
- **System does:** Renders the trade without ranking it:

    | Add Terra Bridge (🟠 paid, bridged) | What you keep without it (🟢 free, zero-transit) |
    |---|---|
    | Live Garmin sync — readiness, body battery, stress, HRV, workouts | **Everything already ingested stays** — Apple Watch, Apple Health history, labs, all of it, untouched |
    | ~50+ providers reachable, per-provider | Every **direct** provider (Oura, Whoop, Polar, Fitbit…) via Open Wearables, zero transit |
    | Records transit Terra's cloud before landing locally | **Garmin FIT-file export → local parse** — a zero-transit path for historical Garmin data, no bridge |

- **Value returned this step:** She can see the whole decision at a glance — the bridge is never shown without the fallback beside it, so "no" is a fully-informed option.
- **Modality:** Two-column comparison card, fixed axes (no silent ranking — Law 2).
- **UX constraints / laws:** **Law 6** dominates — a tier is never rendered without what you keep without it. **Law 2** — nothing is ranked; the columns sit on the same axes and ayuOS does not nudge toward the paid one.

### Step 3 — Maya opens the consent screen (reads, does not yet accept)

- **User intent here:** See exactly what enabling the bridge would authorize.
- **User does:** Taps *Review the Terra Bridge consent* on the Garmin card. This is a **read**, not an enable — nothing is turned on by opening it.
- **System does:** Presents the per-provider consent screen, scoped to **Garmin only**:

    !!! warning "Terra Bridge — Garmin (consent required)"
        - **What happens:** Terra authenticates with Garmin on your behalf and delivers Garmin data to your local Open Wearables endpoint. **Your Garmin records transit Terra's cloud before landing on your machine.**
        - **Scope:** this consent covers **Garmin only.** It enables no other provider. It is **off by default** and is never assumed.
        - **What Terra may do with transit data:** Terra's terms permit aggregating **de-identified** analytics on data in transit. Enabling the bridge accepts that.
        - **Posture change:** the Garmin source becomes **🟠 amber** — bridged, crossing the device boundary. Every other source stays 🟢 green.
        - **Revocable:** you can revoke this per-provider consent at any time; revoking stops future sync and falls back to FIT-file export ([Journey 08](08-switch-connectors.md)).
        - **Logged:** enabling, and every later sync, is written to the append-only consent log and the [ledger](../ai-transparency.md).

- **Value returned this step:** Full disclosure *before* any commitment — she reads the exact terms, the exact scope, and the exact posture change with zero obligation to proceed.
- **Modality:** Consent admonition; append-only consent log entry only *if* she accepts.
- **UX constraints / laws:** Consent is **per-purpose, per-provider, and reversible** (reciprocity rule — every ask is scoped and reversible). Egress is **previewed, never assumed** (Law 4): the transit is named before anything moves.

### Step 4 — Maya declines — and the product respects it without nagging

- **User intent here:** Decide. For her sovereign posture, transiting Terra's cloud is not worth live Garmin sync.
- **User does:** Closes the consent screen without enabling. Instead she taps *Use FIT-file export instead* on the Garmin card.
- **System does:** Enables the **zero-transit** Garmin path — she drops FIT exports into the uploads pane and they parse locally, same as any file. Garmin history lands in the store with **no amber anywhere**. No modal asks "are you sure?", no reminder badge reappears, no periodic prompt to reconsider. The Garmin card simply shows *direct (FIT export) · bridge available if you want it later*.
- **Value returned this step:** She gets Garmin history **on her own terms** — and, just as important, the product treats "no" as a legitimate final answer. The reward for effort this step is her guarantee kept intact plus the data she actually needed.
- **Modality:** File upload (FIT) → local parse; no live connector.
- **UX constraints / laws:** **No dark patterns** — declining a paid tier must not degrade the free experience or nag (Law 7: education/prompts inject, never nag, never gate). The absence of amber is the visible proof her posture held.

### Step 5 — The accept-branch (a different user, eyes fully open)

- **User intent here:** Show that the *same* screen serves a user who wants the bridge — the point is the choice was legible, not that one answer is correct.
- **User does:** A Maya-shaped user who *does* want live Garmin sync taps *Enable Terra Bridge for Garmin*, pays Terra's per-connection fee, and authorizes Garmin through Terra's hosted widget.
- **System does:** Terra begins delivering Garmin data to the local Open Wearables endpoint. The Garmin source card turns **🟠 amber**; the header posture summary now reads *1 bridged source (Garmin)*, everything else green. The consent log records the enable with timestamp, scope, and the transit disclosure. First sync streams in over minutes, not instantly.
- **Value returned this step:** Live gated-device data, with the cost rendered permanently on the source — amber for Garmin, green for the rest, auditable forever.
- **Modality:** Hosted Terra widget (OAuth) → local webhook; amber posture on the source card.
- **UX constraints / laws:** **Law 1** — posture is always on screen; the amber is not a one-time warning, it is the source's standing state. **Law 4** — the transit was previewed and is now logged.

### Step 6 — Ravi hits the same wall on the EHR axis (Cerner)

- **User intent here:** Pull his cardiologist's records — the one provider his Epic direct path cannot reach.
- **User does:** In **Data sources**, searches for his cardiology group; it resolves to a **Cerner (Oracle Health)** system.
- **System does:** Marks it **not reachable directly** — Epic auto-distribution serves only Epic orgs; Cerner has no equivalent free self-service path. The card names the one path that reaches it (**Fasten Connect**, 🟠 bridged, paid) and, beside it, what he keeps without it: his **Epic** hospital (labs, notes, Outside Records) and his wearables, all direct, all green.
- **Value returned this step:** Same wall, same fallback-beside-it framing — Ravi immediately sees this bridge buys *one* provider, not a replacement for his working direct tier.
- **Modality:** Connector search + card; the EHR equivalent of Maya's Garmin card.
- **UX constraints / laws:** **Law 6** again — the paid EHR tier renders beside the free Epic + Apple-export paths it never replaces.

### Step 7 — Ravi reads the Fasten consent (note the extra disclosures)

- **User intent here:** Understand the terms specific to bridged EHR before enabling.
- **User does:** Opens *Review the Fasten Connect consent* for the cardiology group.
- **System does:** Presents a per-provider consent screen, scoped to that **one Cerner provider**:

    !!! warning "Fasten Connect — [Cardiology group] (consent required)"
        - **What happens:** Fasten retrieves this provider's records via SMART-on-FHIR on your behalf and your machine polls to download them as FHIR R4 NDJSON. **These records transit Fasten's cloud.**
        - **Retention:** Fasten deletes the cached clinical copy automatically **after 24 hours.** (Account/connection metadata persists — stated plainly.)
        - **Scope:** this consent covers **this provider only.** Your Epic connection and wearables are untouched and stay 🟢 green.
        - **AI/ML disclosure (CARIN):** ayuOS runs local LLM reasoning over your records; under Fasten's CARIN obligations this use is disclosed to you here.
        - **Not sold:** *"We don't sell your personal information, ever."* No AI/ML training clause.
        - **Revocable & logged:** revoke per-provider anytime; falls back to Epic direct + Apple export ([Journey 08](08-switch-connectors.md)). Enable and every poll are written to the consent log and [ledger](../ai-transparency.md).

- **Value returned this step:** The bridged-EHR trade in full — including the *better-than-Terra* 24-hour retention and the CARIN AI/ML disclosure — before he commits a dollar or a record.
- **Modality:** Consent admonition; per-provider scope.
- **UX constraints / laws:** **Law 4** — transit and retention previewed before anything moves. Reciprocity — the ask (pay + consent) is scoped to exactly one provider and reversible.

### Step 8 — Ravi accepts for that one provider — amber for it alone

- **User intent here:** Get the cardiologist's history into the record; for him the breadth is worth the transit.
- **User does:** Taps *Enable Fasten Connect*, authorizes the Cerner portal login through Fasten's widget, confirms the per-provider consent.
- **System does:** Fasten pulls the records; ayuOS polls and downloads NDJSON to the local store, deduplicating against Epic and Apple-export data by `(patient, LOINC code, effective date/time)`. The cardiology source card turns **🟠 amber**; **Epic stays green, wearables stay green.** The header posture reads *1 bridged EHR source*. New cardiology labs now merge into the same timeline as his Epic labs.
- **Value returned this step:** The one missing provider, unified into a record that was already answering his questions — with the cost isolated to exactly that source and visible forever.
- **Modality:** Fasten Stitch widget → poll/download NDJSON → local dedup + merge.
- **UX constraints / laws:** **Law 1** — amber marks only the Cerner source; posture is per-source, never a blanket verdict on the install. **Data over chrome** — the merged labs render in the timeline with their reference ranges, source-labeled.

---

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Search for a gated provider (Garmin) | The reason the direct path can't reach it, plus the one path that can — no dead end |
| 2 | Read the bridge card | The full trade at a glance: the bridge *and* everything kept without it, side by side (Law 6) |
| 3 | Open the consent screen | Exact terms, exact scope, exact posture change — with zero obligation to enable |
| 4 | Decline the bridge | Garmin history via zero-transit FIT export, guarantee intact, and no nagging afterward |
| 5 | (Accept branch) pay + authorize Terra | Live gated-device sync with the cost rendered permanently as amber on that source only |
| 6 | Ravi searches for his Cerner cardiologist | Same wall + the Epic/Apple fallback shown beside the paid option |
| 7 | Ravi reads the Fasten consent | Bridged-EHR terms in full — 24h retention, CARIN AI/ML disclosure, per-provider scope |
| 8 | Ravi accepts for one provider | The missing cardiologist merged into his timeline; amber isolated to that source, Epic stays green |

---

## UX & modality constraints

- **The dominant laws here are 6, 4, 2, and 1.** Law 6 (fallback shown with every tier) is the spine — no bridge appears without what you keep without it. Law 4 (egress previewed, never assumed) governs both consent screens. Law 2 (nothing ranked silently) keeps the two-column trade neutral. Law 1 (posture always on screen) makes amber a *standing* per-source state, not a dismissible warning.
- **Color semantics are load-bearing:** 🟢 green = direct/zero-transit sources, 🟠 amber = bridged sources crossing the device boundary. Amber is **per-source** — one amber source never turns the rest of the install amber.
- **Consent is per-provider, off by default, reversible.** Opening a consent screen enables nothing; enabling is a distinct explicit act, logged append-only.
- **Latency:** bridged first-sync is not instant — Terra delivers over minutes; Fasten export files range from ~30 MB up to multi-GB, so download and local ingest take time. The app stays usable throughout.
- **Offline:** with a bridge enabled, going offline simply pauses future syncs; everything already downloaded is local and fully queryable. The bridge is a delivery path, not a dependency of reading the record.
- **Empty/decline state is a first-class outcome:** declining leaves a clean card offering the zero-transit fallback (FIT export for Garmin; Epic + Apple export for EHR), never a locked or degraded view.
- **Accessibility:** green/amber is paired with text labels and the source-card status line, never color alone; evidence strength (elsewhere) uses the hue-free ink-dot ramp so it can't be confused with the privacy hues.

---

## Where it can break (and the fallback)

!!! warning "Failure modes are the point of this journey"
    Every break here degrades to a direct, zero-transit path — losing a bridge costs breadth, never the system or the stored history ([Tiers](../tiers.md)).

| What breaks | What the user sees | Fallback |
|---|---|---|
| **User declines consent** | Nothing enabled; card offers the zero-transit path | Fine — the intended, respected outcome. Garmin via FIT export; Cerner deferred, Epic + Apple export intact |
| **Terra / Fasten changes pricing or shuts the service** | The bridged source stops syncing, logged loudly | Everything already ingested **stays in Postgres**; direct providers keep working — the switch-and-lose flow is [Journey 08](08-switch-connectors.md) |
| **A provider even the bridge can't reach** | Card marks it unreachable by *any* path | No pretense — offered the nearest manual path (FIT export, a portal PDF upload) rather than a promise it can't keep |
| **Bridge sync errors mid-pull** | Error surfaced on the source card; partial data flagged | Connectors fail loudly and skip; the agent still answers over what's stored — nothing else stalls |
| **Commercial fit unverified (Fasten individual pricing)** | If no individual tier exists, the tier is simply not offerable | The limitation is stated ([ADR-0001](../adr/0001-ehr-ingestion.md)); Epic + Apple export remain the working EHR floor |
| **Later doubt about an amber source** | The user wants to audit exactly what left the device | The amber source's every sync is in the ledger — verified in [Journey 14](14-verify-and-maintain.md) |

---

## What good looks like

- Maya declines the Garmin bridge, keeps her zero-egress guarantee, still gets her Garmin history via FIT export — and is **never nagged** to reconsider. The product proved "no" is a first-class answer.
- Ravi enables Fasten Connect for **one** Cerner provider, his cardiologist's records merge into the same timeline as his Epic labs, and the cost is isolated to a single amber card while everything else stays green.
- In both cases the user could state, unprompted, *exactly* what they traded — the bridge existed only where the direct path was closed, the consent was per-provider and reversible, and the amber tells the truth at a glance. The value returned was the **legibility of the trade**.

---

## Related

- [Tiers & fallbacks](../tiers.md) — Axis 3 (Connections), the fallback guarantee, worked configurations
- [Open Wearables](../open-wearables.md) — the direct wearable path and the Terra Bridge add-on for gated devices
- [EHR ingestion](../ingestion/ehr.md) · [ADR-0001](../adr/0001-ehr-ingestion.md) — the four EHR tiers and the per-provider consent requirement
- [AI Transparency](../ai-transparency.md) — the ledger and consent log that record every bridged sync
- [PII gateway](../pii-gateway.md) — why bridged transit is an *ingestion* egress, distinct from the model-call chokepoint
- [Journey 04 — Connect direct wearables](04-connect-wearables.md) · [Journey 05 — Connect Epic directly](05-connect-ehr-epic.md)
- [Journey 08 — Switch, swap & lose a connector](08-switch-connectors.md) — what happens when a bridge disappears
- [Journey 14 — Verify sovereignty & live with it](14-verify-and-maintain.md) — auditing an amber source in the ledger
