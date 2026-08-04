# Journey 11 — Run an n-of-1 experiment end to end

> **Who:** Maya Okonkwo, 39 — the sovereign purist · **Intent:** turn a hunch about her morning glucose into a result she can actually trust · **Entry surface:** Ask (a flagged pattern) → Experiments · **Egress posture:** 🟢 green throughout — every model call local; the trade she accepts is a weaker local analysis, never egress · **Primary modality:** text/voice to design; sub-10s capture + EMA prompts to run.

## The intent

Maya has Hashimoto's, runs on levothyroxine, and is chasing steadier daytime energy. The anchor
query surfaced something she half-suspected: her morning glucose swings more on some days than
others, and the rough days track the swings. She has a hunch — *"a two-week window of lower-carb
breakfasts flattens my morning glucose variability and steadies my energy."* She has run enough bad
self-experiments to distrust her own enthusiasm, so what she actually wants is a
**verdict she can't talk herself into**: the design fixed and the success bar set *before* she sees
a single day of data. She will run this entirely on-device and accept a weaker local analysis rather
than let one number leave the machine.

## Preconditions

- ayuOS is installed and running locally, all three roles green — see
  [Install & first run](01-install-self-hosted.md). Maya never opts into a cloud reasoner.
- The record is already populated: her Apple Health export seeded labs, conditions
  (Hashimoto's), meds (levothyroxine), and Apple Watch history —
  see [Bootstrap the record](03-apple-health-bootstrap.md) and the live
  [wearable stream](04-connect-wearables.md) for sleep and resting HR.
- She has run [the anchor query](09-anchor-query.md); the morning-glucose pattern came out of it.
- She owns a CGM she wears in **time-boxed windows only** — never always-on
  ([data capture](../data-capture.md)). Its glucose reaches ayuOS by a **zero-transit path**: the
  CGM app writes to Apple Health and she re-exports (she **declined the Terra bridge** in
  [Add a bridged connector](07-add-bridged-connector.md); the cost is manual re-export cadence, not
  the data — Law 6).
- The bundled [healthspan model](../healthspan-model.md) and guideline corpus ship offline, so
  evidence grounding needs no network call.

## Walkthrough

### Step 1 — A hunch, handed to her by the anchor query

- **User intent here:** act on a pattern the data flagged, not one she talked herself into.
- **User does:** from the [anchor-query](09-anchor-query.md) answer where morning glucose
  variability and low-energy mornings co-move, she taps **"test this"** on the flagged pattern.
- **System does:** opens **Experiments** with the pattern pre-loaded as a candidate hypothesis and
  the source cards (which glucose days, which energy logs) carried across — she does not re-state
  what she just read.
- **Value returned this step:** the observation becomes an actionable object in one tap; no retyping,
  no re-explaining the pattern to a blank form.
- **Modality:** tap-through from an Ask answer into Experiments.
- **UX constraints / laws:** posture stays three greens — the hand-off is local (Law 1). Reciprocity:
  the effort she already spent reading the anchor answer is carried forward, not discarded.

### Step 2 — Turn the hunch into a *testable* hypothesis

- **User intent here:** state the claim precisely enough that it could be wrong.
- **User does:** in Experiments, refines the statement by voice: *"Lower-carb breakfast (<20 g) for
  14 days flattens my morning glucose variability and raises my morning energy."*
- **System does:** the local reasoner grounds it on **two sides at once** —
  - **her own data:** her last CGM window's morning glycaemic variability, fasting-glucose trend, and
    HbA1c, so the hypothesis is anchored to *her* numbers;
  - **the evidence base:** the [healthspan model's](../healthspan-model.md) `SUPPORTS` edge
    (carbohydrate-load reduction → post-prandial glucose) rendered with its **evidence-strength
    label** on the hue-free ink-dot ramp (`●●●○` for the general effect), retrieved from the bundled
    corpus — not synthesised ([evidence](../evidence.md)).
  It also names the **confounders up front**: levothyroxine timing (absorption vs. breakfast timing
  affects energy), sleep quality, and the menstrual cycle phase — each something to watch, not ignore.
- **Value returned this step:** a sharp, falsifiable statement with its evidence graded and
  its confounders on the table — the difference between an experiment and a wish.
- **Modality:** voice/text refinement; inline evidence label + one concept card.
- **UX constraints / laws:** every external claim carries a tappable label (Law 3). Because this is
  her first n-of-1, the agent injects **one** concept card — *what a single-subject result can and
  can't establish* — inline, never a modal (Law 7; [epistemics](../epistemics.md)). Evidence strength
  uses the ink-dot ramp so it can never be mistaken for the green/amber privacy language.

!!! abstract "Grounded, with its ceiling stated"
    The evidence grounding is limited to what ships offline. The optional literature index would be a
    cloud fetch through the [PII gateway](../pii-gateway.md) — Maya declines it, so the agent says so
    plainly: *"external grounding here is the bundled guideline corpus only."*

### Step 3 — Pre-register the design (lock the bar before the data)

- **User intent here:** lock the rules so the verdict can't be moved after she sees the data.
- **User does:** walks the pre-registration card with the agent and confirms each field.
- **System does:** fixes the [experiment object](../experimentation.md) **before any data is
  collected** —

  | Field | Fixed value |
  |---|---|
  | `baseline` | `7 days` normal breakfasts, CGM on — establishes *her* natural morning variability |
  | `intervention` | Breakfast carbohydrate `< 20 g`, timing held constant |
  | `protocol` | `14 days`, simple pre/post; A-B-A reversal offered for a later re-run |
  | `metrics` | Primary: morning glucose SD & MAGE (CGM, Tier C — *trend-only*). Secondary: morning energy 1–5 (EMA, Tier D) |
  | `success_criteria` | Morning glucose SD **↓ ≥ 15%** vs. baseline **and** median energy **↑ ≥ 1** point — set **now**, greyed-out and locked once she starts |
  | `confounder_flags` | Levothyroxine timing, sleep < 6 h, illness, cycle phase |

  A **power/duration heuristic** reads the CGM marker's `noise` from the healthspan model and warns
  that a Tier C consumer sensor is noisy: 14 days can detect a 15% shift but not a 5% one — so the
  bar is set within what this design can actually detect.
- **Value returned this step:** a result she will *trust*, because the threshold was set while she
  was still ignorant of the outcome — the single thing that separates an n-of-1 from a rationalisation.
- **Modality:** guided form (confirm-per-field), values in monospace.
- **UX constraints / laws:** Law 8 — every threshold and window renders in tabular monospace. The
  power warning is the reciprocity payoff for the setup effort: she learns *before* investing 21 days
  whether the design can answer the question ([experimentation](../experimentation.md#methodology-support)).

### Step 4 — Run it: time-boxed capture that pays her back every log

- **User intent here:** stay adherent for three weeks without it feeling like a chore.
- **User does:** starts the window. Wears the CGM; logs each breakfast in **under 10 seconds**
  (photo-of-the-plate or one-tap "low-carb ✓"); answers a **one-question EMA** on morning energy.
- **System does:**
  - pulls sleep and resting HR **passively** from the Apple Watch stream (passive before manual — she
    never logs sleep);
  - lands CGM glucose by the zero-transit re-export path, deduped on re-import ([storage](../storage.md));
  - fires the energy EMA at a **contextually smart moment** (mid-morning, tied to this active goal),
    not on a fixed alarm;
  - updates a **live experiment view** on every log: adherence %, morning glucose curves overlaid on
    the baseline band, energy trend.
- **Value returned this step:** each capture *immediately advances her experiment* — the glucose
  curve redraws against baseline the moment she logs breakfast. This is a hypothesis-linked window,
  not a standing food diary; the reciprocity is instant and specific to *this* question
  ([data capture](../data-capture.md)).
- **Modality:** sub-10s capture (photo/one-tap/voice — see [low-friction capture](12-low-friction-capture.md));
  EMA micro-prompt; passive wearable ingest.
- **UX constraints / laws:** adherence is treated as a **product problem, not a user virtue** — the
  EMA does the remembering. Posture stays green; the CGM path is zero-transit by her own choice
  (Law 6). Offline is first-class — logging works with the network cable pulled.

### Step 5 — Mid-window: an adherence gap and a confounder, surfaced with their cost

- **User intent here:** not have a rough patch silently poison the result.
- **User does:** misses two breakfast logs on a travel day and reports a bad night's sleep via EMA.
- **System does:**
  - flags the **adherence gap** on the live view and states the consequence plainly: *"2 missing
    days reduce this window's power — the 15% bar is now detectable but with less margin,"* and offers
    to extend the window rather than pretend the gap didn't happen;
  - detects the flagged **confounder** (sleep < 6 h coincides with a glucose spike) and annotates that
    day so it can be down-weighted or excluded at analysis — visibly, with its reason, never silently.
- **Value returned this step:** a running status that states the lost power as it happens, instead
  of a corrupted dataset she'd only discover at the end. A gap costs *power*, visibly — it doesn't
  invalidate the run or hide.
- **Modality:** inline experiment-view annotations; an optional extend-window prompt.
- **UX constraints / laws:** trade-offs over verdicts — the system surfaces the trade-off (reduced
  power, confounded day) and lets her decide, rather than quietly dropping data. Confounder handling
  is shown with its reason (Law 3-adjacent transparency).

### Step 6 — The verdict: supported or inconclusive, never overclaimed

- **User intent here:** an answer she can act on — or an explicit "we don't know yet."
- **User does:** at day 21 opens the completed experiment.
- **System does:** the **local reasoner** compares the intervention window to baseline **against the
  pre-registered criteria only** — no moving the goalposts. It reports one of:
  - **Supported** — glucose SD fell ≥ 15% *and* energy rose ≥ 1, labelled `EVIDENCE: LOW` because a
    positive n-of-1 is low evidence, full stop ([experimentation](../experimentation.md#guardrails-against-overclaiming)),
    with A-B-A replication suggested before she treats it as settled;
  - **Inconclusive** — the likeliest outcome given Tier C noise and the missed days: the effect is
    smaller than this design can resolve. Framed as **informative, not a failure** — she learned the
    variance is larger than she guessed and the next window needs to be longer or the sensor upgraded.
  It never reports the single-window correlation as causation.
- **Value returned this step:** a trustworthy read on her own body, with its confidence stated
  outright — and *inconclusive is a respected, useful result*, not a dead end.
- **Modality:** text verdict with the comparison rendered; source cards to the underlying windows.
- **UX constraints / laws:** three greens throughout — the analysis ran on-device
  ([model providers](../model-providers.md)); the accepted trade is a weaker local model, **not**
  egress (Law 1, Law 4). Every claim carries its evidence label (Law 3).

### Step 7 — The belief updates and feeds the next turn of the loop

- **User intent here:** not lose what she learned; run the loop again, smarter.
- **User does:** accepts the verdict; optionally schedules an A-B-A re-run or refines the hypothesis.
- **System does:** writes the `result` back onto the stored [hypothesis](../evidence.md) and
  experiment, so future reasoning knows it ("*your last lower-carb-breakfast trial was
  inconclusive*"); the whole record — pre-registration, raw windows, verdict — is **durable and
  exportable** ([storage](../storage.md)), so a model update or reinstall never erases her
  experiment history ([verify & maintain](14-verify-and-maintain.md)).
- **Value returned this step:** the loop closes and compounds — the next experiment starts from a
  measured prior, not a blank slate.
- **Modality:** stored objects; optional re-run scheduling.
- **UX constraints / laws:** durability is a sovereignty guarantee — her experiment history is hers,
  locally, forever, and portable.

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | One tap on a flagged pattern | The observation becomes an editable experiment, sources carried over — no retyping |
| 2 | Refine the claim by voice | A falsifiable hypothesis, evidence-graded, confounders named up front |
| 3 | Confirm the pre-registered design | A locked success bar + a warning about what the design can detect, *before* investing 21 days |
| 4 | Wear a CGM, log breakfast in <10s, one EMA/day | Live glucose-vs-baseline redraw on every log; sleep pulled passively |
| 5 | Report a bad night; miss two logs | Live power/confounder status and an extend-window option — no silent corruption |
| 6 | Open the finished window | A trustworthy supported/inconclusive verdict, evidence-labelled, on-device |
| 7 | Accept the result | A durable, exportable belief that seeds the next loop |

## UX & modality constraints

- **Input modality:** voice/text to design and refine; sub-10-second photo/one-tap for the
  intervention log; single-question EMA for the subjective outcome; passive wearable ingest for
  sleep and resting HR.
- **Latency:** the design conversation and the final analysis stream over seconds on local inference
  — the wait is visible, never masked. A CGM re-import parses in the background; the app stays usable.
- **Offline:** the entire journey runs with the network disconnected — capture, EMA, and the local
  analysis all work offline (Maya's proof test).
- **Empty / error states:** an underpowered design is flagged at pre-registration, not silently run;
  an adherence gap is surfaced with its cost, not hidden; an inconclusive verdict offers the next
  best action (longer window, better sensor, A-B-A), never a dead end.
- **Accessibility:** evidence strength uses the hue-free ink-dot ramp; all values and thresholds are
  tabular monospace — colour never carries meaning that text doesn't also carry.
- **Dominant laws:** Law 3 (every claim labelled), Law 6 (the declined bridge still leaves a
  zero-transit path), Law 7 (the n-of-1 concept injects once), Law 8 (data over chrome). Posture
  (Law 1) never leaves green.

## Where it can break (and the fallback)

- **Underpowered by design.** A Tier C CGM plus a 14-day window can't resolve a small effect. The
  power heuristic says so *before* she starts ([healthspan model](../healthspan-model.md) marker
  `noise`) and offers a longer window or a note that only a large effect is detectable — the design
  states its own detection ceiling rather than manufacturing a finding.
- **Adherence gaps.** Missed logs are expected, not a moral failing. The EMA does the remembering;
  gaps are shown with their power cost and an extend-window option (Step 5). The verdict is computed
  over what was actually captured.
- **A confounder lands mid-window.** Illness, a poor-sleep night, a cycle-phase shift, or a
  levothyroxine-timing change is flagged against `confounder_flags`, annotated on the offending day
  with its reason, and down-weighted or excluded — visibly, never silently.
- **Inconclusive is not a failure.** When variability swamps the effect, the verdict is
  *inconclusive* ([experimentation](../experimentation.md)). It is reported as such — informative
  about her variance, pointing at a better next design — not dressed up as a weak positive.
- **CGM data path.** Because she declined the [bridge](07-add-bridged-connector.md), glucose arrives
  by zero-transit re-export, not live auto-sync. The cost is a manual re-export cadence during the
  window — convenience, never the data (Law 6). If a re-export is late, the live view shows a stale
  marker rather than silently interpolating.
- **She wants a stronger analysis.** A cloud reasoner could offer a more sophisticated model — but
  that is egress, and Maya declines it. The system honours her posture and runs the weaker local
  analysis, stating the trade rather than nudging her across the boundary
  ([AI transparency](../ai-transparency.md)).

## What good looks like

- The success bar was set **before** any data existed, greyed-out and locked — so whatever the
  verdict, Maya trusts it, because she couldn't have moved it.
- Every breakfast log and EMA visibly advanced *her* experiment in the moment — no generic diary,
  no effort without payback.
- An **inconclusive** result lands as a respected finding that sharpens the next window —
  the loop turns again, and the whole history stays local, durable, and hers.

## Related

- [Experimentation & Validation](../experimentation.md) — the experiment object, methodology support,
  and overclaiming guardrails this journey exercises.
- [Evidence & Hypotheses](../evidence.md) — the hypothesis object and the evidence-strength ladder.
- [Health Literacy & Epistemics](../epistemics.md) — the n-of-1 concept injected at first design;
  pre-registration and natural-variability education.
- [The Healthspan Model](../healthspan-model.md) — the `SUPPORTS` edge that grounds the hypothesis and
  the marker `noise` that powers the duration heuristic.
- [Data capture strategy](../data-capture.md) — time-boxed hypothesis-linked capture, sub-10s logging,
  EMA prompts, adherence as a product problem.
- [Model providers](../model-providers.md) · [AI transparency](../ai-transparency.md) — why the
  analysis stays local and what the accepted trade is.
- **Adjacent journeys:** [The anchor query](09-anchor-query.md) seeded the hypothesis ·
  [Low-friction capture](12-low-friction-capture.md) is the sub-10s logging this window relies on ·
  [Connect wearables](04-connect-wearables.md) supplies the passive sleep stream ·
  [Verify & maintain](14-verify-and-maintain.md) is why her experiment history is durable.
