# User Journeys

Every other page in this spec describes a *component* — what it is, how it's built, why the
decision went the way it did. This section is the orthogonal cut: it follows **two real people
through the system**, step by step, and asks at every step a single question —

!!! abstract "The test every step must pass"
    **What is the user giving, and what do they get back *in that same step*?**

    ayuOS never asks for effort — a click, a file, a consent, a wait — without returning value
    immediately. If a step takes and gives nothing back, the step is designed wrong. These
    journeys are where that reciprocity is made visible, one exchange at a time.

This is not a marketing walkthrough. It states the friction honestly, names the modality of every
interaction, cites the [interaction laws](../design-system.md#interaction-laws) each step obeys,
and — because ayoOS is a system of [tiers and fallbacks](../tiers.md) — shows what breaks and what
the user keeps when it does.

---

## The two first users

The MVP target is two self-hosting biohackers. We give them names and hold their facts fixed
across every journey, so the pages compose into one coherent picture rather than fourteen
disconnected demos. Ravi is also the **[reference-demo](../demo/index.html) persona** — the mocked
dataset behind the live app — so what these journeys describe is what the demo actually shows.

<div class="grid cards" markdown>

-   **Ravi Mehta, 45** · he/him — *the pragmatic optimizer*

    ---

    Product manager, not a developer, comfortable following terminal instructions. Mac Mini (M2,
    32 GB). Privacy-conscious but **pragmatic**: he'll send PII-stripped context to a frontier
    reasoner for a harder question — *if he can see exactly what he's trading.*

    - **Posture:** Hybrid — local by default; cloud reasoner opted in per the pre-send review. MedGemma stays local.
    - **Data:** Oura + Whoop · ApoB `95` (elevated), HbA1c `5.4%`, VO₂max `52`, CAC `0` · controlled hypertension (lisinopril) · family early CAD (father, MI at 62) · brain MRI · 23andMe (APOE ε3/ε3).
    - **Sources:** Epic hospital (direct); a cardiologist on Cerner (the paid-bridge case).
    - **Wants:** *"What's my cardiac trajectory, how do I lower ApoB, and can I hand my cardiologist something better than a shoebox of PDFs?"*

-   **Maya Okonkwo, 39** · she/her — *the sovereign purist*

    ---

    Infrastructure/security engineer. Chose ayuOS **because** the alternatives would hold her
    data. Technically strong, **low patience for busywork**. Audits the ledger; occasionally pulls
    the network cable to prove the claim.

    - **Posture:** Sovereign — all roles local, always. **Never** opts into cloud; accepts a weaker answer as the price of zero-egress.
    - **Data:** Apple Watch + a **Garmin** (gated — only reachable via the paid Terra Bridge, which collides with her purism) · Hashimoto's (levothyroxine) · glucose/energy/mood focus · **CGM in time-boxed windows**.
    - **Labs she watches:** TSH, free T4, TPO antibodies, fasting glucose, HbA1c.
    - **Wants:** *"Absolute control of my record, tight n-of-1 experiments I can trust, and no company holding my history. I'll trade capability for that."*

</div>

A third, lightweight persona — **Priya, 41 (she/her)**, Ravi's sister — appears in exactly one
journey ([02](02-managed-cloud.md)). She wants the synthesis and the doctor packet but will *never*
run a server. She is why [ayuOS Cloud](../tiers.md#ayuos-cloud-managed-subscription) exists:
self-hosting is a choice about risk posture, not a prerequisite for using the product at all.

!!! note "Why these two"
    They differ on every axis that matters: deployment appetite (hybrid vs absolutist), health
    focus (cardio-metabolic vs autoimmune/metabolic), temperament (patient reader vs impatient
    auditor), and the connector tension each hits (Ravi's non-Epic cardiologist → Fasten; Maya's
    gated Garmin → Terra). Between them they exercise all three [tiering axes](../tiers.md#the-three-axes)
    and every entry point below.

---

## The entry-point map

A user does not enter through a front door and walk a fixed path. They enter through whatever
*intent* brought them — to install, to load a file, to ask a question, to prep a doctor visit, to
verify the privacy claim. These are the fourteen entry points, grouped by phase of the
[loop](../vision.md#the-loop). Each links to its own detailed journey.

### Getting in — acquire, install, run

| # | Journey | Whose intent | The exchange in one line |
|---|---|---|---|
| 01 | [Acquire, verify & first run (self-hosted)](01-install-self-hosted.md) | Ravi | Runs two commands; gets a working, offline, private instance open on **Ask**. |
| 02 | [The no-server path — ayuOS Cloud](02-managed-cloud.md) | Priya | Signs up in minutes; gets the capability, told plainly what's a weaker claim and what's identical. |

### Bootstrapping the record — add data & connectors

| # | Journey | Whose intent | The exchange in one line |
|---|---|---|---|
| 03 | [Bootstrap with an Apple Health export](03-apple-health-bootstrap.md) | Maya | One `export.zip` → years of records answer a real question before any connector is set up. |
| 04 | [Connect direct wearables — Oura & Whoop](04-connect-wearables.md) | Ravi | A PAT and an OAuth click → daily HRV/sleep/strain, our own recomputed scores, zero transit. |
| 05 | [Connect an EHR directly — Epic](05-connect-ehr-epic.md) | Ravi | One hospital login → clinical notes and labs land locally, nothing transiting a third party. |
| 06 | [Upload files — lab PDF, MRI, genome](06-upload-files.md) | Ravi | Drag a PDF / DICOM / genome file → parsed, placed on the timeline, honestly confidence-graded. |
| 07 | [Add a bridged connector with consent](07-add-bridged-connector.md) | Maya · Ravi | Reach a gated provider — but only after a consent screen that says exactly what transits whom. |
| 08 | [Switch, swap & lose a connector](08-switch-connectors.md) | both | Replace a device, drop a bridge, survive a vendor shutdown — history stays, breadth is what moves. |

### The value loop — understand, act, measure, share

| # | Journey | Whose intent | The exchange in one line |
|---|---|---|---|
| 09 | ["What changed in my last 90 days?"](09-anchor-query.md) | Ravi | One question → a grounded, evidence-labeled synthesis across every source, fully offline. |
| 10 | [First egress — enabling hybrid cloud reasoning](10-enable-cloud-reasoning.md) | Ravi | Opts a frontier reasoner in — and sees the exact payload, the redaction diff, and the ledger row. |
| 11 | [Run an n-of-1 experiment end to end](11-run-experiment.md) | Maya | A hunch becomes a pre-registered experiment with an honest supported/inconclusive verdict. |
| 12 | [Low-friction capture — supplements, symptoms, voice](12-low-friction-capture.md) | Maya | Sub-10-second logging and passive inference — the action side of the loop without a food diary. |
| 13 | [Share a scoped sliver / doctor packet](13-share-doctor-packet.md) | Ravi | Assembles exactly the cardiac slice for one cardiologist — previewed, consented, revocable. |

### Living with it — verify, maintain, endure

| # | Journey | Whose intent | The exchange in one line |
|---|---|---|---|
| 14 | [Verify sovereignty & live with it](14-verify-and-maintain.md) | both | Audits the ledger against a packet sniffer; updates without downtime; proves the promise. |

---

## How to read a journey

Each page follows the same shape, so you can scan or read deeply:

| Section | What it gives you |
|---|---|
| **Dossier** | One line: who, intent, entry surface, egress posture, primary modality. |
| **The intent** | Why the user is here and what state of mind they're in. |
| **Preconditions** | What must already be true (and which prior journey establishes it). |
| **Walkthrough** | The numbered spine. Every step names *user does · system does · **value returned this step** · modality · the laws it obeys.* |
| **Exchange ledger** | A table making the give/get reciprocity explicit, row by row. |
| **UX & modality constraints** | The input modes, latency, offline behavior, empty/error states, and color-semantics that bind this journey. |
| **Where it can break** | Honest failure modes and the graceful fallback. |
| **What good looks like** | The success signal — the "aha" for this persona. |

---

## The constraints every journey inherits

Rather than repeat them fourteen times, the shared design contract lives in two pages and is cited
throughout:

- **[Design System & UX](../design-system.md)** — the eight [interaction laws](../design-system.md#interaction-laws),
  the reserved four-color language (indigo brand · **green local** · **amber egress** · red block),
  the hue-free evidence ramp, and the three typefaces (serif for the agent's voice, sans for the
  interface, mono for every measured value).
- **[AI Transparency](../ai-transparency.md)** — the three disclosure surfaces (status indicator,
  pre-send review, call ledger) that make egress legible, and the [review modes](../ai-transparency.md#review-modes)
  (`every_call` / `new_shape` / `off`) that decide how often the user is asked.

Two rules from those pages recur so often they're worth stating up front:

1. **Green means it stayed; amber means it left.** The three-role posture indicator is on screen in
   every view. A fully-local install shows three greens, and any change is visible the instant it
   happens ([Law 1](../design-system.md#interaction-laws)).
2. **Nothing crosses the device boundary unpreviewed.** Before anything leaves — a cloud model
   call, a bridged connector, a hosted share link — the user sees the exact payload, what was
   stripped, and where it's going, and the ledger records it forever ([Law 4](../design-system.md#interaction-laws)).
