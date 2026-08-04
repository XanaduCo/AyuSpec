# Journey 10 — First egress: enabling hybrid cloud reasoning

> **Who:** Ravi Mehta, 45 — the pragmatic optimizer · **Intent:** get a stronger answer to a hard cardiac-synthesis question without giving up control of what leaves his machine · **Entry surface:** Ask, then Settings → reasoner · **Egress posture:** 🟢 all-local → 🟠 reasoner-only cloud (MedGemma + tool-caller stay green) · **Primary modality:** pre-send review + posture indicator

## The intent

Ravi has just run the anchor query ([Journey 09](09-anchor-query.md)) and pushed it one level harder: *"Given my ApoB trend, my father's MI at 62, a CAC of 0, and my APOE genotype — what is my actual 10-year cardiac trajectory, and which single change buys the most risk reduction?"* The local reasoner (`deepseek-r1:8b`) gives an answer that is **correct but shallow** — it hedges, it doesn't weigh the CAC-0 against the family history well, it won't commit to a comparison. Ravi can *see* the ceiling. He is willing to send this one question to a frontier model — but only if he can see, exactly and verbatim, what leaves. This is the trust-defining moment of the whole product: the first time any of his data crosses the device boundary. He is not looking for a toggle; he is looking for a **receipt**.

## Preconditions

- Self-hosted install running, all three roles local — the default from [Journey 01](01-install-self-hosted.md). Posture header shows three greens.
- A record worth reasoning over: labs, wearables, EHR, imaging and genome already ingested ([Journey 06](06-upload-files.md)), so the hard question has real context behind it.
- He has just hit the local reasoner's ceiling on a synthesis question ([Journey 09](09-anchor-query.md)) — the felt need that motivates this step.
- An Anthropic API key in hand. No prior cloud provider has ever been configured (so `every_call` will be the default the moment one is).

!!! abstract "The reciprocity of this journey"
    The exchange here is **trust for capability**. Ravi gives up a PII-stripped slice of context; in return he gets a *measurably better answer* **and** total visibility and control over the trade — the exact payload, the redactions, the destination, what was withheld, the cost, and a permanent local record. He is never asked to trust a promise; he is handed the artifact.

## Walkthrough

### Step 1 — Feel the ceiling, decide to escalate

- **User intent here:** confirm the local answer is actually weaker before spending trust on egress.
- **User does:** re-reads the local reasoner's answer in **Ask**; taps the evidence labels and sees the synthesis is thin, not the sources. Decides to try a frontier reasoner for this class of question.
- **System does:** nothing yet — no escalation happens implicitly. There is no "the model wasn't sure, so we sent it to the cloud" path. Egress is a decision the user makes, not one the agent makes for him.
- **Value returned this step:** clarity that the weakness is in the *reasoner*, not the data — so cloud reasoning is the right lever, not more ingestion.
- **Modality:** text answer in Ask; tappable evidence labels (Law 3).
- **UX constraints / laws:** posture still three-green (Law 1); the agent never routes to cloud silently (Law 4). Trade-offs over verdicts — the system shows the ceiling, it doesn't quietly climb over it.

### Step 2 — Configure the reasoner role (only the reasoner)

- **User intent here:** point *one* role at a frontier model without touching the two roles that see raw clinical text or run tools.
- **User does:** **Settings → Models → reasoner** → provider `anthropic`, model `claude-opus-4-8`, pastes the API key. Leaves **tool-caller** and **medical extractor** on Ollama. Saves.
- **System does:** writes the key to the **macOS Keychain** (never the database, never the ledger); writes `config.toml`:
  ```toml
  [models.reasoner]
  provider = "anthropic"
  model    = "claude-opus-4-8"
  fallback = "ollama:deepseek-r1:8b"
  review   = "every_call"          # forced default on first cloud config for a role
  ```
  The posture indicator for the reasoner flips **green → amber**, instantly and visibly, in the header of every view. `tools` and `medical` stay green.
- **Value returned this step:** the recommended hybrid, expressed exactly — frontier synthesis on top of strictly local PHI handling. MedGemma (raw clinical text) and the tool-caller never leave. The change is legible the instant it happens.
- **Modality:** Settings form; posture header.
- **UX constraints / laws:** Law 1 — the amber flip is never silent; a user who changes the local default *sees* the change. Amber is reserved and load-bearing (design-system color law). Per-role config is the whole point ([Model Providers](../model-providers.md)) — this trade is only expressible because roles are separable.

!!! note "What stays green, and why it matters"
    `medical` (MedGemma) is the role that reads raw notes and lab documents *before* anything is normalized or stripped. Keeping it local is the load-bearing choice: the cloud reasoner only ever sees context that has already passed the [PII gateway](../pii-gateway.md). Amber on one pill, green on two, is the recommended hybrid — see [Tiers](../tiers.md#axis-2-inference).

### Step 3 — The pre-send review fires (the receipt)

- **User intent here:** see *exactly* what is about to leave, before it leaves — and confirm the genome and imaging are not in it.
- **User does:** re-asks the hard cardiac question. Because `every_call` is the default on a freshly-configured cloud role, the **pre-send review panel** opens *before any socket is opened*. He reads it top to bottom.
- **System does:** renders the amber pre-send panel with all five parts:
  1. **The exact payload, verbatim** — system prompt + retrieved context (ApoB trend, lisinopril, `CAC 0`, `VO₂max 52`, father's MI) + the user query, as it will be transmitted.
  2. **The redaction diff, in place** — `Dr. Sarah Chen → [PROVIDER_NAME]`, `2026-03-14 → 2025-11-17 (shifted −117d)`, facility names → `[FACILITY]`. Date-shifting preserves relative timing ("lab drawn 3 days after the visit") without leaking calendar dates.
  3. **The destination** — `anthropic · claude-opus-4-8 · api.anthropic.com`.
  4. **What was withheld entirely** — his **`MolecularSequence` data, excluded by default**, flagged in **red**: his APOE genotype and CVD polygenic score were *dropped, not masked*, with the reason ("a genome is itself an identifier; masking a name changes nothing") and the consequence stated plainly: *the answer cannot use your genetic risk — its cardiac trajectory is genome-blind.* He *could* opt in to send it, warned it stays identifiable; he leaves it off. Imaging pixel data is a true hard exclusion and is never sent.
  5. **Token count and estimated cost** — `2,847 tokens · ~$0.04`.
- **Value returned this step:** he can *see his genome and MRI didn't go* — the single fact that earns his trust — and he learns the answer's blind spot before he reads the answer, not after. The redaction diff is checkable against his own timeline (Law 4's verification path).
- **Modality:** the pre-send review panel (a signature component).
- **UX constraints / laws:** Law 4 — egress is previewed, never assumed. Red marks content withheld by default (his genome) — off unless he deliberately opts in — and the true hard exclusions (color law). The withheld-context disclosure is non-negotiable: a silently narrowed answer is worse than a disclosed one ([PII Gateway](../pii-gateway.md#genomic-data)).

### Step 4 — Confirm, and the answer comes back stronger

- **User intent here:** send it, read a better answer, and keep the record.
- **User does:** clicks **Confirm and send**.
- **System does:** the gateway strips (unconditionally — this is not the confirm button's job; the button gates *asking*, never *stripping*), sends, and streams back a stronger synthesis: it weighs CAC 0 against the family history proportionally, commits to a comparison frame across interventions, and names its own genome-blindness inline. A **ledger row is written locally, forever** — `provider: anthropic`, full payload retained (not hashed), `gateway.applied: true`, `hard_exclusions: ["MolecularSequence"]`, `cost_usd: 0.043`, `review.user_confirmed: true`.
- **Value returned this step:** the better answer he came for — *and* a permanent, queryable receipt of the exact trade he just made. The synthesis streams over a few seconds; the row is instantaneous.
- **Modality:** streamed markdown answer in Ask; comparison frame; ledger write.
- **UX constraints / laws:** the answer carries evidence labels (Law 3) and, because it used a cloud reasoner, says so. Every call is logged regardless of mode — the ledger is unsuppressable ([AI Transparency](../ai-transparency.md#3-call-ledger)).

!!! abstract "The row that was written (`ayuos.model_calls`)"
    ```json
    {
      "role": "reasoner",
      "provider": "anthropic",
      "model": "claude-opus-4-8",
      "destination": "api.anthropic.com",
      "left_device": true,
      "gateway": {
        "applied": true,
        "redactions": { "PERSON": 4, "FACILITY": 2, "DATE_SHIFT": -117 },
        "hard_exclusions": ["MolecularSequence"]
      },
      "payload":  { "retained": true, "token_count": 2847 },
      "review":   { "mode": "every_call", "prompted": true, "user_confirmed": true },
      "cost_usd": 0.043
    }
    ```
    Retained in full on his own disk, alongside the health data itself — hashing it would protect nothing and destroy the one answer that matters: *what exactly did you send?*

### Step 5 — Click the amber pill → the reasoner's ledger slice

- **User intent here:** verify the receipt he was just shown is really recorded, and only for the reasoner.
- **User does:** clicks the **amber `reasoner` pill** in the header.
- **System does:** opens the **Transparency** view filtered to `role = reasoner` — his single cloud call, its full payload, the redaction summary, the destination, the cost. The `tools` and `medical` slices show only local, green calls.
- **Value returned this step:** proof, on demand, that the amber pill and the ledger tell the same story — and that only the one role he escalated ever left. Auditing the whole ledger over time is [Journey 14](14-verify-and-maintain.md).
- **Modality:** posture pill → filtered ledger.
- **UX constraints / laws:** Law 1 — clicking a role opens that role's slice of the ledger. The indicator and the ledger are two views of one truth.

### Step 6 — Living with it: relax the review mode (but never all the way blind)

- **User intent here:** stop confirming every single send now that he trusts the shape, without giving up the record.
- **User does:** after several confirmed calls, **Settings → reasoner → review** → `new_shape`. Later he considers `off`.
- **System does:** `new_shape` now prompts only when a *distinct payload shape* appears — a new resource type, a new tool's output, a new redaction category — and lets structurally identical sends proceed. The UI **blocks `off`** until he has seen at least one full preview for that role (he has) *and* the shipped stripper version has cleared its per-class recall bars in CI; even under `off`, a deterministic backstop and the ledger remain. No mode ever suppresses a ledger row.
- **Value returned this step:** friction drops to match his trust, in his control, without the record ever going dark. He can dial it back up — or **revoke the Anthropic provider** entirely — anytime and return to three greens.
- **Modality:** Settings; the review-mode selector.
- **UX constraints / laws:** review mode changes *how often he's asked*, never *whether stripping happens* or *whether it's logged* ([PII Gateway](../pii-gateway.md#the-review-gate)). Reversibility is a first-class property — the amber is a revocable preference.

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | Read the local answer critically before escalating | Confidence the weakness is the reasoner, not the data — so cloud is the right lever |
| 2 | Configure one role, paste an API key | The recommended hybrid, exact: frontier synthesis, PHI-handling roles still green; the change visible instantly |
| 3 | Read the pre-send review in full | Sees his genome and MRI didn't leave; learns the answer's blind spot *before* reading it; a checkable redaction diff |
| 4 | Click Confirm and send | A stronger, evidence-labeled synthesis **plus** a permanent, queryable receipt of the exact trade |
| 5 | Click the amber pill | Proof the indicator and the ledger agree, and that only the escalated role left |
| 6 | Choose a standing review mode | Friction that matches his trust, fully reversible, with the ledger never suppressible |

## UX & modality constraints

- **Dominant laws:** Law 1 (posture always on screen; amber flip never silent), Law 4 (egress previewed, never assumed). Law 6 lurks in the fallback (below); Law 3 rides on the returned answer.
- **Color semantics carry the meaning:** green pills = stayed local; the one amber pill = the reasoner's stripped context leaves; **red** = the genome, withheld by default (an opt-in he declined), alongside the true hard exclusions. None of these three hues is ever decorative here.
- **Input modality:** Settings form + the pre-send review panel are the operative surfaces; the question itself is voice or text in Ask.
- **Latency:** local reasoning already streamed over seconds; the cloud call adds network round-trip but returns a stronger answer. The pre-send panel is instant (it renders the already-built payload).
- **Empty/first-run state:** the very first cloud call for a role *always* shows the full preview — `every_call` is forced, `off` is not selectable. There is no configuration in which a first egress is silent.
- **Accessibility:** amber/green/red are reinforced by the pill's text label (`cloud` / `local`) and the pill icon, never color alone.

## Where it can break (and the fallback)

!!! warning "A skipped strip is a LOUD failure, not a silent leak"
    If a bug ever let a call skip stripping, the ledger row is written with `gateway.applied: false` — a **startup-blocking invariant violation**, not a quiet leak. The single egress chokepoint has no code path around it: a provider client that bypasses the gateway has no network transport at all ([where enforcement lives](../ai-transparency.md#where-enforcement-lives)).

| Failure mode | What happens | What Ravi keeps |
|---|---|---|
| **Invalid / expired API key** | The call **falls back to the local reasoner** rather than failing. The posture pill shows what *actually ran* — it flips back to **green** for that call, because the indicator reflects resolved runtime state, not config. | The answer, on local models. He notices the green pill and re-checks the key. |
| **Offline / provider outage** | Same fallback to local; the ledger records the fallback. Offline is a first-class state in the self-hosted tier, not an error. | Every workflow completes on local models alone ([Model Providers](../model-providers.md#fallback-behaviour)). |
| **He revokes the provider** | Reasoner returns to Ollama; posture returns to **three greens**; the historical ledger rows stay. | Full local operation, and the permanent record of the calls he *did* make. |
| **He wants this question genome-aware** | Two paths: opt in to send the genome to the cloud model — warned it's identifiable and stays that way — or ask it against the *local* reasoner, which sees the genome with nothing leaving the device. | Either a genome-aware cloud answer he explicitly authorised, or one at the local reasoner's quality ceiling. The trade is explicit, not hidden. |

**Contrast — Maya never takes this step.** [Maya](14-verify-and-maintain.md) runs all three roles local, always, and accepts a weaker synthesis as the price of zero-egress; she is the user who pulls the network cable to prove it and audits the ledger for any row at all. Ravi's amber pill is a legitimate, different risk posture — the system's job is not to pick between them ([Tiers](../tiers.md)).

## What good looks like

- Ravi sends his first cloud call and can state, from the receipt, **exactly** what left and what didn't — his genome and MRI provably did not.
- The answer is visibly better *and* he never had to trade visibility to get it — capability and control arrived in the same step.
- When his key later expires mid-question, the pill goes green and the answer still comes — he *sees* the fallback rather than getting an error, and trusts the indicator because it showed him the truth.
- Months later, one query answers "has anything ever gone to Anthropic, and what did it cost?" — the ledger, not memory, is the source of truth ([Journey 14](14-verify-and-maintain.md)).

## Related

- [Journey 09 — the anchor query](09-anchor-query.md) — the local answer this journey improves on.
- [Journey 06 — upload files](06-upload-files.md) — where the genome and MRI that stay excluded came from.
- [Journey 14 — verify sovereignty & live with it](14-verify-and-maintain.md) — auditing the ledger this journey just started writing; Maya's zero-egress contrast.
- [Journey 02 — the no-server path](02-managed-cloud.md) — the deployment-axis choice this journey is orthogonal to.
- [AI Transparency](../ai-transparency.md) — status indicator, pre-send review, and the call ledger.
- [PII Gateway](../pii-gateway.md) — what gets stripped, the review gate, and the hard exclusions.
- [Model Providers](../model-providers.md) — per-role configuration and fallback behaviour.
- [Tiers & Fallbacks](../tiers.md) — why egress is a per-role choice and what every tier still shares.
- [Design System & UX](../design-system.md) — the color law and the posture indicator this journey leans on.
