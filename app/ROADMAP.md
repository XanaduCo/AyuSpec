# ayuOS demo — build roadmap

This is the **living plan** for building out the UI-only demo. It is written to be
self-contained: a fresh session can open this file, pick a phase, and execute it without
prior context. Check items off as they land.

- **What the demo is:** every ayuOS product surface as a React + Vite app, UI-only, with
  deterministic mocked data. No backend, no model, no network.
- **Design contract:** [`docs/design-system.md`](../docs/design-system.md) — read it before
  building. The colour language is load-bearing (green = stayed on device, amber = left,
  red = block; indigo = brand, no privacy meaning; evidence strength is a hue-free dot ramp).
- **Reference:** [`app/README.md`](README.md) for the file map.

---

## How to work (any phase)

```bash
cd app
npm install            # first time only
npm run dev            # dev server + HMR — build against this
npm run build          # outputs to ../docs/demo/ (git-ignored, CI-built)
```

Full pipeline sanity check (what CI runs — do this before finishing a phase):

```bash
cd prototype && node build.mjs          # compile+validate the healthspan graph
cd ../app && npm run build              # build the app -> docs/demo
cd .. && python3 -m mkdocs build --strict   # confirm the site still builds
```

**Conventions**
- One file per view in `src/views/`. Shared atoms in `src/components/`. All mock data in
  `src/mock/` — add to the existing modules, keep the Ravi Mehta story coherent across views.
- Reuse tokens/classes from `src/styles/` — do **not** introduce new colours outside the
  four semantic roles. New reusable widgets get a class in `app.css` and a component.
- Every screen keeps the posture header (already in the shell). Anything that could cause
  egress renders amber + names its free fallback.
- Commit per phase (or per view for the big ones). End messages with the Co-Authored-By line.

**Where things live**
| Area | Path |
|---|---|
| Shell (rail, posture header, routing) | `src/shell/`, `src/App.jsx`, `src/main.jsx` |
| Design tokens + styles | `src/styles/{tokens,app,explore}.css` |
| Mock persona / agent / ledger / posture | `src/mock/` |
| Healthspan graph + resolver | `src/explore/` (imports `../prototype/seed/graph.json`) |
| Shared components | `src/components/` (EvidenceLabel, PosturePill, StubView) |

---

## Status at a glance

| Phase | Views | State |
|---|---|---|
| **0 · Foundation** | shell, tokens, mocks, Explore | ✅ done |
| **1 · Anchor loop** | Ask (deepen), Timeline (real) | ⬜ next |
| **2 · Trust surfaces** | Settings (+ live posture), Transparency (polish) | ⬜ |
| **3 · The rest** | Experiments, Data sources, Share | ⬜ |
| **X · Cross-cutting** | concept cards, source drawer, simplify, voice, a11y | ⬜ ongoing |

Legend: ✅ done · 🟡 partial · ⬜ not started.

---

## Phase 0 — Foundation ✅

Shipped in commit `4c08a2f`. For reference, what exists:

- ✅ Vite + React app, HashRouter, `base: './'`, builds to `../docs/demo`.
- ✅ App shell: left rail (8 destinations), always-on posture header (per-role green/amber,
  click → `/transparency?role=…`).
- ✅ Design tokens (light + dark), the reserved colour language, serif/sans/mono triad.
- ✅ Mock layer: `persona.js`, `agent.js`, `ledger.js`, `posture.jsx`.
- ✅ **Explore** — healthspan model fully ported (resolver logic preserved verbatim).
- 🟡 **Ask**, **Timeline**, **Transparency** — functional first pass (deepened in phases 1–2).
- ⬜ **Experiments / Data / Share / Settings** — planned-fidelity stubs (`StubView`).
- ✅ Integration: `build.mjs` trimmed to graph-only; CI builds graph → app → mkdocs.

---

## Phase 1 — The anchor loop ("what changed in 90 days")

The query the product is judged on. Make Ask and Timeline genuinely rich.

### Ask — deepen  · spec: [frontend#chat](../docs/frontend.md), [agent-loop](../docs/agent-loop.md), [epistemics](../docs/epistemics.md)
Current: canned structured answers with inline evidence labels, comparison frames, concept +
source callouts (`src/views/Ask.jsx`, `src/mock/agent.js`).
- [ ] **Source cards click-through** — a citation/`◆ SOURCE` opens a drawer with the underlying
      record (mock FHIR Observation/DocumentReference). *(shared "source drawer", see Cross-cutting)*
- [ ] **Evidence label → concept card** — tapping a label expands the epistemics concept with the
      live claim as the worked example. *(shared concept system, see Cross-cutting)*
- [ ] **Query history sidebar** — past questions, click to re-open. Persist in memory only.
- [ ] **Voice input** — mic button fills a canned transcript; label it on-device. *(Cross-cutting)*
- [ ] **"Simplify this for me"** — a follow-up that collapses a comparison frame into a ranking and
      **shows its work** ("walking ranked first because you weight certainty + cost"). *(Cross-cutting)*
- [ ] **Pre-send review on cloud answers** — when the reasoner is cloud (it is, by default), the
      first answer surfaces the pre-send panel (reuse `src/mock/ledger.js` `presend` + the
      Transparency panel) before "sending". Ties the posture story into Ask.
- Mock data: extend `agent.js` answers to reference specific `persona` records by id so the source
  drawer can resolve them; add 2–3 more answered questions.
- **Done when:** a user can ask a suggested question, expand a claim into a concept, click a source
  to see the record, ask to simplify and see a justified ranking — all offline.

### Timeline — build for real  · spec: [frontend#timeline](../docs/frontend.md), [storage](../docs/storage.md)
Current: a light static panel of labs/wearables/imaging/meds (`src/views/Timeline.jsx`).
- [ ] **Zoomable time axis** — day / week / month / year toggle over the 90-day window.
- [ ] **Tracks** — labs, wearable metrics, conditions, procedures, medications, imaging studies as
      horizontal lanes on a shared date axis.
- [ ] **Click an event → its FHIR resource** — same source drawer as Ask (subsumes a raw resource
      browser; there is no separate resource view).
- [ ] **Overlay mode** — select two metrics onto one axis (e.g. HRV vs. VO₂max) to see co-movement.
- Mock data: expand `persona.js` wearable series to daily-ish resolution over 90 days (or a
  generator seeded deterministically); add event dates for meds/imaging/labs already present.
- **Done when:** the "what changed" story is legible visually — zoom, scan tracks, overlay two
  metrics, drill into any event's record.

---

## Phase 2 — Trust surfaces

Where the marketing claims get earned, and where posture becomes interactive.

### Settings — build + wire posture  · spec: [model-providers](../docs/model-providers.md), [tiers](../docs/tiers.md), [security](../docs/security.md), [federation](../docs/federation.md)
Current: `StubView`.
- [ ] **Per-role provider config** — reasoner / tools / medical, each: provider dropdown
      (Ollama / Anthropic / OpenAI / Google / OpenAI-compatible), model, endpoint field
      (openai-compatible only), fallback, review-mode radios.
- [ ] **Wire to `posture.jsx`** — changing a role's provider updates the shared posture context so
      the **header pills flip green↔amber live**. This is the payoff of Phase 0's context.
- [ ] **Review-mode rule** — `off` is disabled until the user has seen one full pre-send preview for
      that role (enforce in UI, per ai-transparency.md).
- [ ] **Egress posture summary** — plain-language paragraph computed from the three roles + any
      bridged connectors ("Cloud reasoner on; PII-stripped context leaves for synthesis. Everything
      else local."). Answers tiers.md's open question.
- [ ] **Security block** — disk-encryption check (mock ok/warn), telemetry toggle (off default),
      services-bound-to-localhost indicator.
- [ ] **Federation opt-in** — off by default; consent text modal before enabling.
- Mock data: a `settings.js` mock or extend `posture.jsx` with the full provider option lists.
- **Done when:** flipping the reasoner to local turns the header pill green everywhere, and the
  egress summary + review-mode lock behave per spec.

### Transparency — polish  · spec: [ai-transparency](../docs/ai-transparency.md)
Current: expandable ledger + pre-send panel + role filter (`src/views/Transparency.jsx`).
- [ ] **More filters** — by date range and the "gateway found zero PII" case (the interesting one).
- [ ] **Per-role landing** — arriving via `?role=` already filters; add a small role summary header.
- [ ] **Payload retention note** + append-only/queryable framing surfaced in UI.
- **Done when:** the ledger answers the spec's canonical questions (has anything gone to OpenAI?
  what left last month + cost? zero-PII payloads?) via the filter chips.

---

## Phase 3 — The rest

Same fidelity, reusing the components built above.

### Experiments  · spec: [evidence](../docs/evidence.md), [experimentation](../docs/experimentation.md)
Current: `StubView`.
- [ ] **Hypothesis object + list** — statement, goal, rationale, evidence label (separate from
      confidence), grouped by goal. Seed with Ravi's post-meal-walking hypothesis.
- [ ] **Experiment setup** — protocol (pre/post or A-B-A), metric sources, baseline window picker,
      **pre-registered success criteria**, confounder flags (travel/illness/alcohol).
- [ ] **Baseline variability display** — show natural noise before the intervention.
- [ ] **Result** — supported / not supported / **inconclusive**, with an effect-size viz (baseline
      vs intervention distributions overlaid) and an honest label when underpowered.
- Mock data: `experiments.js` — 1 running (post-meal walks, wk 4, 21/30), 1 complete, 1 inconclusive.
- **Done when:** the honesty guardrails are visible — an n-of-1 that overlaps baseline reads
  "inconclusive", not "it worked".

### Data sources  · spec: [ingestion](../docs/ingestion/index.md), [data-capture](../docs/data-capture.md)
Current: `StubView`.
- [ ] **Connector cards** — Wearables (Oura, Whoop), Apple Health, EHR (Epic direct / Fasten
      bridged), Labs, Imaging, Genomics. Each: status, last sync, next run, record count, errors.
- [ ] **Tier badge per source** — direct = green, bridged = amber **with disclosure text** and its
      free fallback named (Terra → Open Wearables; Fasten → Apple/Epic).
- [ ] **Manual "sync now"** (mock) and **file-upload zones** (Apple Health export, lab PDF, DICOM,
      genome) with a fake parse/confidence result.
- [ ] Optional: crosswalk/dedup transparency; screening due-dates with nudge/snooze.
- Mock data: `connectors.js` — status per source consistent with the persona (Oura+Whoop active,
  Epic connected, no Garmin).
- **Done when:** every source's tier and transit story is explicit, and a bridged source always
  shows the direct path it degrades to.

### Share  · spec: [sharing](../docs/sharing.md), [frontend#doctor-packet](../docs/frontend.md)
Current: `StubView`.
- [ ] **Sliver composer** — scope pickers (domain / source / resource type / time window), format
      (doctor packet PDF · FHIR bundle · structured summary · hosted link=amber), **preview of
      exactly what's included**, generate.
- [ ] **Doctor packet** — sections: summary + notable changes, labs with ranges/flagged abnormals,
      meds & conditions, questions to raise. Rendered from persona data.
- [ ] **Consent log** — append-only record of shares (purpose, recipient, scope, expiry); honest
      revocation limits ("file-based shares can't be un-shared").
- [ ] Optional: agent-proposed sliver ("what my new PCP needs" → suggested scope → approve/edit).
- Mock data: `shares.js` — one past share (cardiology consult), plus the composer state.
- **Done when:** a user can scope, preview, and "generate" a doctor packet, and every share lands
  in the consent log.

---

## Cross-cutting (build once, use everywhere)

These are shared systems several views depend on — build when the first consumer needs them.

- [ ] **Concept-card system** — a small mock concept library (`src/mock/concepts.js`, ~6–10 from
      epistemics.md), an `EvidenceLabel` that expands its matching concept with the live claim, and
      one-per-response injection. Consumers: Ask, Explore, Experiments.
- [ ] **Source drawer** — a shared slide-over that renders a mock FHIR resource / document from an
      id. Consumers: Ask (citations), Timeline (events).
- [ ] **Comparison-frame component** — extract the inline frame in `Ask.jsx` into
      `components/ComparisonFrame.jsx`; used by Ask, Explore, and the "simplify" flow.
- [ ] **Preference model / "simplify"** — a light preference profile + a ranking that shows its
      work. Consumers: Ask, Explore.
- [ ] **Voice input** — a reusable mic control that fills a canned transcript, labelled on-device.
- [ ] **A11y + responsive pass** — keyboard focus states, aria on the posture pills and tabs, a
      mobile rail (drawer) for < 760px. Dark-mode visual QA across every view.

---

## Open product questions that touch the UI

Tracked in the spec; note them when a phase forces a decision:
- Voice transcription on-device vs. opt-in cloud STT ([frontend](../docs/frontend.md) open Qs).
- Doctor-packet hosted link delivery without breaking local-first ([frontend](../docs/frontend.md)).
- Local-network tier posture colour — green-with-caveat vs. a third colour ([ai-transparency](../docs/ai-transparency.md)).
- Specific typefaces (must be self-hostable — no CDN font) ([design-system](../docs/design-system.md)).
