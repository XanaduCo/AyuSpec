# Journey 06 — Upload files: lab PDF, MRI (DICOM), genome

> **Who:** Ravi Mehta, 45 — the pragmatic optimizer · **Intent:** turn three files he already
> owns into queryable, trended, viewable data · **Entry surface:** Data sources → file upload ·
> **Egress posture:** 🟢 local — every step here runs on-device (two of the three files are hard
> exclusions from any cloud model) · **Primary modality:** drag-and-drop upload, then Timeline /
> OHIF viewer

## The intent

Ravi has a folder of health artifacts he's collected over the years and never once read together:
a LabCorp lipid panel, a CD of his brain MRI from a headache workup, and the raw 23andMe file he
downloaded in 2019 and forgot. His EHR is already connected ([Journey 05](05-connect-ehr-epic.md)),
but these three sit outside any portal. He wants each one to *do something* the moment it lands —
not become a row in a to-do list. He's specifically wary of two things: silent cloud upload of a
scan, and a genome report that pretends to know more than it does.

## Preconditions

- ayuOS installed and running at `http://localhost:4000` ([Journey 01](01-install-self-hosted.md)).
- Apple Health export already bootstrapped the record ([Journey 03](03-apple-health-bootstrap.md)),
  so the Timeline has wearable and some clinical tracks to drop new values onto.
- Epic records connected ([Journey 05](05-connect-ehr-epic.md)) — useful because the lab values
  here will trend against labs already pulled from the hospital.
- Egress posture is the recommended hybrid, but that's irrelevant to this journey: the medical
  extractor is local by constraint, and imaging pixels and genomic sequence are
  [hard exclusions](../pii-gateway.md#hard-exclusions) regardless of any setting.

## Walkthrough

### Step 1 — Open the drop zone

- **User intent here:** find where files go without hunting through menus.
- **User does:** clicks **Data sources** in the sidebar; the page shows connector cards
  (Oura, Whoop, Epic) at the top and a **File uploads** panel below with four labeled drop targets:
  Apple Health, lab PDF, DICOM, genome.
- **System does:** each drop target names the formats it accepts and, in muted text, what it
  returns (`lab PDF → Observations on your Timeline`). Nothing is asked yet.
- **Value returned this step:** he sees the whole surface at once and knows exactly what each file
  will become before committing effort.
- **Modality:** navigation + drop-zone UI.
- **UX constraints / laws:** empty state offers the next best action, never a dead end; header
  posture indicator (Law 1) shows all three roles 🟢 green — this page does no cloud work.

### Step 2 — Drag the lab PDF

- **User intent here:** make a static PDF into numbers he can trend.
- **User does:** drags `LabCorp_2026-06.pdf` onto the lab-PDF target.
- **System does:** routes on text layer first (see [Lab PDF ingestion](../ingestion/labs.md)). This
  file is born-digital, so it takes the **text path** — deterministic `pdfplumber` extract, then
  the local **medical-extractor role (MedGemma)** structures it into the schema-constrained JSON.
  Every value, unit, and range is put through the **grounding check**: it must string-match back
  into the independently extracted raw text. Matches on all fields → `confidence=high`.
- **Value returned this step:** within a few seconds a preview table appears —
  `ApoB 95 mg/dL`, `HbA1c 5.4%`, `LDL-C`, `HDL-C` — each with its reference range and a
  `source=pdf · path=text-layer · confidence=high` provenance tag. His **ApoB 95** sits **above its
  reference bound** — flagged out-of-range against its reference range, in the neutral data treatment,
  not the reserved red block colour (red is for stops, not an elevated lipid).
- **Modality:** upload → tabular preview.
- **UX constraints / laws:** data over chrome (Law 8) — values in tabular monospaced numerals with
  their reference ranges; every extracted claim carries a provenance tag (Law 3); all local, so
  the posture stays 🟢 green.

### Step 3 — Confirm the lab values onto the Timeline

- **User intent here:** trust the numbers, then see them in context.
- **User does:** scans the preview, clicks **Add to record** (high-confidence rows are pre-checked;
  he could uncheck any).
- **System does:** writes each row as a FHIR `Observation` in the `clinical` schema with a LOINC
  code from the local lookup, links the original raw text region in a `note` for audit, and plots
  each value on the **Timeline** labs track. ApoB now sits on a trend line beside the lipid values
  already pulled from Epic.
- **Value returned this step:** the anchor payoff — a PDF became **trended, queryable data in
  seconds**. He immediately asks on **Ask**: *"has my ApoB moved?"* and gets a grounded,
  `source-backed` answer with the two data points and their dates. His elevated ApoB is now a
  first-class part of the cardiac picture the agent reasons over ([Journey 09](09-anchor-query.md)).
- **Modality:** tap-confirm → Timeline → optional Ask query.
- **UX constraints / laws:** every claim carries a label (Law 3); nothing entered silently — he
  confirmed; the out-of-range ApoB is flagged against its reference range in tabular
  monospaced numerals (Law 8), not dressed in the reserved red block colour.

### Step 4 — Upload the DICOM MRI study

- **User intent here:** actually *see* his brain scan and get a plain-language read, without a
  radiologist portal.
- **User does:** drags the folder of `.dcm` files (T1, T2, FLAIR series) onto the DICOM target.
- **System does:** `pydicom` parses metadata into a FHIR `ImagingStudy` (modality, series,
  study date, instance counts); pixel data is written to **local disk**, not Postgres. The
  **posture indicator makes the boundary explicit**: a persistent red **`imaging pixels · never
  leaves device`** badge sits on the study card.
- **Value returned this step:** the study appears on the Timeline's imaging track and opens in the
  in-app **OHIF viewer** — he can pan, zoom, and window/level his own scan, offline, with no portal
  login and no CD drive.
- **Modality:** upload → OHIF viewer.
- **UX constraints / laws:** **hard exclusion rendered in red (Law 4)** — imaging pixel data is
  *never* sent to a cloud model, any tier, any setting, because burned-in DICOM tags carry
  unbounded identifiers the stripper cannot be trusted to catch
  ([hard exclusions](../pii-gateway.md#hard-exclusions)); OHIF is served locally, no external CDN.

!!! warning "The imaging exclusion is architectural, not a preference"
    Even with all three model roles pointed at cloud providers and review mode `off`, the DICOM
    pixel data is *dropped from any cloud payload*, not masked. A cloud reasoner, if he ever
    enables one, works from the **extracted summary text** below — never the raw scan. See
    [Journey 10](10-enable-cloud-reasoning.md) for why this holds even in hybrid.

### Step 5 — Read the local MedGemma summary

- **User intent here:** understand what the scan shows in words, labeled for what it is.
- **User does:** clicks **Summarize** on the study card.
- **System does:** the local **MedGemma vision** model reads representative slices per series and
  writes a plain-language summary into a `DocumentReference` (`source=ai-summary`, `model=medgemma`)
  linked to the `ImagingStudy`. The prompt forbids diagnostic claims: findings are labeled
  `inferred`, never `source-backed`, and the card states plainly this is **not a radiologist read**.
- **Value returned this step:** the scan is now *summarized and viewable* privately — he learns
  what structures are visible and what, if anything, differs from typical appearance, entirely
  on-device. This summary (not the pixels) is what can later feed the doctor packet
  ([Journey 13](13-share-doctor-packet.md)) or a cloud reasoner.
- **Modality:** tap → serif agent-voice summary with an evidence label.
- **UX constraints / laws:** education injects, never blocks (Law 7) — the "AI-generated, not a
  diagnosis" disclosure is inline, not a modal; evidence strength is hue-free ink dots, distinct
  from the red exclusion badge.

### Step 6 — Upload the 23andMe genome

- **User intent here:** finally learn what the file he downloaded once actually means.
- **User does:** drags `genome_v5.txt` onto the genome target.
- **System does:** the parser extracts variants `(rsID, chromosome, position, genotype)` from the
  ~650k-SNP TSV into FHIR `MolecularSequence` resources; computes **polygenic risk scores** for the
  configured traits against the bundled ClinVar/dbSNP snapshot; and surfaces notable calls. A second
  persistent red badge appears: **`genomic sequence · stays local by default`**.
- **Value returned this step:** a findings card — **APOE ε3/ε3** surfaced (the common,
  non-ε4 genotype), plus a **CVD polygenic risk score at the 70th percentile**. His genome is no
  longer an opaque download; it's readable.
- **Modality:** upload → findings card.
- **UX constraints / laws:** **default exclusion in red (Law 4)** — genomic sequence and PRS
  content are withheld from cloud models by default because a genome is itself an identifier that
  masking a name cannot make safe; the user can opt in, warned it's identifiable
  ([Genomics ingestion](../ingestion/genomics.md#privacy-note)).

### Step 7 — See the genome findings labeled as hypotheses

- **User intent here:** know how much to actually believe this.
- **User does:** taps the `inferred` label on the PRS result.
- **System does:** expands a concept card stating the caveats verbatim: PRS are
  **population-level statistics applied to one person, not diagnostic**; effect sizes come from
  GWAS studies of **largely European-ancestry** cohorts and are less predictive otherwise; and
  consumer genomics is **low analytic value with often-opaque methodology** — where the vendor's
  method can't be verified, the card **says so** rather than faking precision
  ([data capture, principle 5](../data-capture.md)).
- **Value returned this step:** he gets meaning *and* the stated uncertainty that lets him weight it
  correctly — a hypothesis to hold lightly, not a verdict. The APOE ε3/ε3 result sits alongside his
  family early-CAD history without overclaiming; the agent will treat it as
  `inferred`/`speculative` when it reasons ([Journey 09](09-anchor-query.md)).
- **Modality:** tap → inline concept card.
- **UX constraints / laws:** every claim carries a label and expands with the live claim as the
  worked example (Law 3); education injects, never blocks (Law 7); no false precision — trade-offs
  over verdicts.

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Open Data sources | The full upload surface, each target labeled with what it produces |
| 2 | Drag a lab PDF | A grounded, confidence-tagged value table in seconds — ApoB 95 flagged out of range |
| 3 | Confirm the values | Trended `Observation`s on the Timeline, queryable on Ask right away |
| 4 | Drop a DICOM folder | His scan viewable in-app (OHIF), plus a visible "never leaves device" guarantee |
| 5 | Tap Summarize | A plain-language read of the scan, labeled as AI-inferred — fully local |
| 6 | Drop a genome file | APOE ε3/ε3 and a CVD PRS surfaced — the file finally means something |
| 7 | Tap the evidence label | The caveats that let him weight the result correctly |

## UX & modality constraints

- **Input modality:** drag-and-drop file upload throughout; secondary surfaces are the Timeline,
  the OHIF viewer, Ask, and inline concept cards. No forms, no typing required to get first value.
- **Latency:** local inference is not instant. The text-path lab parse returns in a few seconds;
  the MedGemma vision summary of an MRI streams over longer and runs in the background while the
  viewer is already usable. Set the expectation; never spin silently.
- **Offline:** first-class. All three flows complete with the network cable pulled — nothing here
  needs egress, and the badges say so.
- **Color semantics that dominate here:** **red is load-bearing — reserved for the two hard
  exclusions** (imaging pixels, Step 4; genomic sequence, Step 6), which are blocks. It is
  deliberately *not* used for the elevated ApoB: an out-of-range lab is a warning, not a stop, so it
  is flagged against its reference range in the neutral data treatment (Law 8). Green marks
  the local, on-device provenance of everything produced. Amber never appears in this journey.
- **Laws that bind:** Law 3 (every claim labeled), Law 4 (egress previewed / hard exclusions
  visible), Law 7 (education injects, never blocks), Law 8 (data over chrome).
- **Accessibility:** evidence strength is a hue-free ink-dot ramp, kept distinct from the
  green/amber/red privacy-and-block language so the two are never conflated.

## Where it can break (and the fallback)

- **Scanned PDF with no text layer** (a concierge clinic that prints-then-scans): routing detects
  no extractable text and falls to the **local doc-VLM path**. A plain-text OCR pass still runs —
  as the *verification source* for the grounding check, not the extractor. Values that don't
  string-match are tagged `confidence=low`, **quarantined for review, and excluded from agent
  responses** until he confirms them. He is told which rows need a look, rather than getting silent
  guesses.
- **A huge DICOM study** (thousands of instances, multiple series): parsing and the MedGemma
  summary run in the **background**; the study card shows progress and the OHIF viewer opens on
  each series as it becomes available. The app stays responsive on everything else meanwhile.
- **A genome format quirk** (an older 23andMe build, or GRCh37 vs GRCh38 coordinates): the parser
  reports which variants it could and couldn't map rather than failing the whole file; unmappable
  calls are skipped and named. Partial results still land.
- **Methodology unverifiable:** when a consumer report's method can't be checked against the
  bundled annotation sources, the finding is labeled a hypothesis and the card **says the method is
  unverifiable** — the failure mode is disclosure, not fabricated confidence.
- **Empty state:** if he opens Data sources with nothing uploaded yet, the panel offers the four
  targets and a one-line "start with any file — it'll answer a question immediately," never a blank
  wall.

## What good looks like

- A LabCorp PDF becomes an out-of-range-flagged **ApoB 95** on his Timeline in seconds, and he can ask about
  its trend before he's even closed the upload panel.
- He pans and window/levels **his own brain MRI** inside ayuOS, offline, and reads a plain-language
  summary — with a visible, unbreakable guarantee that the pixels never left the Mac Mini.
- The genome tells him he's **APOE ε3/ε3** with a 70th-percentile CVD PRS, and he trusts it
  *exactly as much as it deserves* because the interface labeled it a hypothesis, not a diagnosis —
  and named its own uncertainty instead of hiding it.

## Related

- [Lab PDF ingestion](../ingestion/labs.md) · [Imaging (DICOM) ingestion](../ingestion/imaging.md)
  · [Genomics ingestion](../ingestion/genomics.md)
- [Data capture strategy](../data-capture.md) — why consumer genomics is low-signal, and the
  confidence-graded interpretation principle
- [PII gateway — hard exclusions](../pii-gateway.md#hard-exclusions) · [AI & ML layer](../ai-ml.md)
- Adjacent journeys: [05 — Connect an EHR directly](05-connect-ehr-epic.md) ·
  [09 — the anchor query](09-anchor-query.md) ·
  [10 — enabling hybrid cloud reasoning](10-enable-cloud-reasoning.md) ·
  [13 — share a doctor packet](13-share-doctor-packet.md)
- [ADR-0002 — clinical data store](../adr/0002-clinical-data-store.md)
