# AyuBot — the background agent

!!! note "Status: principles fixed, generation layer future"
    Renamed and reframed 2026-08 (formerly Hermes, specced as a messaging-only channel that did
    not reason — that framing is retired; see [How AyuBot reasons](#how-ayubot-reasons)). The
    messaging principles, the non-response policy, the channel/egress model, and the
    outbound-message contract below are decided. The AI workflow that *generates and schedules*
    messages (which model role drafts copy, how timing is learned) is future work — this page
    specs its inputs and outputs only. See [Open questions](#open-questions).

## Overview

AyuBot is ayuOS's autonomous background agent. It works on the user's health data between
sessions: as data lands in the store — a wearable sync, a lab PDF, a closed experiment window —
it runs the same two-stage discipline as the rest of the system (mechanistic change detection
first, model salience second — [agent loop](agent-loop.md)), and it **initiates a conversation
when something purposeful needs the user**. "Purposeful" is a closed set, and it defines the
product:

1. **Goal-relevant change notification.** When a change clears its marker's noise floor *and*
   the salience pass judges it material against a goal the user actually holds, AyuBot says so.
   This is how a change reaches a user who hasn't opened the app — and the two-stage gate is
   what keeps it from becoming a model narrating every delta. Sub-noise wiggles and goal-free
   trivia never generate a message.
2. **Goal information collection.** ayuOS's model of the user's goals is always incomplete.
   When a specific gap exists whose answer would change a decision — is the training block
   still aimed at the October race? does "sleep better" mean duration or continuity? — AyuBot
   asks the one sub-10-second question that fills it, so the agent has more to work with. One
   question, never a questionnaire, per the
   [minimum-necessary-question rules](data-capture.md#cross-cutting-principles).
3. **Targeted adherence recording.** An n-of-1 experiment is only as good as its adherence
   record. "Did you take it / do it today?" answered in one tap, at the right moment, is the
   difference between an analyzable experiment and a guess. AyuBot is how
   [Experimentation](experimentation.md) gets consistent intervention data without the user
   keeping a diary.
4. **Journal-type capture.** Subjective states, context, and confounders — "energy crashed at
   3pm", "skipped sauna, traveling", a photo of a meal — are data no sensor can reach. AyuBot
   is the intake for the one class of signal that only exists if the user says it.

AyuBot is also still the delivery mechanism for the EMA micro-prompts the
[data-capture strategy](data-capture.md#cross-cutting-principles) commits to, and the
manual-capture path [Experimentation](experimentation.md#capturing-the-inputs) depends on. It
inherits every cross-cutting capture principle — passive before manual, sub-10-second logging,
time-boxed hypothesis-linked capture, adherence as a product problem — and adds the messaging
discipline this page defines. Its primary home is the conversation thread in the
[Companion App](companion-app.md), the surface where everyday interaction with ayuOS happens.

**What AyuBot is not:** a cheerleader, an engagement surface, or a replacement for
[Ask](frontend.md) — deliberate investigation the user starts is Ask's job; AyuBot's thread is
for what the *agent* starts, plus the quick captures and one-word controls that belong in a
messaging surface. It has no streaks, no scores, no personality-driven banter, and no opinion
about whether you've been "consistent lately". A messaging bot that wants your attention is an
adversary; AyuBot wants your goals served, your data-of-record complete, and your attention
back.

## How AyuBot reasons

AyuBot is not a separate intelligence and not a dumb pipe. It runs on the standard
[agent loop](agent-loop.md) with the same [model roles](model-providers.md) as any foreground
question — the difference is what stands in for the user's query and what gates the output:

| | Foreground (Ask) | Background (AyuBot) |
|---|---|---|
| Triggered by | The user's question | Data arriving, a window closing, a schedule or due date firing |
| Goal term | Stated, carried, or established by a clarifying turn | Always required up front: an active goal, experiment, or plan — no goal term, no run worth messaging about |
| Stage 1 | Mechanistic change detection, noise-gated | Same, identical code path — no model sees sub-noise deltas |
| Stage 2 | Model salience against the goal term | Same, and stricter: the output must justify an *interruption*, not just a sentence |
| Output | An answer, evidence-labeled | A message that passes the [purpose](#principle-1-why-we-message-no-message-without-a-purpose), [budget](#the-message-budget), and [salience](#the-salience-gate) gates — or, far more often, a silent write to the record |
| Disclosure | Status indicator, pre-send review, [call ledger](ai-transparency.md#3-call-ledger) | Identical — every model call AyuBot makes is ledgered like any other; cloud roles pass the [PII gateway](pii-gateway.md) |

Most of AyuBot's runs end in silence: state updated, findings filed to [Now](frontend.md#now),
no message sent. That asymmetry is the design. The agent works continuously; it speaks rarely,
and only through the purposes below.

Everything AyuBot decides lands in the existing stores — adherence records, observations, goal
and plan objects, findings on Now. There is no AyuBot-private silo: delete AyuBot and every
record it captured or surfaced is still yours, in place, because it was always written to the
record first and messaged second.

---

## Principle 1 — Why we message: no message without a purpose

**Every outbound message is traceable to a purpose the user opted into.** Not "notifications
enabled" — a specific, inspectable purpose: this experiment, this goal, this schedule the user
set. The purpose is carried on the [message object](#the-outbound-message-object) and shown in
the UI ("why this message"), the same way every model call carries its trigger in the
[ledger](ai-transparency.md#3-call-ledger).

The complete list of legitimate purposes:

| Purpose | Opt-in that authorizes it | Fires when |
|---|---|---|
| **Change notification** | An active [goal](companion-app.md#goal) (notification on by default at goal creation, mutable per goal) | The two-stage pipeline promotes a change: past its marker's noise floor (mechanistic), then salient against that goal (model) — see [the salience gate](#the-salience-gate) |
| **Goal question** | An active goal | The agent identifies a specific gap in its model of the goal whose answer would change a decision — one sub-10-second question, never a questionnaire |
| **Adherence check** | Starting an [experiment](experimentation.md) (the protocol states its check cadence up front) | The protocol's dose/behavior window passes without a passive signal confirming it |
| **EMA micro-prompt** | An active goal or experiment whose outcome metric is subjective ([self-feedback](data-capture.md#self-feedback)) | The contextually smart moment the protocol targets |
| **Confounder capture** | Same experiment opt-in | A signal suggests a confounder — travel detected, a rough night's sleep, a training spike — and the experiment's `confounder_flags` list it |
| **Due-date reminder** | The [due-date engine](data-capture.md#screening-history) (on by default, mutable per item) | A screening or re-test comes due |
| **Scheduled journal prompt** | The user set the schedule themselves | The user's own schedule |
| **Plan check-in (pre-action)** | Committing a plan in the [Companion App's plan loop](companion-app.md) | Shortly before a committed action's likely window |
| **Plan reconciliation (post-action)** | Same plan commitment | The completed activity syncs; bundles tracked-issue follow-ups |
| **Periodic plan review** | Same plan commitment | Once per plan period (weekly default) |

Everything else is banned. Explicitly:

- **No streaks, no badges, no "7 days in a row!"** Adherence data is for the analysis, not for
  gamifying the user.
- **No re-activation.** "We miss you", "it's been a while", "come see what's new" — never.
  Absence is not a problem AyuBot solves; it isn't a problem at all.
- **No engagement-timed content.** Nothing is sent because a metric of ours (open rate,
  session count) would improve. AyuBot has no such metric.
- **No goal-free insight.** "Your steps were up 4%!" is not a finding; it is engagement wearing
  a lab coat. A finding may initiate a conversation only through `change_notification` —
  anchored to a goal the user holds, past its noise floor, past the salience gate, inside the
  budget. Everything below that bar waits on [Now](frontend.md#now) for the user to come back.
  Safety-critical routing remains a separate path with its own rules, and is not AyuBot's
  call — see [agent loop](agent-loop.md).

The corollary is the load-bearing one: **if there is no active goal, no active experiment, and
nothing due, AyuBot is silent.** Silence is the default state, not a failure state. A user with
no goals stated and no experiment running hears nothing — and that is the behavior working as
designed.

### The salience gate

The predecessor rule here was blunter: findings were never pushed at all. What replaced it is
not a looser rule but a sharper one. Notifying the user about a change is now one of AyuBot's
jobs — it is how changes reach a user between sessions — and it passes three gates, in order,
all mandatory:

1. **Mechanistic first.** A change candidate exists only if stage 1 — deterministic,
   noise-gated, model-free — says the marker moved past its own noise floor. No model ever
   sees, let alone narrates, a sub-noise delta. This is the project's
   [two-stage rule](agent-loop.md), applied at the notification boundary where it matters most.
2. **Goal-anchored salience.** Stage 2 asks not "is this interesting?" but "is this material
   *to a goal this user holds*, right now?" A change with no goal to be salient against — however
   novel — fails the gate and files to Now instead. The goal term is recorded on the message;
   an inferred anchor is declared as inferred, same as in the
   [clarifying-turn rules](agent-loop.md#the-clarifying-turn).
3. **Budget and timing last.** A promoted finding still spends the same
   [per-day budget](#the-message-budget) as every other purpose, respects quiet hours, and
   batches when the budget is spent. Salience buys a message, not an exemption.

What the notification carries is deliberately small: the one-line finding with its
[evidence label](evidence.md#strength-of-evidence-labeling), the goal it is anchored to, and a
link into the record. The full picture — comparisons, history, caveats — lives where it always
did, in [Now](frontend.md#now) and the store; the message is a doorway, not an essay. A
notified finding still appears on Now, marked as notified rather than silently cleared.

---

## Principle 2 — How we message

### Answerable in under ten seconds

Every prompt is designed to the [sub-10-second rule](data-capture.md#cross-cutting-principles),
and most should resolve in under three. The affordance is part of the message, not left to the
user's initiative:

| Affordance | Used for |
|---|---|
| One-line finding + open-in-app link | Change notifications (nothing to answer; tapping is optional) |
| One-tap chips (`took it` / `skipped` / `snooze`) | Adherence checks |
| Chips or a single line | Goal questions |
| Numeric tap scale (1–5) + optional one-word chip | EMA subjective scores |
| Single line of free text | Context, confounders, anything |
| Photo | Meals (inside an experiment window), supplement bottles |
| Voice line | Everything free text covers, hands-free |

**One question at a time.** A message never stacks asks. If an adherence check and an EMA are
both due, they are sequenced (and usually batched — see the budget), never combined into a
two-part question.

**Every message says what it's for.** Not a paragraph — a line: *"logging adherence for your
post-meal-walk experiment (day 18 of 30)"*, *"this is about your cardiac goal."* The user
should never have to wonder why they were messaged, and the answer should never be
"engagement".

### The message budget

Messaging capacity is a budget, spent against purposes, not a firehose:

| Budget rule | Default | Notes |
|---|---|---|
| Per-day cap, all purposes | 3 | User-adjustable down to 0 (which mutes AyuBot entirely). Change notifications and goal questions spend from the same cap — reasoning earns no exemption |
| Per-experiment cap | Set by the protocol at design time | An experiment that needs more than ~1–2 prompts/day is a protocol design smell — fix the protocol, not the budget |
| Quiet hours | Detected sleep window + user-set hours | Never mid-night, ever. Wearable sleep detection extends the user's set window when they sleep late |
| Timing | Chosen from context | After the logged workout window, after the meal window the protocol targets, not during a detected commute or meeting block where signals allow. A fixed alarm is the fallback, not the design |

When the budget is exhausted, remaining asks **batch to the end-of-day digest** (one message,
multiple one-tap items) rather than spilling over. The budget state is carried on every message
object and shown in the inspector — "2 of 3 today" is a fact the user can check, not a vibe.

### Tone

| Rule | Yes | No |
|---|---|---|
| Plain | "Walk after dinner yesterday?" | "Time for your daily wellness check-in!" |
| Warm, not chipper | "No rush — end of day is fine." | "You've got this!! 💪" |
| Zero guilt | "Marked as not recorded." | "You missed 3 check-ins this week 😢" |
| States its purpose | "…this feeds day 18 of your walk experiment." | *(unexplained ask)* |
| No exclamation-mark cheeriness | — | Any of it |

AyuBot reads like a good lab assistant: brief, warm, precise about what the message is for, and
completely unbothered when the answer is no.

---

## Principle 3 — Non-response: silence is signal, not failure

Most messaging products treat a non-response as a retention emergency. AyuBot treats it as
**data**. A user who doesn't answer is telling us something — busy, uninterested in this
category, done with this experiment — and the correct response is to listen, record honestly,
and back off.

### The backoff ladder

Non-response walks down an explicit ladder, per thread (a thread ≈ one purpose stream, e.g.
"adherence checks for experiment X"):

| Rung | Trigger | Behavior |
|---|---|---|
| 1 · **Skip** | One unanswered prompt | The prompt is not repeated. The next scheduled one fires normally. |
| 2 · **Batch** | ~2–3 consecutive unanswered | Individual prompts stop; asks collapse into the end-of-day digest (one message, one-tap items). |
| 3 · **Weekly** | Digest goes unanswered ~a week | Down to one weekly summary message with catch-up taps ("mark the week: mostly yes / mixed / mostly no / leave blank"). |
| 4 · **Dormant** | Weekly unanswered twice | The thread goes silent. A single plain notice says so: *"Pausing adherence pings for this experiment — data will be marked not-recorded. Say 'resume' anytime."* |

Never on the ladder: repeating an unanswered question, escalating urgency, guilt copy, or
"are you still there?". The ladder only ever steps **down** in volume; answering steps it back
up (one answered digest returns the thread to normal cadence).

Change notifications ask for nothing, so an unread one has no rung to walk — it is never
re-sent. But consistently ignored notifications for a goal are still signal, and the auto-mute
rule below applies to that category like any other.

### Missing means missing

An unanswered adherence check is recorded as **`not_recorded`** — a first-class value, not a
gap to paper over. In the [experiment analysis](experimentation.md#analysis):

- Missing days are **shown** in the adherence record (Ravi's demo experiment reads 21/30, not
  "21 ✓") and **counted against the experiment's power**, degrading confidence honestly.
- Missing is **never imputed** — not as "probably took it" (adherence bias), not as "probably
  skipped" (the opposite bias). An analysis that silently fills gaps is manufacturing evidence,
  which is exactly what the [overclaiming guardrails](experimentation.md#guardrails-against-overclaiming)
  exist to prevent.
- A stretch of missing data that undermines the pre-registered window is surfaced as such:
  the verdict degrades toward *inconclusive* and says why.

The same rule governs goal questions: an unanswered question leaves the gap open and disclosed.
AyuBot never fills in the user's goals for them from silence.

This is the same honesty rule the rest of the system runs on: a disclosed hole beats a smoothed
one.

### Auto-mute, disclosed

Repeated non-response to a *category* (e.g. every EMA, across experiments; every notification
for a goal) auto-mutes that category — and **says so**, in one plain message, with the one-word
way back. AyuBot never concludes "try a different time of day and keep pushing"; it concludes
"this user doesn't want these" and stops.

And at any time, in any thread, the user can steer with a single word: **`mute`** (this
thread), **`snooze`** (today), **`weekly`** (jump straight to rung 3), **`resume`**,
**`stop`** (everything). No settings excavation required; the words are honored from any
channel, and confirmed in one line.

---

## Principle 4 — Journal-type capture: the data no sensor can get

The intake half of AyuBot's job is the signals that only exist as the user's own words:
subjective states, context, confounders, and the interventions record's long tail.

**Input is whatever's cheapest for the user:**

- Free text: *"energy crashed at 3pm"* · *"skipped sauna, traveling"*
- Voice: the same sentence spoken; transcribed per the configured STT (on-device where the
  posture requires it — see [Journey 12](journeys/12-low-friction-capture.md))
- Photo: a meal (inside a time-boxed experiment window only — no standing food diary, ever), a
  supplement bottle
- One-line context replies to a confounder prompt or goal question

**Extraction is graded, shown, and correctable — never silently asserted.** From each entry,
the local extractor drafts structure:

| Extracted | Example from *"skipped sauna, traveling — slept badly in the hotel"* | Lands as |
|---|---|---|
| Adherence mark | sauna → `skipped` for today | The experiment's adherence record |
| Confounder flag | `travel`, `poor_sleep` | The experiment's `confounder_flags` window |
| Subjective score | sleep quality: low (inferred, low confidence) | Self-feedback observation |
| Intervention change | *(none here; "started taking X" would draft a `MedicationStatement`)* | Medication/supplement record, via the [photo/voice capture path](journeys/12-low-friction-capture.md) |
| Goal signal | *(none here; "training for a spring half instead" would draft a goal update)* | The [goal object](companion-app.md#goal), with provenance |

Three rules, all inherited from how the rest of the system treats noisy input:

1. **Provenance on every extraction.** Each structured field records that it was extracted from
   this journal entry, by which model, at what confidence — same discipline as the
   [psychographic profile](data-capture.md#psychographic-preference-signal).
2. **Shown for correction, sub-10-seconds.** AyuBot replies with what it extracted as tappable
   chips (*"logged: sauna skipped · travel flag · edit?"*). A wrong extraction costs one tap,
   not a re-type. Low-confidence fields are flagged, not silently committed.
3. **The raw entry is kept.** Text, transcript, and photo are stored alongside the extraction.
   The structure is an interpretation; the user's words are the record. Re-extraction with a
   better model later is possible only because the raw survives.

The reciprocity rule from [data capture](data-capture.md) applies with full force: every
journal entry pays back in the same exchange — a confounder flag lands visibly on the
experiment timeline, an adherence mark ticks the day over, a bottle photo returns an
interaction check, a goal answer sharpens the next recommendation. AyuBot never asks for data
whose value the user can't see land.

---

## Principle 5 — Channels & privacy: a messaging agent implies egress, so channels are tiered

Here is where AyuBot diverges hardest from the products that inspired its messaging surface.
Illume-style companions are SMS-first: convenient, and every message — including your meal
photos and your "felt awful today" — transits a messaging vendor and the product's cloud. ayuOS
will not pretend that's a neutral choice. Per the project's rules, every egress claim below is
scoped to a configuration, and every convenient tier is paired with its zero-transit fallback.

| Channel | Configuration | Transit | Status |
|---|---|---|---|
| **ayuOS Companion App** ([mobile](companion-app.md)) | Self-hosted + companion app | Push wake-up transits Apple's APNs / Google's FCM (content-minimized); payloads sync device↔store directly | **Primary surface** — where the AyuBot thread lives |
| **ayuOS web app / PWA push** | Self-hosted, local network | None beyond the LAN. Prompt, reply, photo, voice all terminate at the user's own store. | Default, free — the standing fallback |
| **Local-network chat surface** | Self-hosted; any device on the LAN | None beyond the LAN | Default, free |
| **Bridged: SMS / WhatsApp / Telegram / Signal** | Any deployment, **opt-in per channel** | **Message content transits the carrier/vendor.** Labeled as such at opt-in, content-minimized, gateway-enforced, ledgered | Opt-in add-on |

**The default self-hosted configuration with local channels runs AyuBot with zero third-party
transit:** no prompt, reply, or photo leaves the user's network, because no code path sends it
anywhere. That is a property of *this* configuration; the Companion App adds only the
content-minimized push wake-up, and the bridged channels below trade more away explicitly,
never silently.

### Bridged channels: convenient, labeled, minimized

Some users will only answer a bot that reaches them where their messages already are. The
bridge exists for them — under the same rules as every other bridged tier
([Tiers, Axis 3](tiers.md#axis-3-connections)):

- **Opt-in per channel, never default.** The consent prompt states plainly that message content
  transits the carrier or vendor (and, for SMS, is not end-to-end encrypted).
- **Content-minimized.** The bridge carries the least that still works. Where the channel
  supports it, the outbound message is a nudge — *"Adherence check ready · tap to log"* — with
  a link that opens the local/PWA surface, so the health content never rides the bridge.
  Where the user chooses full-content messaging for convenience (answering `y`/`n` by SMS is
  the whole point for some), that choice is made eyes-open at opt-in, per channel.
- **Gateway-enforced.** Outbound bridged content passes the [PII gateway](pii-gateway.md) like
  any egress — there is no separate messaging code path around the chokepoint — and every
  bridged send lands in the [call ledger](ai-transparency.md#3-call-ledger) with its payload,
  channel, and destination. The transparency guarantee is the same one model calls get:
  where the architecture can't guarantee privacy (a message on Vodafone's network is not
  ours to protect), disclosure and the ledger are the guarantee.
- **The fallback is always standing.** Turn a bridged channel off — or lose it — and every
  message routes to the local channels instead. You lose reach-me-anywhere convenience; you
  never lose AyuBot, the experiment, or a byte of recorded history.

Inbound over a bridge (the user texting a photo from a beach) is the user's own choice of
transport for their own data; it is ingested on arrival and stored locally like any capture.
The asymmetry is deliberate: we constrain what *we* push through a third party, not what the
user chooses to send.

---

## Message taxonomy

| Type | Trigger | Example copy | Response affordance | Where the response lands |
|---|---|---|---|---|
| Change notification | The two-stage pipeline promotes a goal-anchored change | "ApoB 88 → 95 mg/dL — past the threshold your cardiac goal watches. Tap for the full picture." | Open-in-app link; optional `snooze this marker` | Nothing to land — the finding is already in the store and on Now, marked as notified |
| Goal question | A decision-changing gap in the goal model | "Quick one for the marathon goal: still targeting the October race, or has that moved?" | Chips: `yes` / `it moved` + optional line | Goal object update, with provenance |
| Adherence check | Protocol window passed, no passive confirmation | "Walk after dinner yesterday? — day 18 of 30, post-meal-walk experiment" | Chips: `took it` / `skipped` / `snooze` | Experiment adherence record (`done` / `skipped` / `not_recorded`) |
| EMA micro-prompt | Protocol's smart moment for a subjective metric | "Energy right now? — outcome metric for your walk experiment" | 1–5 tap scale + optional word chip | Self-feedback observation, joined to the experiment window |
| Confounder capture | Signal (travel, bad sleep, illness pattern) matching the experiment's `confounder_flags` | "Looks like you're traveling — flag this week as a confounder for the walk experiment?" | Chips: `yes, flag it` / `no` + optional line | `confounder_flags` entry on the experiment |
| Due-date reminder | [Due-date engine](data-capture.md#screening-history) | "Your quarterly lipid panel is due this month. Want the booking checklist?" | Chips: `show me` / `snooze` / `done already` | Screening/due record; booking flow if accepted |
| Scheduled journal prompt | User's own schedule | "Evening note? (you asked for this — one line is plenty)" | Free text / voice / photo | Journal entry + graded extraction |
| Extraction echo | User sent a journal entry | "Logged: sauna skipped · travel flag · sleep low (guess). Tap anything to fix." | Tap a chip to correct | Corrections update the structured records; raw kept |
| Ladder/mute notice | Backoff rung 4, or auto-mute | "Pausing adherence pings for this experiment — days will be marked not-recorded. Say 'resume' anytime." | One word: `resume` | Thread state; nothing imputed meanwhile |

Every row's copy follows the tone table, states its purpose inline, and is answerable (or
dismissable) in under ten seconds. There is no row for engagement, celebration, or
reactivation, because those messages do not exist.

## The outbound-message object

The contract every outbound message satisfies — this is what the generation layer (future
work) must produce, and what the UI's "why this message" inspector renders:

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `purpose` | enum | `change_notification` · `goal_question` · `adherence` · `ema` · `confounder` · `due_date` · `journal_scheduled` · `plan_checkin` · `plan_reconciliation` · `plan_review` · `system_notice` — the closed set from [Principle 1](#principle-1-why-we-message-no-message-without-a-purpose) |
| `purpose_ref` | ref | The goal, experiment, due-date item, or user schedule that authorizes it. **Non-nullable** for everything except `system_notice` (ladder/mute notices) — a message that can't name its authorization can't be sent |
| `salience` | object? | For `change_notification` only: the mechanistic trigger (marker, delta, noise floor cleared) and the goal term the salience pass anchored on — both gates, recorded and inspectable |
| `experiment_ref` | ref? | Set for adherence/EMA/confounder; joins the response into the experiment window |
| `body` | text | Copy per the tone rules; includes the stated purpose line and, for findings, the [evidence label](evidence.md#strength-of-evidence-labeling) |
| `affordance` | object | The reply structure: chips, scale, free-form, open-link — what makes it sub-10-second |
| `budget` | object | `{day_used, day_cap, experiment_used, experiment_cap}` at send time — auditable, shown in the inspector |
| `scheduled_basis` | object | Why *now*: the context signal or window used (e.g. `after:evening_meal_window`), and the quiet-hours check passed |
| `channel` | enum | `ios_companion` · `android_companion` · `local_push` · `local_chat` · `sms` · `whatsapp` · `telegram` · `signal` |
| `egress` | object? | For bridged channels only: minimization level, gateway result, `ledger_ref`. Local channels carry none — there is nothing to record leaving |
| `thread` | ref | The purpose stream, for ladder state |
| `ladder_rung` | int | 1–4; which backoff rung the thread is on |
| `response_state` | enum | `pending` → `answered` · `snoozed` · `not_recorded` (set when the next prompt in the thread fires, or the day closes); change notifications close as `seen` or unread, never `not_recorded` |
| `response_ref` | ref? | Where the answer landed (adherence mark, observation, journal entry, goal update) |

Responses, journal entries, and AyuBot's own findings land in existing stores — the experiment
record, self-feedback observations, `MedicationStatement`s, goal and plan objects, Now — not in
an AyuBot-private silo. AyuBot is an agent, not a second database: delete it and everything it
captured or surfaced is still yours, in place.

## Relationship to other components

- [Companion App (mobile)](companion-app.md) — AyuBot's primary surface: the conversation
  thread where change notifications, goal questions, and check-ins reach the user, and the
  expected home of everyday interaction with ayuOS. The plan loop's check-ins are AyuBot
  messages under the three `plan_*` purposes: same budget, ladder, and tone.
- [Agent loop](agent-loop.md) — AyuBot runs the standard loop with the standard
  [model roles](model-providers.md); the two-stage rule is what stands between the store and
  the user's notifications. Anything safety-critical routes through the agent's
  clinician-routing rules, not a text message.
- [Data capture](data-capture.md) — AyuBot is the delivery mechanism for the EMA micro-prompt
  principle and the sub-10-second manual paths; it inherits all cross-cutting capture rules,
  including minimum-necessary questions for goal collection.
- [Experimentation](experimentation.md) — a primary customer: adherence records, confounder
  flags, and subjective outcome metrics flow into experiment windows; `not_recorded` days
  degrade power honestly.
- [Journey 12 — Low-friction capture](journeys/12-low-friction-capture.md) — the in-app
  capture micro-UX AyuBot's prompts open into; the backoff behavior here generalizes that
  journey's "prompts retire and adapt" rule.
- [PII gateway](pii-gateway.md) & [AI transparency](ai-transparency.md) — every model call
  AyuBot makes is ledgered like any other; bridged sends pass the gateway and land in the
  ledger like any egress; local channels have nothing to ledger because nothing leaves.
- [Tiers](tiers.md) — bridged messaging is an Axis-3-style opt-in with a standing zero-transit
  fallback; losing a bridge loses reach, never the system or history.
- [Frontend](frontend.md) — the web app carries the same thread and remains fully capable;
  [Now](frontend.md#now) stays the complete re-entry view. Change notifications are the
  goal-anchored, salience-gated subset of Now that doesn't wait to be visited — a notified
  finding still appears there, marked as notified.

## Open questions

- [ ] The generation/scheduling layer: which model role drafts copy and picks the
      contextually smart moment, and how much of "smart" is rules (window + quiet hours) vs.
      learned per user?
- [ ] Background cadence: does AyuBot's change-detection pass run event-driven on every sync,
      on a periodic sweep, or both — and what bounds its compute on low-power self-hosted
      hardware?
- [ ] Calibrating the salience gate: what makes a goal-anchored change "material enough" to
      spend a message — a fixed rule per marker class, a per-goal sensitivity setting, or
      learned from which notifications the user opens vs. snoozes?
- [ ] Goal questions: is there a rate limit of their own (e.g. one per goal per week) beneath
      the shared daily cap, so the agent's curiosity never dominates the budget?
- [ ] Exact ladder thresholds (2 vs. 3 skips to batch; one vs. two silent weeks to dormant) —
      fixed constants, or adapted per user from response history?
- [ ] Does `not_recorded` get a passive-inference second chance — e.g. the wearable shows a
      post-dinner walk happened, prompting "looks like you walked — confirm?" instead of
      marking missing?
- [ ] Bridged channel implementation order: Signal (best privacy story) vs. SMS/WhatsApp
      (largest reach) first — and is Telegram's bot API's server-side storage acceptable even
      opt-in?
- [ ] Per-channel minimization defaults: is "nudge + link" the forced default on SMS, with
      full-content messaging requiring a second explicit opt-in?
- [ ] Where does the message/thread state live in the [storage](storage.md) schema — an
      `ayuos.messages` table with the ledger holding only bridged sends?
- [ ] Voice notes over bridged channels: transcribe on arrival locally, obviously — but do we
      accept the vendor's server-side copy existing, or disable voice on non-E2EE bridges?
