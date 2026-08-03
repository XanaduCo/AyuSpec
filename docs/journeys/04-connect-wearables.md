# Journey 04 — Connect direct wearables — Oura & Whoop

> **Who:** Ravi Mehta, 45 (he/him) · **Intent:** get his only daily-updating signals — HRV, sleep, readiness, strain — flowing in, *direct* and zero-transit · **Entry surface:** Data sources · **Egress posture:** 🟢 green — self-hosted [Open Wearables](../open-wearables.md), no vendor holds the data · **Primary modality:** connector cards (PAT paste + OAuth redirect)

## The intent

Ravi has a frozen record. His Apple Health export gave him years of history in one shot, but it's a
*snapshot* — the moment he generated `export.zip` and nothing after. What he actually wants is the
one class of signal that updates every morning: heart-rate variability, sleep architecture, Oura
readiness, Whoop strain. He owns both rings-and-straps. He wants that stream landing in his own
store on his own machine — **not** parked in Oura's cloud dashboard and Whoop's app, each a silo
with its own closed AI score he can't inspect. The job he's hiring ayuOS for here: *"turn my two
wearables into a live feed I own, without routing it through anyone."*

## Preconditions

- ayuOS is installed and running self-hosted on his Mac Mini — [Journey 01](01-install-self-hosted.md).
- His record is bootstrapped from an Apple Health export, so he already has a **static, one-time
  snapshot** of wearable-style metrics (the export path — [Journey 03](03-apple-health-bootstrap.md)).
  This journey turns that snapshot into a live stream.
- **Docker is available.** Open Wearables is the one component that needs it; the rest of ayuOS does
  not (see [Deployment](../deployment.md)).
- He owns **Oura** (Personal Access Token, self-serve) and **Whoop** (OAuth). Both are ungated
  direct providers — no developer agreement required ([Open Wearables](../open-wearables.md#device-support-for-ayuos-users)).

!!! note "Direct here means direct"
    Open Wearables is **self-hosted** — the service runs on his own loopback interface. Oura and
    Whoop data flows *from the vendor API into his machine and nowhere else*. That is why every card
    in this journey is **green**, including the Whoop OAuth one. OAuth is an authorization handshake,
    not a bridge — no third party ever holds the payload. Contrast [Journey 07](07-add-bridged-connector.md),
    where a *bridge* (Terra) genuinely transits the data and the card turns amber.

## Walkthrough

### Step 1 — Open **Data sources** and pick the direct path

- **User intent here:** see the menu of ways to connect a wearable, and which are zero-transit,
  before committing anything.
- **User does:** clicks **Data sources** in the sidebar. The page lists connector cards grouped by
  tier: **Direct (Open Wearables)** and **Bridged (Terra, paid)**.
- **System does:** renders every ungated provider Open Wearables supports (Oura, Whoop, Polar,
  Fitbit, Google, …) with a green **DIRECT · zero-transit** badge. Gated devices (Garmin, Dexcom)
  appear greyed under **Bridged**, labeled *"needs Terra Bridge — [Journey 07](07-add-bridged-connector.md)."*
  If the Open Wearables container isn't up yet, the Oura/Whoop cards show an **empty state** with the
  exact one-liner to start it — `ayu start` (which brings up Open Wearables if configured) — not a
  dead end.
- **Value returned this step:** he sees the *entire* direct catalogue and the transit posture of each
  option in one glance — and learns his two devices are both on the free, zero-transit path — before
  typing a single token.
- **Modality:** tap / connector cards.
- **UX constraints / laws:** the tier is never shown without its fallback (Law 6) — direct and
  bridged sit side by side. Green marks *"this will not leave your machine"* (color language). Empty
  states offer the next action, never a dead end.

### Step 2 — Connect **Oura** with a Personal Access Token

- **User intent here:** the fastest possible connect — Oura's PAT is self-serve and instant, no app
  review.
- **User does:** clicks **Connect Oura**. The card links him to Oura's account page where he
  generates a Personal Access Token, copies it, and pastes it into the token field on the card.
- **System does:** Open Wearables stores the PAT **locally** (loopback only), validates it against
  the Oura Cloud API v2, and immediately kicks off a **backfill** — sleep, readiness, activity, heart
  rate, HRV, SpO₂, temperature. Each metric lands as a FHIR `Observation` with a LOINC code where one
  exists ([Wearables ingestion](../ingestion/wearables.md#oura)).
- **Value returned this step:** the *instant* he pastes the token, months of Oura history stream in.
  The card flips green and shows `last sync: just now`, per-signal record counts (e.g.
  `sleep 214 · HRV 214 · readiness 214`), and a sparkline. Effort in, data back, same step.
- **Modality:** paste (token) → card.
- **UX constraints / laws:** the token never leaves the device — green (color language). Measured
  values render in tabular monospace (Law 8). Reciprocity: the ask (generate + paste a token) is paid
  back with a visible backfill, not a "we'll sync overnight."

### Step 3 — Connect **Whoop** over OAuth

- **User intent here:** authorize Whoop without handing his Whoop *password* to anything, and confirm
  this is still direct.
- **User does:** clicks **Connect Whoop**. ayuOS redirects him to Whoop's own consent screen; he logs
  in *at Whoop*, reviews the scopes (recovery, strain, sleep, HRV, respiratory rate), and approves.
  Whoop redirects back to `localhost:4000`.
- **System does:** the OAuth token exchange completes **through his self-hosted Open Wearables
  service** — access + refresh tokens land locally, never with ayuOS-the-company (there is no
  ayuOS-the-company in a self-hosted install). Backfill starts: recovery score, strain, sleep, HRV,
  respiratory rate. The card is **green**, not amber.
- **Value returned this step:** Whoop recovery and strain — signals the Apple Health snapshot never
  had — appear on the card within seconds, and he's confirmed the handshake is an authorization, not
  a data bridge. Same green posture as Oura.
- **Modality:** OAuth redirect (browser) → card.
- **UX constraints / laws:** OAuth ≠ bridge — the card stays green because no third party retains the
  payload (color language, Law 6). Posture indicator in the header never flips amber for this connect
  (Law 1). The consent screen is Whoop's own, and the scopes are shown before approval.

### Step 4 — Set the schedule — **pull, don't push**

- **User intent here:** decide how fresh he wants the data, without signing up for an always-on
  background daemon phoning out.
- **User does:** on each card, sets a pull cadence — **daily** (the default) or **on-demand** — and
  notes the **Sync now** button.
- **System does:** schedules a pull on his chosen cadence; there is **no always-on push listener**.
  Connectors run on a user-configured schedule or when he hits **Sync now** ([Ingestion design
  principles](../ingestion/index.md#design-principles)). A manual **Sync now** returns fresh rows
  immediately.
- **Value returned this step:** control over his own cadence, and an on-demand button that pays back
  instantly — press it, watch the record count tick up. The stream is his to pace, not a vendor's to
  drive.
- **Modality:** tap / toggle.
- **UX constraints / laws:** pull-don't-push is a sovereignty property, not just a scheduling one — no
  process reaches out unless he tells it to. Offline is first-class: if the Mac is asleep, the pull
  simply resumes; nothing is lost.

### Step 5 — **Own the scores**

- **User intent here:** not be locked to Oura's and Whoop's closed, proprietary AI scores — he wants
  numbers he can inspect and reproduce.
- **User does:** opens a metric on the Oura card (e.g. **Readiness**) and sees two rows: Oura's
  vendor score, and **ayuOS's own recomputed metric** from the raw HRV / resting-HR / temperature
  signals.
- **System does:** stores the **raw signals**, and recomputes its own derived metrics rather than
  depending on the vendor's black box — the [own-the-scores principle](../data-capture.md#wearables-home-devices).
  The vendor score is kept too, labeled as *the vendor's*, so he can compare.
- **Value returned this step:** he's no longer hostage to a closed algorithm that can change silently
  with an app update. If Oura re-weights readiness overnight, his own longitudinal metric stays
  consistent — and he can see exactly how it's computed.
- **Modality:** tap (drill into a metric).
- **UX constraints / laws:** honesty over decisiveness — the vendor score is shown *as the vendor's*,
  not passed off as ground truth. Values in monospace with their derivation inspectable (Law 8).

### Step 6 — First value: the live stream reaches **Timeline** and **Ask**

- **User intent here:** confirm the whole point — that his frozen snapshot is now a moving feed he can
  ask questions over.
- **User does:** opens **Timeline**, zooms the HRV and sleep tracks to the last week; then goes to
  **Ask** and types *"How has my HRV trended since I connected Oura, and did strain track it?"*
- **System does:** the Timeline now shows **fresh daily points** past the old export date — the static
  Apple Watch snapshot from [Journey 03](03-apple-health-bootstrap.md) is visibly *superseded* by a
  live stream, with the two Oura/Whoop sources deduplicated against the Apple Health rows
  ([dedup policy](../ingestion/wearables.md#deduplication)). The agent answers **locally** over the
  streamed rows, overlaying HRV and strain, each claim carrying a source-backed evidence label.
- **Value returned this step:** the loop closes — effort across five steps returns a living, queryable
  signal. This is the stream every later experiment reads from ([Journey 11](11-run-experiment.md)).
- **Modality:** Timeline (zoom/overlay) → Ask (text).
- **UX constraints / laws:** three greens in the header — reasoner · tools · medical all local (Law
  1). A synthesis answer *streams over seconds*, not instantly — honest local-inference latency.
  Every claim is tappable to its source (Law 3).

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Open Data sources, choose a path | The whole direct catalogue + each option's transit posture, before committing anything |
| 2 | Generate an Oura PAT, paste it in | Months of Oura sleep/HRV/readiness backfill + green card with live record counts |
| 3 | Approve Whoop's OAuth consent | Recovery + strain + respiratory rate (new signals) land locally, card stays green |
| 4 | Choose a pull cadence | Control of the schedule + a **Sync now** button that returns fresh rows on demand |
| 5 | Drill into a metric | ayuOS's own recomputed score beside the vendor's — no longer locked to a black box |
| 6 | Ask one question | A live, evidence-labeled answer over the now-streaming HRV/strain — snapshot becomes stream |

## UX & modality constraints

- **Input modalities:** connector cards, a token paste (Oura), an OAuth browser redirect (Whoop), a
  cadence toggle, and finally Timeline + Ask. No file upload in this journey.
- **Color semantics dominant here:** **green throughout.** Both connectors are direct and zero-transit;
  the Whoop card stays green *despite* the OAuth redirect, because Open Wearables is self-hosted and no
  vendor retains the payload. Amber would appear only on the bridged path ([Journey 07](07-add-bridged-connector.md)).
- **Laws that bind this journey:** Law 1 (posture indicator stays three-green), Law 6 (direct shown
  beside its bridged fallback), Law 8 (monospaced tabular values on every card). Law 4 barely applies —
  nothing egresses, so there is nothing to preview.
- **Latency:** backfill of months of data streams over seconds-to-minutes per provider; the card shows
  progress, not a spinner-to-completion wall. The synthesis answer in Step 6 streams over seconds
  (local inference is not instant).
- **Offline:** first-class. A scheduled pull that can't reach the vendor API (no network) simply logs
  and retries next cadence; the agent keeps answering over stored rows in the meantime.
- **Empty / error states:** every card that can't sync shows *why* and the next action — never a bare
  failure.

## Where it can break (and the fallback)

!!! warning "Fail loudly, degrade gracefully"
    A broken connector logs an error and **skips**; it never blocks the agent from answering over
    what's already stored ([design principle](../ingestion/index.md#design-principles)).

| Failure | What Ravi sees | Fallback |
|---|---|---|
| **Open Wearables container down** (Docker not running) | Oura/Whoop cards show an empty state: *"Open Wearables isn't running — `ayu start`."* | Every *other* source (Apple Health, Epic, files) is unaffected; the agent answers over stored data. Bringing the container up resumes pulls. |
| **Whoop OAuth refresh fails** (token expired/revoked upstream) | The Whoop card turns to an error state with a **loud** log entry and last-good-sync timestamp; a **Reconnect** button re-runs the OAuth flow. | The agent still answers over **stored Whoop history** — the stream stalls, the record doesn't vanish. Fresh data resumes on reconnect. |
| **Oura token revoked** (he rotated it at Oura) | Card flags `auth failed`; prompts for a new PAT. | Historical Oura rows stay in the store; paste a new token to resume. |
| **Provider API hiccup** (Oura/Whoop 5xx) | Card shows `sync failed — will retry`; the pull-don't-push scheduler retries next cadence. | No user action needed; stored data remains queryable throughout. |
| **He wants a gated device** (Garmin, Dexcom) | Those cards are greyed under **Bridged**, not offered as direct. | This is not the direct path — it's the **paid Terra Bridge**, with its own consent ([Journey 07](07-add-bridged-connector.md)). Losing/declining it costs *breadth*, never the store (Law 6). |
| **He replaces or drops a device** | — | Connectors are independent; removing one doesn't touch the others, and history stays ([Journey 08](08-switch-connectors.md)). |

## What good looks like

- **The snapshot becomes a stream.** The Timeline HRV/sleep tracks now extend past the Apple Health
  export date with fresh daily points — the single clearest signal that the record is *alive*.
- **Two connects, two green cards, zero amber.** Ravi understands — because the interface showed him —
  that a self-hosted OAuth connect is still direct, and that the only amber path is a bridge he hasn't
  taken.
- **He owns the scores.** He can see ayuOS's own readiness/HRV metric beside the vendor's, computed
  from raw signals he can inspect — the opposite of a locked dashboard.
- **The feed powers the loop.** This stream is what every later n-of-1 experiment measures against
  ([Journey 11](11-run-experiment.md)); connecting it is the moment the *measure* side of the loop
  turns on.

## Related

- [Open Wearables](../open-wearables.md) — the self-hosted ingestion layer, provider support, Terra comparison
- [Wearables ingestion](../ingestion/wearables.md) — Oura (PAT), Whoop (OAuth), schedules, deduplication
- [Ingestion — overview](../ingestion/index.md) — pull-don't-push, adapters-not-interfaces, fail-loudly
- [Data capture strategy](../data-capture.md) — why wearables are the only daily-updating signal; own-the-scores
- [Tiers & fallbacks](../tiers.md) — Axis 3: direct vs bridged connections
- **Adjacent journeys:** [03 — Apple Health bootstrap](03-apple-health-bootstrap.md) (the snapshot this supersedes) · [07 — Add a bridged connector](07-add-bridged-connector.md) (the amber path for gated devices) · [08 — Switch & lose a connector](08-switch-connectors.md) (the fallback in action) · [11 — Run an n-of-1 experiment](11-run-experiment.md) (what reads this stream)
