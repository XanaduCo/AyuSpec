# Journey 14 — Verify sovereignty & live with it — ledger, updates, durability

> **Who:** Maya (verifies) · both personas (maintain & endure) · **Intent:** prove the privacy claim without ayuOS's cooperation, then keep the system healthy for years · **Entry surface:** Settings → Transparency → CLI · **Egress posture:** 🟢 Sovereign (Maya, all three roles local) · **Primary modality:** CLI + Transparency (call ledger) + direct Postgres

## The intent

The first thirteen journeys got Maya's record built and her experiments running. This one is about the thing she chose ayuOS *for*: not trusting the privacy claim, but **checking it** — herself, adversarially, without asking the app to cooperate. Then both personas settle into the boring, load-bearing part of ownership: updating the system without losing a day of use, surviving a connector that breaks, and getting a small nudge back every so often so the record stays alive. The job she's hiring ayuOS for here is *durability she can audit* — a record no vendor can strand and a guarantee she can reproduce on a Tuesday night with `tcpdump`.

## Preconditions

- Maya has a working self-hosted install with data in it — see [01 — Install self-hosted](01-install-self-hosted.md) and [03 — Apple Health bootstrap](03-apple-health-bootstrap.md).
- All three model roles are (or are about to be) set local. Maya has never opted into a cloud reasoner.
- She has run the workflows she wants to verify at least once: the [anchor query](09-anchor-query.md), an [n-of-1 experiment](11-run-experiment.md), a [doctor packet](13-share-doctor-packet.md).
- Comfort with a terminal, `psql`, and a packet sniffer (`tcpdump`) or a per-app firewall (Little Snitch). This journey assumes the [sovereign configuration](../tiers.md#worked-configurations); the cloud-tier caveat is called out in the last step.

---

## Walkthrough

!!! abstract "Three arcs"
    **Verify** (Steps 1–4, Maya) — prove the sovereign claim adversarially, without the app's help.
    **Maintain** (Steps 5–6, both) — update with zero downtime; survive a broken connector.
    **Endure** (Steps 7–8, both) — the due-date nudge as ongoing value; the export door that no vendor can lock.

### Step 1 — Confirm the posture the app claims

- **User intent here:** before testing the claim, read what the app says the claim *is* right now.
- **User does:** opens the header status indicator; all three roles read `reasoner · tools · medical` in green (`ollama · local`).
- **System does:** renders **resolved runtime state**, not the config file — if a cloud provider were configured but unreachable and a call had fallen back to local, it would show what actually ran (Law 1). Three greens mean no health data leaves the device for any role.
- **Value returned this step:** a one-glance, always-on answer to "what is my posture," with no settings page to open. This is the assertion she is about to try to break.
- **Modality:** tap the header indicator.
- **UX constraints / laws:** Law 1 (posture always on screen); green = local, `#1F8A5B` ("this did not leave your machine"). See [AI Transparency — status indicator](../ai-transparency.md#1-status-indicator).

### Step 2 — Cut the network and run everything anyway

- **User intent here:** prove that in full-local config, the workflows do not merely *avoid* the network — there is no network path to avoid.
- **User does:** pulls the Ethernet cable (or blocks the ayuOS process in Little Snitch), then runs the anchor query, opens a running experiment, and generates a doctor packet — fully offline.
- **System does:** every workflow completes. Local inference streams over seconds — visibly not instant, with no spinner that implies a round-trip. Offline is a **first-class state**, not an error; nothing shows a "reconnect" banner because nothing needed the connection.
- **Value returned this step:** she has personally confirmed the first of the four self-checks — *nothing leaves in the full-local config* — without taking this page's word for it.
- **Modality:** physical cable / firewall + normal in-app use.
- **UX constraints / laws:** offline is first-class (self-hosted tier); latency stated plainly (synthesis streams over seconds). This is self-check #1 from [Verifying it yourself](../ai-transparency.md#verifying-it-yourself).

### Step 3 — Reconcile the packet capture against the ledger

- **User intent here:** the strongest test — does the ledger match reality, byte for byte of intent?
- **User does:** runs `sudo tcpdump -i any -n host not 127.0.0.1` alongside ayuOS while she uses it for an hour, then compares the captured outbound connections against `ayuos.model_calls`.
- **System does:** in the sovereign config, the capture shows **zero** off-loopback connections and the ledger shows **zero** rows with `left_device: true` — the two nulls agree. To test the positive case, she temporarily points the reasoner at a cloud API, sends **one** query through the [pre-send review](../ai-transparency.md#2-pre-send-review), and confirms the invariant holds in the other direction: exactly one new outbound connection, exactly one new ledger row, and **no row without a connection and no connection without a row**.
- **Value returned this step:** self-check #2 confirmed. The ledger is not a story the app tells about itself; it is a faithful index of the socket activity she can see from outside the app.
- **Modality:** CLI (`tcpdump`) + Transparency view + a single deliberate cloud call.
- **UX constraints / laws:** Law 4 (egress previewed, never assumed) — the one cloud call showed the exact payload, redaction diff, destination, and what was withheld *before* it left; amber `#B57400`, never silent. The chokepoint guarantees a provider client with no ledger entry has no transport. See [enforcement lives here](../ai-transparency.md#where-enforcement-lives) and the [egress table](../security.md#egress-posture-is-a-configuration-not-a-fixed-property).

### Step 4 — Query the ledger directly, as a Postgres table

- **User intent here:** answer "has anything *ever* gone to OpenAI?" without trusting a UI filter — go to the source.
- **User does:** opens `psql` and runs `select count(*) from ayuos.model_calls where provider = 'openai';`
- **System does:** returns `0`. The ledger is a plain table in the `ayuos` schema — append-only, retained in full (payload and response, not just a hash), never transmitted anywhere. She can equally ask *what left the device last month and what did it cost*, or *show me every payload where the gateway found zero PII* (the interesting case — usually under-detection, not a clean payload).
- **Value returned this step:** the trust claim is **checkable in SQL she owns**, not a dashboard she has to believe. The record and the audit trail live in the same database, on her disk.
- **Modality:** direct `psql` query.
- **UX constraints / laws:** the ledger is queryable, not just viewable — [call ledger](../ai-transparency.md#3-call-ledger). Payloads retained, not hashed, because hashing on the user's own machine protects nothing and destroys the one answer that matters.

!!! abstract "The four self-checks, in her hands"
    Steps 2–4 cover three of the four from [Verifying it yourself](../ai-transparency.md#verifying-it-yourself): *nothing leaves in full-local*, *the ledger matches reality*, *stripping does what it says* (the pre-send preview compared against the timeline source in [Journey 09](09-anchor-query.md)). The fourth — *the code does what this page says* — is the MIT source itself; the [chokepoint is one module](../ai-transparency.md#where-enforcement-lives). None of the four require the project's cooperation.

### Step 5 — `ayu update`: new core, migrations, background re-embed

- **User intent here:** take an update without losing a working system or a day of use.
- **User does:** runs `ayu update` from the terminal.
- **System does:** pulls the new core, **runs database migrations**, and updates any newly-configured Ollama models. A model update is the disruptive one: it **re-embeds every stored resource**, which for a full record can take **hours**. That work runs in the **background**; the app stays fully usable on the **old embeddings** meanwhile, and search quality steps up when re-indexing finishes — no downtime, no "come back later" wall.
- **Value returned this step:** the cost is stated up front (this may run for hours) and paid in the background (she keeps using the app the whole time). No update phones home; `ayu update` is the only thing that checks for updates.
- **Modality:** CLI (`ayu update`).
- **UX constraints / laws:** latency stated up front (re-embed takes hours, app usable on old embeddings meanwhile); no background phone-home ever — see [Deployment — updates](../deployment.md#updates) and the [egress table](../security.md#egress-posture-is-a-configuration-not-a-fixed-property).

### Step 6 — A connector breaks; the agent keeps answering

- **User intent here:** find out what happens when a vendor changes an API out from under her — the thing that kills projects like this.
- **User does:** nothing at first — a scheduled sync just starts failing after a vendor-side API change.
- **System does:** the connector **fails loudly** — an error on its card in Data sources, a red count, a clear reason — and **skips**; every other connector keeps syncing and the agent keeps answering over **what is already stored**. Nothing is silently dropped, nothing blocks. When the adapter is fixed (upstream or in a point release picked up by the next `ayu update`), the source resumes. This is the same fallback machinery Maya met in [Journey 08](08-switch-connectors.md) — an adapter behind an interface, the direct lesson of the Fasten Onprem archival.
- **Value returned this step:** a broken dependency costs *that one source*, never the system or the stored history. Loud failure means she learns immediately, not on the day she needed the data.
- **Modality:** Data sources connector card (error state) + eventual `ayu update`.
- **UX constraints / laws:** connectors fail loudly and degrade gracefully; red `#C0392B` is a stop/error, not decoration. See the [fallback guarantee](../tiers.md#the-fallback-guarantee).

### Step 7 — The due-date nudge: the cheapest recurring value

- **User intent here:** keep the record alive without a diary — get told when something real is due.
- **User does:** nothing standing; weeks later a single inline nudge appears on Ask — "you're due for a TSH re-check; your last was 11 months ago" (relevant to Maya's Hashimoto's), or a screening due against age/sex/risk guidelines.
- **System does:** the screening/lab **due-date engine** runs against guidelines and the dates already extracted from her records, and surfaces at most a small nudge inline — never a modal, never a nag (Law 7). It can offer to facilitate the booking; it does not gate anything behind it.
- **Value returned this step:** the lowest-effort ongoing value in the whole product — a nudge that saves her a lapse she'd otherwise only notice at the next appointment. Reciprocity: the system did the watching so she didn't have to.
- **Modality:** inline nudge on Ask (education/reminder injects, never blocks).
- **UX constraints / laws:** Law 7 (education injects, never blocks; one per response, retires when acted on). This is the "cheapest recurring value is a reminder" principle — [Data Capture — screening history](../data-capture.md#screening-history) and [principle 8](../data-capture.md#cross-cutting-principles).

### Step 8 — Durability: export anytime, same core, no one can strand it

- **User intent here:** confirm the exit door is real before she needs it.
- **User does:** triggers a full export (open formats) and confirms it round-trips.
- **System does:** exports everything — clinical resources, timeseries, the `ayuos` app objects **including the full call ledger** — in open formats, at any time. The core is MIT; the store is Postgres schemas she owns; no vendor sits between her and her data. Losing any paid tier is a migration, never a rebuild.
- **Value returned this step:** the load-bearing promise made concrete — no tier is a dependency of the tier below it, and no company is holding her health history. Exactly the guarantee she chose ayuOS for.
- **Modality:** export (CLI or Settings) + verification.
- **UX constraints / laws:** full export at any time, in open formats; the ledger exports with the data. See [What every tier shares](../tiers.md#what-every-tier-shares) and [Why MIT](../governance.md#why-mit).

---

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Glance at the header | The exact resolved posture, no settings page |
| 2 | Pull the cable / block the process | Proof every workflow completes offline — self-check #1 |
| 3 | Run `tcpdump` for an hour, send one deliberate cloud call | The ledger reconciled against real socket activity — self-check #2 |
| 4 | Open `psql`, write one query | A definitive, source-of-truth answer to "has anything gone to OpenAI?" |
| 5 | Run `ayu update`, accept an hours-long re-embed | A current system with **zero downtime** — usable on old embeddings throughout |
| 6 | Nothing (a sync fails on its own) | A loud, scoped error and an agent that keeps answering over stored data |
| 7 | Nothing standing | A single inline nudge that saves a real lapse (a due TSH / screening) |
| 8 | Trigger one export | Confirmed exit door — full data + ledger, open formats, no vendor lock |

---

## UX & modality constraints

- **Dominant laws:** Law 1 (posture always on screen), Law 4 (egress previewed, never assumed — the single deliberate cloud call in Step 3), Law 7 (the due-date nudge injects, never blocks). Law 6 (a tier never shown without its fallback) governs Steps 6 and 8.
- **Color semantics:** green in Steps 1–2 (local), amber for the one deliberate cloud call in Step 3, red for the broken connector in Step 6. No decorative use of any reserved hue.
- **Latency:** local synthesis streams over seconds, not instantly (Step 2); a re-embed after a model update can run for **hours in the background** while the app stays usable on old embeddings (Step 5). Both are stated, never hidden behind a spinner.
- **Offline:** a first-class state in the self-hosted tier, not an error (Step 2). The verification depends on it.
- **Error/empty states:** the broken connector (Step 6) is the canonical loud-failure state — an error on the card, a red count, a reason, and graceful skip; never a silent drop and never a full-app block.
- **Accessibility:** evidence strength stays hue-free (ink-dot ramp) so verification color-language (green/amber/red) is never overloaded; ledger rows and payloads render in monospace with tabular numerals.

---

## Where it can break (and the fallback)

!!! warning "A migration needs manual attention"
    Most migrations in `ayu update` are automatic. Occasionally one needs a decision (a schema change touching data ayuOS can't transform unambiguously). It **stops and asks** rather than guessing — the update halts with a clear message and the **old version keeps running** until she resolves it. A migration is never applied silently against ambiguous data.

!!! note "The re-embed is running long"
    On a large record the post-update re-embed can run for hours. This is expected, not a hang: the app stays usable on the **old embeddings** the entire time, and only vector-search freshness lags until it completes. No workflow is blocked waiting on it.

!!! warning "The cloud-tier caveat"
    Everything above is Maya's self-hosted reality. A [managed ayuOS Cloud user](02-managed-cloud.md) (Priya) can run the first three self-checks against **her own tenant's ledger** — same append-only table, same full payloads, exported with her data — but she **cannot** run the fourth check against the running instance's code, because she is not operating it. That is the real, stated difference between the tiers: the self-hosted guarantee is architectural; the cloud guarantee is a policy backed by a subscription that does not point at the data. The spec does not blur the two — see [Security — ayuOS Cloud is a different posture](../security.md#egress-posture-is-a-configuration-not-a-fixed-property) and [Tiers — Axis 1](../tiers.md#axis-1-deployment).

!!! note "A vendor archives the product (again)"
    This already happened once — Fasten Onprem, the original EHR spine, was archived mid-2026. Because ingestion sources sit behind adapters and the store is owned (Step 8), an archived vendor costs **future retrieval from that source**, never the history already in Postgres. The fallback is the design, not a patch.

---

## What good looks like

- **Maya trusts nothing and confirms everything.** She has personally reproduced the four self-checks; the privacy claim is now something she verified, not something she read.
- **An update cost her hours of background work and zero minutes of usable time.** She updated on a weeknight and never stopped using the app.
- **A connector broke and she found out from a loud red card, not from a missing answer.** The agent kept working; she scheduled the fix on her own time.
- **The record maintains itself just enough** — a due-date nudge every few weeks keeps it current without a diary, and she knows the export door opens whenever she wants.

---

## Related

- [AI Transparency](../ai-transparency.md) — the status indicator, pre-send review, call ledger, and the four self-checks Maya runs
- [Security & Privacy](../security.md) — threat model, egress-as-configuration, verifying the claim
- [Tiers & Fallbacks](../tiers.md) — the fallback guarantee and the three shared floors
- [Deployment](../deployment.md) — `ayu update`, migrations, and the background re-embed
- [Data Capture](../data-capture.md) — the screening due-date engine as cheapest recurring value
- [Governance](../governance.md) — MIT, why the cloud tier runs the same core, export-anytime as a commitment
- [Journey 01 — Install self-hosted](01-install-self-hosted.md) · [02 — Managed Cloud](02-managed-cloud.md) · [08 — Switch, swap & lose a connector](08-switch-connectors.md) · [09 — The anchor query](09-anchor-query.md) · [10 — Enable cloud reasoning](10-enable-cloud-reasoning.md)
