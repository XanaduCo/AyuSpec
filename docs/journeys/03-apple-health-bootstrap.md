# Journey 03 — Bootstrap the record with an Apple Health export

> **Who:** Maya Okonkwo, 39 — the sovereign purist · **Intent:** get years of history into the store *now*, with zero transit · **Entry surface:** Data sources (file upload) → Ask · **Egress posture:** 🟢 green throughout — one local file, nothing leaves the machine · **Primary modality:** file upload, then text.

## The intent

Maya has just finished `ayu start` and is looking at an empty store. She does not want to spend an
afternoon wiring connectors before the product does anything for her, and she will not enable
anything that transits a vendor. She knows the single highest-leverage first move: the iPhone Health
app exports **everything at once** — Apple Watch metrics *and* the raw provider FHIR JSON her
hospitals pushed into Apple Health Records. One file, no accounts, no OAuth, no network call. She
wants to drop it in and immediately ask a real question over what landed. This is the move that
rewards her purism instead of taxing it.

## Preconditions

- ayuOS is installed and running locally — see [Install & first run](01-install-self-hosted.md).
  The app is open at `http://localhost:4000`.
- All three model roles are **local** (Maya's fixed posture); the header shows three greens.
- An iPhone with the Health app, holding Apple Watch history and Health Records connections to at
  least one hospital. No wearable connector configured yet — that is deliberate (passive before
  manual; first value before full setup).
- Familiarity with the base tier: the export is the EHR **Tier 1** path — see
  [EHR ingestion](../ingestion/ehr.md) and [Apple Health ingestion](../ingestion/apple-health.md).

## Walkthrough

### Step 1 — Produce the export on the iPhone

- **User intent here:** get the largest possible slice of history out of Apple in one action.
- **User does:** Health app → profile photo → **Export All Health Data**. iOS grinds for a while and
  produces `export.zip`. She AirDrops it to the Mac Mini.
- **System does:** nothing yet — this half is Apple's. The zip is a **cumulative full dump**: every
  record type HealthKit stores, plus a `clinical-records/` tree of raw provider FHIR JSON.
- **Value returned this step:** she now holds a single self-contained artifact — auditable, offline,
  hers. No connector, no login, no vendor between her and her data.
- **Modality:** native iOS export → file transfer (AirDrop / USB / scp).
- **UX constraints / laws:** this step is **un-automatable** and manual by Apple's design — there is
  no Shortcuts action, so honesty means saying so up front rather than implying live sync. The
  cumulative-dump property is what makes re-import safe later (Step 5).

!!! note "One file, two schemas"
    The export is the only source that bootstraps **both** sides of the record at once: Apple Watch
    metrics land in `timeseries`, and the embedded provider FHIR (`clinical-records/*.json`, ~450
    multi-site systems) lands in `clinical`. That is why it is the recommended first move.

### Step 2 — Drop the zip into Data sources

- **User intent here:** hand the file to ayuOS with the least ceremony.
- **User does:** opens **Data sources**, drags `export.zip` onto the upload card (or clicks to
  browse). The card names the file, its size (often multi-GB), and asks for one confirmation.
- **System does:** stores the zip on local disk (referenced later by
  `DocumentReference.content.attachment.url`), then starts extracting `export.xml` and the
  `clinical-records/` tree. It SAX-streams the multi-GB XML rather than loading it into memory.
- **Value returned this step:** immediate acknowledgement with a live record counter — she watches
  Observations, DiagnosticReports, and MedicationStatements tick upward as they parse, not a
  spinner with no signal.
- **Modality:** drag-and-drop file upload (tap-to-browse fallback).
- **UX constraints / laws:** posture stays green — a file upload is a local operation, so the
  three-role indicator never flickers amber (Law 1, Law 4). The upload card belongs to the
  file-uploads region of Data sources, distinct from connector cards.

### Step 3 — Parse in the background; the app stays usable

- **User intent here:** not be blocked while a large archive processes.
- **User does:** nothing — she leaves the Data sources view and clicks into Ask.
- **System does:** parsing continues on a background worker. For a heavy archive (years of Watch
  data can be **tens of millions of time-series samples**) this is minutes, not seconds, and ayuOS
  says so honestly. Watch metrics stream into `timeseries` first (they parse fast); the
  `clinical-records/` FHIR files are mapped to R4 and written to `clinical` as they resolve. A
  progress row stays pinned with an honest estimate and a per-type breakdown.
- **Value returned this step:** the app is fully usable *during* the import — offline is a
  first-class state, and a long parse is a background job, never a modal wall (Law 5). Early-parsed
  data is already queryable before the run finishes.
- **Modality:** background job + a persistent progress indicator.
- **UX constraints / laws:** honest latency (§3 latency expectations). No blocking screen; the
  empty state she started from is already filling in behind her.

### Step 4 — Watch the record light up

- **User intent here:** see that the effort actually produced a record, and trust what it produced.
- **User does:** opens **Timeline** (zoomed to year) and scrolls.
- **System does:** renders tracks that did not exist ten minutes ago —
  - **wearables track:** Apple Watch HRV, resting HR, SpO₂, steps, sleep — Apple identifiers mapped
    to LOINC where a mapping exists (e.g. `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` →
    `80404-7`), each row `source = apple-health`;
  - **labs / conditions / meds tracks:** the embedded provider FHIR — real `Observation`,
    `DiagnosticReport`, `Condition`, `MedicationStatement` resources — placed at their real dates. If
    her Hashimoto's diagnosis and levothyroxine are in a connected hospital's Health Records, they
    appear here without her typing anything.
  - Clicking any event opens the underlying FHIR resource (Law 8 — data over chrome).
- **Value returned this step:** a longitudinal record materialized from a single file — the labs and
  the Watch metrics on one axis, which no single app on her phone showed her.
- **Modality:** Timeline (zoomable, click-through to source).
- **UX constraints / laws:** every value renders in tabular monospace against honest reference
  ranges (Law 8). Provenance is real: each resource carries `content_hash` +
  `(source, source_resource_id)` — see [Storage](../storage.md).

!!! warning "Provider FHIR carries no note text and no institution name inline"
    `DocumentReference` entries in the export point at `Binary/<id>` files that Apple does **not**
    include — treat them as a coverage manifest, not readable notes. And institution provenance
    (`sourceName`) lives only on the `<ClinicalRecord>` stub in `export.xml`, so ayuOS joins it back
    onto each resource during the parse. Getting the actual note *content* is what
    [Epic direct](05-connect-ehr-epic.md) adds.

### Step 5 — Ask a real question before configuring a single connector

- **User intent here:** get an answer *now* — the reciprocity payoff of the file.
- **User does:** on **Ask** (the home surface, cursor already blinking), types
  *"What's in here — and what's my TSH trend?"*
- **System does:** the local reasoner answers over just-imported data — inventories what landed
  (counts per resource type, date coverage, which systems), then plots her TSH values from the
  embedded labs with dates and reference ranges, each number a tappable source card back to its
  `Observation`. Every claim carries an evidence label (Law 3).
- **Value returned this step:** a grounded, source-backed answer from **one file and zero setup** —
  no wearable connector, no EHR registration, no cloud. This is the whole promise in one screen.
- **Modality:** text (voice available); markdown answer with inline source cards.
- **UX constraints / laws:** the answer streams over seconds on local inference — honest, not
  instant (§3). Posture stays three greens: the reasoner ran on-device, nothing left the machine
  (Law 1, Law 4). If coverage is thin, the answer says so rather than overreaching (honesty over
  decisiveness).

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Run Apple's manual export and transfer a multi-GB zip | A single self-contained, offline, auditable artifact of her whole history |
| 2 | Drag one file into Data sources, confirm once | Live record counter — Observations/reports/meds ticking up as they parse |
| 3 | Wait through a long parse | Full app usability during the import; early data already queryable |
| 4 | Open Timeline | Watch metrics *and* provider labs/conditions/meds on one dated axis, click-through to source |
| 5 | Type one question | A grounded, source-backed, zero-egress answer before any connector exists |

## UX & modality constraints

- **Input modality:** file upload (drag-drop primary, browse fallback) → text/voice Ask.
- **Latency:** parsing a heavy archive is minutes on a background worker; the synthesis answer
  streams over seconds locally. Both are stated honestly, never disguised as instant.
- **Offline:** the entire journey runs with the network cable pulled — Maya's proof test. Nothing in
  it requires egress (Law 1, Law 4 — posture never leaves green).
- **Empty state:** before the import, Data sources offers the export as the *next best action*, not a
  dead end (§3 empty-state rule).
- **Accessibility:** progress and counts are text, not colour-coded; evidence strength uses the
  hue-free ink-dot ramp so it never collides with the green/amber privacy language.
- **Dominant laws:** Law 1 (posture on screen), Law 4 (egress previewed — here, none), Law 5 (fast to
  the first question), Law 8 (data over chrome).

## Where it can break (and the fallback)

- **Very large zip / slow parse.** A multi-year archive can be tens of millions of samples. Import
  runs in the background with an honest estimate; the app is usable throughout and early-parsed data
  is already queryable. Never a blocking screen.
- **Messy or partial export.** Mixed **DSTU2 and R4** resources appear in the same export, per
  record; some records fail to convert. The parser **fails loudly and degrades gracefully** — it
  logs the skipped resources, imports the rest, and the agent answers over what landed
  ([Ingestion](../ingestion/index.md)). The progress row surfaces a "skipped N" count she can inspect.
- **Export missing provider FHIR.** If she never connected any hospital to Apple Health Records, the
  `clinical-records/` tree is empty — she gets Watch metrics but no labs. The empty Timeline lab
  track offers the fallback directly: connect [Epic directly](05-connect-ehr-epic.md) for live records
  and note text, or reach non-Epic systems through the bridged
  [Fasten path](07-add-bridged-connector.md). Losing the base tier costs breadth, never the store
  (Law 6).
- **`export_cda.xml` confusion.** That file is a CCD Apple generates from *her own* HealthKit vitals,
  not provider records — ayuOS ignores it rather than double-importing her own numbers as if they
  were clinical results.
- **Re-import next quarter.** She exports again in 90 days — another full cumulative dump. Dedup by
  `content_hash` + `(source, source_resource_id)` means unchanged resources are recognized, not
  duplicated; only genuinely new or modified records are written ([Storage](../storage.md)). No
  merge dialog, no growing pile of duplicate labs.

## What good looks like

- One dropped file yields a populated Timeline spanning years and a source-backed answer on Ask —
  **before** Maya configures a single connector or logs a single thing.
- The posture indicator never left green; she could (and does) verify it by importing with the
  network disconnected.
- Re-importing the cumulative dump a quarter later adds only what changed — the store stays clean and
  she never re-does work.

## Related

- [Apple Health ingestion](../ingestion/apple-health.md) — the export parser and Apple→LOINC mapping.
- [EHR ingestion](../ingestion/ehr.md) — the four tiers; this journey is Tier 1 (Base).
- [Storage](../storage.md) — `content_hash` dedup, timeseries vs. clinical schemas, provenance.
- [Data capture strategy](../data-capture.md) — passive-before-manual, why the export is highest-leverage.
- [Tiers & fallbacks](../tiers.md) — the load-bearing "every tier degrades to a zero-transit path" promise.
- **Next:** [Connect direct wearables](04-connect-wearables.md) — replace the static Watch snapshot with a live Oura/Whoop stream. · [Connect Epic directly](05-connect-ehr-epic.md) — live records and clinical note text. · [The anchor query](09-anchor-query.md) — "what changed in my last 90 days?" over the now-populated store. · [Run an n-of-1 experiment](11-run-experiment.md) — a time-boxed CGM window on top of this baseline.
