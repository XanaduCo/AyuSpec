# Journey 12 — Low-friction capture — supplements, symptoms, voice

> **Who:** Maya Okonkwo, 39 (she/her) — the sovereign purist · **Intent:** get supplements, symptoms, and intake into her record without it becoming a second job — every log paid back in the same tap · **Entry surface:** the capture micro-UX (photo / voice / one-tap EMA), surfaced in context rather than as a form · **Egress posture:** 🟢 green — all three roles local, nothing leaves the machine · **Primary modality:** photo-of-the-bottle, voice, one-tap EMA prompts

## The intent

Maya has done the hard part — her record is bootstrapped, her wearables stream, and she has an
active n-of-1 experiment running. What she will *not* do is babysit a habit tracker. She has
abandoned every food diary and mood app she ever tried, and she knows why: they demanded effort
today and promised value "later, once you've logged enough." She chose ayuOS partly on the promise
that it treats **adherence as a product problem, not a test of her discipline**
([data capture](../data-capture.md#cross-cutting-principles)). The job she's hiring capture for
here: *"detect what you can, ask me only for what you genuinely can't, keep every manual log under
ten seconds, and hand me something back the instant I give you something."*

## Preconditions

- ayuOS is running self-hosted; her Apple Watch stream is live via
  [Journey 03](03-apple-health-bootstrap.md) and her wearable connectors from
  [Journey 04](04-connect-wearables.md) (activity, HR, HRV, sleep).
- She takes **levothyroxine** for Hashimoto's, recorded as a `MedicationStatement`. This is the
  interaction baseline every new intake is checked against.
- She has an **active experiment** — energy/mood against a supplement change — running from
  [Journey 11](11-run-experiment.md). Its outcome metric is what the EMA prompt advances.
- Posture is **sovereign**: reasoner · tools · medical are all local Ollama models. Voice
  transcription runs **on-device** (her setting; see the [frontend](../frontend.md) open question on
  STT). Nothing in this journey egresses.

!!! warning "Interventions are the highest-liability data in the system"
    A supplement/med log is the most important record for attributing any change *and* the most
    dangerous to get wrong — interactions and dosing are safety concerns, not completeness ones
    ([data capture](../data-capture.md#lifestyle-interventions)). Capture accuracy here is held to a
    higher bar than anywhere else in the product: a parse is shown with its confidence, an
    interaction is surfaced before the log is accepted, and anything clinically significant is
    **routed to a clinician (red), never silently stored**.

## Walkthrough

### Step 1 — Passive before manual: the run she never logged

- **User intent here:** not log the obvious. She went for a run this morning; her watch already
  knows.
- **User does:** *nothing.* She opens ayuOS for an unrelated reason and sees a lightweight card:
  *"Logged a 6.2 km run at 07:10 from Apple Watch — correct?"* with a single **Looks right** tap and
  a quiet **Edit**.
- **System does:** infers the activity from the wearable stream that already exists
  ([passive inference](../data-capture.md#cross-cutting-principles)), writes it as an activity
  `Observation`, and *asks for confirmation only*, not for entry. Manual capture is the last resort,
  reached only for what no stream can detect.
- **Value returned this step:** the single largest category of "logging" — exercise — happens with
  zero typing. She confirms in one tap or ignores it; either way the record is right.
- **Modality:** passive detection → one-tap confirm.
- **UX constraints / laws:** posture stays three-green (Law 1) — inference is local. Data over chrome
  (Law 8): distance/time in tabular monospace. The card is a *confirmation*, never a blocking modal
  (Law 7). This is the same wearable stream connected in [Journey 04](04-connect-wearables.md).

### Step 2 — Supplement intake by photo-of-the-bottle (<10s) — with a safety check

- **User intent here:** record a new supplement she just started, without transcribing a label full
  of names and doses.
- **User does:** taps **＋ → Photo a bottle**, points the camera at an iron supplement label, and
  shoots. One frame. Under ten seconds, camera to done.
- **System does:** a **local doc-VLM (MedGemma vision)** reads the label — product, ingredient,
  strength, form — and drafts a `MedicationStatement` with each parsed field shown at its **parse
  confidence** (an evidence-dot rating, `●●●●` HIGH → `○○○○`). Before it accepts the log, it runs an
  **interaction check against her levothyroxine** and surfaces the result inline: *"Iron reduces
  levothyroxine absorption — separate the two by ~4 hours"* with a tappable evidence label.
- **Value returned this step:** the reciprocity made literal — she snapped a photo and got back a
  **safety flag she did not know**, in the same step. The dosing guidance is worth more than the log
  itself, and it arrived before the log was even confirmed.
- **Modality:** photo → local extraction → one-tap confirm.
- **UX constraints / laws:** interventions are highest-liability — the interaction check is
  mandatory, not opt-in (safety). Every claim carries a label (Law 3): the interaction note expands a
  concept card with her own two meds as the worked example. Green throughout — the label never left
  the device (color language). Confidence-graded interpretation: low-confidence fields are flagged
  for her to correct, not silently trusted.

### Step 3 — A symptom EMA fired at a smart moment, tied to her live experiment

- **User intent here:** she cares about energy and mood — but she will not fill out a standing daily
  survey.
- **User does:** mid-afternoon, a single micro-prompt appears (the moment her experiment protocol
  targets): *"Energy right now?"* on a 1–5 tap scale, plus an optional one-word mood chip. One tap,
  optionally two.
- **System does:** fires an **EMA micro-prompt** (1–2 questions max) at a *contextually smart moment*
  tied to her **active experiment**, not a fixed alarm ([self-feedback](../data-capture.md#self-feedback)).
  The tap writes the outcome metric straight into the experiment's window and updates its progress on
  the spot.
- **Value returned this step:** the tap **advances her running experiment** immediately — she sees
  the day tick over on the experiment's baseline-vs-intervention chart. The ask *is* the payoff; she
  isn't feeding a database for a rainy day, she's moving her own study forward.
- **Modality:** one-tap EMA (1–2 questions).
- **UX constraints / laws:** the prompt is scoped to an active goal, never a standing survey — this is
  the manual-capture path [Experimentation](../experimentation.md#capturing-the-inputs) depends on.
  Education injects, never nags (Law 7): prompts **retire and adapt** — if she stops answering a
  prompt, it backs off rather than escalating (over-prompting fatigue is a designed-against failure,
  not her fault).

### Step 4 — Voice log: a spoken sentence becomes structured data

- **User intent here:** capture something she started, hands-free, while making tea.
- **User does:** taps the mic (or says the wake phrase) and speaks: *"Started taking magnesium
  glycinate at night."* No form, no fields.
- **System does:** **on-device STT** transcribes it, the local tool-caller (Qwen) parses it into a
  structured `MedicationStatement` — substance *magnesium glycinate*, timing *night*, start *today* —
  and presents a **one-tap confirm** with each field editable. It also notes, quietly and correctly,
  that a nighttime dose is already **separated** from her morning levothyroxine, so no timing conflict
  applies.
- **Value returned this step:** a full structured record from one spoken sentence — zero fields typed.
  The confirm card is the correction surface if the parse misheard (*"glycinate," not "citrate"*), so
  a misparse costs one tap, not a re-do.
- **Modality:** voice → on-device transcription → structured draft → one-tap confirm.
- **UX constraints / laws:** posture three-green (Law 1) — STT and parse are both local; if her only
  STT option were a cloud one, the voice affordance would be **disabled with its reason shown**, and
  she'd type instead (fallback beside the tier, Law 6). Confidence-graded: an uncertain token is
  highlighted for confirmation, honest about what it heard.

### Step 5 — The anti-pattern it refuses: no standing food diary

- **User intent here:** she expects, from every past app, to now be nagged to log meals. She is not.
- **User does:** looks for a food log — and finds there isn't one. Nutrition capture is offered **only
  inside a time-boxed experiment window**, surfaced when she starts a CGM/diet experiment, never as an
  always-on tracker.
- **System does:** withholds the standing diary by design. Nutrition and CGM run as **time-boxed,
  hypothesis-linked capture** ([data capture](../data-capture.md#lifestyle-interventions)) — her
  14-day CGM windows, tied to a specific hypothesis in [Journey 11](11-run-experiment.md), are the
  *only* place meals get logged, and only for that window, with the CGM stream giving her fast
  feedback in return.
- **Value returned this step:** the absence *is* the value — she is never asked to log food for its
  own sake. When she does log meals, it is inside a bounded experiment that pays back with two-week
  glucose feedback, then closes. No open-ended diary to abandon.
- **Modality:** (deliberately none — capture is scoped into the experiment surface).
- **UX constraints / laws:** time-boxed over standing — the highest-friction stream in the product is
  never a default. This is the reciprocity rule enforced by *removal*: work with no in-step payoff is
  designed out, not asked for.

### Step 6 — Where the logs land, and why they were worth it

- **User intent here:** confirm the captures actually did something — that ten seconds here and a tap
  there add up.
- **User does:** opens **Ask** and types *"what have I started in the last two weeks, and does any of
  it clash with my thyroid meds?"*
- **System does:** answers **locally** over the `MedicationStatement`s from the photo and voice logs,
  the confirmed run, and the EMA points — surfacing the iron/levothyroxine separation flag again with
  a source-backed label, all rows clickable to the underlying FHIR resource. The same logs feed her
  running experiment's attribution ([Journey 11](11-run-experiment.md)) and enrich the record the
  anchor query reads ([Journey 09](09-anchor-query.md)).
- **Value returned this step:** the loop closes — a handful of sub-ten-second captures become a
  grounded, safety-aware answer and a moving experiment. Every ask was already paid back; this is the
  compounding on top.
- **Modality:** Ask (text) → local synthesis.
- **UX constraints / laws:** three greens in the header (Law 1); the synthesis **streams over
  seconds**, not instantly (honest local latency). Each claim tappable to source (Law 3).

## Exchange ledger

| Step | What we ask of the user | What they get back immediately |
|---|---|---|
| 1 | One tap to confirm an auto-detected run (or nothing) | Exercise logged with zero typing — the biggest category, captured passively |
| 2 | Snap one photo of a supplement bottle | A parsed `MedicationStatement` **plus** an interaction/dosing flag against her levothyroxine she didn't know |
| 3 | One tap on an "energy right now?" prompt | Her live experiment advances on the spot — the tap moves her own study forward |
| 4 | Speak one sentence, one tap to confirm | A full structured med record from a spoken line — misparse fixed in one tap |
| 5 | *(nothing — no food diary asked)* | Freedom from a standing tracker; nutrition only inside a bounded, paying-back experiment window |
| 6 | Ask one question | A local, evidence-labeled answer over everything just captured, re-surfacing the safety flag |

## UX & modality constraints

- **Input modalities:** passive detection + one-tap confirm (Step 1), camera/photo (Step 2), one-tap
  EMA (Step 3), voice + on-device STT (Step 4), and finally Ask (Step 6). Each manual path is built to
  the **sub-ten-second** rule; anything slower is redesigned or removed.
- **Color semantics dominant here:** **green throughout** — photo extraction, voice transcription,
  parsing, and interaction checks all run on local models; nothing egresses, so Law 4 (egress preview)
  barely applies. The one place **red** appears is an interaction serious enough to route to a
  clinician (below) — a stop, not a decoration.
- **Laws that bind this journey:** Law 1 (posture stays three-green — capture must not quietly invoke
  a cloud model), Law 3 (parse confidence and interaction claims are labeled and tappable), Law 7
  (prompts inject and **retire**, never nag or block), Law 8 (doses, distances, and codes in tabular
  monospace).
- **Latency:** photo extraction and voice parse resolve in a second or two on-device; the Step 6
  synthesis streams over seconds. None of it is instant, and the UI says so rather than faking speed.
- **Offline:** first-class. Every capture path — photo, voice, EMA — works with the network cable
  pulled, because every model is local. This is precisely the property Maya periodically tests.
- **Empty / error states:** a low-confidence parse never silently commits — it opens the confirm card
  with the uncertain field flagged for correction. If no experiment is active, the EMA simply doesn't
  fire (no prompt without a goal to serve).

## Where it can break (and the fallback)

!!! warning "A high-liability interaction routes to a clinician — it is never silently accepted"
    Absorption/timing notes (iron, calcium, magnesium vs levothyroxine) are shown inline and the log
    proceeds. But an interaction that is **clinically significant** — a genuine drug–drug or
    drug–condition risk — is rendered **red**, the log is held pending review, and the user is routed
    to compose a question for their clinician ([Journey 13](13-share-doctor-packet.md)). ayuOS
    surfaces and routes; it does not adjudicate a dangerous interaction on its own.

| Failure | What Maya sees | Fallback |
|---|---|---|
| **Misparsed photo** (wrong strength, missed ingredient) | The confirm card shows the field at low confidence (`○○○○`), highlighted | One tap to correct the field; nothing commits until she confirms — parse errors cost a tap, not a bad record |
| **Misparsed voice** (*"citrate"* heard for *"glycinate"*) | The transcript and structured draft are shown before saving | One-tap edit on the confirm card; the confirm surface *is* the correction surface |
| **Serious interaction detected** | A **red** block, log held, "raise this with your clinician" | Routed to the doctor-packet composer ([Journey 13](13-share-doctor-packet.md)); never auto-stored, never dismissed silently |
| **Over-prompting fatigue** (she stops answering EMAs) | Prompts quietly reduce, then pause | The prompt **retires and adapts** — adherence is the product's problem to solve, not hers to power through |
| **On-device STT unavailable** (only a cloud STT offered) | The mic affordance is disabled with its reason shown | She types the same sentence — the fallback sits beside the tier (Law 6); sovereignty is never traded for the feature |
| **Camera/OCR can't read a label** | *"Couldn't read the label — type it or try voice"* | The manual/voice path is offered as the next best action, never a dead end |

## What good looks like

- **Most "logging" happened without her.** The run was detected, the EMA was one tap, the meds came
  from a photo and a sentence — she never opened a form, and she never abandoned a tracker because
  there was nothing standing to abandon.
- **A capture returned safety, not just a record.** Photographing a bottle handed her a
  levothyroxine-absorption flag she didn't know — effort in, value back, same step.
- **Every tap moved something real.** The energy prompt advanced her live experiment; the med logs
  fed her record and her attribution. No capture was busywork banked for later.
- **Sovereignty held under load.** Photo, voice, EMA, and interaction checks all ran on local models,
  green the whole way — she could pull the cable mid-capture and lose nothing.

## Related

- [Data capture strategy](../data-capture.md) — passive-before-manual, sub-10s logging, adherence as a
  product problem, interventions as highest-liability, time-boxed nutrition
- [Experimentation & validation](../experimentation.md) — the n-of-1 loop these logs feed; the
  minimal-friction manual-capture requirement
- [Evidence & hypotheses](../evidence.md) — the evidence/confidence labels the parse and interaction
  checks carry
- [Frontend & UI](../frontend.md) — the capture surfaces, voice input, and the on-device-STT question
- [Healthspan model](../healthspan-model.md) — the intervention library the interaction check reads
  against · [Epistemics](../epistemics.md) — the concept cards a tapped label opens
- **Adjacent journeys:** [04 — Connect wearables](04-connect-wearables.md) (the passive stream Step 1
  reads) · [11 — Run an n-of-1 experiment](11-run-experiment.md) (what consumes these logs; where
  nutrition/CGM capture is time-boxed) · [09 — The anchor query](09-anchor-query.md) (the record these
  captures enrich) · [13 — Share a doctor packet](13-share-doctor-packet.md) (where the captured
  medications and values get scoped into a clinician brief)
