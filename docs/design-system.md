# Design System & UX

[Frontend & UI](frontend.md) decides *what views exist* and *what stack builds them*. This page
decides *how they look and behave* — the visual identity and the interaction laws that every screen
obeys, so the app reads as one instrument rather than a dozen features stapled together.

!!! abstract "The stance"
    ayuOS is **an instrument you own that never hides what it's doing.** Two ideas — sovereignty made
    visible, and trade-offs over verdicts — are not marketing; they are constraints on every screen.
    If a view doesn't make them *felt*, it is a worse version of the products ayuOS exists to replace.

This system governs the [reference demo](#the-reference-demo) being built now, and is the contract any
future contributor designs against.

---

## Two ideas the interface serves

Every existing health product answers questions. ayuOS differs in exactly two ways, and the UI's whole
job is to make those two differences legible on every screen.

| | The idea | How the UI carries it |
|---|---|---|
| **Sovereignty, made visible** | You can always see where your data is and what is leaving the device. | The current posture is on screen at all times — never buried in settings. Green means it stayed; amber means it left. |
| **Trade-offs over verdicts** | The system shows you the trade-off; it does not make the choice. | Nothing is scored, ranked, or recommended silently. Options sit on fixed axes; evidence is labeled; every promotion names its reason. |

These trace directly to [AI Transparency](ai-transparency.md) and [Health Literacy &
Epistemics](epistemics.md) — this page is where they become pixels.

---

## Interaction laws

Eight non-negotiables. When a design question comes up mid-build, it resolves against this list rather
than taste.

| # | Law | Source |
|---|---|---|
| 1 | **Posture is always on screen.** The three-role status indicator lives in the header of every view. A fully-local install shows three greens; any change is visible the instant it happens. | [AI Transparency §1](ai-transparency.md#1-status-indicator) |
| 2 | **Nothing is ranked silently.** Options render on the same fixed axes. Ranking appears only when the user asks to "simplify," and then it names the stated preference that produced the order. | [Epistemics](epistemics.md#the-comparison-frame) |
| 3 | **Every claim carries a label.** Evidence labels are tappable and expand the matching concept card with the live claim as the worked example. Labels are the curriculum, not decoration. | [Agent Loop](agent-loop.md#evidence-labeling-in-the-prompt), [Epistemics](epistemics.md#design-principles) |
| 4 | **Egress is previewed, never assumed.** Before anything leaves the device, the exact payload, the redaction diff, the destination, and what was withheld are shown. The ledger records it forever after. | [AI Transparency §2](ai-transparency.md#2-pre-send-review) |
| 5 | **Fast to the first question.** The app opens on **Ask** with the cursor ready. No dashboard wall, no onboarding gate. | [Frontend](frontend.md#principles) |
| 6 | **A tier is never shown without its fallback.** Every paid or cloud affordance renders beside what you keep without it. Losing a tier costs breadth, never the system or your history. | [Tiers](tiers.md#the-fallback-guarantee) |
| 7 | **Education injects, never blocks.** Concept cards appear inline, at most one per response, and retire once fluency is shown. Never a modal, never a nag, never a gate on functionality. | [Epistemics](epistemics.md#the-injection-policy) |
| 8 | **Data over chrome.** Health values use tabular, monospaced numerals and as-reported reference ranges. The interface recedes; the record is the subject. | — |

---

## Color is a language

The identity's backbone is a strict rule: **three hues carry meaning and are never used
decoratively.** Because they are reserved, the user learns them once and can trust them. The brand
colour is deliberately *cool* (indigo) precisely so it never competes with the warm semantic end.

| Role | Light hex | Meaning — and nothing else |
|---|---|---|
| **Indigo — brand** | `#4A47B5` | Primary actions, active navigation, links, brand marks. Carries no health or privacy meaning. |
| **Green — local** | `#1F8A5B` | On-device inference, direct (zero-transit) connectors, source-backed facts. *"This did not leave your machine."* |
| **Amber — egress** | `#B57400` | Cloud inference, bridged connectors, hosted share links — anything crossing the device boundary, PII-stripped. **Never silent, never decorative.** |
| **Red — block** | `#C0392B` | Hard exclusions, blocked interventions, clinician-routed red flags, critically abnormal values. Stops, not warnings. |

Two consequences of the reservation:

- **Warmth comes from the paper and the serif, not a spare accent.** The surface is warm off-white
  (`#FCFBF8`) over near-black ink (`#191C1F`); discipline in the accent is what makes the semantics
  trustworthy.
- **Evidence strength is hue-free.** It renders as a neutral ink ramp of filled dots
  (`●●●●` HIGH → `○○○○` NONE), so it can never be mistaken for the green/amber privacy law.

A full light **and** dark token set ships with the system; the hexes above are the light-mode anchors.

---

## Typography — three typefaces, three jobs

| Face | Job | Rationale |
|---|---|---|
| **Humanist serif** (display) | Headings and the agent's own voice | Signals care and consideration — the opposite of clinical software. |
| **Humanist sans** (interface) | Everything the user reads and operates | Quiet, legible, unopinionated. |
| **Monospace** (data) | Every measured value, LOINC code, timestamp, payload, ledger row | Tabular numerals; the machine speaking plainly. |

---

## Information architecture

One shell, eight destinations, a persistent posture header. [Frontend & UI](frontend.md#views) holds
the per-view detail; this is the consolidated map the navigation is built from.

| Rail item | What it is | Detail |
|---|---|---|
| **✦ Ask** *(home)* | Chat with the agent — voice/text, markdown answers, inline evidence labels, comparison frames, source cards, history. | [Frontend](frontend.md#chat), [Agent Loop](agent-loop.md) |
| **◷ Timeline** | Zoomable record of labs, wearables, conditions, meds, imaging. Overlay two metrics; click an event → its FHIR resource. | [Frontend](frontend.md#timeline) |
| **◇ Explore** | The healthspan model — systems → functions → interventions, live modifier resolution, comparison frame, markers. | [Healthspan Model](healthspan-model.md) |
| **⁘ Experiments** | Hypotheses and n-of-1 experiments — baseline, protocol, pre-registered success criteria, supported/inconclusive verdicts. | [Evidence](evidence.md), [Experimentation](experimentation.md) |
| **⇲ Data sources** | Connector cards — tier (direct/bridged), last sync, record counts, errors. File uploads: Apple Health, lab PDFs, DICOM, genome. | [Ingestion](ingestion/index.md) |
| **◨ Share** | Doctor-packet & sliver composer — scope, format, preview of exactly what's included, append-only consent log. | [Sharing](sharing.md) |
| **▤ Transparency** | The call ledger — every model call, filterable, with full payload. Pre-send review and per-role posture detail. | [AI Transparency](ai-transparency.md) |
| **⚙ Settings** | Per-role model providers & review modes, tier posture, security/egress summary, federation opt-in, deployment status. | [Model Providers](model-providers.md), [Security](security.md) |

The header carries the **three-role status indicator** (`reasoner · tools · medical`, green=local /
amber=cloud) on every screen, reflecting resolved runtime state — not the config file.

---

## Signature components

The recurring parts that make ayuOS look like ayuOS. Each encodes an interaction law directly:

- **Posture indicator** — the header status pills. Reflects what *actually ran*, not what was
  configured; clicking a role opens that role's slice of the ledger. *(Law 1)*
- **Evidence label** — the hue-free dot ramp plus `◆ SOURCE-BACKED` / `◇ INFERRED`. Tappable into a
  concept card. *(Laws 3, 8)*
- **Comparison frame** — fixed-axis table (evidence, effect, certainty, cost, risk, reversibility,
  effort). Fills the cells and stops; no score, no recommendation. *(Law 2)*
- **Pre-send review** — the amber panel showing the verbatim payload, the in-place redaction diff, the
  destination, and hard exclusions withheld entirely. *(Law 4)*
- **Modifier-resolution trail** — an attributed list where every change names the fact that caused it
  and cites a source; conflicts shown side by side, never averaged. *(Law 2)*
- **Tier + fallback pairing** — any paid/cloud affordance rendered beside the free path it degrades to.
  *(Law 6)*

---

## The reference demo

The design system is being proven by a full **UI-only demo** — the whole product surface as a React +
Vite app with entirely mocked data, replacing the single-file healthspan explorer currently served at
`/demo/`.

**One coherent persona.** A single deterministic dataset — *Ravi Mehta, 45* — feeds every view through
a mock agent-tool API, so the lab drawn on a date appears in the Timeline, feeds the "what changed"
answer, and is what the doctor packet exports. That cross-view coherence is what makes a mock feel real.

| | |
|---|---|
| Wearables | Oura + Whoop (HRV, sleep, readiness, strain) |
| Labs | ApoB 95 mg/dL (elevated), HbA1c 5.4%, VO₂max 52, CAC score 0 |
| History | Hypertension (controlled, lisinopril); family early CAD (father, 62) |
| Imaging / genomics | Brain MRI (T1/T2/FLAIR, MedGemma summary); 23andMe (APOE ε3/ε3, CVD PRS 70th) |
| Active hypothesis | Post-meal walks reduce glucose peaks — 21/30 days, week 4 |

**Build sequence** — shell first, then one rich view at a time, always demoable:

| Phase | Scope |
|---|---|
| **0 — Foundation** | Vite scaffold → `docs/demo/`, design tokens (light+dark), app shell (rail + posture header + routing), mock-data layer. Fold the existing explorer in as **Explore**. |
| **1 — Anchor loop** | **Ask** (chat, evidence labels, comparison frame) → **Timeline**. The "what changed in 90 days" query the product is judged on. |
| **2 — Trust surfaces** | **Transparency** (ledger + pre-send review) and **Settings** (providers, tiers, egress posture). |
| **3 — The rest** | **Experiments**, **Data sources**, **Share** — same fidelity, reusing the components above. |

The app's `vite build` outputs to `docs/demo/index.html`, so MkDocs keeps serving it at `/demo/`; the
healthspan graph JSON becomes a data import rather than an inlined blob.

---

## Open questions

- [ ] Final typeface choices — the system specifies *roles* (serif display, sans interface, mono data);
      the specific families are open, and must be self-hostable (no CDN font dependency for the
      local-first tier).
- [ ] Does the serif voice extend to the agent's chat responses, or only to headings?
- [ ] Is the hue-free evidence ramp legible enough at a glance, or does `EVIDENCE: NONE` need a stronger
      distinct treatment than a dashed hollow ramp?
