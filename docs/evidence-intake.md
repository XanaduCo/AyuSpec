# Evidence Intake

!!! note "Status: draft"
    The flow, the stage contracts, and the grading rules are decided. The retrieval path for
    paywalled papers, the corpus-matching implementation, and every model prompt are open.
    See [Open questions](#open-questions).

## Overview

A user reads a paper, hears a claim on a podcast, gets a supplement recommendation from a
friend, or notices something about themselves. Today that lands nowhere: they either act on it
un-appraised or forget it. This component is the path in — **the user brings the evidence, ayuOS
appraises it, and offers to turn it into a hypothesis**.

It is the mirror image of [Evidence & Hypotheses](evidence.md), which describes the agent
*proposing* hypotheses by walking the [healthspan model](healthspan-model.md) against the user's
record. Same hypothesis object, same evidence ladder, opposite direction of travel. Both feed the
same loop: **understand → hypothesize → act → measure → learn**.

The job is narrow and worth stating precisely: appraise **what the user brought**, against
**what we already hold**, and say **how much weight it can bear**. It is not a literature search,
and it is not a verdict on whether the user should do the thing.

## The intake object

What the user submits, stored first-class before any appraisal runs. Nothing is appraised in
flight and discarded — the submission is the record, and the appraisal is a separate object
pointing at it.

| Field | Description |
|---|---|
| `id` | |
| `submitted_at` | |
| `source_type` | Where it came from — see [source types](#source-types) |
| `supporting_evidence_type` | What backs the claim — see [supporting-evidence types](#supporting-evidence-types). This is the axis that decides how appraisal runs |
| `claim_verbatim` | The claim as the user received it, in the original wording |
| `claim_user_framing` | The user's own summary and why they care ("worth trying before my next panel?") |
| `artifact` | The retained content: pasted text, saved page, PDF, screenshot, transcript excerpt, voice note |
| `provenance` | [Who / where / when / how obtained](#provenance-capture) |
| `goal_ref` | Which user goal it attaches to, if any |
| `status` | `submitted` / `appraised` / `hypothesis` / `watching` / `filed` |
| `appraisal_ref` | The [appraisal](#what-the-appraisal-returns) once the pipeline has run |
| `hypothesis_ref` | Set if the user accepted the [offer](#the-offer) |

### Source types

| Source type | Examples |
|---|---|
| `journal` | Peer-reviewed article, systematic review, meta-analysis |
| `preprint` | bioRxiv / medRxiv, conference abstract |
| `podcast_video` | A claim made in an episode, with a timestamp |
| `social` | Post, thread, short video, newsletter |
| `book_media` | Book, long-form article |
| `practitioner` | "My doctor said…" |
| `personal_network` | A friend's or relative's account of what worked for them |
| `self_observation` | The user's own noticing — "I sleep worse the nights I lift late" |
| `product` | Manufacturer or clinic marketing material |

### Supporting-evidence types

Orthogonal to the source. A podcast can carry a well-run RCT; a journal article can carry pure
mechanism; a supplement label can cite a real trial in a population nothing like the user's. The
appraisal keys off **this** field, never off the source's prestige.

| Supporting-evidence type | What it is |
|---|---|
| `study` | A named piece of research the claim rests on — trial, cohort, review, meta-analysis |
| `mechanism` | A causal story: "X raises Y, and Y is upstream of Z, therefore X helps Z" |
| `bare_claim` | An assertion with nothing attached, including an assertion by an authority |
| `third_party_anecdote` | Someone else's personal result |
| `self_observation` | The user's own experience, which is the one type checkable against their own store |

An item may carry several — a podcast episode that cites one trial and then extrapolates a
mechanism well past it is the common case, and both are appraised, separately.

## Provenance capture

The system must be able to say later *exactly what the user was told and by whom*. Paraphrases
are not enough: appraising "a well-known podcaster said creatine improves memory" requires the
actual sentence, because the claim's scope (which population, what dose, what outcome, how
hedged) usually lives in the wording.

| Field | Description |
|---|---|
| `attributed_to` | Named person, author list, account, or "a friend" |
| `venue` | Journal, show name and episode, platform, clinic |
| `stated_at` | When the claim was made or published |
| `captured_at` | When the user brought it in |
| `locator` | DOI / PMID / URL / episode timestamp / page |
| `capture_method` | Paste, share-sheet, URL, photo of a page, voice note, transcription |
| `retrieved` | Whether ayuOS actually fetched the underlying source, or is working from the user's summary alone — see [fetching is egress](#local-vs-cloud-fetching-a-paper-is-egress) |

`retrieved` is load-bearing. An appraisal of a claim we could not retrieve is an appraisal of the
*user's account of a study*, and it says so in those words rather than borrowing the study's
authority.

## The appraisal pipeline

Five stages, each with a defined input and output. Every stage can return `insufficient` and pass
that forward — an unknown is carried through to the verdict, not smoothed over.

```
intake object
     │
  1  ├─► extract & normalize ──► structured claim (intervention · population ·
     │                            outcome · direction · magnitude · timeframe)
     │
  2  ├─► background check ────► prior position: what the healthspan model and the
     │                            bundled corpus already hold on this claim
     │
  3  ├─► quality & power ─────► design · n · effect size · endpoint · population
     │                            match · conflicts · replication
     │
  4  ├─► grade ───────────────► EVIDENCE: HIGH / MODERATE / LOW / NONE
     │                            + applicability-to-you + agent confidence
     │
  5  └─► offer ───────────────► hypothesis · watch · file
```

| Stage | Input | Output | Where it runs |
|---|---|---|---|
| **1 · Extract & normalize** | `claim_verbatim`, artifact | Structured claim, plus intervention/marker resolved to [healthspan model](healthspan-model.md) node ids where they resolve, and an explicit list of terms that did not | Local (medical extractor role) |
| **2 · Background check** | Structured claim | Prior position: an existing cited `SUPPORTS` edge with its `evidence_strength`, a guideline statement, a contradiction, a prior intake item on the same claim, or nothing at all | Local; graph + corpus lookup, no model needed for the lookup itself |
| **3 · Quality & power** | Artifact, structured claim, user record summary | [Quality profile](#what-the-appraisal-returns) with a reason per dimension and `unknown` where the source does not say | Local by default |
| **4 · Grade** | Stages 2 + 3 | Verdict on the [existing evidence ladder](evidence.md#strength-of-evidence-labeling), applicability, confidence, and the one-paragraph account of why | Local by default |
| **5 · Offer** | Verdict | Draft [hypothesis object](evidence.md#the-hypothesis-object), or a filed item | Local, always — the offer is a UI step, not a model call |

Stage 2 deliberately runs **before** stage 3. Whether a new single trial matters depends on what
is already held: against an authored, cited `HIGH` edge, one small study changes nothing and
should be told so plainly; against an empty node, the same study is the only thing anyone has.

### Grading by supporting-evidence type

Each type has a **ceiling** on the ladder. The ceiling is mechanical — it is applied before any
model writes prose, so a fluent argument cannot talk itself up a rung.

| Supporting-evidence type | Ceiling | How the appraisal reads it |
|---|---|---|
| Meta-analysis / multiple consistent RCTs | `HIGH` | Heterogeneity, publication bias, whether the pooled population resembles the user |
| Single RCT, or consistent observational | `MODERATE` | Randomisation, blinding, pre-registration, endpoint type, dropout, n against the claimed effect |
| Mechanistic reasoning | `LOW` | The mechanism is assessed for plausibility and for how many inferential steps it takes. A perfect mechanism does not become `MODERATE` — mechanism has predicted the wrong outcome too many times ([cautionary cases](epistemics.md#the-concept-library)) |
| Third-party anecdote | `NONE` | Recorded, not dismissed. One person's result with no comparator cannot separate the intervention from regression to the mean |
| Bare claim, including by an authority | `NONE` | The claim inherits whatever it cites. If it cites nothing, the grade is `NONE` no matter who said it |
| The user's own observation | `NONE` as external evidence | But it is checked against their own store immediately, and if the record corroborates it the observation becomes `INFERRED` or `SOURCE-BACKED` *data* — which is a different axis, and often the strongest reason to run an experiment |

The ceiling is a ceiling, not a floor. An RCT with n=14, an unblinded design, and a surrogate
endpoint does not get `MODERATE` for turning up in a journal. The route down is always stated:
"single RCT, but n=14 against a claimed 8% effect — underpowered, graded `LOW`."

Two rules keep this honest in both directions:

1. **Fame is provenance, not evidence.** "Huberman said so" is graded exactly as "a colleague
   said so" would be — by what is attached to it. When the episode cites a trial, that trial is
   appraised on its own terms and the grade comes from the trial.
2. **Prestige is not evidence either.** A journal masthead earns no rungs. The same n, endpoint,
   and population questions are asked of a *Nature* paper and of a supplement brochure.

### Strength and applicability are separate axes

A meta-analysis in 70-year-olds with heart failure can be `EVIDENCE: HIGH` and nearly
inapplicable to a 45-year-old with a CAC of zero. These are never multiplied into one number:

| Axis | What it answers |
|---|---|
| `evidence_strength` | Is the effect real, in the population studied? |
| `applicability` | Does that population, dose, baseline, and endpoint resemble *this* user? `close` / `partial` / `distant` / `unknown`, with the mismatch named |
| `confidence` | The agent's own calibrated confidence, per [evidence.md](evidence.md#the-hypothesis-object) — kept distinct from both |

### What the appraisal returns

| Field | Description |
|---|---|
| `intake_ref` | |
| `structured_claim` | Intervention, population, outcome/marker, direction, magnitude, timeframe |
| `resolved_nodes` | Healthspan-model node ids matched, and terms left unresolved |
| `prior_position` | What we already held, with its citation — or `nothing held` |
| `quality` | Per dimension: design, n, effect size and interval, blinding, endpoint type, replication, funding and conflicts. Each is a value, `unknown`, or `not applicable` |
| `applicability` | Rating plus the named mismatches |
| `evidence_strength` | `HIGH` / `MODERATE` / `LOW` / `NONE` on the [existing ladder](evidence.md#strength-of-evidence-labeling) |
| `what_would_change_it` | The specific missing thing — a larger trial, a hard endpoint, a replication in this population |
| `narrative` | The short readable account, with every claim carrying its own label |
| `offer` | `hypothesis` / `watch` / `file`, with the reason |

`what_would_change_it` is required, not optional. A grade with no stated route to a different
grade reads as a verdict on the idea rather than on the current evidence.

## The offer

When an item survives appraisal well enough to be worth testing, ayuOS offers to promote it into
the [hypothesis object](evidence.md#the-hypothesis-object) — the same object the agent's own
proposals use.

| Hypothesis field | Filled from |
|---|---|
| `statement` | The structured claim, rewritten as a first-person testable sentence with a marker and a direction |
| `goal` | `goal_ref` on the intake, or asked |
| `rationale` | Prior position + the user-record signal + what the submitted evidence adds |
| `evidence_strength` | The graded verdict, carried across unchanged |
| `proposed_intervention` | Dose, timing, and form as stated in the source — flagged when the source is vague |
| `expected_effect` | The source's effect size, adjusted only if the applicability mismatch is quantified; otherwise "unknown" |
| `confidence` | The agent's calibrated confidence, separate from the grade |
| `origin` | `user_intake`, with `intake_ref` — so a hypothesis always says where it came from |

The draft is shown in full and is editable before it is stored. It then goes to
[Experimentation](experimentation.md), where the power and duration check may conclude the thing
is not testable with the markers this user has — which is a useful answer delivered *before* the
days are spent, not after.

Three exits, all of them normal:

- **Hypothesis** — testable, relevant, worth the window.
- **Watch** — plausible but nothing to test yet (no marker, effect below the marker's noise floor,
  or the evidence is a single preprint awaiting replication). It sits in the record and resurfaces
  when something changes: a new lab panel, a replication, a related question.
- **File** — kept and labeled, no action.

## Rejected and weak items are kept

Nothing submitted is deleted by the system. A `NONE`-graded item stays in the record with its
grade, its provenance, and its narrative, and it is searchable by intervention, by source, and by
free text.

Three reasons this matters more than tidiness:

1. **The claim will come back.** The same supplement will be recommended again by someone else in
   six months. "You brought this in March; here is what we said, and nothing has changed since" is
   the highest-value thing this component produces, and it requires the March record.
2. **Grades move.** A `NONE` mechanism that acquires a trial should be re-appraised as an update
   to the existing item, keeping the history, not started fresh.
3. **A judgment you cannot re-read cannot be audited.** A system that discards what it graded
   badly is asking to be trusted about work it has destroyed.

The *user* may delete anything — it is their record. The system does not.

## Guardrails against the confident-but-wrong failure mode

This is the sharpest risk in the component: an eloquent appraisal of a bad study reads as
authoritative precisely because it is well written. The mitigations are structural, not tonal.

- **Ceilings are applied before prose.** The type-to-ceiling mapping is a lookup, not a judgment
  the writing model gets to make.
- **Absences are printed.** "The abstract does not report a confidence interval" and "n is not
  stated" appear in the verdict. Unknowns are never rendered as defaults.
- **No artifact, no borrowed authority.** If the source was not retrieved, the verdict is scoped
  to the user's account of it, in those words.
- **Three axes, never collapsed.** Strength, applicability, and confidence are shown separately.
  A single composite score is the exact sleight of hand [epistemics](epistemics.md#the-comparison-frame)
  refuses.
- **Refusal is a valid output.** "This claim is too vague to appraise — what outcome, over what
  window?" is a better response than a graded verdict on a claim nobody has pinned down. It is the
  same move as the agent loop's [clarifying turn](agent-loop.md#the-clarifying-turn), and it carries
  what was found rather than handing back a bare question.
- **Concepts are injected at the grade.** A first `NONE`, a first mechanism-only item, or a
  cross-tier comparison triggers the matching concept card under the
  [injection policy](epistemics.md#the-injection-policy). The label is the entry point.
- **No source-category editorialising.** There is no penalty term for "influencer" and no bonus
  for "journal". The asymmetry users expect us to apply is exactly the one that would make the
  grades unauditable.

## Local vs. cloud: fetching a paper is egress

Pasting a DOI or a URL asks ayuOS to make a network request to someone else's server. That
request discloses an IP address and which paper is being read, which is a health-relevant fact
about the user. So the fetch is treated as egress in the same frame as a model call: it is
disclosed before it happens, recorded in the [call ledger](ai-transparency.md#3-call-ledger)
alongside model calls, and refused outright under a strict local-only posture.

The fallback is always available and always free: **paste the text**. Pasted or photographed
content is appraised with zero transit, in the default self-hosted plus local-inference
configuration, with the extractor and grader running on-device. Losing the fetch path costs
convenience — the user does the retrieval themselves — never the appraisal.

Two further rules, consistent with the [PII gateway](pii-gateway.md):

- **The user's record is the PII, not the paper.** When a cloud reasoner is configured for the
  appraisal role, the stage-3 input includes a summary of the user's own record for the
  applicability check. That summary passes through the gateway's unconditional stripping like any
  other cloud-bound payload. The paper text itself carries no user identifiers and is not the
  sensitive half.
- **Retrieved once, stored locally.** The artifact is kept on disk, so re-appraisal, search, and
  the "you brought this in March" recall never re-fetch and never re-disclose.

## Storage

Consistent with [Storage](storage.md#application-objects) — this is user-owned application data,
so it lives in the `ayuos` schema with real foreign keys, not in `clinical` and not as FHIR
(there is no R4 resource for "a claim my friend made").

| Table | Purpose |
|---|---|
| `evidence_intake` | The [intake object](#the-intake-object), including provenance |
| `evidence_appraisals` | One row per appraisal run, FK to `evidence_intake`; re-appraisal appends rather than overwrites |
| — | FKs out to `hypotheses` and `goals`; `hypotheses.origin` carries `intake_ref` |

Two boundaries follow from decisions already made:

- **Artifacts are files, not columns.** Saved pages, PDFs, and audio notes go on disk with a
  content hash in the row, per [what is not in Postgres](storage.md#what-is-not-in-postgres). The
  extracted text is stored and embedded in `vectors` so "have I seen something about this?" works.
- **User-brought evidence never edits the shipped graph.** The bundled corpus and the
  [healthspan model](healthspan-model.md) stay in their own schema. An accepted intake item can
  propose a node or edge only as a **user layer** under the model's
  [layered editing](healthspan-model.md#layered-not-edited-in-place) rules, visibly authored by the
  user and never merged into reviewed content. The no-synthesis invariant holds: a comparison-frame
  cell still requires a cited, reviewed edge.

## Where the AI workflows plug in later

**Future work.** This page specifies the inputs and outputs of each stage. Prompts, model
selection per stage, thresholds, and evaluation are out of scope here and are specced with
[AI & ML Layer](ai-ml.md).

| Stage | Model role ([ai-ml.md](ai-ml.md)) | Defined now | Deferred |
|---|---|---|---|
| 1 · Extract & normalize | Medical extractor (MedGemma) | The structured-claim schema and the "unresolved terms" output | Extraction prompt, handling of tables and figures, PDF layout parsing |
| 2 · Background check | None for lookup; reasoner for reconciliation | The prior-position contract | How near-miss matches to graph nodes are scored, and when a disagreement is a contradiction vs. a different question |
| 3 · Quality & power | Medical extractor + reasoner | The quality dimensions and the mandatory `unknown` | How effect size and power are computed from partial reporting; conflict-of-interest detection |
| 4 · Grade | Reasoner | The ladder, the ceilings, the three separate axes | How applicability is scored against the user record; confidence calibration |
| 5 · Offer | Tool-caller | The hypothesis field mapping | Statement rewriting into a testable first-person sentence |

The ceilings in [grading by type](#grading-by-supporting-evidence-type) are deliberately outside
the model's discretion in every one of these. Whatever the eventual prompts, a mechanism cannot be
graded above `LOW`.

## Relationship to other components

- [Evidence & Hypotheses](evidence.md) — supplies the evidence-strength ladder and the hypothesis
  object this component fills in. That page covers agent-proposed hypotheses; this one is the
  user-brought path into the same object.
- [Experimentation & Validation](experimentation.md) — receives accepted hypotheses, and may
  refuse to design a testable window for them, which is a legitimate end state.
- [The Healthspan Model](healthspan-model.md) — the background check runs against its cited edges;
  accepted items may propose user-layer additions but never edit reviewed content.
- [Health Literacy & Epistemics](epistemics.md) — the appraisal's labels are injection points; the
  concept library explains the ladder, mechanism-vs-outcome, and conflicts of interest at the
  moment a verdict shows one.
- [Agent Loop](agent-loop.md) — filed and watched items are part of the record the agent reasons
  over; a relevant prior appraisal is recalled when the topic returns.
- [Data Capture Strategy](data-capture.md) — the submission path is a capture path, and is held to
  the same sub-10-second bar: paste, share, or speak, and the appraisal happens after.
- [PII Gateway](pii-gateway.md) — the paper fetch and any cloud-bound appraisal call pass the
  single egress chokepoint; record context is stripped unconditionally.
- [Storage](storage.md) — intake and appraisal objects live in the `ayuos` schema; artifacts on
  disk; extracted text embedded in `vectors`.
- [Frontend & UI](frontend.md) — the intake surface, the staged appraisal reveal, and the offer
  step; demonstrated in the [demo](demo/index.html#/evidence).

## Open questions

- [ ] What can actually be fetched? Most full text is paywalled; abstracts are open. Does the
      appraisal work from abstracts by default and say so, or push the user to supply the PDF?
- [ ] Does a podcast or video claim get transcribed locally (Whisper-class model, more moving
      parts) or does the user paste the quote?
- [ ] How is applicability scored against the user record — a rules table over population
      attributes, or a model judgment with the mismatches enumerated?
- [ ] Re-appraisal cadence: is a `watch` item re-checked on a schedule, only when the user asks,
      or when a corpus update touches its topic?
- [ ] Duplicate detection — the same claim arrives twice from different sources. Merge into one
      item with two provenances, or keep both and link them?
- [ ] Does a *contradiction* between a submitted item and the shipped healthspan model surface as
      a user-visible disagreement, and does it feed anything back to the content maintainers?
- [ ] Where do conflicts of interest come from — declared funding in the paper only, or a
      maintained sponsor list that would itself need governance?
- [ ] Does an accepted item that never becomes an experiment still influence the agent's answers,
      or is a hypothesis inert until tested?
