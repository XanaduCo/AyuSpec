# ayuOS demo app

A **UI-only** demo of the whole ayuOS product surface, built with React + Vite.
All data is mocked and deterministic — there is no backend, no model, and no
network. It is the reference implementation of the
[Design System & UX](../docs/design-system.md) spec.

## Run it

```bash
cd app
npm install
npm run dev        # local dev server with HMR
```

## Build it

```bash
npm run build      # outputs to ../docs/demo/
```

The production build lands in `../docs/demo/`, which MkDocs serves at `/demo/`
(see `.github/workflows/deploy.yml`). `docs/demo/` is git-ignored and produced
in CI.

## How it fits together

- **`src/shell/`** — the app shell: left rail, the always-on posture header, routing.
- **`src/mock/`** — the single source of truth for the demo:
  - `persona.js` — Ravi Mehta's coherent dataset: labs, meds, imaging, wearables (with a seeded
    daily series over the timeline domain), and dated `events`. Every view reads from here.
  - `agent.js` — a fake agent-tool API returning canned, structured answers; citations reference
    record ids, and `cloud` answers trigger the pre-send review.
  - `fhir.js` — resolves a record id → a FHIR-shaped resource for the source drawer.
  - `concepts.js` — the epistemics concept library + evidence-label → concept mapping.
  - `preferences.js` — Ravi's preference profile + the "simplify" ranking that shows its work.
  - `ledger.js` — the model-call ledger and a pre-send review.
  - `posture.jsx` — the resolved per-role model posture (green = local, amber = cloud).
- **`src/explore/`** — the healthspan model, folded in from the original single-file
  explorer. Imports the compiled graph from `../prototype/seed/graph.json` (regenerated
  by `prototype/build.mjs`), so a graph rebuild flows straight into the app.
  - `experiments.js` — three n-of-1 experiments (running / supported / inconclusive) with the
    honesty guardrails baked into the data.
  - `connectors.js` — every data source's tier, transit story, and fallback path.
  - `shares.js` — the shareable inventory, scope filter, doctor-packet builder, and consent log.
- **`src/views/`** — one file per rail destination. All eight are now functional: `Ask`, `Timeline`,
  `Explore`, `Transparency`, `Settings`, `Experiments`, `Data sources`, and `Share`.
- **`src/components/`** — shared atoms and cross-cutting systems: `EvidenceLabel` (+ `Citation`),
  `PosturePill`, `StubView`, `Drawer` (the shared source/concept slide-over + `DrawerProvider`),
  `ComparisonFrame` (with the simplify ranking), `PreSendPanel`, `VoiceInput`, `Modal`, `Switch`.

## Design invariants

The colour language is load-bearing: **green = stayed on device, amber = left the
device, red = block/critical**, and indigo is the brand (no privacy meaning).
Evidence strength is a hue-free dot ramp so it never collides with the privacy
colours. See `src/styles/tokens.css` and the design-system spec.
