# Journey 09 — "What changed in my last 90 days?" — the anchor query

> **Who:** Ravi Mehta, 45, pragmatic optimizer · **Intent:** one grounded, cross-source answer about his cardiac trajectory — fully offline · **Entry surface:** Ask (home) · **Egress posture:** 🟢 all three roles local for this query (hybrid reasoner configured but not invoked) · **Primary modality:** voice or text → streamed markdown with tappable evidence labels and source cards

## The intent

This is the query the product is judged on. Ravi has labs every quarter, an Oura ring, a Whoop, an Epic record, a brain MRI, and a 23andMe file — and until now, no single place that could answer *"what actually changed, and does my heart look okay?"* He wants a synthesis — not another dashboard — that reads across **all** his sources at once, tells him what moved, labels how sure it is, and — critically — does it without shipping his health record to anyone. He is mildly anxious (father had an MI at 62) and time-poor. The job he is hiring ayuOS for: *replace the mental work of stitching six silos together into one grounded paragraph.*

!!! abstract "Why this journey is the reciprocity high-water mark"
    The whole exchange is **one question in, a cross-source grounded answer out, zero egress.** He supplies a single sentence and a few seconds of patience; he gets back a labeled synthesis across labs, wearables, imaging, meds, genome, and family history — every claim one tap from its source, computed entirely on his own machine. No prior tool he has used can produce this answer at all, let alone offline. Everything else in this page is in service of not squandering that one ask.

## Preconditions

- Self-hosted install running; `ayu start` has opened `localhost:4000`. See [01-install-self-hosted.md](01-install-self-hosted.md).
- Enough of the record is ingested for a cross-source answer:
    - Apple Health export bootstrapped the base record — [03-apple-health-bootstrap.md](03-apple-health-bootstrap.md).
    - Oura + Whoop connected direct (HRV, sleep, readiness) — [04-connect-wearables.md](04-connect-wearables.md).
    - Epic connected direct (labs, meds, conditions, notes) — [05-connect-ehr-epic.md](05-connect-ehr-epic.md).
    - Lab PDF, brain MRI (DICOM), and 23andMe uploaded — [06-upload-files.md](06-upload-files.md).
- A hybrid cloud reasoner *may* already be configured ([10-enable-cloud-reasoning.md](10-enable-cloud-reasoning.md)), but this journey runs **entirely local**; nothing here requires it.

!!! note "This is the reference-demo dataset"
    Ravi's figures here — ApoB 95, HbA1c 5.4%, VO₂max 52, CAC 0, hypertension on lisinopril, father's MI at 62, APOE ε3/ε3, and the active post-meal-walk experiment — are the exact mocked dataset behind the [live demo](../demo/index.html). The journey and the demo are meant to agree number-for-number.

## Walkthrough

### Step 1 — Land on Ask, cursor ready

- **User intent here:** get to the question with zero friction.
- **User does:** opens `localhost:4000`. The app is already on **Ask**, the input focused, cursor blinking.
- **System does:** no dashboard, no onboarding gate. The header shows the posture indicator — `reasoner · tools · medical`, all **green**. The sidebar shows prior queries; the composer shows a mic button beside the text field.
- **Value returned this step:** the first question is reachable in under a second — the home surface *is* the ask box (Law 5).
- **Modality:** app open; text field + mic affordance.
- **UX constraints / laws:** Fast to the first question (Law 5); posture always on screen (Law 1). Offline is a first-class state — if the machine is off the network, nothing here changes, because nothing here needs the network.

### Step 2 — Ask the question (voice *or* text)

- **User intent here:** phrase it the way he'd ask a smart friend.
- **User does:** taps the mic and **speaks**: *"What changed in my last 90 days? I care most about my heart."* (Typing the same sentence is equivalent — voice is a first-class input.)
- **System does:** transcribes on-device, drops the text into the composer for him to eyeball, and submits. The transcription itself is a model call and is ledgered like any other.
- **Value returned this step:** he expressed intent hands-free in ~4 seconds; the cardiac focus he voiced becomes a real constraint on retrieval, not decoration.
- **Modality:** **voice** input (on-device STT), with the transcript shown before send.
- **UX constraints / laws:** reciprocity — the spoken focus ("my heart") is *used*, narrowing the answer rather than being ignored. Voice transcription is on-device in the zero-egress default (an [open question](../frontend.md) flags optional cloud STT as strictly opt-in).

### Step 3 — The agent plans and runs tools, visibly local

- **User intent here:** trust that this is really happening on his machine.
- **User does:** waits. Watches.
- **System does:** the tool-caller (Qwen, local) plans the [anchor workflow](../agent-loop.md) and fans out — in parallel where it can:
    - `get_time_series` for tracked LOINC codes over 90 days (ApoB, HbA1c, BP, HRV, sleep, readiness, VO₂max);
    - `get_trend` — delta of each metric vs the prior 90-day baseline;
    - `get_correlations` — metric pairs that co-moved;
    - `search_records` — recent notes, the latest lab report, the MRI summary;
    - `search_guidelines` — reference ranges for anything flagged (e.g. AHA lipid targets).
  A compact, expandable "thinking" strip narrates the chain at a high level ("pulled 7 metrics · computed trends · retrieved 2 notes · checked lipid guideline"). Tool failures degrade rather than halt — a timed-out call is logged, skipped, and the reasoner proceeds over the partial context with the gap disclosed. The posture stays **three greens** the entire time; one query fans out into several ledger rows, one per model call.
- **Value returned this step:** legibility — he can see *what* it looked at, and that it never left the box.
- **Modality:** live tool-trace strip; header posture indicator.
- **UX constraints / laws:** posture always on screen (Law 1); local latency shown as it is — seconds of visible work, never dressed up as instant (see [latency expectations](../frontend.md)). Every one of these calls lands in the [call ledger](../ai-transparency.md) with `any_left_device = false`.

### Step 4 — The answer streams, every claim labeled

- **User intent here:** read one grounded paragraph, not ten charts.
- **User does:** reads as the reasoner (DeepSeek-R1, local) streams the synthesis over a few seconds.
- **System does:** produces a cardiac-focused synthesis touching his real data, **every clause carrying an evidence label** — the hue-free strength ramp (`●●●●` HIGH → `○○○○` NONE) plus the provenance tag (source-backed / guideline-backed / inferred / speculative). For example:
    > Your **ApoB is 95 mg/dL** and has drifted up from 88 over the window `[source-backed ●●●● · Observation ApoB 2026-07-19]` — above the optimal target given your family history `[guideline-backed ●●●○ · AHA/ACC lipids]`. Your **CAC score is 0** `[source-backed ●●●● · ImagingStudy CAC]`, which meaningfully lowers near-term event risk despite that number. Your **VO₂max is 52** — strong for your age and independently protective `[source-backed ●●●● · Observation]`. HRV and sleep from Oura and Whoop are stable-to-slightly-improved `[source-backed ●●●○]`; the dip mid-June tracks two short-sleep weeks `[inferred ●●○○]`. BP is controlled on lisinopril `[source-backed ●●●●]`. Your genome (APOE ε3/ε3, CVD polygenic risk ~70th percentile) is context, **not a verdict** — treated as a low-confidence hypothesis, not a measurement `[speculative ○○○○ · MolecularSequence]`.
- **Value returned this step:** the single answer no other tool gives him — a grounded cross-source read that weighs the rising ApoB, the reassuring CAC 0, the protective VO₂max, and the genomic risk *together and proportionally*, rather than letting any one number drown the rest.
- **Modality:** streamed markdown; inline tappable labels.
- **UX constraints / laws:** every claim carries a label (Law 3); strength is hue-free by construction so it can never be confused with the green/amber egress language; data over chrome (Law 8) — `95 mg/dL`, `0`, dates all in tabular monospace. Tapping any label expands a [concept card](../epistemics.md) using *this* claim as the worked example (e.g. tapping the ApoB label opens *effect size vs. certainty*; the first `○○○○` he ever sees opens *hierarchy of evidence*) — education injects, never blocks (Law 7), one card max.

### Step 5 — Source cards: click through to the underlying record

- **User intent here:** verify. "Where did the 95 come from?"
- **User does:** clicks the ApoB source card, then the MRI citation.
- **System does:** the ApoB card opens the underlying FHIR `Observation` (value, unit, LOINC, collection date, the `DiagnosticReport` it belongs to); the MRI card opens the `ImagingStudy` and its MedGemma-generated summary. No claim is unbacked — anything the model couldn't source is labeled `inferred`/`speculative`, not dressed as fact.
- **Value returned this step:** trust by inspection — every number is one tap from its origin, closing the gap between "the agent said" and "the record shows."
- **Modality:** tap → source panel over the underlying [FHIR resource / document](../frontend.md).
- **UX constraints / laws:** data over chrome (Law 8); source-backed means *a real resource is behind it* — the [storage model](../storage.md) keeps these as first-class Observation / ImagingStudy / MedicationStatement resources, not prose.

### Step 6 — What to consider, on fixed axes — and what it *won't* conclude

- **User intent here:** okay, so what are my options — and don't sell me one.
- **User does:** reads the "things you could consider" block the synthesis appends for the ApoB.
- **System does:** surfaces candidate interventions from the [healthspan model](../healthspan-model.md) (`query_health_model` → `resolve_modifiers` → `rank_interventions`) rendered on the **comparison frame's fixed axes** — evidence, effect, certainty, cost, risk, reversibility, effort — with **no silent ranking**. Statin adherence, increased fibre, Zone 2 volume, and post-meal walking sit side by side, each cell traced to a cited edge (no cited edge, no cell). It then states its limits plainly:
    > I can tell you your ApoB is elevated and trending up, and that your CAC is 0. I **cannot** tell you your personal 10-year event risk, whether to start or change a statin, or that any single number caused another — those are clinician decisions, and the correlations here are associations, not proof. `[speculative ○○○○ where I've guessed]`
- **Value returned this step:** trade-offs over verdicts (Law 2) — he gets a map of the trade-offs and an explicit boundary in place of a verdict the evidence can't support.
- **Modality:** comparison frame (fixed axes, side by side); inline limits statement.
- **UX constraints / laws:** nothing ranked silently (Law 2 / Law 6-adjacent); ordering, if any, is the default effect×evidence order with all axes visible — a personal ranking appears **only** if he later asks to "simplify," and it names the preferences that produced it ([epistemics](../epistemics.md)). Red-flag routing is live: had he voiced *exertional chest pain*, the model would halt to a clinician rather than produce a plan.

### Step 7 — The follow-up: understand → hypothesize

- **User intent here:** move from awareness to agency, in the same breath.
- **User does:** stays in the conversation and asks (voice or text): *"What should I do about the ApoB?"*
- **System does:** keeps context, re-ranks the same cited candidates against the ApoB goal, and notices he **already has a relevant experiment running** — post-meal walks reducing glucose peaks, 21/30 days, week 4 — offering to extend or branch it rather than start from zero. Because this is a natural bridge, it offers to turn one candidate into a testable **hypothesis** with a marker and a realistic window (e.g. "increased soluble fibre is a `MODERATE`-evidence ApoB lever, but ApoB's `min_useful_interval` means a 2-week n-of-1 can't detect the change — here's a design that can"). It links out rather than pushing.
- **Value returned this step:** the loop advances — one question became a candidate experiment, without a hard sell and without leaving the chat.
- **Modality:** conversational follow-up; hypothesis hand-off card.
- **UX constraints / laws:** reciprocity high-water mark — the whole arc was **one question in, a cross-source grounded answer out, zero egress.** Bridges to [11-run-experiment.md](11-run-experiment.md) (hypothesis → n-of-1) and, when he's ready to bring it to his cardiologist, [13-share-doctor-packet.md](13-share-doctor-packet.md).

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 2 | Speak/type one question, ~4s | The cardiac focus is *used* to shape retrieval, not discarded |
| 3 | Wait a few seconds | A visible, on-device tool trace — proof the machine, not the cloud, did the work |
| 4 | Read one paragraph | The cross-source synthesis no other tool produces, every claim labeled |
| 4 | Tap an evidence label (optional) | A concept card with *his* claim as the worked example — one card, never a detour |
| 5 | Click a source card | The underlying FHIR resource / document — the number's origin, one tap away |
| 6 | Read the options | Interventions on fixed axes with no silent ranking + an explicit statement of limits |
| 7 | Ask one follow-up | A ready-to-run hypothesis with a measurement window the marker can actually satisfy, aware of the experiment he's already running |

## UX & modality constraints

- **Input:** text **and** voice (Law 5); transcript shown before send; the mic is on-device in the zero-egress default.
- **Latency:** local and stated plainly — tool fan-out and streamed synthesis take **seconds**, not milliseconds. The tool-trace strip makes the wait legible instead of blank. Never pretend it is instant.
- **Offline:** first-class. The entire journey runs with the network cable pulled; posture stays three greens and nothing degrades, because nothing here needs egress.
- **Evidence labels (Law 3):** the hue-free `●●●●→○○○○` strength ramp **plus** a provenance tag; tappable, expanding at most one concept card per response ([epistemics](../epistemics.md)).
- **Color semantics:** green = local throughout (this query never crosses the boundary); strength is deliberately hue-free so it can't be confused with the privacy language. No amber appears anywhere in this journey.
- **Trade-offs over verdicts (Law 2):** options on fixed axes, no silent ranking (Law 6-adjacent); an explicit "what I cannot conclude" statement is required, not optional.
- **Accessibility:** voice-first path for hands-free / low-vision use; monospace tabular numerals for every value; source cards are keyboard-reachable; strength dots are colorblind-safe by construction.
- **Empty / sparse states:** never a dead end — a thin metric returns an explicit "not enough data" plus the next best action (connect the source, widen the window), and an ambiguous ask returns one clarifying question with a sensible default, not a blank form.
- **Ledger discipline:** every call in this journey — the STT transcription, each tool-backed model step, the reasoner synthesis — is recorded in the [call ledger](../ai-transparency.md) with its full payload; the query's audit entry reads `any_left_device = false`.
- **Dominant laws here:** **5** (fast to first question), **1** (posture on screen), **3** (labeled claims), **2** (no silent choice), **8** (data over chrome).

## Where it can break (and the fallback)

!!! warning "Sparse data → it says so, it does not invent"
    If a metric has too few points in the window (e.g. Whoop only connected two weeks ago), the agent **states the gap** — *"HRV trend is unreliable: 11 days of data in this window"* `[speculative ○○○○]` — rather than fabricating a trend. Empty state offers the next best action (connect the source, widen the window), never a dead end.

!!! note "Ambiguous query → it asks one clarifying question"
    *"What changed?"* with no focus and a broad record may return a clarifier — *"Across everything, or a system? You mentioned your heart before — start there?"* — a single question, not a form. Reciprocity: it proposes a sensible default so a one-word answer suffices.

!!! abstract "A hard synthesis the local reasoner strains on → it says so, with an offered lever"
    If the cross-source reasoning is at the edge of the local model, the answer says so — *"this synthesis is near the limit of the local reasoner; a frontier reasoner may connect these more reliably"* — and points to the optional hybrid path ([10-enable-cloud-reasoning.md](10-enable-cloud-reasoning.md)) **without pushing**. Choosing it would route only the PII-stripped reasoning prompt through the [PII gateway](../pii-gateway.md) with a pre-send review (Law 4); the medical extractor and raw records **never** leave. Declining costs reasoning depth on one hard question and nothing else (Law 6). Raw documents, imaging pixels, and genomic sequence stay excluded regardless.

!!! warning "A connector was broken at ingest → degrade loudly, answer anyway"
    If, say, the Oura sync errored last week, that source is flagged in the answer's provenance and skipped; the agent still synthesizes over everything stored. Broken connectors fail loudly and never block the query — see [08-switch-connectors.md](08-switch-connectors.md).

!!! abstract "Network pulled mid-query → it doesn't notice, because it doesn't care"
    Maya's habit of yanking the cable to prove sovereignty applies here too: because this query is all-local, disconnecting the machine mid-synthesis changes nothing — no spinner waiting on a remote host, no failed call. Offline is a first-class state in the self-hosted tier, not an error to recover from. See [14-verify-and-maintain.md](14-verify-and-maintain.md).

!!! note "Voice mis-transcribed → he catches it before send"
    Because the transcript is shown in the composer *before* submission (Step 2), a mis-heard word ("art" for "heart") is his to correct with an edit or a re-record — the system never silently acts on a wrong transcription. The mic is a convenience over the boundary of the same zero-egress default; it does not become a reason to reach for a cloud service.

## What good looks like

- Ravi gets **one paragraph** that reads across labs, wearables, imaging, meds, genome, and family history — every sentence one tap from its source, and he *sees* it was computed on his Mac Mini (three greens, a local tool trace, `any_left_device = false`).
- The rising ApoB and the reassuring CAC 0 are held **together**, neither buried — and the system states plainly what it *won't* claim.
- The follow-up turns awareness into a testable experiment in the same conversation — understand → hypothesize, no dead end, no upsell.
- Nothing pressured him toward the cloud: the local answer stood on its own, and the hybrid reasoner sat as an offered lever he did not need to pull.

## Related

- [The agent loop](../agent-loop.md) — the anchor workflow and its tools
- [AI & ML layer](../ai-ml.md) · [Model providers](../model-providers.md) — the three roles and where they run
- [Evidence & hypotheses](../evidence.md) · [Health literacy & epistemics](../epistemics.md) — evidence labels, concept cards, the comparison frame
- [The healthspan model](../healthspan-model.md) — where the intervention cells come from
- [AI transparency](../ai-transparency.md) · [PII gateway](../pii-gateway.md) — the ledger and the egress chokepoint
- [Frontend & UI](../frontend.md) — Ask, source cards, voice input
- [Storage](../storage.md) — the FHIR-shaped resources the source cards open
- Data this journey reasons over: [03](03-apple-health-bootstrap.md) · [04](04-connect-wearables.md) · [05](05-connect-ehr-epic.md) · [06](06-upload-files.md)
- Adjacent journeys: [10 — cloud reasoning](10-enable-cloud-reasoning.md) · [11 — run an experiment](11-run-experiment.md) · [13 — doctor packet](13-share-doctor-packet.md)
