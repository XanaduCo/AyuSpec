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
  - `persona.js` — Ravi Mehta's coherent 90-day dataset (every view reads from here).
  - `agent.js` — a fake agent-tool API returning canned, structured answers.
  - `ledger.js` — the model-call ledger and a pre-send review.
  - `posture.jsx` — the resolved per-role model posture (green = local, amber = cloud).
- **`src/explore/`** — the healthspan model, folded in from the original single-file
  explorer. Imports the compiled graph from `../prototype/seed/graph.json` (regenerated
  by `prototype/build.mjs`), so a graph rebuild flows straight into the app.
- **`src/views/`** — one file per rail destination. `Ask`, `Timeline`, `Explore`, and
  `Transparency` are functional; `Experiments`, `Data sources`, `Share`, and `Settings`
  are planned-fidelity stubs being filled in over phases 1–3.
- **`src/components/`** — shared atoms (evidence labels, posture pills, stub view).

## Design invariants

The colour language is load-bearing: **green = stayed on device, amber = left the
device, red = block/critical**, and indigo is the brand (no privacy meaning).
Evidence strength is a hue-free dot ramp so it never collides with the privacy
colours. See `src/styles/tokens.css` and the design-system spec.
