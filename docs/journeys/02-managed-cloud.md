# Journey 02 — The no-server path — ayuOS Cloud

> **Who:** Priya, 41 (she/her) — Ravi's sister; wants the capability, will never run a server ·
> **Intent:** the synthesis and the doctor packet without hardware or a terminal ·
> **Entry surface:** a browser, at the ayuOS Cloud sign-up page ·
> **Egress posture:** 🟠 managed — data lives on operated infrastructure under a *policy* guarantee, not the self-hosted tier's *architectural* one ·
> **Primary modality:** the same web app as everyone else, over HTTPS.

## The intent

Priya watched Ravi get a real answer out of his own labs and wearables and wanted the same thing —
"what's actually going on with me, and what should I do about it?" — but she is never going to buy
a Mac Mini, pull model weights, or debug an OAuth refresh. She is not anti-privacy; she just draws
the line at running infrastructure. She is the reason ayuOS Cloud exists: **self-hosting is a choice
about risk posture, not a prerequisite for using the product at all.** What she needs from this
journey is to get in fast *and* to be told plainly what she is trading, so the choice is hers with
eyes open rather than a thing she finds out later.

## Preconditions

- Nothing on Priya's side — no install, no hardware, no CLI. That is the entire point of this tier.
- She has a browser and an email address. She has, at most, a health file or two she can upload
  (an Apple Health `export.zip`, a lab PDF) — but even those can wait; the account works empty.
- Contrast established in [Journey 01](01-install-self-hosted.md): the self-hosted path Ravi took.
  This journey is the fork *away* from that, made legible.

## Walkthrough

### Step 1 — The fork: self-hosted or managed

- **User intent here:** decide whether to run it herself or let someone operate it — and understand
  what that choice actually costs before making it.
- **User does:** opens the sign-up page and reads two options rendered side by side: *Self-hosted
  (free, MIT, runs on your hardware)* and *ayuOS Cloud (subscription, we operate it)*.
- **System does:** shows each tier **beside its trade**, not as a pricing upsell. The managed card
  states, in the same breath as its benefit: *"We run Postgres, the models, and the connectors for
  you. Your data lives on our infrastructure — a promise backed by our business model, not the
  physics of a machine you control."* The free tier's stronger, architectural claim is shown right
  next to it, unhidden.
- **Value returned this step:** she learns the real shape of the decision in ten seconds, without a
  sales funnel — including that the thing she is giving up (the architectural guarantee) is real and
  named, not buried.
- **Modality:** web, read-only comparison; no account required to see it.
- **UX constraints / laws:** **Law 6** dominates — a tier is never shown without its fallback. The
  managed option is [amber](../design-system.md#interaction-laws) by nature; the page does not
  pretend otherwise.

!!! abstract "The weaker claim, stated once, plainly"
    ayuOS Cloud is a **policy** guarantee backed by an operator, not the self-hosted tier's
    **architectural** guarantee (the absence of any network path). Your data lives on
    ayuOS-operated infrastructure under published commitments — never sold, never used for model
    training, never shared. That is *stronger* than every competitor, because the revenue is a
    subscription and does not point at your data — but it is **not the same claim**, and this page
    says so rather than blurring it. See [Tiers — Axis 1](../tiers.md#axis-1-deployment).

### Step 2 — Sign up in the browser, in minutes

- **User intent here:** get in and start, without an install ritual.
- **User does:** enters email, sets up the account, picks a plan. A few minutes, entirely in the
  browser.
- **System does:** provisions her **own tenant** and drops her straight onto **Ask**, cursor ready —
  the *same application* Ravi runs, served over HTTPS instead of `http://localhost:4000`. There is no
  separate "cloud UI": the managed tier runs the same MIT core, so the product she sees is byte-for-
  byte the product the spec describes everywhere else.
- **Value returned this step:** a working instance open on a question box, in the time it takes to
  make an account — no hardware, no terminal, no weights to download.
- **Modality:** web sign-up form → the standard **Ask** home.
- **UX constraints / laws:** **Law 5** — fast to the first question; the app opens on Ask, not a
  setup wall. **Law 1** — the three-role posture indicator (`reasoner · tools · medical`) is in the
  header from the first screen, so she can always see where her inference runs.

### Step 3 — Add a record, get a real answer back

- **User intent here:** confirm this is worth it before investing any more effort.
- **User does:** uploads one file she already has — an Apple Health `export.zip` or a single lab PDF —
  and types a real question ("is anything in here off?").
- **System does:** parses the file into her tenant and answers over it, streaming a grounded,
  evidence-labeled synthesis. If that synthesis routes to an external model, the **PII gateway still
  enforces** on the way out — the same single egress chokepoint that runs in the self-hosted tier,
  stripping PII and writing a ledger row — and the pre-send posture is visible before it leaves.
- **Value returned this step:** one upload buys a real answer to a real question, immediately — the
  reciprocity rule holds even here. And she has just watched the privacy machinery work on her own
  data, not read about it.
- **Modality:** drag-and-drop upload + text (or voice) on Ask; streamed markdown answer with tappable
  evidence labels.
- **UX constraints / laws:** **Law 3** — every claim carries an evidence label. **Law 4** — egress is
  previewed, never assumed, even inside the managed tier. Local inference (and cloud inference alike)
  is not instant: the answer streams over seconds.

!!! note "What is identical to the self-hosted tier — not marketing, spec"
    None of these is withheld from her because she chose managed:

    - **The same MIT core.** No feature is cloud-exclusive as a lock-in mechanism
      ([Governance — Sustainability](../governance.md#sustainability)).
    - **The PII gateway still enforces** on any call leaving to an external model — unbypassable in
      the code path, not a toggle.
    - **The call ledger still records everything** — every model call, full payload — stored in *her
      own tenant* and [exported with her data](../ai-transparency.md#3-call-ledger).
    - **Never sold, never used for training, never shared.** Any tier, any add-on.
    - **Full export, any time, in open formats.** No tier can strand her data.

### Step 4 — Audit her own tenant's ledger

- **User intent here:** check, not trust — see what has actually left for an external model.
- **User does:** opens **Transparency** and filters the [call ledger](../ai-transparency.md#3-call-ledger)
  — *has anything gone to a cloud provider, and what was in it?*
- **System does:** shows every model call in her tenant with provider, destination, the redaction
  diff, and the full retained payload — the same ledger surface a self-hoster gets, scoped to her
  data.
- **Value returned this step:** she can verify the disclosure surfaces against her own record — three
  of the four checks a self-hoster can run ([Verifying it yourself](../ai-transparency.md#verifying-it-yourself))
  work here too.
- **Modality:** the Transparency ledger view — filterable, queryable, per-payload.
- **UX constraints / laws:** **Law 1 / Law 4** again — posture on screen, egress on record. The ledger
  is append-only and never transmitted anywhere.

!!! warning "The one limit she accepts"
    Priya can audit **her own tenant's ledger** — what was sent, where, and stripped how. She
    **cannot audit the running instance's code** the way a self-hoster can (block the process at the
    firewall, diff the binary against the public source). That fourth verification requires custody
    of the machine, and in the managed tier ayuOS holds it. This is the difference between the
    tiers, stated where it bites — see [AI Transparency](../ai-transparency.md#verifying-it-yourself).
    It is the price of every ops step she skipped, and she is choosing it knowingly.

### Step 5 — The exit is built in, from day one

- **User intent here:** confirm that leaving later is cheap — before she has more to lose.
- **User does:** opens **Settings → export** and sees a one-action full export of everything, ledger
  included, in open formats.
- **System does:** confirms the fallback in writing: because the cloud tier runs the *same open core*,
  moving off it is a **migration, not a rewrite**. If she cancels, or ayuOS Cloud shuts down, she
  falls back to the self-hosted tier with the same code and her full data — she loses *the hosting*,
  not the software, not the data, not any feature or history.
- **Value returned this step:** the safety that makes the whole choice reversible — she committed to a
  weaker claim, but not to a one-way door.
- **Modality:** Settings export + a plain-language fallback summary.
- **UX constraints / laws:** **Law 6** — the tier is shown beside its fallback, at the moment it
  matters most. Lock-in is not permitted as a retention mechanism
  ([Governance — Sustainability](../governance.md#sustainability)).

## Exchange ledger

| Step | What we ask of Priya | What she gets back immediately |
|---|---|---|
| 1 | Read the two options and their trade-offs | The real shape of the decision in seconds, with the weaker claim named, not hidden |
| 2 | Email + a few minutes in a browser | Her own tenant, provisioned, open on **Ask** — no hardware, no CLI, no weights |
| 3 | Upload one file she already has | A grounded, evidence-labeled answer to a real question, PII gateway visibly enforcing |
| 4 | Open the ledger and filter it | Proof, on her own record, of exactly what left the device and what was stripped |
| 5 | (Nothing — she just looks) | A one-action full export and a written guarantee that leaving costs only the hosting |

## UX & modality constraints

- **Input:** web only — the same app as self-hosted, over HTTPS. Text and voice on Ask; drag-and-drop
  file upload; the Transparency ledger and Settings export are the two surfaces unique to this
  journey's beats.
- **Latency:** inference streams over seconds; a first upload parses in the background while the app
  stays usable. Nothing about "managed" makes synthesis instant.
- **Offline:** **not** a first-class state here, unlike self-hosted. The managed tier is a hosted web
  app; it needs the network. This differs from Ravi's and Maya's tiers, and the spec
  does not pretend otherwise.
- **Empty state:** a brand-new tenant with no data still opens on Ask and offers the next best action
  (upload a file, connect a source) — never a dead-end dashboard.
- **Color semantics:** her posture skews **amber** by construction — data on operated infrastructure,
  and inference that may route to a cloud model — but amber is *never silent*: the posture indicator
  and the ledger make every crossing legible. Green still appears for any role kept local.
- **Dominant laws:** **Law 6** (tier beside fallback), **Law 4** (egress previewed and recorded),
  **Law 1** (posture always on screen), **Law 5** (fast to first question).

## Where it can break (and the fallback)

- **She decides the policy guarantee isn't enough.** Expected, and supported: she exports everything
  in one action and migrates to self-hosted — the *same core*, her *same data* — trading the
  convenience back for the architectural guarantee. See
  [Journey 08](08-switch-connectors.md) and [Journey 14](14-verify-and-maintain.md).
- **ayuOS Cloud shuts down or she cancels.** The [fallback guarantee](../tiers.md#the-fallback-guarantee)
  covers exactly this: she falls back to self-hosted with a full export. She loses the managed hosting
  — not the software, the data, or the history.
- **A connector she set up in her tenant breaks.** Connectors fail loudly and degrade gracefully; the
  agent still answers over everything already stored. The broken source is what's missing, not the
  system.
- **She wants a guarantee the managed tier structurally cannot give** — that the code her data runs on
  is the audited public source. It cannot, and the UI says so (Step 4's warning) rather than implying
  otherwise. Her options are: accept the policy guarantee, or migrate to self-hosted.

## What good looks like

- Priya is answering real questions about her own health within minutes, having never opened a
  terminal — and she can say precisely what she traded to get there.
- She understands, without being upsold or misled, that hers is a *policy* guarantee, not an
  architectural one — and that the ledger, the PII gateway, the MIT core, and full export are hers all
  the same.
- The exit is visibly cheap: she knows that leaving costs the hosting and nothing else, which is what
  makes staying a real choice rather than a trap.

## Related

- [Tiers & Fallbacks](../tiers.md) — [Axis 1 · Deployment](../tiers.md#axis-1-deployment),
  [the fallback guarantee](../tiers.md#the-fallback-guarantee),
  [what every tier shares](../tiers.md#what-every-tier-shares)
- [AI Transparency](../ai-transparency.md) — the [call ledger](../ai-transparency.md#3-call-ledger)
  and [verifying it yourself](../ai-transparency.md#verifying-it-yourself)
- [Governance](../governance.md) — [why MIT](../governance.md#why-mit) and
  [sustainability](../governance.md#sustainability) (the no-feature-gating commitment)
- [Security & Privacy](../security.md) — the managed tier stated as a distinct posture
- [Vision — the problem](../vision.md#the-problem) the managed tier removes the hardware barrier for
- Adjacent journeys: [01 — self-hosted first run](01-install-self-hosted.md) (the fork she chose
  *against*), [08 — switch & lose a connector](08-switch-connectors.md),
  [14 — verify & maintain](14-verify-and-maintain.md) (migrate and prove it)
