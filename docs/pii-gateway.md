# PII Gateway & Cloud Escalation

## Purpose

The PII gateway sits between the agent and any outbound model call. It guarantees that no cloud-bound call escapes de-identification and review — the chokepoint is structural, with no code path around it. It does *not* promise perfect redaction: the local NER and regex stripping is best-effort and carries a measurable miss rate (see [Measurement & the trust contract](#measurement-the-trust-contract)). So the honest split is this — what is *impossible* is reaching a cloud service without passing through the gateway; what the gateway then makes *less likely*, not impossible, is an individual identifier surviving the strip.

## When it activates

**Every model call passes through the gateway**, including local ones. It is the single egress chokepoint: no provider client holds its own network transport, so there is no path around it. This is what makes the guarantee structural rather than procedural — see [where enforcement lives](ai-transparency.md#where-enforcement-lives).

What the gateway *does* depends on the destination:

| Destination | Gateway behaviour |
|---|---|
| **Local** — Ollama, local-network endpoint | No-op passthrough. Nothing is stripped; the call is still written to the [ledger](ai-transparency.md#3-call-ledger). |
| **Cloud** — any configured cloud provider | Stripping applied **unconditionally**, then the [review gate](#the-review-gate) for that role, then send. |

Stripping for cloud destinations cannot be disabled or overridden per prompt. The user sets their risk posture by configuring which roles use a cloud provider ([Model Providers](model-providers.md)); the gateway then enforces that posture on every call without further discretion.

## The review gate

Stripping is unconditional; *being asked to confirm each send* is not — a standing cloud reasoner would be unusable if it prompted on every query. The review mode is configured per role:

| Mode | Behaviour |
|---|---|
| `every_call` | Preview and explicit confirmation before every send. **Default** when a cloud provider is first configured for a role. |
| `new_shape` | Confirm once per distinct payload shape; structurally identical sends proceed without prompting. |
| `off` | Standing consent, no prompt. Cannot be selected until the user has seen at least one full preview for that role. |

No mode suppresses the ledger entry. Full detail and rationale: [AI Transparency](ai-transparency.md#2-pre-send-review).

## What it strips

The gateway applies local NER (Named Entity Recognition) and regex patterns to remove or mask:

| Category | Examples | Method |
|---|---|---|
| Names | Patient name, provider name, facility name | NER (local model) |
| Dates of birth | `DOB: 1985-04-12` | Regex + NER |
| Specific dates | Shifted by a fixed random offset per session (preserves relative timing) | Date shift |
| Addresses | Street, city, zip | NER |
| Phone / fax numbers | | Regex |
| MRN / account numbers | `MRN: 12345678` | Regex |
| SSN | | Regex |
| Genomic data | All `MolecularSequence` and PRS content | Excluded by default; opt-in per call |
| Insurance / financial | | Regex |

### Date shifting

Absolute dates are shifted by a fixed random offset (e.g., ±180 days) applied consistently within a session. This preserves the relative timing of events (e.g., "lab drawn 3 days after symptom onset") without revealing actual calendar dates.

## User preview

Whenever the review gate prompts, the user sees:

1. The stripped payload in full, verbatim as it will be transmitted
2. A diff view showing what was removed or masked, in place
3. The destination — provider, model, API hostname
4. What was withheld entirely under [hard exclusions](#hard-exclusions), so the answer's blind spots are visible rather than silent
5. Token count and estimated cost
6. A confirmation button

## Cloud provider configuration

Cloud providers are configured **per model role**, not as a single global escalation setting — see [Model Providers](model-providers.md) for the `config.toml` schema. API keys live in the macOS Keychain (or an env var for headless installs), never in the database, and are never logged.

## Audit trail

Every model call is written to the local, append-only ledger — cloud and local alike, with the full request and response retained rather than hashed. Schema, retention policy, and the reasoning behind retaining payloads instead of hashes: [AI Transparency](ai-transparency.md#3-call-ledger).

## Hard exclusions

Regardless of user settings, review mode, or tier, these are **never** sent to a cloud model:

- Imaging pixel data (DICOM files)
- Raw source documents (original PDFs, Apple Health export files)

These are excluded rather than stripped because stripping cannot make them safe: they are not the clean, extracted text the [stripper](#what-it-strips) operates on. They carry unbounded, unpredictable identifiers — burned-in DICOM tags, scanned letterheads, export metadata — that local NER and regex cannot be trusted to catch. For everything the gateway strips, masking is sufficient; for these two, only exclusion is. The value they'd add to a text prompt is also low: a cloud reasoner works from the *extracted* findings (a radiologist's impression, parsed lab values), which flow through the normal stripping path, not from the raw artifact.

When an exclusion drops content that was relevant to the query, the user is told — in the preview if one is shown, and in the ledger entry regardless. A silently narrowed answer is worse than a disclosed one.

## Genomic data

Genomic data (`MolecularSequence`, PRS scores, raw variant data) is **excluded by default**, but — unlike the hard exclusions above — the user can opt to send it to a cloud model, or include it in a [sliver](sharing.md) shared with a third party. The gateway cannot de-identify it: a genome is itself an identifier that uniquely fingerprints the person and their blood relatives, so masking a name changes nothing. The opt-in therefore carries a plain warning that the data is identifiable and stays that way. It is off unless the user turns it on, and every send is recorded in the ledger like any other call.

## Measurement & the trust contract

"What is the acceptable miss rate?" is close to unanswerable as a single number, because PII is
not fungible — a missed phone number is not the same risk as a missed name + DOB + MRN triple
that re-identifies. The question is decomposed into a **contract** that CI enforces and the docs
publish, rather than a magic threshold.

### Split the surface by method

Most of what the gateway strips is not the NER model's job. The [strip table](#what-it-strips)
already routes the high-risk **direct identifiers** — SSN, MRN, phone/fax, DOB, structured
dates, account numbers — to **deterministic regex**. These have formats, so near-100% recall is
achievable and a miss is a *bug caught by a test suite*, not a statistic to be tolerated. That
leaves NER responsible only for the genuinely unstructured entities — **names, addresses,
facility names** — which is the far smaller surface the "acceptable miss rate" question actually
applies to.

| Surface | Method | Standard |
|---|---|---|
| Direct identifiers (SSN, MRN, phone/fax, DOB, structured dates, account #) | Deterministic regex | **100% on a versioned regex test suite.** Any miss is a release-blocking bug. |
| Unstructured entities (names, addresses, facility names) | NER | **Published per-class recall** on a labelled corpus, re-run in CI, gating `off`-mode availability. |

### Per-class recall, not one aggregate

Recall (miss rate = 1 − recall) is reported **broken out by identifier class**, not as a single
figure. Recall is the safety metric; precision (over-stripping, which destroys answer utility)
is tracked as the utility metric. The strictest recall bar sits on the highest
re-identification-risk classes. Note that [date-shifting](#date-shifting) already neutralises
absolute dates, so a *missed* date is a lower-risk event than a missed name — the thresholds
reflect that weighting.

### The eval corpus

A threshold cannot be set or measured without a labelled corpus, built from two sources:

- **Synthetic backbone** — realistic *extracted* clinical text (lab panels, note snippets, med
  lists — the shapes that actually flow through the gateway, not arbitrary prose) with injected
  PII whose ground-truth spans we control. Thousands of examples, exact labels.
- **External benchmark** — the **i2b2/n2c2 2014 de-identification corpus**, the standard
  PHI-annotated dataset (HIPAA identifiers labelled), used as the objective yardstick recall is
  published against. Access requires a data-use agreement.

### Model: compose, don't fine-tune

Start from **Microsoft Presidio** (MIT-licensed, open source) — it is already this architecture:
regex recognizers + spaCy NER + context enhancement + per-entity confidence scores to gate on,
all offline and extensible. Back the NER with **scispaCy `en_core_sci_md`**. A local-Ollama LLM
pass is an *optional second belt* for the `off` tier, never the primary detector — a
nondeterministic model cannot be regression-tested. A custom fine-tuned model is deferred; it
carries the same content-rot maintenance liability the project avoids elsewhere.

### The `off`-mode trust contract

`off` review mode (standing consent, no per-send prompt) is unlocked only when **all** hold:

1. The user has seen at least one full [preview](#user-preview) for that role (already required).
2. The shipped model version has cleared the **per-class recall bars** on the eval corpus in CI.
   A version that has not cleared them **cannot expose `off` in the UI**.
3. A **runtime deterministic backstop runs even in `off`**: a cheap second-pass scan for
   direct-identifier-shaped strings (SSN, MRN patterns) the first pass missed forces a prompt
   regardless of mode. `off` means "don't ask me about routine sends," never "disable the safety
   net."

This turns an unanswerable question into a measurable, versioned, CI-enforced contract —
consistent with the project's stance that where the architecture cannot *guarantee* privacy,
transparency is the guarantee.

## Open questions

- [ ] Exact per-class recall targets for the NER-owned entities (names / addresses / facilities) — fix the numbers once the corpus is built and a first Presidio baseline is measured.
- [ ] Date shifting: per-session or per-user? Per-session is simpler but loses cross-session date consistency.
- [ ] Should the gateway support an "export mode" for users who want to share data with a doctor? (i.e., strip for a human recipient, not a cloud LLM — a different threat model from cloud-LLM egress.)
