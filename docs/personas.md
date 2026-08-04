# Sample Patients — Psychographic Profiles

!!! abstract "What this page is"
    Two sample people, drawn in enough depth that the demo can reason about *who they are*, not
    just what their labs say — and a worked example of how ayuOS **captures** that depth without a
    personality quiz. Every attribute below is shown the way the product shows it: with how it was
    captured, how confident we are, and what the agent does with it. The live version is the
    [Profile view](demo/index.html#/profile) in the demo.

Most of the [data-capture strategy](data-capture.md) is about signal from the **body**. This page
is about the one class that is signal about the **person** — their worries, the way they show up,
what they weight when they decide, how much they trust the machine. It is what decides whether a
clinically correct answer is a *useful* one. See
[Psychographic & preference signal](data-capture.md#psychographic-preference-signal) for where it
sits in the matrix.

## Why two, and why these two

The pair is chosen to be opposite on the axis that matters most for capture: **how much the person
gives the system, and how much they let it infer.**

| | **Ravi Mehta** | **Maya Okonkwo** |
|---|---|---|
| | 45 · he/him · self-hosted power user | 39 · she/her · sovereign purist |
| **Record** | Dense — ~40k records, three wearables, a genome | Deliberately small and private |
| **Posture** | 🟠 self-hosted · cloud reasoner opt-in, disclosed & logged | 🟢 self-hosted · all roles local · on-device STT |
| **Wants** | The number *and* the method behind it | The meaning — the plain "so what" |
| **Effort appetite** | High — a daily habit barely counts against an option | Low — will not babysit a tracker |
| **Capture problem** | Rich history to *read*; trusts what he can audit | Little to read; the work is earning more without taxing her |

Ravi is the easy case for a data-hungry product and the hard case for privacy; Maya is the reverse.
A design that serves both is a design that isn't quietly assuming everyone is Ravi.

## How the profile is captured

Not with a survey. A self-reported trait is often the inverse of the behavioural one — the person
who *says* they log everything is the one who abandons the tracker — and onboarding quizzes go
uncompleted. So each attribute is **inferred first, graded for confidence, and shown with its
provenance**, exactly like every other noisy input in the system.

**Capture methods** (passive before manual — the [governing principle](data-capture.md#cross-cutting-principles)):

| Method | Passive? | What it reads |
|---|---|---|
| Inferred from query pattern | ✅ | *What* they repeatedly ask and *how* they ask it |
| Affect from wearables | ✅ (on-device) | Query timing/sentiment against HRV, sleep, strain |
| Observed behaviour | ✅ | What they open, re-run, act on, or abandon |
| EMA micro-prompt | — (sub-10s) | A single in-context check that also does other work |
| Chosen posture / first-run | — | Their settings and a few in-context questions — not a survey |

**Confidence tiers** — an inferred attribute is never rendered as a fact:

`Hypothesis` (one weak signal, held not used) → `Observed` (seen once, clearly) →
`Corroborated` (independent signals agree) → `Confirmed` (stated, or acted on repeatedly).

!!! warning "Held as sensitive data"
    The profile is **user-visible and editable — a stored object in the `ayuos` schema, never an
    inferred shadow profile**. Every attribute can be corrected or deleted; the affect inference runs
    on-device and its use is disclosed. An **unvoiced** concern is held as a hypothesis and surfaced
    as a *question at the right moment*, never delivered as a verdict.

---

## Ravi Mehta

> A quantitative self-experimenter who wants the earliest possible warning on his heart and the
> method behind every number. Gives the system a lot to read; trusts what he can audit.

**On his mind**

- **Early heart disease, before it shows** — *Corroborated · inferred from query pattern.* The
  through-line under most of what he asks; his father had coronary artery disease at 62. Read from
  his CAC and HRV questions plus the family-history record, not from him saying he's afraid.
  → *Cardiac signals are weighted up in 90-day change detection; a clean CAC is kept visible so
  reassurance is grounded.*
- **Heavy-metal load from all the fish** — *Confirmed · stated in chat.* A real, checkable worry he
  raised directly when a metals panel moved. → *Seafood cadence is joined to the metals trend
  automatically.*
- **Whether the anti-ageing effort is real or self-flattery** — *Observed · inferred from query
  pattern.* An epistemic worry, surfaced by his "clocks disagree with my labs — which do I trust?"
  → *Disagreement between sources is surfaced, not reconciled away.*

!!! note "The unvoiced one — *That the training block is costing him the recovery he is chasing*"
    **Hypothesis · affect from wearables.** He has **not** said this. He frames rising training load
    as pure progress — but HRV and REM both bend down as the block ramps, and his "why is my HRV
    down?" queries cluster on mornings after his biggest sessions. The agent holds the connection as
    a hypothesis and queues it as a *question*, to raise only when he next asks about HRV or
    recovery. Never pushed. This is the ayuOS analogue of a buried concern.

**How he shows up** — wants the number and its derivation (*inferred*); runs his own n-of-1s, high
agency (*confirmed · behaviour*); skeptical of black-box scores, reads the call ledger (*behaviour*);
even-keeled, but his querying clusters on low-HRV mornings — the state, not the result, is often what
sends him to ask (*observed · affect*).

**Health literacy** — fluent in the evidence frame; the [literacy profile](epistemics.md#the-literacy-profile)
has retired proactive injection for the concepts he's engaged (*confirmed · behaviour*).

**How he decides** — weights settled evidence and long-term safety above all; effort barely counts
against an option (*confirmed · stated*). This is his [preference model](epistemics.md#the-preference-model-simplify-this-for-me).

**Trust posture** — eyes-open: owns the store, self-hosted and FileVault, uses a cloud reasoner but
only disclosed and logged, and reads the ledger to confirm what left (*confirmed · chosen posture*).

---

## Maya Okonkwo

> A private, principled Hashimoto's patient who wants meaning over metrics and will not babysit a
> tracker. Gives the system little on purpose; the work is earning the rest without taxing her.

Her clinical stub is small and real — **Hashimoto's on levothyroxine** (the interaction baseline
every new intake is checked against), an **Apple Watch** stream, and an **active energy/mood n-of-1**.
See her [bootstrap](journeys/03-apple-health-bootstrap.md) and [low-friction capture](journeys/12-low-friction-capture.md) journeys.

**On her mind**

- **Keeping the Hashimoto's from stealing her energy** — *Confirmed · stated.* Her live question is
  functional, not numeric. → *The EMA that advances her experiment asks about energy, in her framing,
  not a lab surrogate.*
- **Whether anything new interacts with her levothyroxine** — *Corroborated · behaviour.* She doesn't
  always raise it, but the system treats every supplement log as an interaction question, because for
  her it always is. → *Interventions are the highest-liability class; the check is surfaced before a
  log is accepted.*
- **That her body's data should never live on someone else's server** — *Confirmed · chosen posture.*
  Not anxiety — a principle, firm enough to shape every setting, and the reason she chose ayuOS over
  Function or Superpower.

!!! note "The unvoiced one — *That this becomes another app she abandons*"
    **Observed · behaviour.** She has quit every food diary and mood tracker she ever started, and
    won't say she's afraid of doing it again. The tell is behavioural: any flow over a few taps and
    she drops it. The agent infers the pattern and *adapts capture to it* — passive-first, every
    manual log under ten seconds, a stalled flow dropped rather than nagged — instead of confronting
    her with it.

**How she shows up** — will not babysit a tracker, the single most important fact for serving her
(*confirmed · behaviour*); wants meaning over a metric, warmer register (*observed · inferred*);
vendor-skeptical and private by default (*corroborated · posture*).

**Health literacy** — engaged and well-read, but carries a few confident wrong priors (a
natural-is-safer lean), so injection stays on for the concepts that touch them — a light touch, not a
correction (*observed · inferred*).

**How she decides** — one or two steps at a time, natural-leaning but willing to accept an evidence
check if it isn't a scolding. Effort weighs **heavily** in her ranking — the exact inverse of Ravi,
which is what makes the two worth holding side by side (*observed · inferred*).

**Trust posture** — maximal: all three model roles local, voice transcription on-device, every egress
declined and verified. There is no cloud codepath to disclose for her; here transparency is *proving
the absence* (*confirmed · chosen posture*).

---

## How we'd weave more in

For each soft signal: what we have today, the next increment, and — because this is sensitive — the
consent it's bound to. The framework is shared; how it lands differs per person.

### Ravi

| Signal | Today | Next | Consent |
|---|---|---|---|
| **Concerns** | Inferred from query pattern; stated when specific | Monthly one-tap EMA + an affect-triggered "we noticed a low-recovery stretch — anything weighing on you?" | Opt-in; the affect trigger is disclosed, so the inference is never hidden |
| **Communication style** | Inferred from how quantitative his questions are | An explicit, editable "just the number / show the working" control, seeded from the inference | User-visible and editable; never a shadow profile |
| **Affect / state** | Coarse: query timing vs. HRV and sleep | Query sentiment joined to the wearable stress read, to soften the lead of a response in anxious stretches | On-device only; shown, and can be turned off without losing history |
| **Literacy** | Tracked from concepts engaged | Optional prediction games that train judgment and feed the profile faster | Always optional; never pushed into chat |

### Maya

| Signal | Today | Next | Consent |
|---|---|---|---|
| **Concerns** | Stated for the live experiment; the rest inferred from behaviour | A single voice line after a logged intake — "how's your energy today?" — that also advances her experiment | On-device STT; opt-in; one-tap skip, never repeated in a session |
| **Interaction safety** | Every intake checked against her med list | Surface the check inline *before* a log is accepted, with its confidence; route anything clinically significant to a clinician | No new consent to run the check; a red-flag routing is disclosed, not hidden |
| **Communication style** | Inferred from her "what does it mean" framing | Let the read set the *voice* of ordinary answers — warmer, meaning-first | Visible and reversible |
| **Adherence pattern** | Observed: completes sub-10s captures, abandons longer ones | Treat the abandonment signal as a first-class input — shorten or drop any flow she stalls on, never re-prompt a dropped one | In-app behaviour only; used to reduce asks, not increase them |

## See also

- [Data Capture Strategy → Psychographic & preference signal](data-capture.md#psychographic-preference-signal) — where this class sits and why.
- [Health Literacy & Epistemics](epistemics.md) — the literacy profile and preference model this layer extends.
- [Journey 12 — Low-friction capture](journeys/12-low-friction-capture.md) — Maya's capture micro-UX in motion.
- [Profile view](demo/index.html#/profile) — the live, per-attribute-provenance version in the demo.
