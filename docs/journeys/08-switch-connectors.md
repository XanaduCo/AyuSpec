# Journey 08 — Switch, swap & lose a connector — the fallback in action

> **Who:** Ravi (device swap, Fasten loss, broken API) and Maya (reclaiming zero-transit) · **Intent:** change what feeds the record — by choice or by force — without losing history · **Entry surface:** Data sources · **Egress posture:** mixed, and *legible per source* — 🟢 direct connectors, 🟠 bridged ones · **Primary modality:** connector cards (toggle, re-sync, error badge) + per-source posture color

## The intent

Connectors are the part of ayuOS most exposed to the outside world, and the outside world is
unreliable: a vendor changes pricing, an API breaks, a program you depended on gets archived —
this happened once already, to the project's own original EHR spine. This journey is the
fallback guarantee stated in the [Tiers](../tiers.md#the-fallback-guarantee) page, dramatized
across four things that actually happen to a connector: you **swap** one, you **move** one from
bridged to direct, you **lose** one against your will, and one simply **breaks**. In every case
the question the user is really asking is the same: *"if this source goes away, what happens to
everything it already gave me?"* The answer this journey proves — not promises — is: **you lose
breadth or convenience; you never lose the system or the stored history.**

Three architectural properties make that real, and each sub-case leans on one:

- **Adapters, never interfaces.** No external service is ever the ingestion interface itself —
  it is one implementation behind it ([Ingestion](../ingestion/index.md#design-principles)).
- **We own the store.** Ingested data lands in Postgres schemas we designed
  ([ADR-0002](../adr/0002-clinical-data-store.md)); losing a vendor never loses history, only
  future retrieval.
- **The open core is the whole core.** There is no proprietary piece a self-hoster is missing,
  so "fall back" is a re-route, not a rebuild.

## Preconditions

- Connectors already exist to switch. Assumes some subset of:
  [direct wearables — Oura & Whoop](04-connect-wearables.md),
  [Epic direct EHR](05-connect-ehr-epic.md), and at least one
  [bridged connector with consent](07-add-bridged-connector.md).
- A bootstrapped record from an [Apple Health export](03-apple-health-bootstrap.md) — this is the
  zero-gate base tier every EHR fallback lands on ([ADR-0001](../adr/0001-ehr-ingestion.md)).
- Inference posture is unaffected by any of this — Ravi stays hybrid, Maya stays fully local.
  Connector changes touch **Axis 3 (connections)** only; the three-role header indicator (Law 1)
  does not move because no *model* provider changed.

!!! abstract "Read the color before reading the words"
    On every connector card, **green** means direct / zero-transit and **amber** means bridged /
    transits a vendor ([Design System](../design-system.md), color law). A connector *error* is an
    operational state, not a privacy state — it is shown as a neutral error badge, deliberately
    **not** the reserved red, which is kept for hard blocks and critical values only.

---

## Walkthrough

### Step 1 — Swap a device without double-counting (Ravi, A)

- **User intent here:** Ravi buys an Apple Watch to wear alongside his Oura ring. He wants the new
  device's data in, but both report **steps and heart rate** — he is worried the overlap will
  either double his step count or silently drop the older history.
- **User does:** Runs a fresh [Apple Health export](../ingestion/apple-health.md) (the watch data
  rides in it) and drops the `export.zip` onto the Apple Health card in **Data sources**. Oura
  keeps syncing untouched.
- **System does:** Parses the export, then runs the [crosswalk/dedup layer](../ingestion/index.md#crosswalk-and-normalization):
  overlapping observations are deduplicated by `content_hash` + `(source, source_resource_id)`,
  wearable codes map to LOINC where a mapping exists, and where two sources report the same day's
  steps the record keeps both with provenance rather than summing them. Oura's four months of ring
  history stay exactly as they were.
- **Value returned this step:** The Apple Watch card lights up **green** with its record count, and
  the Timeline immediately shows the two sources as distinct, labeled tracks — no phantom doubling,
  no lost ring history. Continuity across a hardware change, in one drag-and-drop.
- **Modality:** File upload (Apple Health `export.zip`) → Data sources card → Timeline verification.
- **UX constraints / laws:** Dedup is idempotent because **we own the store** and every resource
  carries provenance ([Storage](../storage.md#idempotency-and-provenance)); Apple exports are
  cumulative full dumps re-imported wholesale, so re-running is safe by design. Color: both cards
  green (direct). Law 8 — the Timeline shows each source's own values rather than a merged series.

### Step 2 — Move a source from bridged to direct, reclaiming zero-transit (Maya, B)

- **User intent here:** Maya enabled the paid **Terra Bridge** for her Garmin in
  [Journey 07](07-add-bridged-connector.md) — eyes open, per-provider consent — but the amber card
  bothers her every time she opens Data sources. She would rather stop the transit and pull Garmin
  history a slower, colder way that never leaves her machine.
- **User does:** On the Garmin card she opens the source picker and switches the adapter from
  **Terra Bridge** to **FIT file export**, then drops in her exported `.fit` files. She toggles the
  Terra Bridge connection off and revokes its per-provider consent.
- **System does:** Parses the FIT files locally into `timeseries`, dedups them against the samples
  Terra had already delivered (same provenance keys, so no duplication), and records the consent
  revocation in the append-only consent log. Because Garmin is one adapter behind the ingestion
  interface, nothing else in the pipeline changes. The Garmin card's posture flips from **amber to
  green**.
- **Value returned this step:** Everything Terra already pulled **stays in her Postgres** — she
  loses nothing she had. What she gains is the thing she came to ayuOS for: that source is now
  zero-transit, and the card says so in green. What she gives up is named on the card — future
  Garmin data now arrives only when she manually exports FIT files, not automatically.
- **Modality:** Connector card source-picker toggle + FIT file upload.
- **UX constraints / laws:** Law 6 — the switch is offered *beside* the fallback it degrades to, so
  she can see the trade before she commits. Law 4 spirit — revoking bridged consent is legible and
  logged, not silent. Color law: amber → green is the whole point of the step. Note the header's
  three-role indicator does not change — her inference was already fully local; connections and
  inference are independent axes.

### Step 3 — Lose a connector involuntarily — the load-bearing case (Ravi, C)

- **User intent here:** Ravi relies on **Fasten Connect** (paid, bridged) to reach his cardiologist
  on a non-Epic **Cerner** system — the only path to those records. One morning Data sources shows
  the Fasten card with an error badge: the service has changed its pricing to something he will not
  pay, or shut the tier down. His stomach drops: *does his cardiology history vanish with it?*
- **User does:** Clicks the Fasten card to read the failure. He is not asked to do damage control —
  the system already did it.
- **System does:** The Fasten adapter has failed loudly and stopped future retrieval. But **every
  Cerner record already ingested remains in the `clinical` schema** — Fasten never held Ravi's
  store; it only fed it (24-hour retention on their side, [ADR-0001](../adr/0001-ehr-ingestion.md)).
  The card presents the fallback inline (Law 6): non-Epic history that continues to answer from
  Postgres, plus the two zero-transit paths that remain open — the
  [Apple Health export base tier](../ingestion/apple-health.md) (~450 systems, zero gates) and
  [Epic direct](05-connect-ehr-epic.md). What he loses is scoped precisely: **new** records from
  that Cerner provider, nothing already retrieved.
- **Value returned this step:** The guarantee proven under fire. He asks *"show my cardiology
  history"* and it answers in full — the loss is future-only. This is not hypothetical marketing:
  it echoes the real **Fasten Onprem archival (mid-2026)** that motivated the adapter design in the
  first place. The store outlived the connector because the store was never the connector's.
- **Modality:** Error badge on the connector card → inline fallback panel → Ask (verifying history
  still answers).
- **UX constraints / laws:** Law 6 dominates — a lost tier is never shown without what you keep.
  **Adapters, never interfaces** and **we own the store** are the two properties doing the work.
  The error badge is neutral, not the reserved red — losing a paid connector is a degradation, not
  a hard block. Empty-state rule: the Fasten card does not disappear; it stays, disabled, with a
  path to re-enable if he ever chooses to pay again.

### Step 4 — See exactly what survived, and what didn't (Ravi, C continued)

- **User intent here:** Reassurance is not enough for a careful user — Ravi wants the ledger
  itself.
- **User does:** Opens the Data sources detail for the retired Fasten connector, then cross-checks
  in the [Timeline](../frontend.md).
- **System does:** Shows the last successful sync timestamp, the record counts still resident by
  resource type (Conditions, Observations, DocumentReferences from the Cerner provider), and a plain
  line: *future retrieval from this provider is off; stored history is intact and queryable.* The
  Timeline renders those Cerner events exactly as before, unchanged.
- **Value returned this step:** A precise inventory of what he keeps — counts, dates, resource
  types — instead of a vibe. He can decide whether the missing *future* breadth is worth finding
  another path (or re-subscribing) with full information.
- **Modality:** Connector detail view + Timeline.
- **UX constraints / laws:** Law 8 — data over chrome; the record counts are monospaced, tabular,
  and exact. **The open core is the whole core** — none of this survived because of a hosted
  feature; it survived because it was always local.

### Step 5 — A single connector breaks and the system keeps answering (Ravi, D)

- **User intent here:** Ravi opens ayuOS to ask his usual weekly question. He does not know or care
  that overnight **Whoop changed its OAuth token endpoint** and the connector's refresh failed.
- **User does:** Nothing special — he just goes to **Ask** and asks *"what changed this week?"*
- **System does:** The Whoop adapter failed its sync, logged the error, and **skipped** — it did not
  block the pipeline ([fail loudly, degrade gracefully](../ingestion/index.md#design-principles)).
  Data sources shows a neutral error badge on the Whoop card with the failure reason and a
  **Re-sync** button. The agent answers the weekly question over **everything else still stored** —
  Oura, labs, Apple Health, EHR — and, honoring Law 3, flags in the answer that Whoop recovery data
  is stale as of the last good sync so Ravi is not misled by a silent gap.
- **Value returned this step:** One broken source never takes the system down. He still gets his
  answer *and* a note flagging the one stream that is behind, plus a one-click retry when Whoop
  fixes its endpoint (or the adapter ships a patch via [`ayu update`](../deployment.md)).
- **Modality:** Ask (the answer) + Data sources error badge + Re-sync button.
- **UX constraints / laws:** **Fail loudly, degrade gracefully** is the whole step. Law 3 — the
  staleness caveat is a labeled claim in the answer, not hidden. Error badge is neutral, not red.
  Empty-state rule: the card offers the next best action (Re-sync), never a dead end.

### Step 6 — Re-verify posture after all the switching (both, → Journey 14)

- **User intent here:** After swapping, moving, losing, and repairing connectors, both users want to
  confirm the resulting posture is what they think it is — no bridge left running by accident, no
  cloud path opened silently.
- **User does:** Scans the Data sources view (per-source green/amber) and the header (three-role
  inference indicator), then — for the audit-minded — opens the ledger.
- **System does:** Renders a consistent picture: Maya sees all-green sources and an all-green
  header; Ravi sees green direct connectors, one disabled Fasten card, one Whoop card mid-repair,
  and his hybrid-reasoner amber only where he opted into it. Nothing changed inference posture as a
  side effect of a connector change.
- **Value returned this step:** Confidence that the switches did exactly what they appeared to, with
  no hidden egress introduced. Sovereignty made visible.
- **Modality:** Data sources + header posture + hand-off to the full audit in
  [Journey 14](14-verify-and-maintain.md).
- **UX constraints / laws:** Law 1 — posture is always on screen and reflects resolved runtime
  state. Law 6 — every remaining paid/bridged affordance still renders beside its fallback.

---

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Re-export Apple Health and drop in the new watch's `export.zip` | New device in, overlap deduped, four months of Oura history untouched — continuity across a hardware swap |
| 2 | Switch Garmin's adapter, upload FIT files, revoke Terra consent | Amber → green on that source; zero-transit reclaimed; nothing already pulled is lost |
| 3 | Click the failing Fasten card to understand the loss | Proof the loss is future-only — all ingested Cerner history stays queryable, with the fallback shown inline |
| 4 | Open the connector detail to audit | A precise, monospaced inventory of surviving records by type and date |
| 5 | Nothing — just ask the usual question | A full answer over everything else, plus a staleness flag and a one-click Re-sync |
| 6 | Glance at posture / open the ledger | Confirmation no hidden egress was introduced by any switch |

---

## UX & modality constraints

- **Primary surface:** the Data sources view — connector cards carrying tier (direct/bridged), last
  sync, record counts, a per-source **green/amber** posture, error badges, and manual re-sync.
- **Color semantics dominate here.** Green = direct/zero-transit, amber = bridged/transits a vendor.
  A connector **error** is a neutral operational badge — deliberately *not* the reserved red, which
  stays for hard blocks and critically abnormal values only (Law 8, [Design System](../design-system.md)).
- **Laws that bind this journey:** **Law 6** (a tier is never shown without its fallback) is the
  spine; **Law 1** (posture always on screen) confirms connector changes don't move inference
  posture; **Law 3** (every claim carries a label) surfaces the staleness caveat in Step 5;
  **Law 4** spirit governs the logged, legible consent revocation in Step 2.
- **Latency / offline:** all of this works offline in the self-hosted tier — FIT and Apple exports
  parse locally; the agent answers over the local store even when a bridge or vendor is unreachable.
  Re-embedding after an `ayu update` connector patch runs in the background on old embeddings.
- **Idempotency is load-bearing:** every switch relies on `content_hash` + `(source,
  source_resource_id)` dedup so re-imports and adapter swaps never duplicate or drop history
  ([Storage](../storage.md#idempotency-and-provenance)).
- **Empty/error states never dead-end:** a failed connector keeps its card, states the reason, and
  offers Re-sync or re-enable; a lost paid tier shows what remains and how to restore it.

## Where it can break (and the fallback)

!!! warning "The frame for every failure here: what you lose vs. what you keep"
    This journey *is* the failure-mode page. Each break below is scored the same way — the loss is
    always breadth or convenience; the keep is always the system and all stored history.

- **The swapped device's export is huge and slow to parse.** Loss: minutes of waiting on a multi-GB
  `export.xml` SAX stream. Keep: everything — parsing is idempotent, resumable, and the app stays
  usable on existing data while it runs.
- **FIT export for Garmin is manual and infrequent.** Loss: automatic, near-real-time Garmin sync
  (the convenience the paid bridge bought). Keep: full historical Garmin data, zero-transit, and the
  option to re-enable Terra Bridge per-provider at any time.
- **Fasten Connect disappears entirely (the real precedent).** Loss: *future* records from non-Epic,
  non-Apple providers. Keep: every record already ingested (it lives in your Postgres, not
  Fasten's), plus the two free zero-transit fallbacks — Apple Health export and Epic direct.
- **A single vendor API breaks mid-week.** Loss: fresh data from that one source until it is fixed.
  Keep: the agent still answers over every other connector, and flags the one stale stream rather
  than hiding it.
- **A switch accidentally leaves a bridge running.** Caught by Step 6: the per-source amber and the
  posture view make a stray bridge visible; nothing bridged is ever silent.

## What good looks like

- Ravi swaps in a watch and the answer to *"how are my steps trending?"* is right the first time —
  no doubling, no gap where the ring's history used to be.
- Maya watches a card go amber → green and understands exactly what she traded (auto-sync for
  zero-transit) — the choice was hers and legible.
- The day Fasten dies, Ravi asks for his cardiology history and gets all of it. The guarantee is
  something he *saw work*.
- A broken Whoop endpoint is a badge and a Re-sync button, not an outage. The system's usefulness is
  not hostage to any one connector.

## Related

- [Tiers & Fallbacks](../tiers.md) — the fallback guarantee and the three properties this journey dramatizes
- [Ingestion — Overview](../ingestion/index.md) — adapters not interfaces; fail loudly, degrade gracefully; crosswalk/dedup
- [ADR-0001 — EHR ingestion](../adr/0001-ehr-ingestion.md) — the Fasten Onprem archival and the tiered EHR design it forced
- [ADR-0002 — ayuOS owns its database](../adr/0002-clinical-data-store.md) — why losing a vendor never loses history
- [Storage](../storage.md) — idempotency, provenance, and the owned store
- [Open Wearables](../open-wearables.md) — direct wearable path and the Garmin FIT-export fallback
- [Design System](../design-system.md) — the green/amber color law and the interaction laws
- Journeys: [04 — direct wearables](04-connect-wearables.md) · [05 — Epic direct EHR](05-connect-ehr-epic.md) · [07 — bridged connectors](07-add-bridged-connector.md) · [14 — verify & maintain](14-verify-and-maintain.md)
