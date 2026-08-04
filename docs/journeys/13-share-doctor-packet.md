# Journey 13 — Share a scoped sliver / doctor packet

> **Who:** Ravi Mehta, 45 — the pragmatic optimizer · **Intent:** hand his cardiologist something
> better than a shoebox of PDFs — but the *cardiac slice only*, never his whole record · **Entry
> surface:** Share (sliver composer) · **Egress posture:** 🟢 green while composing, and a legible
> 🟢/🟠 fork at delivery — a local file stays green, a hosted link is amber and disclosed ·
> **Primary modality:** scope composer + preview, then rich web view / PDF

## The intent

Ravi has a cardiology appointment in two weeks — with a cardiologist on a **Cerner system** his
Epic-connected records don't reach, which is exactly why he's assembling something to hand over by
hand. He wants to walk in with a clean, current cardiac picture instead of a folder of printouts.
But he is deliberate about one thing: the cardiologist should see his **cardiac slice** — ApoB,
lipids, the CAC 0, his blood pressure and lisinopril, the family early-CAD history, the relevant
imaging — and **nothing else**. Not his genome, not unrelated notes, not his sleep data. This is
[user job #2 from the vision](../vision.md): share a deliberately narrow slice, on his terms, not
all-or-nothing. He wants the packet to be useful *and* to know, precisely and forever,
exactly what left.

## Preconditions

- The record is populated: labs and the MRI are uploaded ([Journey 06](06-upload-files.md)), Epic
  clinical notes are connected ([Journey 05](05-connect-ehr-epic.md)).
- He has already run the synthesis this packet rests on — *"what changed in my last 90 days?"*
  ([Journey 09](09-anchor-query.md)) — so the trends and notable changes exist and are cited.
- Egress posture is the recommended hybrid ([Journey 10](10-enable-cloud-reasoning.md)), but note:
  a **doctor packet is written for a human recipient who needs the real names and dates**, so its
  generation runs on the **local reasoner by default** — cloud stripping would destroy the very
  identifiers the cardiologist needs. The egress question here is about *delivery*, not generation.

## Walkthrough

### Step 1 — Open Share and name the purpose

- **User intent here:** start from what the packet is *for*, not from a blank export dialog.
- **User does:** clicks **Share** in the sidebar, then **New sliver**; types the purpose:
  `Cardiology consult — 2026-08-17`, and sets the recipient to `Dr. cardiology (Cerner)`.
- **System does:** records the purpose and recipient as the seed of an [append-only consent
  record](../sharing.md#consent-audit) — *before* any data is selected. Purpose is a required,
  first-class field.
- **Value returned this step:** naming the purpose is what lets the agent **propose a scope for
  him** in the next step — a few typed words buy him a drafted cardiac sliver instead of a
  build-from-scratch checklist.
- **Modality:** short text form (purpose + recipient).
- **UX constraints / laws:** header posture (Law 1) shows all three roles 🟢 green — composing a
  packet does no cloud work; every ask is scoped and reversible (nothing is committed yet).

### Step 2 — Let the agent propose the cardiac sliver

- **User intent here:** not hand-pick fifty resources; get a sensible cardiac draft to edit down.
- **User does:** clicks **Propose scope from purpose** (or just asks: *"put together what my
  cardiologist needs — cardiac only"*).
- **System does:** the agent maps "cardiology consult" to the cardiac domain and drafts a scope
  ([composition model](../sharing.md#composition-model)): ApoB + full lipid panel, the **CAC score
  0**, blood pressure series + **lisinopril**, the **family early-CAD history**, and the brain MRI's
  *extracted summary* — and it **leaves out** the genome, sleep/HRV, and unrelated notes. Each
  proposed item is shown with why it was included.
- **Value returned this step:** a modest natural-language ask returns a **ready-to-edit cardiac
  draft** — the reciprocity payoff. He starts from a good default instead of a blank composer.
- **Modality:** button or voice/text request → proposed scope list.
- **UX constraints / laws:** nothing is ranked silently (Law 2) — the draft is a scope, not a
  recommendation of what to do; he remains the decider on every row.

### Step 3 — Refine the scope and read the exact preview

- **User intent here:** confirm precisely what's in, and prove to himself the genome is really out.
- **User does:** reviews the proposed rows; keeps ApoB/lipids/CAC/BP/lisinopril/family-CAD/imaging;
  **unchecks** two unrelated notes the draft over-included; sets the window to `last 12 months`.
- **System does:** renders a **two-column preview — Included / Excluded** — listing every resource
  by name, and showing the *excluded* set explicitly: `MolecularSequence (genome) — excluded`,
  `sleep & HRV — excluded`, `dermatology note — excluded`. Nothing is hidden; the withheld set is
  as visible as the included set (the spirit of Law 4 — egress is previewed, never assumed).
- **Value returned this step:** he can *see* the boundary of what he's about to share, both sides
  of it, before a single byte is rendered. Over-share is prevented by making it visible, not by a
  warning after the fact.
- **Modality:** checklist toggles + time-window control → live Included/Excluded preview.
- **UX constraints / laws:** Law 4 spirit (the withheld set is shown, not assumed); data over
  chrome (Law 8) — values render in tabular monospaced numerals with their reference ranges; the
  imaging entry shows the **MedGemma summary text**, never pixels ([why](../ingestion/imaging.md)).

!!! note "Genomic content is off by default, but includable"
    Genomic data is [excluded from cloud models and shares by default](../pii-gateway.md#genomic-data);
    the user can opt to include it, warned that a genome cannot be de-identified and the share will
    be identifiable. In this journey Ravi leaves it out by his own deliberate scope decision — the
    composer treats it like any other resource he can include or omit, and he omits it because the
    cardiologist has no need for it.

### Step 4 — The agent generates the curated brief (local R1)

- **User intent here:** get a clinician-ready brief, not a raw data dump the doctor has to parse.
- **User does:** clicks **Generate brief**.
- **System does:** the **reasoner (R1)** — running **local** for this packet — composes the four
  [doctor-packet sections](../frontend.md): (1) a summary with **notable changes over the period**,
  (2) **trending labs with reference ranges and flagged abnormals** (ApoB 95 flagged, HbA1c 5.4%,
  the lipid trend, CAC 0), (3) **medications and conditions** (lisinopril; controlled hypertension;
  family early-CAD), and (4) a placeholder **Questions** block. The synthesis streams over several
  seconds; source cards and evidence labels are attached to each claim.
- **Value returned this step:** a shoebox of PDFs becomes a **structured, cited, clinician-legible
  brief** — the core exchange of this journey.
- **Modality:** tap → streamed serif agent-voice brief with inline source cards.
- **UX constraints / laws:** local inference is not instant — the brief streams; the header stays
  🟢 green because this generation ran on-device. Every claim carries a label (Law 3); ApoB 95 is
  flagged against its reference bound (data over chrome, Law 8).

### Step 5 — Review and edit before anything is shared

- **User intent here:** make it *his* brief — add the questions he actually wants answered, cut
  anything he'd rather raise verbally.
- **User does:** edits inline: writes his questions (*"Given CAC 0 but ApoB 95 and my father's MI
  at 62 — do we treat to an ApoB target now, or watch?"*), trims a sentence from the summary,
  leaves the labs untouched.
- **System does:** applies edits to the draft artifact **in place**, still purely local. Nothing
  has been rendered for delivery or written to the consent log's shareable set yet — this is a
  draft, and the UI says so.
- **Value returned this step:** he walks in with the **exact questions** that make the visit
  efficient — the packet is a conversation starter he authored.
- **Modality:** inline rich-text editing.
- **UX constraints / laws:** trade-offs over verdicts — the system drafted, the user decides; the
  agent's evidence labels remain attached to the claims he keeps, so nothing he edits loses its
  provenance.

### Step 6 — Choose the format, with its egress posture beside it (Law 6)

- **User intent here:** pick a form that keeps the trends *interactive* if possible — while
  knowing exactly what each choice does to his data's boundary.
- **User does:** opens **Deliver**, where the options render side by side with their posture:

  | Format | What the recipient gets | Egress posture |
  |---|---|---|
  | **Rich web view — exported file** | A single self-contained `.html` with **interactive trend charts, source cards, evidence labels** | 🟢 **Green** — a local file he transmits himself; no ayuOS network call |
  | **Rich web view — hosted link** | The same interactive view, fetched from a hosted endpoint, **revocable** | 🟠 **Amber** — the sliver **transits ayuOS Cloud**; opt-in, disclosed, logged |
  | **PDF** | A printable, paper-friendly brief (produced by a **PDF library**, not a headless browser) | 🟢 **Green** — a local file; no network call |

- **System does:** for either **green** option it writes the artifact to local disk and hands him
  the file; for the **amber** hosted link it shows a pre-delivery disclosure — what will transit,
  the destination, the link's expiry — before anything leaves ([egress is previewed](../ai-transparency.md#2-pre-send-review)).
- **Value returned this step:** he sees the **full trade-off in one view** — interactivity vs.
  paper, and convenience/revocability vs. staying entirely on his machine — and chooses knowingly.
  A cloud/hosted affordance is never shown without the local fallback beside it (Law 6).
- **Modality:** format picker with paired posture; a disclosure sheet only for the amber path.
- **UX constraints / laws:** Law 6 (a tier never shown without its fallback); green/amber are
  load-bearing here, not decorative (Law 4) — a hosted link crossing the device boundary is amber,
  a local file is green.

!!! warning "Open question: how the *rich link* is delivered without breaking local-first"
    The self-contained web view is easy; **delivering it as a live link** is the
    unresolved part ([frontend open question](../frontend.md), [sharing open questions](../sharing.md#open-questions)).
    Three candidate mechanisms, none yet locked:

    - **Export-to-file** — hand over the `.html` directly. Fully local (🟢), but not revocable and
      not reachable by a remote recipient without the file itself.
    - **Time-boxed local URL** — served from his Mac Mini. Local, but the cardiologist can only
      reach it on the same network.
    - **Explicit consented upload to a hosted endpoint** — reachable anywhere and revocable, but it
      **transits ayuOS Cloud** (🟠) and is opt-in, disclosed, and cloud-tier by nature
      ([sharing → egress posture](../sharing.md#relationship-to-egress-posture)).

    **The PDF fallback has none of this concern** — it is always a local file. Ravi, self-hosted,
    takes the **exported rich `.html`** for interactivity plus a **PDF** to hand over on paper, and
    skips the hosted link entirely. He gives up remote-fetch and revocability, nothing else — the
    same content in every form.

### Step 7 — Confirm, log the consent, and keep the right to revoke

- **User intent here:** have a permanent, precise record of exactly what he shared and with whom.
- **User does:** clicks **Confirm & produce**.
- **System does:** writes an **append-only [consent record](../sharing.md#consent-audit)** —
  `sliver_id`, `created_at`, `purpose`, `recipient`, the **serialized scope** (every included and
  excluded resource), `format`, and an `expiry` for any hosted link — and produces the artifact(s).
  The record is visible in Share and mirrored where the [ledger and consent log are audited](14-verify-and-maintain.md).
- **Value returned this step:** precise, durable, **revocable control** — for a hosted link,
  **Revoke** invalidates it (the caveat: a **file already handed over cannot be un-shared** —
  the UI states this distinction plainly, [per the consent model](../sharing.md#consent-audit)).
- **Modality:** confirm → consent-record row (monospace fields) + produced artifact(s).
- **UX constraints / laws:** append-only, never transmitted anywhere; the consent log is the
  outbound mirror of the [call ledger's](../ai-transparency.md#3-call-ledger) egress discipline —
  what left, to whom, when.

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Name the purpose + recipient | The seed of a scoped consent record — and the key that unlocks an auto-proposed scope |
| 2 | Click "propose scope" | A ready-to-edit **cardiac draft** instead of a blank checklist |
| 3 | Refine the scope | A two-column **Included / Excluded** preview — the genome visibly *out* |
| 4 | Click "generate brief" | A structured, cited, clinician-legible brief (local, streamed) |
| 5 | Edit the draft | *His* questions and summary — an efficient visit he authored |
| 6 | Pick a format | The full interactivity-vs-paper and local-vs-hosted trade-off, side by side |
| 7 | Confirm | The artifact(s) **plus** a permanent, revocable, append-only consent record |

## UX & modality constraints

- **Input modality:** a scope composer (checklist + time window), inline rich-text editing, and a
  format picker. Voice/text can drive the initial "propose scope" ask. No raw export dialog.
- **Latency:** the local R1 brief **streams over several seconds** — set the expectation, never
  spin silently. File artifacts (HTML/PDF) render effectively instantly; a hosted link involves a
  disclosed network step.
- **Offline:** the entire green path — compose, preview, generate, edit, export HTML/PDF —
  completes **fully offline**. Only the amber hosted-link delivery needs the network, and it is the
  one path that announces itself.
- **Color semantics that dominate here:** **green vs amber is the whole story of delivery** — a
  local file is green, a boundary-crossing hosted link is amber and disclosed. Red does not appear
  (no hard block is triggered; the genome is scoped out by choice, not blocked).
- **Laws that bind:** Law 4 (egress/withheld previewed, never assumed — applied to both the
  Excluded preview and the hosted-link disclosure), Law 6 (every hosted affordance beside its
  local fallback), Law 3 (claims keep their evidence labels into the shared artifact), Law 1
  (posture on screen throughout), Law 8 (data over chrome in the brief).
- **Accessibility:** evidence strength stays a hue-free ink-dot ramp inside the rich view, distinct
  from the green/amber delivery language, so provenance and egress are never conflated.

## Where it can break (and the fallback)

- **Over-share attempted:** the two-column preview (Step 3) is the guard — anything included is
  shown by name before rendering, and the excluded set is shown too. There is no silent inclusion
  to slip past him.
- **The cardiologist just wants paper:** many clinicians won't open an interactive link. The **PDF
  fallback** is a first-class, always-local artifact — same content, printable, produced by a PDF
  library. He hands over paper and loses nothing but interactivity.
- **A hosted link needs revoking:** after the visit he clicks **Revoke** on the consent record and
  the link stops resolving. The UI states that this works **only for the hosted link** — a file
  already handed over (HTML or PDF) cannot be recalled.
- **He's self-hosted and there's no ayuOS Cloud tenant:** the hosted link simply isn't offered —
  it's cloud-tier only ([sharing → egress posture](../sharing.md#relationship-to-egress-posture)).
  The composer degrades gracefully to the two green file forms; the feature is absent, not broken.
- **Empty state:** opening Share with no record yet shows the composer with a one-line "import a
  file or connect a source first, then compose a sliver" pointing at [Journey 06](06-upload-files.md) —
  the next best action, never a dead end.

## What good looks like

- Ravi walks into a **Cerner-based cardiologist** he can't reach electronically with a **cardiac
  brief** — ApoB trend, CAC 0, BP + lisinopril, family history, MRI summary, and his own three
  questions — that reads like it came from an organized colleague, not a patient's shoebox.
- He can point to a **two-column preview** and say, truthfully, "my genome and everything unrelated
  never left the cardiac slice" — because the interface showed him the boundary before producing
  anything.
- The share is a single **append-only consent row** he can read months later — *what, to whom,
  when* — and, for the one form that crossed his device boundary, **revoke**.

## Related

- [Data Sharing & Consent (Slivers)](../sharing.md) — the sliver model, consent record, and
  delivery-format egress table this journey instantiates
- [Frontend & UI — Doctor Packet](../frontend.md) — the four packet sections and the rich-link /
  PDF-fallback design
- [AI Transparency](../ai-transparency.md) · [PII Gateway — hard exclusions](../pii-gateway.md#hard-exclusions)
  — the egress discipline the consent log mirrors outbound
- [Security & Privacy](../security.md) · [Health Literacy & Epistemics](../epistemics.md) — evidence
  labels that survive into the shared artifact
- Adjacent journeys: [05 — Connect an EHR directly](05-connect-ehr-epic.md) ·
  [06 — Upload files](06-upload-files.md) · [09 — the anchor query](09-anchor-query.md) ·
  [10 — enabling hybrid cloud reasoning](10-enable-cloud-reasoning.md) ·
  [14 — verify sovereignty & the consent log](14-verify-and-maintain.md)
