# Companion App — the adaptive loop on your phone

!!! note "Status: draft for review"
    Generalized from a running-specific product exploration into ayuOS's vocabulary. The domain
    model (goals, plan resolutions, tracked issues, reconciliation) and the check-in discipline
    are proposed here; the adaptation engine's split of deterministic vs. model work follows the
    project's two-stage rule. Scheduling/generation details and the device write-back path are
    open. See [Open questions](#open-questions).

## Overview

The ayuOS Companion is the first-party mobile app, and **the primary interface for regular
interaction with ayuOS**. The [web app](frontend.md) remains fully capable — every capability
of the system is reachable from it, and it is where deep work happens — but everyday
interaction is expected to happen here, on the phone. Until now the spec gave the app one job —
relaying HealthKit data to the local store ([Apple Health, Tier 3](ingestion/apple-health.md#pre-built-ayuos-companion-app-p1)).
This page widens it:

1. **Device bridge.** The phone is where wearable data lives and where sensors are. The
   Companion reads HealthKit (and, on Android, Health Connect) continuously and syncs it to the
   user's own store over the local network — plus it carries the push channel
   [AyuBot](ayubot.md) needs to reach a phone without a third-party messaging vendor.
2. **The messaging surface.** The Companion hosts the conversation thread with
   [AyuBot](ayubot.md), the background agent — this is how the user learns about goal-relevant
   changes and how goal-relevant information gets collected into ayuOS. The thread is
   goal-centric by design: change notifications, goal questions, adherence checks, and journal
   capture, all under AyuBot's purpose, budget, and ladder discipline.
3. **The adaptive plan loop.** For a user working toward something — a training block, a rehab
   protocol, a sleep intervention — the Companion closes the loop between *what was intended*
   and *what actually happened*, at the cost of seconds of attention per day. It answers,
   continuously: **"given what I'm trying to achieve, what the system already knows, and what
   actually happened — what should I do next?"**

**What the Companion is not:** a fitness tracker, a dashboard, a training-plan generator, or a
second brain to feed. Deep investigation stays in the [web app](frontend.md) — Ask, the
Timeline, the call ledger, the doctor packet, experiment design — and [Now](frontend.md#now)
remains the complete re-entry view. The Companion is the surface where the agent meets the
physical world: devices, notifications, voice, and the moments right before and after a
planned action.

**One agent, one primary surface.** The old naming collision is resolved: [AyuBot](ayubot.md)
is the *background agent* — it works over the store between sessions, reasons on the standard
[agent loop](agent-loop.md), and initiates conversation only under its closed set of purposes,
budget, and backoff ladder. The Companion App is the *surface* that carries AyuBot's thread (as
the `ios_companion` / `android_companion` channel) and adds the plan-loop interactions this
page defines. Plan-loop check-ins are simply AyuBot-initiated conversations under the `plan_*`
purposes: they draw from the same budget, ride the same backoff ladder, and are banned from
everything AyuBot bans (streaks, re-activation, engagement copy).

## The loop

The entire feature reduces to one cycle, and every piece of this page serves one step of it:

| Step | Question | Owned by |
|---|---|---|
| **Know** | What does the system currently believe? | [The domain model](#the-domain-model), the [storage layer](storage.md) |
| **Notice** | What changed in the real world? | Device bridge, [wearable ingestion](ingestion/wearables.md), check-ins — *mechanistic, model-free* |
| **Interpret** | What does the change mean for the user's goals? | The model salience pass ([agent loop](agent-loop.md)) |
| **Decide** | What is the best next action? | The [adaptation engine](#the-adaptation-engine) |
| **Execute** | Make the action as easy as possible | Scheduled sessions; [device write-back](#write-back-publishing-a-session-to-the-device) where supported |
| **Observe** | What actually happened? | Activity sync, post-action check-in |
| **Reconcile** | How did actual differ from intended, and does it matter? | [Reconciliation](#activity-planned-vs-actual-reconciliation) |
| **Adapt** | Update state and future plans | The adaptation engine, with the user's commitment |

The competitive claim is deliberately modest: not a theoretically perfect plan, but a
**high-quality, low-friction model of reality, continuously reconciled against intention**.
Note also what the loop does to question quality: "what should I do next?" is only answerable
because every input is anchored to a goal — salience is defined, which is exactly what the
goal-free anchor query lacks ([agent loop](agent-loop.md#the-anchor-workflow-what-changed-in-my-last-90-days)).

## A worked example

The generalized model below was extracted from a concrete flow. Keep it in mind throughout —
every abstraction on this page has to survive contact with it:

> A runner is building toward a marathon. Weekly envelope ~35 km, long run ~15 km, most volume
> easy. An Achilles issue is actively tracked; a toe is recently sore; last night's sleep was
> short; there was a strength session yesterday. The plan says 7–8 km easy this morning.
>
> **Pre-action:** one notification — *"Easy run this morning · 7–8 km. Anything changed?"* —
> answered with one voice line: *"Slept about six hours. Heel's fine, toe still sore, knee
> caught a couple of times on the stairs. Only did my heel stretches."* Five structured updates
> land from one utterance; the recommendation stays 7–8 km easy, with a note not to force it if
> the knee changes how they move.
>
> **Post-action:** the watch syncs 7.4 km. The app never asks how far they ran — it asks the
> three things sensors can't know: *heel / knee / toe — better, same, worse?* and *did you
> stretch?* One tap each.
>
> **Weekly:** 31.8 km against ~35. The system proposes 34–36 km next week — not 38.2 — because
> plans are budgets, not debts.

Running is the first domain adapter, not the product. The same objects express a strength
progression, a mobility/rehab protocol, a sleep-consistency intervention, or a
post-illness return-to-baseline — anything with intentions, actions, and a body that talks back.

## Principles

1. **Ask for changes, not status.** The system already knows the plan, the wearable stream, and
   yesterday. The default prompt is *"anything changed?"* — never a questionnaire. One natural
   utterance can carry a dozen structured updates; extraction is the system's job
   ([Journey 12](journeys/12-low-friction-capture.md)).
2. **Never ask what a sensor already answered.** If the watch knows the distance, asking for it
   is a bug. Manual capture is reserved for what sensors cannot know: pain, effort, mood,
   motivation, constraints, *why* a plan changed ([data capture](data-capture.md#cross-cutting-principles)).
3. **Facts, observations, interpretations, and recommendations never collapse.** Device data
   (fact), the user's words (observation), derived state ("recovery below baseline" —
   interpretation), and "keep today easy" (recommendation) are separate records. The first two
   are never overwritten; the last two are always recomputable. This is the same discipline as
   [evidence labeling](evidence.md#strength-of-evidence-labeling) and the raw-kept rule.
4. **Minimum necessary questions.** Before asking anything, inspect existing knowledge. Follow-ups
   only when the answer changes a decision. Related asks are bundled; "nothing changed" is always
   a one-tap answer; the [AyuBot budget](ayubot.md#the-message-budget) caps the day.
5. **Plans are guides to decisions, not debts.** A missed session is never "repaid" by inflating
   the next one. Adaptation recalculates from current state, not from arrears.
6. **Recommendation and user decision are distinct records.** The user can always overrule; the
   system records both without silently rewriting either.

## Role 1 — Device bridge

The bridge subsumes and extends the existing Tier-3 spec:

| Function | Detail | Status |
|---|---|---|
| **HealthKit relay** | Background delivery, incremental sync, encrypted push to the local store over the LAN. As specced in [Apple Health](ingestion/apple-health.md#pre-built-ayuos-companion-app-p1) | P1 |
| **Health Connect relay (Android)** | Same contract against Android's Health Connect store (exercise, HR, sleep records) | P1/P2 |
| **File intake** | FIT / TCX / GPX share-sheet import for devices with no open API (Garmin's developer program is currently gated — see [wearables](ingestion/wearables.md#devices-p1-later)); lab PDFs and other documents via the same share sheet into [ingestion](ingestion/index.md) | P1 |
| **AyuBot channel** | Push (`ios_companion`): wake-up transits APNs content-minimized; payloads sync device↔store directly ([channels](ayubot.md#principle-5-channels-privacy-a-messaging-agent-implies-egress-so-channels-are-tiered)) | P1 |
| **Offline capture** | Voice, photo, and one-tap logs captured offline queue locally and sync when the store is reachable | P1 |
| **Session write-back** | Publish a committed session to a watch platform — see below | P2, gated |

All bridge traffic terminates at the user's own store. The bridge adds **no third-party
transit** in the default configuration; the one exception (content-minimized APNs wake-ups) is
already disclosed in the AyuBot channel table.

### Write-back: publishing a session to the device

The loop's *Execute* step wants the planned session on the user's wrist — a structured workout
the watch guides, so the phone stays in the pocket. This is ayuOS's first **write** path to a
vendor cloud, and it is held to the egress rules:

- **Opt-in per platform, gateway-enforced, ledgered.** A published workout is an egress event:
  it passes the [PII gateway](pii-gateway.md), is disclosed at opt-in, and lands in the
  [call ledger](ai-transparency.md#3-call-ledger) with its payload and destination. The payload
  is a workout structure (steps, targets, durations) — minimal by construction, but it is still
  the user's plan leaving the device.
- **Gated by vendor programs.** Garmin's Training API requires an approved developer program
  (currently suspended for new applicants); other platforms vary. Write-back is therefore P2
  and platform-by-platform.
- **The fallback is standing.** Without write-back the committed session renders in the
  Companion itself (and can export a FIT workout file where the platform supports manual
  transfer). You lose wrist guidance, never the plan. Same shape as every
  [tier fallback](tiers.md).

Lifecycle of a scheduled session: `proposed → committed → published (optional) → completed →
reconciled`.

**In-action interaction is explicitly out of scope for MVP.** Nobody pulls out a phone at
kilometre four to log knee pain. Mid-action events are reported afterward; a one-tap watch
affordance ("note this moment") is a later phase.

## Role 2 — The adaptive plan loop

### The domain model

Six objects, all living in the `ayuos` schema ([storage](storage.md)); FHIR (`Goal`,
`CarePlan`) is mapped at the boundaries only, per [ADR-0002](adr/0002-clinical-data-store.md).

#### Goal

A user has many goals at once — train for a marathon, hold strength, sleep more consistently,
protect an Achilles, keep family time — and they conflict. A goal carries: `name`, `domain`,
`priority`, `horizon`, `target_date?`, `success_definition?`, `flexibility` (hard vs. soft),
`status`, `source` (user-stated vs. system-proposed). Goals are created conversationally — a
sentence, not a wizard — and a new goal triggers at most **one** operationalizing question
(*"measurable strength gains, muscle, or maintenance?"*), asked only after inspecting what the
record already shows.

#### Plan — six resolutions, coexisting

The load-bearing structural idea: **a strategy must not have to become a calendar before it can
be represented.** Plans exist at several resolutions simultaneously, each a `PlanNode` with a
`type`, a parent, a `commitment` level (`exploratory` / `proposed` / `committed`), a target or
allowed range, and a rationale:

| Level | Type | Example (training) | Example (rehab) |
|---|---|---|---|
| 1 | Goal | Complete a marathon | Return shoulder to full function |
| 2 | Principle | Keep most volume easy; don't build while the heel worsens | Load progressively; pain ≤ 3/10 during work |
| 3 | Block | Six weeks: ~30 km/wk → ~40 km/wk | Four weeks: isometrics → eccentrics |
| 4 | Period envelope | ~35 km this week, long run ~15 km — *a budget, not a schedule* | 3 sessions this week |
| 5 | Scheduled action | Wednesday morning: 7–8 km easy | Tuesday: eccentric protocol, 3×15 |
| 6 | Executable session | Warm-up → 7 km @ easy targets → cool-down (publishable to a device) | Guided set/rep/tempo structure |

Lower levels are optional. A user can hold *"eventually I should handle marathon-distance weeks"*
as an exploratory Level-2/3 node without ever committing a number to next week. The weekly
review is where resolution is *offered* — "want me to make the week concrete?" — never forced.

#### Cross-goal contribution

An action is never owned by one goal. A run serves marathon prep, cardiovascular fitness, and
mood; a strength session serves strength, running durability, and bone health. A
`GoalContribution` edge (`entity`, `goal`, `expected_effect`, `confidence`, `rationale`) records
this — deliberately **not** normalized to weights summing to 100%. This is attribution
bookkeeping for the [experimentation](experimentation.md) and evidence layers, not accounting.

#### Observation vs. tracked issue

The distinction that keeps the loop low-friction:

| | Observation | Tracked issue |
|---|---|---|
| What it is | Something noticed at a moment: *"knee caught on the stairs"* | Something the system deliberately monitors: *the Achilles* |
| Created by | Any check-in, voice line, or extraction | Explicit promotion — proposed by the system, confirmed by the user |
| Absence of symptom | Not data | **Data.** "No heel pain today" is a meaningful record and is actively collected |
| Follow-up burden | None beyond the moment (today's knee gets one post-action question *because it was mentioned pre-action*) | Governed by its tracking policy |
| Lifecycle | Exists; may cluster | `candidate → tracked → improving / stable / worsening → resolved` |

Recurrence drives promotion: *"your knee has come up after three activities — should I start
tracking it?"* One tap creates the tracked issue; silence leaves it an observation cluster. A
symptom mentioned once and never again creates **no permanent questioning burden** — that is
the design, not a gap.

Each tracked issue carries a `TrackingPolicy`: which activity types are relevant, whether to ask
before and/or after them, review cadence, escalation and de-escalation conditions (a sustained
symptom-free stretch steps asking down automatically). The system proposes the policy; the user
can edit it; nobody configures rules by hand in normal use.

Tracked issues surface in the **Watch** section of the home screen and are natural
[pin](frontend.md#pinned-user-declared-attention) candidates on Now — but a tracked issue is a
*monitoring contract* (it may generate prompts, within budget), whereas a pin is pure attention
and never notifies.

#### Constraint

Real life, represented explicitly rather than inferred badly: 40 minutes available, travel
tomorrow, heat after 8am, gym inaccessible, illness, yesterday's hard session. Constraints may
be recurring, temporary, user-stated, or inferred (with provenance); a constraint is context,
not a problem.

#### Activity, planned vs. actual, reconciliation

Activities arrive from the wearable stream ([canonical model, dedup, source priority](ingestion/wearables.md#deduplication))
and are matched to scheduled actions by time, type, and duration overlap. Then the invariant:

**The plan is never rewritten to match reality.** Planned 8 km; a meeting cut it to 6.3 km —
the plan still says 8. A `Reconciliation` record joins the two: completion, relevant
differences, the user's one-line explanation if offered, and whether replanning is warranted.
Habits need no separate machinery — "stretch after running" is a small goal, an action
template, and completion observations, reconciled the same way.

#### Recommendation

Every recommendation is a record, not a chat message: the recommendation itself, goals served,
evidence used, constraints considered, alternatives, confidence, an expiry, and — the part that
makes it honest — **what would change it** (*"knee worsens; heel changes materially; your
available window shrinks"*). Default UI shows one line; "why?" expands the rest. Stored with
state/plan/model versions per the [audit log](agent-loop.md#audit-log), so *"why did you tell me
to do only 5 km last Tuesday?"* is answered from records, not reconstructed.

### Check-ins: how reality enters

All prompts are AyuBot messages — the check-ins below are AyuBot-initiated conversations with
the same budget, ladder, tone, and sub-10-second affordances. The plan loop adds three
purposes to AyuBot's closed set (see the
[purpose table](ayubot.md#principle-1-why-we-message-no-message-without-a-purpose)), each
authorized by a plan the user committed to:

| Trigger | Fires when | The prompt | Affordance |
|---|---|---|---|
| **Pre-action** | Shortly before the *likely* action window (learned from history — a window, not an alarm) | *"Easy run this morning · 7–8 km. Anything changed?"* | `Looks good` / `Talk to me` (voice) |
| **Post-action** | The activity syncs from the device | Reconciliation + only the questions sensors can't answer: tracked-issue statuses, anything mentioned pre-action, habit completion — bundled into one message | Chips per item / one voice line |
| **Periodic review** | Once per period (weekly default) | Envelope vs. actual, issue trajectories, next period's proposal — and the offer to make it concrete | Confirm / adjust / leave flexible |
| **Issue follow-up** | A tracked issue's policy | *"Heel: better / same / worse / no pain?"* | One tap |
| **Readiness** | Morning data arrives **and** meaningfully changes the day | Note + adjusted proposal | One tap |
| **User-initiated** | Any time | *"Something changed"* / a new goal, spoken | Voice / text |

Silence rules carry over unchanged: if nothing is planned, nothing is tracked, and nothing is
due, the Companion sends nothing. A readiness signal that doesn't change the day's decision
does not generate a message.

**Extraction** follows the established pipeline — STT per the configured posture, local
extractor drafts structured updates, each carrying its source quote, confidence, and whether
confirmation is required; low-risk high-confidence updates auto-accept, consequential or
ambiguous ones get one confirming line ([AyuBot extraction rules](ayubot.md#principle-4-journal-type-capture-the-data-no-sensor-can-get),
[Journey 12](journeys/12-low-friction-capture.md)). Clarification is asked **only when the
distinction changes a decision**: *"same knee as this morning?"* qualifies; taxonomy for its
own sake does not.

### The adaptation engine

The engine honors the project's two-stage rule: **mechanistic stages own change detection and
feasibility; the model owns interpretation and language.** A model never invents the plan and
never sees sub-noise deltas.

| Stage | Work | Nature |
|---|---|---|
| 1 · State | Recent load, remaining envelope, availability, issue statuses, habit completion, trends vs. baseline | Deterministic |
| 2 · Constraints | User constraints, plan constraints, tracking policies, goal conflicts, hard safety floors | Deterministic |
| 3 · Candidates | Feasible next actions within the envelope and constraints | Deterministic |
| 4 · Salience & language | Interpret ambiguous user input, rank candidates given goal priorities, draft the recommendation and its explanation | Model ([roles](model-providers.md)) |
| 5 · Safety gate | Validate against the [healthspan model's safety floor and red-flag routing](healthspan-model.md#red-flag-routing) before anything is shown or published | Deterministic, versioned, independently testable |
| 6 · Commitment | Material plan changes require the user's confirmation | User |
| 7 · Execution | Schedule; publish to device where enabled | System |

Adaptation runs at four horizons — now, next action, period reconciliation, strategy — and
deliberately **dampens upward**: one short night adjusts today; it does not touch the block.
Conflicting goals are arbitrated explicitly (benefit × priority × timeliness vs. recovery cost,
issue risk, schedule cost) — MVP needs the trade-off *represented and inspectable*, not a
perfect optimizer.

**Coaching vs. clinical is a hard boundary.** Adjusting volume and sequencing easy days is
coaching logic. Symptom interpretation is not: the app never diagnoses, never confidently
attributes pain to a cause, preserves the user's words verbatim, and routes concerning
patterns through the same clinician-routing rules as everything else
([agent loop](agent-loop.md), [Journey 13](journeys/13-share-doctor-packet.md)) — maintained
safety rules, not improvised model reasoning.

### User agency

> User: "No — I want to run 10k."
>
> Companion: "That's above today's recommendation. Recording 10k as your intention. Given the
> knee, I'd still keep it easy."

The recommendation stands as a record; the user's decision stands as a separate record; the
reconciliation notes both. The system never nags about the difference and never silently
adopts it.

## Home screen

Four sections, and it is not a dashboard — the same contract as [Now](frontend.md#now)
(no scores, no rings, no streaks), specialized for the plan loop:

| Section | Contents | Example |
|---|---|---|
| **Now** | The next committed or proposed action, with its one-line context | *Easy run · 7–8 km · morning · heel stable* → `Check in` |
| **Next** | The few upcoming actions worth knowing about | *Tomorrow: strength or rest · Sat: long run ~15 km* |
| **Watch** | Tracked issues and recently active observations, each with trajectory | *Heel — stable · Toe — sore · Knee — new* |
| **This period** | Envelope vs. actual, remaining commitments | *~35 km · 18.4 done · long run remaining* |

Every item expands to full context; the default screen stays minimal. The web app's Now view
shows the same plan-loop items through its attention lists; pins remain the user's own
declaration and are never auto-created by the loop.

## Privacy & egress posture

The loop runs **entirely locally in the default configuration**: state computation, constraint
checks, extraction, and recommendation drafting all use local roles; check-ins ride local
channels. In that configuration nothing in this page egresses.

What can egress, each opt-in, gateway-enforced, and ledgered: cloud model roles (as anywhere
else — [PII gateway](pii-gateway.md)), bridged messaging channels
([AyuBot channels](ayubot.md#principle-5-channels-privacy-a-messaging-agent-implies-egress-so-channels-are-tiered)),
and session write-back to a vendor cloud. Each trade is the user's to make, with a visible
setting, a conservative default, and a standing zero-transit fallback — per the project's
[arbitration principle](context-assembly.md) and [tier rules](tiers.md).

## Acceptance tests

The UX bar, stated as falsifiable checks:

1. If the device already knows the run was 7.4 km, the app never asks how far the user ran.
2. A tracked issue gets a post-action status captured even when the symptom is absent.
3. A symptom mentioned once and never again is never permanently asked about.
4. An entire pre-action status update can be given in one natural utterance.
5. Missing one session never causes its volume to be automatically reassigned.
6. Marathon, strength, sleep, and mobility goals can run simultaneously.
7. One activity can advance several goals.
8. A soft strategy can exist with no scheduled activities under it.
9. A scheduled action can become a precise, device-executable session.
10. Every recommendation has a retrievable explanation, from records.
11. Plan-loop prompts never exceed the AyuBot budget, and an unanswered check-in walks the
    same backoff ladder as any other thread.

## Product metric

Do not optimize for DAU, session minutes, or log counts — those incentivize friction. The
north star:

> **The fraction of meaningful decisions for which the system already has sufficient current
> information to give useful guidance, without additional manual entry.**

Supporting: questions per action, one-interaction answer rate, check-in completion,
reconciliation coverage, tracked-issue follow-up completeness, duplicate/incorrect question
rate. A good outcome is the user spending **less** time in the app as it knows them better.

## Scope

**MVP (first domain adapter: endurance training):** goals created conversationally; plan
levels 1–5 with envelopes and planned-vs-actual reconciliation; observations, tracked issues,
and tracking policies; pre-action / post-action / weekly check-ins over AyuBot channels; the
staged adaptation engine with the safety gate; device bridge for HealthKit + FIT import.

**Explicit non-goals (MVP):** in-action interaction; session write-back (P2, gated); nutrition
tracking (time-boxed experiment windows only, [as everywhere](data-capture.md#lifestyle-interventions));
multi-sport periodization; automatic plan modification without commitment; any diagnosis. The
first release proves the **loop**, not the plan library.

## Relationship to other components

- [AyuBot](ayubot.md) — the background agent whose conversation thread this app hosts;
  plan-loop prompts are AyuBot messages: same purposes framework (extended by three), budget,
  ladder, tone, and channel/egress tiering.
- [Data capture](data-capture.md) — passive-before-manual and sub-10-second rules govern every
  check-in; the bridge is a capture surface.
- [Wearables](ingestion/wearables.md) / [Apple Health](ingestion/apple-health.md) — the
  canonical activity model, dedup, and the HealthKit relay this page extends.
- [Agent loop](agent-loop.md) — the two-stage discipline, context assembly for check-in
  conversations (curated `ConversationContext`, never the whole store), and the audit log
  recommendations land in.
- [Healthspan model](healthspan-model.md) — the safety floor and red-flag routing behind the
  safety gate; the intervention/marker graph recommendations draw on.
- [Experimentation](experimentation.md) — a tracked issue's trajectory and a plan change are
  natural n-of-1 inputs; `GoalContribution` feeds attribution.
- [Frontend](frontend.md) — Now, pins, and the web view of the same plan objects.
- [Storage](storage.md) — all six objects live in the `ayuos` schema; FHIR mapping at
  boundaries only.

## Open questions

- [x] **Naming — decided (2026-08).** The collision is resolved: the messaging companion is
      renamed **[AyuBot](ayubot.md)** and reframed as the background agent; this app stays the
      **Companion App**, AyuBot's primary surface and the primary interface for regular
      interaction with ayuOS.
- [ ] Pre-action timing: how is the "likely window" learned (activity-history clustering vs.
      user-stated schedule), and what fires when history is thin?
- [ ] Where does the plan hierarchy live in the [storage schema](storage.md) — one `plan_nodes`
      table with `type`, or per-level tables? And the FHIR `CarePlan` boundary mapping?
- [ ] Tracking-policy defaults: fixed per issue category, or proposed by the model and
      pinned as data thereafter?
- [ ] Does the adaptation engine's candidate generator (stage 3) ship as rules per domain
      adapter, or as a constraint solver shared across domains?
- [ ] Session write-back: which platform first once programs allow (Garmin Training API vs.
      exporting FIT workout files), and does a published workout need its own ledger view?
- [ ] Android parity: is Health Connect relay P1 alongside HealthKit, or P2?
- [ ] Do plan-loop check-ins share the AyuBot per-day cap (default 3), or does a committed
      plan raise the default cap with the user's consent?
