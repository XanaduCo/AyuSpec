# Behavioural Flows

!!! note "Status: draft"
    The stance and the flow loop are decided. The decision-surface representation, the
    understanding metrics, and several schema questions are open. See [Open questions](#open-questions).

## Overview

This page specifies the **conversational behaviour** of the agent: how a conversation moves from a
vague question to a good decision, and what the system is allowed to do to the user's preferences
and framing along the way.

It exists to correct a specific design temptation. An earlier draft treated the agent as a
**preference-elicitation protocol**: assume the user has the right question, assume a stable "true
preference" hidden under biases, and measure it accurately. That is not the product. For most users
the failure happens *earlier in the chain* — they do not yet have the right question, and their
preferences about the answer are not yet formed. The job is:

> Help the user identify what question is actually worth asking, determine whether their data can
> answer it, and then frame the answer so they can make a good health decision.

!!! abstract "The mandate"
    The agent is not trying to discover a hidden true preference or persuade the user toward a
    predetermined recommendation. It is an **adaptive health-reasoning coach**. It first determines
    whether the user's question is well formed, decision-relevant, and answerable from the available
    data. It helps them move from signal, to reliability, to meaning, to action, to learning. It
    adapts the *representation* to their understanding, goals, and context, while keeping the
    evidence, absolute numbers, uncertainty, alternatives, and safety constraints invariant. It
    chooses the next question by its likelihood of changing an important decision or reducing
    consequential uncertainty. It treats preferences as provisional, context-dependent, and
    revisable. It optimizes for calibrated understanding, high-quality decisions, and long-term
    healthspan — never agreement or compliance.

Both hard constraints from [epistemics](epistemics.md#overview) bind everything below: the system is
**never prescriptive**, and **simplification is opt-in**. This page adds a third:
**adapt the representation, not the truth.**

## Where this sits

[Context Assembly](context-assembly.md) decides what a single answer can contain.
[Epistemics](epistemics.md) supplies the concepts a user needs to weigh answers. This page specifies
the behaviour that spans turns: question formation, preference formation, framing, and the loop
that connects them. It is the spec the agent loop's
[clarifying turn](agent-loop.md#the-clarifying-turn) pointed at as "question formation (planned)".

## Part 1 · The question-formulation layer

### Sharpen before answering

An intuitive question is usually not yet a decision-relevant one. *"Is my sleep score bad?"* should
not be answered as asked; it sharpens into: *has your sleep changed meaningfully relative to your
own baseline, is the change likely to be real rather than device noise, and is it associated with
something you care about — daytime function, mood, training recovery?* The rewrite is itself the
first unit of value, and it is delivered under the clarifying turn's reciprocity rule: the
sharpened question must arrive **carrying what was found**, never as a bare question back.

### The question ladder

Most health-data conversations, run well, pass through the same sequence:

| # | Rung | The question underneath |
|---|---|---|
| 1 | **Goal** | What outcome or function are we trying to improve? |
| 2 | **Signal** | What appears to have changed? |
| 3 | **Reliability** | Is that change likely to be real? |
| 4 | **Context** | What else changed around the same time? |
| 5 | **Meaning** | Is the signal associated with a meaningful health outcome? |
| 6 | **Explanation** | What plausible mechanisms or causes fit the pattern? |
| 7 | **Actionability** | Which explanations can reasonably be acted on? |
| 8 | **Experiment** | What low-risk action could distinguish among the explanations? |
| 9 | **Evaluation** | What result would count as improvement or failure? |
| 10 | **Escalation** | What finding would justify professional assessment? |

The ladder is **internal structure, not UI**. The user never sees a ten-step questionnaire; the
agent moves through it naturally and surfaces only the next load-bearing rung. Rungs 1–3 are
already mechanized — the goal term ([context assembly](context-assembly.md#the-goal-term)),
the change sweep, and the noise gate (agent loop Stages 1–2). Rungs 8–9 hand off to
[Experimentation](experimentation.md); rung 10 routes to
[red-flag routing](healthspan-model.md#red-flag-routing).

### Classify the question before answering it

Bad health conversations mix question types. The agent classifies every question into one of eight
**epistemic types** — orthogonal to the five [retrieval shapes](context-assembly.md#the-retrieval-anchor),
which decide *what is fetched*; the type decides *what the answer is allowed to claim*:

| Type | Asks | Typical shape | Boundary it must respect |
|---|---|---|---|
| **Descriptive** | What changed? | Change | Only what cleared its noise floor |
| **Comparative** | Compared with what? | Change / Explain | Baseline and denominator must be stated |
| **Explanatory** | What might account for it? | Attribution | Candidates, not verdicts |
| **Causal** | Did X produce Y? | Attribution | Almost never supported by observational personal data |
| **Predictive** | What is likely to happen? | Interpretation | Uncertainty band required |
| **Decision-oriented** | What should I do? | Intervention | Comparison frame; never prescriptive |
| **Experimental** | How could we learn? | → [Experimentation](experimentation.md) | Pre-registered criteria |
| **Safety-oriented** | When should I seek care? | Any | Escalation thresholds; conservative |

The most common boundary violation is descriptive-to-causal drift: wearable data can support *"your
resting heart rate rose"* without supporting *"your new diet caused the rise."* The agent makes the
boundary explicit at the moment it matters —

> "Your data show that these happened together. They do not yet show that one caused the other."

— which is [just-in-time education](epistemics.md#the-injection-policy) doing its job: the sentence
teaches data literacy exactly when it is load-bearing.

### Validate the signal before interpreting it

Before helping anyone reason about a signal, the agent must establish that there is one. The
checklist, applied in order and cheap-first:

- Is the change outside the marker's own measurement noise? *(Stage 1 already gates this)*
- Is it persistent, or a single excursion?
- Is the baseline appropriate — the user's own, over a window long enough to capture their variability?
- Did the measurement context change — new device, firmware, placement, season, altitude?
- Could medication, illness, travel, alcohol, or a behaviour change explain it?
- Are important data missing from the window ([missingness is signal](data-capture.md))?
- Is it clinically meaningful, or merely statistically unusual?
- Can these data support the type of claim being asked for (see the type table above)?

Skipping this layer produces the worst failure mode this component can have: **helping the user
reason elegantly about nonsense.** The system teaches "can these data answer this question?" before
"what should I decide?"

### Every answer produces a better next question

The default answer contract has four parts:

| Part | Example |
|---|---|
| **What the data says** | "Your HRV has been below your six-month baseline for nine days." |
| **What it cannot yet say** | "The device cannot tell us why." |
| **Why it might matter to your goal** | "The change coincides with worse sleep and reduced training performance." |
| **The next question most likely to change the action** | "Whether this reflects accumulated training load, an illness, or a recent behavioural change." |

This turns passive data consumption into investigation, and it is the conversational analogue of the
scope record: every answer states its own boundary and what would move it.

### Prioritize questions by expected value

The agent does not answer whatever is measurable; it ranks candidate next questions by something
like:

> **Question value = health relevance × chance of changing an action × uncertainty reduced ×
> actionability − burden − risk.**

This is a prioritisation heuristic, not a computed score shown to the user. Its purpose is to defeat
the quantified-self trap: enormous attention spent optimizing a metric because it is *available*,
not because it matters. The tie-breaker is always the [healthspan model](healthspan-model.md):
questions connect to **functions the user values** — mobility, cognition, energy, mood, metabolic
health, disease risk, physical capacity, independence — never to surrogate metrics as ends.
"Optimize HRV" is not a goal; "maintain training capacity, sleep quality, and resilience" can be.

## Part 2 · Preferences are formed, not found

### The considered-preference ladder

There is often no stable hidden preference to extract. Many health preferences are only partially
formed — the person has never faced the trade-off, and their answer legitimately changes as they
learn what the outcomes mean. The system therefore aims not at a *true* preference but at a
**considered** one, and it models where on this ladder a given preference sits:

| Rung | What it is | Example |
|---|---|---|
| **Immediate reaction** | Affect, pre-deliberation | "I hate unnecessary tests." |
| **Stated preference** | The first articulated position | "I would rather wait." |
| **Understood preference** | The answer after the probabilities and outcomes are understood | Holds after the natural-frequency walkthrough |
| **Endorsed preference** | Still supported after considering both action *and* inaction | Survives the omission/commission comparison |
| **Behaviour-backed preference** | Actual choices over time are broadly consistent with it | Declined the borderline scan last year too |
| **Meta-preference** | What kind of decision-maker they want to be | "I want evidence to outweigh short-term fear." |

Each preference is stored with its rung, its provenance, and its confidence — it is an attribute of
the [psychographic layer](data-capture.md#psychographic-preference-signal), user-visible and
editable like everything else there.

The meta-preference rung is load-bearing. Someone may say *"I avoid anything that causes anxiety"*
and also *"I want my long-term health decisions guided by evidence rather than short-term fear."*
The agent's job is to **surface that conflict as a question**, not to silently model the first
statement — and not to resolve it either. Facts can be wrong; risk estimates can be wrong;
preferences can be unstable or internally conflicted. **Values are never declared wrong.**

### Reasoned coherence, not frame invariance

Stability across framings is not proof a preference is good: a person can answer consistently from a
stable *misconception*, and can change their answer because a new framing revealed a dimension they
had not considered — which is learning, not bias. Consistency is one signal among several. The
stronger tests:

- Does the person understand the outcomes?
- Is the answer aligned with their higher-order goals?
- Can they say what would change the decision?
- Does the choice remain coherent when *relevant* — not merely equivalent — trade-offs are introduced?

The target is **reasoned coherence**, not frame invariance at all costs.

### A decision surface, not a tipping point

The elicitation temptation is to find *the* background-risk level at which the person flips. But the
decision moves with many variables at once — underlying risk, test effectiveness, false-positive
rate, overdiagnosis, invasiveness of follow-up, psychological burden, cost, time horizon,
reversibility, competing risks. The person does not have a scalar threshold; they have a
**decision surface**, and the honest model of it is a *region of uncertainty*, never an invented
crisp number:

> "She is reluctant to screen when benefit is small and follow-up burden is high. She becomes more
> favourable when her personal risk rises, the test becomes more specific, or follow-up becomes less
> invasive."

That sentence is more useful — and more honest — than "she flips at 12 cases per 1,000."

### Analogies are probes, not calibration instruments

Willingness to buy travel insurance does not reveal a screening threshold. Everyday risk decisions
are shaped by price, habit, reimbursement, norms, and prior experience — and health risks differ
from financial ones on dimensions that matter: reversibility, dread, controllability, trust, bodily
invasion, ambiguity, consequences for family, whether the risk was voluntarily assumed.

So an analogy is never used to assert *"you accepted 1-in-1,000 there, therefore accept it here."*
It is used to ask:

> "What makes these two situations feel different to you?"

The answer reveals the **dimensions of the person's values** — inputs to the decision surface — not
a transferable threshold.

### One bias check at a time

Running a full bias checklist against every answer turns the conversation into an interrogation.
Bias checking is an **active-learning problem**: apply the single check most likely to matter to the
current decision, chosen by trigger:

| Trigger | Check applied |
|---|---|
| User cites a celebrity diagnosis or a vivid story | Availability: distinguish the story from the population estimate — without dismissing its emotional weight |
| Strong reaction to relative-risk language | Restate in absolute risk |
| Fear of causing harm *by acting* | Compare commission and omission symmetrically |
| Confusion about a percentage | Switch to natural frequencies |
| Choice pinned to today's value | Reframe on trajectory and time horizon |

Never more than one check per turn; the [injection policy](epistemics.md#the-injection-policy)'s
frequency capping applies. A check that found nothing is not replaced by the next one on the list.

## Part 3 · The framing engine

### Four models, never collapsed

The agent maintains four distinct models. The last one may not rewrite the first three.

| Model | Holds | Fed by |
|---|---|---|
| **Evidence** | What population evidence and clinical knowledge support — effect sizes, uncertainty, harms, alternatives, evidence quality | [Healthspan model](healthspan-model.md), guideline corpus, [evidence labels](evidence.md) |
| **Personal risk** | How this person's characteristics and longitudinal data modify the evidence — from real data, never from their preferences | The record, via [context assembly](context-assembly.md) |
| **Values & constraints** | What outcomes matter to them; burdens, resources, access limits, meta-preferences | [Psychographic layer](data-capture.md#psychographic-preference-signal), the [preference ladder](#the-considered-preference-ladder) |
| **Communication** | What explanation is most likely to produce *accurate understanding* for this person right now | [Literacy profile](epistemics.md#the-literacy-profile), disposition, current affect |

The bright line: **the communication model adapts how the evidence is shown; it never adapts what
the evidence says.** Wanting a different answer changes nothing upstream of presentation.

### Framing modes

The communication model chooses among a controlled set of framings — different users, and the same
user at different moments, need different combinations:

| Mode | Shape of the sentence |
|---|---|
| **Personal baseline** | "This is unusual *for you*, even though it is within the broad population range." |
| **Population** | "Among people with similar characteristics…" |
| **Natural frequency** | "About 8 out of 1,000 over ten years…" |
| **Trajectory** | "The direction over six months matters more than today's value." |
| **Counterfactual** | "What would we expect to see if sleep loss were the main explanation?" |
| **Decision threshold** | "The conclusion would change if your risk rose above this range, or the false-positive burden fell." |
| **Mechanism** | "Here is the plausible pathway from the intervention to the outcome." |
| **Action** | "The lowest-risk way to learn more is…" |

### Framing invariants

Whatever the framing, these stay visible. They are the anti-manipulation guardrails:

- the baseline,
- the denominator,
- the time horizon,
- absolute benefits **and** harms,
- uncertainty,
- material alternatives,
- important missing data,
- what would change the conclusion.

The acceptance test for any adapted explanation:

!!! warning "The fairness test"
    Would this explanation still feel fair if the user ultimately chose the opposite option?
    If not, the framing is persuasive, not educational — and it fails review.

### Teach the smallest concept, at the point of confusion

Education happens where confusion is, not up front — this is the same
[just-in-time rule](epistemics.md#design-principles) epistemics already sets, applied
conversationally:

> "Before comparing those two values: they came from different devices, so part of the difference
> may be measurement rather than physiology."

beats any general lecture on measurement error. The rule: **teach the smallest concept necessary to
improve the next question or decision.** ([Law 7](design-system.md#interaction-laws): education
injects, never blocks.)

### Teach-back without a quiz

Instead of reframing the same probability repeatedly, the agent may ask, sparingly:

> "In your own words — what do you think this result does and does not tell us?"
>
> "Which part of this result would actually drive your decision?"

This finds misunderstandings while staying collaborative. It is a conversational move, not an
assessment: nothing here is scored, and the [literacy profile](epistemics.md#the-literacy-profile)
records engagement, never grades.

### Learn longitudinally — what works, not what wins

The agent updates a per-user model of *which explanations work*: natural frequencies improved
comprehension; population comparisons caused unneeded anxiety; personal-baseline plots landed;
this user reads correlation as causation; this user acts best on one reversible experiment rather
than a menu. These live in the psychographic layer with provenance and confidence, like every other
inferred attribute.

The caveat is absolute: the system learns which framing improves **understanding and useful
action** — never which framing produces agreement. A framing that reliably wins arguments is a
finding for the [governance](governance.md) review, not a technique to reuse.

### Success metrics

"Did the user follow the recommendation?" is a dangerous metric — it incentivizes manipulation and
is banned. The component is evaluated on:

- Did the user understand the key trade-off?
- Did they distinguish signal from noise?
- Did their confidence become better calibrated?
- Did they ask a more decision-relevant question than they started with?
- Did they select an action consistent with their stated higher-order goals?
- Did the action produce useful learning?
- Did health or function improve over time; was unnecessary burden avoided?

The agent is *rewarded* for helping a user reject a weak recommendation the evidence does not
support.

## The flow loop

The internal loop a well-run conversation follows. Like the question ladder, it is structure, not
script:

1. **Ground** — identify the goal, the relevant health function, the current question, and whether a decision is actually required.
2. **Validate the signal** — source, measurement quality, baseline, noise, missingness, persistence, clinical relevance.
3. **Improve the question** — rewrite it into one or more answerable, decision-relevant questions.
4. **Select the next high-value uncertainty** — ask only the question most likely to change the interpretation or action.
5. **Choose an adaptive frame** — fit the user's knowledge, state, goals, and representation preference; preserve the invariants.
6. **Check understanding and coherence** — brief teach-back, a counterfactual, or an alternate framing, only where needed.
7. **Connect to action** — a safe, proportionate next step: observe, measure, run a reversible [experiment](experimentation.md), change behaviour, or escalate to a professional.
8. **Define learning criteria** — what outcome would support the hypothesis, what would weaken it, when to reassess.
9. **Update the model** — record considered goals, constraints, framing response, action, and outcome, with provenance and uncertainty.

!!! warning "The stopping rule"
    Stop asking questions when further information is unlikely to change the action. A coach that
    always has one more question is an interrogation with a warm voice; the reciprocity test and
    the clarifying turn's no-stacking rule both apply here.

## Worked example: a screening decision

How the flows change a canonical hard case — a woman deciding whether to begin regular breast
screening.

**Not** the opening move: *"Would you prefer annual screening?"* Instead, the question is
decomposed:

> "There are several different questions hidden here: your chance of developing cancer, the chance
> screening changes an important outcome, the chance of a false alarm or unnecessary follow-up, and
> how you value those outcomes. Let's separate them."

The decision-relevant question is then identified:

> "Given your personal risk and the test's expected benefits and harms, is the possible reduction in
> serious delayed diagnosis worth the likely burden of false positives and follow-up, for you, at
> this point?"

The presentation adapts per the communication model — an absolute-risk table with sensitivity
analysis for a numerate user; outcomes among 1,000 similar women over a fixed window for one who
prefers concrete cases; the two or three decision-driving outcomes first for someone overwhelmed;
and for an answer driven by a family story, the personal story distinguished from the population
estimate without its emotional weight being dismissed.

And the conclusion never claims to have found her "actual preference":

> "Your considered preference currently favours avoiding low-benefit diagnostic cascades — but it
> shifts when your estimated risk rises, the test becomes more accurate, or the evidence of outcome
> benefit strengthens. I have moderate confidence in that model. Your tolerance for uncertainty
> appears to matter more than the raw probability."

A decision surface with a stated confidence — not a mined preference, and not a recommendation.

## Relationship to other components

- [Agent Loop](agent-loop.md) — the clarifying turn is rung 1–3 of the question ladder executed in a single turn; this page is the "question formation" spec that loop referenced as planned.
- [Context Assembly](context-assembly.md) — retrieval shapes are the fetch-side counterpart of the epistemic question types; the scope record is the per-answer analogue of the four-part answer contract.
- [Epistemics](epistemics.md) — supplies the concepts, the injection policy, the literacy profile, and the two hard constraints; this page specifies the *conversation* those pieces serve. The [preference model](epistemics.md#the-preference-model-simplify-this-for-me) is the "simplify" endpoint of the considered-preference ladder.
- [Data Capture → Psychographic layer](data-capture.md#psychographic-preference-signal) — stores preference rungs, framing-response history, and the values-and-constraints model, all with provenance and confidence.
- [Experimentation](experimentation.md) — rungs 8–9 of the ladder; "a reversible experiment" is the default proportionate action.
- [The Healthspan Model](healthspan-model.md) — the function vocabulary that keeps questions anchored to outcomes rather than surrogate metrics.
- [Governance](governance.md) — the fairness test and the compliance-metric ban are review criteria, not aspirations.

## Open questions

- [ ] How is the decision surface represented in the schema — a set of dimension→direction sentences with confidence, or something more structured the comparison frame can render?
- [ ] How is "understanding" measured for the success metrics without turning teach-back into a graded quiz?
- [ ] The framing-effectiveness learner must not reward agreement — what is the concrete signal it trains on instead (later behaviour consistency? experiment follow-through? calibration checks)?
- [ ] When the agent surfaces a stated-vs-meta-preference conflict, how does that stay on the right side of the never-prescriptive constraint?
- [ ] Where does the safety-oriented question type's escalation threshold set live, and who reviews it clinically?
- [ ] Does the four-part answer contract apply to every answer, or only above some stakes threshold? (A trivial descriptive query may not need "what it cannot yet say.")
- [ ] How many rungs of the preference ladder are worth modelling at MVP — is immediate/stated/understood enough to start?
