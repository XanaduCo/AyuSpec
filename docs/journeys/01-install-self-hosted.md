# Journey 01 — Acquire, verify & first run (self-hosted)

> **Who:** Ravi Mehta, 45 — product manager, not a developer, comfortable in a terminal · **Intent:** stand up a private instance he can trust *before* handing it any records · **Entry surface:** the public spec site / GitHub, then the CLI · **Egress posture:** 🟢 fully local — nothing leaves the machine · **Primary modality:** CLI (`ayu setup`, `ayu start`), then the local web app at `http://localhost:4000`.

## The intent

!!! abstract "Outcome of this journey"
    A running, private, **fully-offline** ayuOS instance on Ravi's own Mac Mini — the store of
    record provisioned and the app open on **Ask** — with **nothing having left the machine**,
    and the sovereignty claim demonstrated on his hardware rather than taken on trust.

Ravi has looked at Function Health and Superpower and stalled on the same objection each time: to get the synthesis, he has to let a company hold his cardiac history for the rest of his life. He is not an absolutist — he will use a cloud reasoner later, with his eyes open — but the *store* of record should be his. He is hiring ayuOS to be that store, and before he trusts it with a single lab value he wants to confirm the trust claim is real and not marketing. The job of this journey is to get him from "interesting claim on a website" to "a working, offline instance on my own Mac Mini" without ever asking him to take the privacy promise on faith.

## Preconditions

- A Mac Mini on Apple Silicon (Ravi's is **M2, 32 GB, 1 TB NVMe** — the reference platform; see [Deployment](../deployment.md)).
- macOS admin rights and a working internet connection (needed *once*, to download software and model weights — not to run the product).
- FileVault available to enable (ayuOS checks full-disk encryption at startup; see [Security](../security.md)).
- **No prior journey required — this is the entry point.** Everything downstream (Apple Health, wearables, the anchor query) depends on this instance existing.

## Walkthrough

### Step 1 — Verify the claim before installing anything

- **User intent here:** decide whether the sovereignty claim is architectural or just a nicer privacy policy — *before* committing effort.
- **User does:** reads the [trust claim](../vision.md) and [Security](../security.md) on the spec site; confirms the licence is **MIT** and the source is public; skims the egress table and the "verify it yourself" note.
- **System does:** the spec states the claim precisely — in the default self-hosted + local-inference + direct-connector configuration, *there is no code path that carries health data off the device*. It also tells him how to check it later (block the process at the firewall; run a proxy and compare against the ledger).
- **Value returned this step:** he can falsify the promise on his own hardware later. The claim is auditable, not asserted — which is exactly the property Function Health cannot offer, because its business needs custody of the data.
- **Modality:** reading (web); no account, no email, no gate.
- **UX constraints / laws:** the trust claim is scoped to a *configuration*, never to "ayuOS" in general (copy rule 1). The fallback is stated alongside every tier (Law 6): even the free local build loses nothing that matters if a paid tier later disappears.

### Step 2 — Choose the posture deliberately

- **User intent here:** pick self-hosted over managed on purpose, understanding what he keeps and what he takes on.
- **User does:** compares self-hosted vs [ayuOS Cloud](../tiers.md) on Axis 1 (deployment); accepts that he provides the hardware and the ops in exchange for an *architectural* guarantee rather than a policy one.
- **System does:** the [Tiers](../tiers.md) page presents the trade honestly — managed is a weaker, policy-backed claim; self-hosted is the strongest posture but asks for a Mac Mini and some terminal time. Neither is hidden behind the other.
- **Value returned this step:** clarity, not a sales funnel. He knows precisely which risk posture he is in and that he can migrate later (the choices are configuration, not a one-way install).
- **Modality:** reading (web).
- **UX constraints / laws:** Law 6 — the paid tier is shown beside the free path it degrades to; his sister Priya's no-server path ([Journey 02](02-managed-cloud.md)) is the same core, so choosing self-hosted forecloses nothing.

### Step 3 — Install the prerequisites

- **User intent here:** get the runtime pieces in place with the least possible ceremony.
- **User does:** in Terminal, installs **Homebrew**, then **Ollama** (local model runtime) and **Postgres 16** via Homebrew; obtains ayuOS (the repo / release) and puts `ayu` on his `PATH`. He **skips Docker** — he'll only need it if he later runs Open Wearables for direct wearable sync ([Journey 04](04-connect-wearables.md)).
- **System does:** nothing yet — this is host setup. ayuOS deliberately leans on standard, separately-auditable components rather than bundling opaque binaries.
- **Value returned this step:** each dependency is a well-known, inspectable tool he (or anyone) can verify independently — the install itself is part of the transparency story, not a black box.
- **Modality:** CLI.
- **UX constraints / laws:** Docker is *optional* — needed only for Open Wearables (see [Deployment](../deployment.md)). The prerequisite list is honest and short; no hidden services.

### Step 4 — `ayu setup`, part one: pull the models (the honest wait)

- **User intent here:** get the local model stack onto the machine so reasoning can run offline.
- **User does:** runs `ayu setup`. The first phase pulls three Ollama models: **DeepSeek-R1 distill** (reasoner), **Qwen** (tool-caller), and **MedGemma** (medical extractor — the role that reads raw clinical text, kept local).
- **System does:** downloads roughly **13 GB total** of quantized weights (≈5 GB + ≈4 GB + ≈4 GB). On typical home broadband this is **tens of minutes**, not seconds — and `setup` says so up front, shows per-model progress, and narrates *why each model exists* while it downloads.

    !!! warning "Set expectations honestly"
        This is the longest single wait in the whole product, and it is one-time. `ayu setup` prints the total download size and a rough ETA before it starts, so Ravi can start it and step away rather than watch a spinner.

- **Value returned this step:** the wait buys *understanding*, not just bytes. By the time the download finishes, `setup` has explained the three-role model architecture — so when the posture header later shows `reasoner · tools · medical`, he already knows what each pill means. (Reciprocity: the narration is the value returned *during* the wait.)
- **Modality:** CLI, streaming progress.
- **UX constraints / laws:** local inference is not instant and the spec never pretends it is (latency honesty). The three roles map exactly to the header status indicator (Law 1) he'll see in the app.

### Step 5 — `ayu setup`, part two: database, catalogue, connectors, import prompt

- **User intent here:** finish provisioning — the store, the seed data, and the first connections — in one guided pass.
- **User does:** answers a few inline prompts as `setup` walks him through: whether to connect a wearable now, and whether to import an Apple Health export now. He can **defer both** and do them later without penalty.
- **System does, in order:**
    1. Initializes **Postgres** and creates the four schemas — `clinical` (FHIR-shaped JSONB), `timeseries` (wearables), `ayuos` (app objects), `vectors` (pgvector) — then runs migrations. See [Storage / ADR-0002](../adr/0002-clinical-data-store.md).
    2. Seeds the **metric catalogue** and the **FHIR R4 SearchParameter index** definitions, so the store can resolve labs and codes the moment data lands.
    3. Offers the **wearable walkthrough** (Oura PAT / Whoop OAuth) — deferrable to [Journey 04](04-connect-wearables.md).
    4. Prompts for an optional **Apple Health `export.zip`** import — deferrable to [Journey 03](03-apple-health-bootstrap.md).
- **Value returned this step:** a fully-provisioned, queryable store *before* any personal data exists — the schemas and catalogue are the scaffolding that makes a single later import immediately answer a real question, rather than sit inert.
- **Modality:** CLI prompts; every ask is deferrable (Law 5's spirit — don't gate first value behind full setup).
- **UX constraints / laws:** every connector ask is **scoped and reversible** (reciprocity rule). No all-or-nothing consent, no onboarding wall. Bridged/paid connectors are not even offered here — only the free, direct, zero-transit paths.

### Step 6 — `ayu start`

- **User intent here:** bring the instance up and open the app.
- **User does:** runs `ayu start`.
- **System does:** checks **Ollama** is running and the required models are pulled; checks **Postgres** is up and migrations are current; starts Open Wearables *only if* configured; starts the ayuOS core (agent API + web frontend, one process); opens **`http://localhost:4000`** in the default browser, landing on **Ask** with the cursor already in the input. All services bind to **`127.0.0.1`** — loopback only, unreachable from the LAN or internet.
- **Value returned this step:** a running, private, **fully-offline** instance. He can pull the network cable right now and every local workflow still works — the sovereignty claim from Step 1, now demonstrable on his own hardware.
- **Modality:** CLI → browser hand-off.
- **UX constraints / laws:** Law 5 — opens on Ask, cursor ready, no gate. Offline is a first-class state, not an error. Loopback binding is the architectural spine of the zero-egress claim ([Security](../security.md)).

### Step 7 — The first moment: an empty state that still gives value

- **User intent here:** understand what he's looking at and what to do next, before he has any data.
- **User does:** reads the Ask screen; notes the header; sees the empty-state guidance.
- **System does:** the **posture header** shows three greens — `reasoner · tools · medical`, all local (Law 1) — proving nothing is configured to leave the device. The empty state does **not** show a dead dashboard; it explains what ayuOS is and offers the two obvious next actions: **import an Apple Health export** or **connect a wearable**, each linking to its flow. Ask accepts a question immediately (he can ask "what can you do?" and get a grounded answer about capabilities and the loop).
- **Value returned this step:** the empty app is *self-explaining and actionable* — it hands him the next best step instead of a blank canvas or an onboarding checklist. Three green pills are a concrete, visible receipt for the trust decision he made in Step 1.
- **Modality:** local web app (text/voice Ask input).
- **UX constraints / laws:** Law 1 (posture always on screen, three greens here), Law 5 (fast to the first question), empty-state rule (offer the next best action, never a dead end), Law 8 (data over chrome — the interface recedes even when empty).

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Read the trust claim and licence | A claim he can *falsify* later on his own hardware — not a promise to trust |
| 2 | Choose a deployment posture | Legible trade-off; certainty about which risk posture he's in; no lock-in |
| 3 | Install Homebrew / Ollama / Postgres | Standard, independently-auditable components — the install is part of the transparency |
| 4 | Wait ~tens of minutes for ~13 GB of models | A narrated explanation of the three-role model architecture during the wait |
| 5 | Answer a few setup prompts (or defer) | A fully-provisioned, queryable store + seeded catalogue before any data exists |
| 6 | Run `ayu start` | A running, private, offline instance bound to loopback — the claim, demonstrated |
| 7 | Look at an empty app | Three green posture pills (receipt for the trust decision) + the two best next actions |

## UX & modality constraints

- **Input modality:** CLI for install/run (`ayu setup`, `ayu start`); the app itself is a local web app on `http://localhost:4000` with text **and** voice Ask input.
- **Latency:** the model pull is the one honest, minutes-long wait — surfaced with size and ETA, one-time. Everything after (`ayu start`, first Ask render) is fast; *reasoning* answers stream over seconds once real data exists.
- **Offline:** first-class. Internet is required *once* for downloads; the running product needs none. Pulling the cable is a supported test, not a failure.
- **Empty/error states:** the empty Ask screen is self-explaining and offers the next best action (import / connect) — never a dead dashboard.
- **Color semantics:** the three green posture pills (Law 1) are the dominant signal of this journey — green = local = "this did not leave your machine." No amber appears anywhere in a default self-hosted install.
- **Accessibility:** posture is conveyed by label text (`reasoner · tools · medical` + local/cloud), not colour alone; the monospace faces carry commands, model names, and paths.
- **Binding laws:** **Law 1** (posture on screen), **Law 5** (fast to first question), **Law 6** (tier shown with its fallback), plus the reciprocity rule (every setup ask returns value or is deferrable).

## Where it can break (and the fallback)

!!! warning "Model pull interrupted"
    A dropped connection mid-download does not corrupt anything — Ollama resumes the pull on the next `ayu setup`, re-fetching only what's missing. No re-provisioning of the database is needed; `setup` is idempotent per phase.

!!! warning "Only 16 GB of RAM"
    All three models loaded at once need ~19–21 GB, which is tight or impossible at 16 GB. The documented mitigation is **lightweight scheduling** — smaller model variants and loading a single model at a time rather than all three concurrently (see [Deployment open questions](../deployment.md)). The instance still runs; the trade is slower role-switching, never lost capability (Law 6).

!!! warning "Port 4000 already in use"
    `ayu start` detects the conflict and reports it plainly rather than failing silently; the bound port is configurable so he can point the local web app elsewhere. Nothing about the loopback-only guarantee changes.

!!! warning "Ollama not running / Postgres down"
    `ayu start` checks both before starting the core and refuses to come up half-broken — it names exactly which dependency is missing and what to start. Connectors and the agent [fail loudly and degrade gracefully](../tiers.md) as a rule; the startup checks are the same principle applied to the runtime itself.

!!! note "FileVault not enabled"
    Encryption at rest is the user's responsibility; ayuOS **checks at startup and warns** if full-disk encryption is off ([Security](../security.md)). The app still runs — the warning is honest, not a gate.

!!! note "No background phone-home"
    There is nothing to break here, because there is nothing running. ayuOS makes **no background
    update check or telemetry call** — updates happen only when Ravi runs `ayu update` himself, and
    telemetry is off by default in every tier ([Security](../security.md)). A firewall that blocks
    the process outbound leaves every local workflow intact; that is the check he was promised in
    Step 1, now trivially performable.

## What good looks like

- Ravi reaches a running instance and can **articulate the trust claim in his own words** — architectural, not policy — because the spec let him verify it, not just read it.
- The header shows **three green pills** and he understands what each role is, because `ayu setup` narrated it during the download.
- The empty app never feels dead: it tells him the next best action (import Apple Health, connect a wearable) instead of demanding an onboarding tour.
- **Nothing has left the machine.** He could unplug the network right now and everything he just set up still works — the whole install produced a private, offline instance.

## Related

- [Deployment & Infrastructure](../deployment.md) — hardware, the stack, `ayu setup` / `ayu start` / `ayu update`
- [Tiers & Fallbacks](../tiers.md) — the three axes and the fallback guarantee
- [Security & Privacy](../security.md) — loopback binding, egress posture, verifying the claim
- [Vision & Problem](../vision.md) — the trust claim and why self-hosting is a choice, not the definition
- [Frontend & UI](../frontend.md) — the local web app, Ask, the posture header
- [ADR-0002 — Clinical data store](../adr/0002-clinical-data-store.md) — the four Postgres schemas
- **Next journeys:** [03 — Bootstrap with an Apple Health export](03-apple-health-bootstrap.md) · [04 — Connect direct wearables](04-connect-wearables.md) · [09 — "What changed in my last 90 days?"](09-anchor-query.md)
- **The no-server alternative:** [02 — ayuOS Cloud](02-managed-cloud.md)
