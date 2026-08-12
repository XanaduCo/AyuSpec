# ayuOS Companion demo

A UI-only, scripted demo of the Companion app's **adaptive plan loop** — the mobile workflow
specced in [`docs/companion-app.md`](../docs/companion-app.md). A phone-framed mobile UI plus a
narration rail walks seven scenes of the spec's worked example (Ravi Mehta, mid marathon block):
home, pre-action check-in with voice extraction, recommendation with "why?", post-action
reconciliation, observation→tracked-issue promotion, weekly review, and the bridge/channels
settings. All data is mocked and deterministic; taps update shared state within a session.

Run locally: `npm install && npm run dev`.

`npm run build` emits to `../docs/appdemo/`, which MkDocs serves at `/appdemo/`
(see `.github/workflows/deploy.yml`). This is separate from `app/`, the desktop web-app demo.
