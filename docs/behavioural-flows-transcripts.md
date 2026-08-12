# Behavioural Flows · Transcripts

!!! note "Status: reference material"
    Two full conversation transcripts that exercise [Behavioural Flows](behavioural-flows.md)
    against patients with very different profiles. They complement the demo's seeded threads
    (all anchored to Ravi's record — see the statin conversation there for the third patient):
    together the three show the same spec producing three different-*feeling* conversations,
    which is the point of the framing engine.

## How these were produced

Each transcript comes from a two-agent simulation. One agent played the patient: it was given a
life situation, a personality, and a set of worries — and **nothing about the behavioural spec**,
so it pushes back, deflects, and changes the subject the way a person does. The other agent played
ayuOS: it was given the spec, the patient's record, and the population evidence, and told to follow
the spec exactly. The conversations ran until the patient ended them; neither agent saw the other's
instructions. Light editing only.

What to look for across both — and against the demo's statin thread:

- **The invariants never move.** Absolute numbers, baselines, denominators, harms with benefits,
  uncertainty, alternatives, what would change the conclusion — present in every conversation.
- **Everything else adapts.** Ravi gets derivations and 200-word turns; Maya gets meaning-first
  answers under 160 words and plans capped at two steps; Dev gets mechanism-vs-outcome
  distinctions and his own thresholds sanity-checked. Same truth, three representations.
- **Nobody is told what to do.** All three conversations end in a recorded plan or decision
  surface the patient authored, not a recommendation.
- **The conversations end at different lengths** because the stopping rule, not a script, decides:
  the statin thread ran ten exchanges; these two closed themselves at seven.

---

## Patient 2 · Maya — "what is going on with me?"

**Profile.** 39, freelance designer. Hashimoto's (2019), levothyroxine 75 µg. Runs everything
local — the most conservative posture the product supports. Effort tolerance *low*: abandons
anything that needs babysitting. Wants meaning, not metrics. Natural-is-safer prior. Unvoiced
fear on file: that the fatigue means the disease is progressing.

**Record going in.** TSH 1.6 → 2.1 → 3.8 mIU/L over two years, all inside the 0.4–4.0 lab range;
free T4 low-normal; TPO antibodies 340, roughly stable across three draws. Ferritin 22 µg/L.
Vitamin D 24 ng/mL. Sleep genuinely fine per Oura (7 h 20 avg, 88 % efficiency). Seven one-tap
energy logs in three weeks, all between 13:40 and 15:10. Intake logging shows the pill taken with
breakfast — coffee within ~15 minutes on most captured mornings. In flight: an ashwagandha
n-of-1, day 12 of 21. She has not seen her endocrinologist in ~18 months. She starts with the
app, not a doctor.

> **Maya** · ok I need you to explain something to me. it's 3pm and I'm on the sofa again because
> my brain just... shut off. this has been happening basically every afternoon for two months. my
> ring keeps insisting my sleep is fine, which honestly makes it worse. what is going on with me?
> and don't tell me my labs are normal, I've heard that one.

> **ayuOS** · You're not imagining it — and your ring actually backs you up. Sleep is averaging
> 7h20 with solid efficiency, steady for months. By your own data, sleep is largely ruled out as
> the culprit. And your crashes aren't random: seven logs in three weeks, all landing between
> about 1:40 and 3pm. That's a pattern, not a mood.
>
> Now, about "your labs are normal." Normal means the population range — not *your* range. Two
> years ago your TSH was 1.6 on this same dose. Last draw: 3.8. Every value inside the lab's
> lines, but for someone on treatment, more than doubling from your own baseline is a real
> signal, the kind "normal" quietly hides.
>
> What the numbers can't yet say is *why* it's drifting. But that hands you a sharper question
> than "why am I tired" — and I have a couple of candidates when you want them.

*Signal validated before interpretation — and validation lands as vindication, because it is her
own data doing it. The personal-baseline framing mode carries the turn. The sharpened question
arrives carrying findings (reciprocity), and the turn stops without stacking a second question.*

> **Maya** · wait. it doubled?? and nobody said anything?? I sat in that office and got
> "everything looks fine, see you next year." 1.6 to 3.8 on the same pill I've taken for six
> years. so I'm not crazy — something IS drifting. okay yes, give me the candidates. is this the
> Hashimoto's getting worse? because that's the thing I keep not letting myself google at 2am.

> **ayuOS** · You're not crazy — the drift is right there in your own numbers. And let's take the
> 2am fear first, because your record has something real to say about it. The marker that tracks
> the autoimmune attack itself — your TPO antibodies — has been roughly stable across three
> measurements. If the Hashimoto's were speeding up, that's where I'd expect movement. It's not
> proof, but your data does not look like a disease accelerating.
>
> Two more ordinary candidates fit better. First: your morning logs show coffee within about
> fifteen minutes of your pill most days — and coffee measurably cuts levothyroxine absorption.
> Same dose swallowed, less of it arriving. Second: your ferritin is 22 — inside the range, but
> below 30 is linked to exactly this kind of fatigue in women.
>
> Candidates, not verdicts. But notice your question just sharpened: not "why am I tired" — "is
> my dose actually getting in, and is low iron riding along?"

*The safety-shaped fear is answered first, with evidence, before anything else — and answered
honestly ("not proof"). Explanatory boundary respected: candidates, never verdicts. The question
ladder climbs in plain sight without ever being shown.*

> **Maya** · hold on. the coffee thing is real?? I've literally taken my pill with breakfast —
> meaning coffee, obviously — for six years. no doctor ever mentioned that once. so half my dose
> might just be... not arriving? that's absurd and also weirdly hopeful?
>
> and okay, since we're here — I've got a tab open for a thyroid glandular supplement, actual
> desiccated thyroid. if my dose isn't getting in, wouldn't a natural boost on top kind of cover
> the gap?

> **ayuOS** · Real and well-documented — coffee that close to the pill measurably blunts
> absorption. Not half, most likely, but enough that a drifting TSH on an unchanged dose is
> exactly what it can look like. The fix costs nothing: water with the pill, coffee thirty to
> sixty minutes later. Six years of nobody mentioning it is maddening, and it may also be your
> cheapest lever.
>
> On the glandular — your instinct that something thyroid-shaped is off looks right. The bottle
> is the wrong instrument, though. Independent testing keeps finding actual T3/T4 hormone in
> those supplements, unlabeled, in amounts that vary bottle to bottle. On top of levothyroxine
> that's a second hormone dose nobody's measuring or adjusting — and chronic excess carries real
> risks, heart-rhythm problems and bone loss among them. If the problem is your dose not
> arriving, the fix that matches it is making *that* dose arrive. The choice stays yours — I just
> want it made with the label filled in.

*The natural-is-safer prior is corrected at the exact decision point — one bias check, light
touch, her instinct validated before the instrument is questioned. "Half" is reined in rather
than ridden. The fairness test holds: the framing would still feel fair if she bought the
bottle.*

> **Maya** · ugh. fine. "unlabeled hormone in random amounts" is not the vibe I want either, even
> from a nice bottle. tab closed. mostly closed.
>
> water with the pill, coffee an hour later — that I can actually do, that's zero effort. but be
> honest with me about the other thing: the 30-day gluten elimination. every Hashimoto's podcast
> swears by it. is that also a wrong instrument, or is there actually something there?

> **ayuOS** · Honest answer: not a wrong instrument like the glandular, but the evidence is much
> thinner than the podcasts make it sound. The trials are small and mixed. The clearest, most
> reliable benefit is in people who actually have celiac disease — and here's the interesting
> gap: your record has no celiac test in it. The podcast stories are people who genuinely felt
> better; that's real, it's just a story, not a probability.
>
> Two practical problems for you specifically. Thirty days of reading every label is exactly the
> kind of babysitting that eats your energy. And you're on day 12 of the ashwagandha run — start
> a second change now and neither one can get credit for anything.
>
> So the low-effort version: coffee timing starts tomorrow, and a celiac check can simply ride
> along on your next blood draw. If that comes back positive, gluten stops being a podcast
> question and becomes a real one.

*Story distinguished from population estimate without its emotional weight being dismissed
(availability check — the one check this turn needed). The effort cost is priced against her
actual profile, and experiment discipline blocks stacked changes. The plan never exceeds two
steps.*

> **Maya** · okay "reading every label for 30 days" — yeah no, you know me. shelved.
>
> but a blood draw means actually going back to the endocrinologist, who I've been dodging for
> like a year and a half because I couldn't face another "everything's fine." if I do go... can
> you give me the receipts? the 1.6 to 3.8 thing, the coffee thing, ferritin, add-a-celiac-test —
> something I can put in front of her so I don't get patted on the head again. and while we're at
> it, is the ashwagandha even doing anything?

> **ayuOS** · Done — I'll build the packet. It leads with the one picture that changes the room:
> your TSH plotted against your own treated baseline — 1.6, 2.1, 3.8 — same dose throughout,
> every point stamped "normal." Then the coffee-timing question, ferritin at 22 with the fatigue
> evidence, and a requested add-on: celiac serology on the same draw. One vial, four answers.
>
> The ashwagandha: nine days left, and your energy logs show the crashes still landing in the
> same afternoon window — no visible shift yet. Let it finish cleanly rather than judge it early.
> It goes in the packet too, because ashwagandha can nudge thyroid hormone levels, and your endo
> should know that when she reads the TSH.
>
> One choice that's genuinely yours: draw soon and it's a baseline, or give the coffee fix six
> weeks and the draw shows whether it worked. Either is defensible. You're not walking in with a
> feeling this time — you're walking in with a chart.

*The dose decision is routed where it belongs — to her endocrinologist — with the record armed
for that conversation rather than replaced by it. The interaction (ashwagandha ↔ TSH) is
disclosed to the clinician path, not just to her. The one genuinely open choice is handed over
explicitly, both branches named defensible.*

> **Maya** · "walking in with a chart" — okay that actually made me a little emotional, which is
> embarrassing. six years of feeling like a hysterical woman with a folder of vibes.
>
> let's do the six weeks. coffee fix starts tomorrow, ashwagandha finishes its run, then the draw
> actually shows something. book-the-endo energy will materialize by then, probably. and honestly
> — hearing the antibodies are stable did more for my 2am brain than anything a doctor's said in
> years. thank you. going to go make an inappropriately late coffee now, since apparently the
> timing only matters at 7am.

> **ayuOS** · Recorded, all of it: coffee fix from tomorrow morning, ashwagandha finishes its
> nine days and gets its verdict, and the draw — TSH, free T4, ferritin, celiac — lands in about
> six weeks, when it can actually show whether the fix worked. The packet's built and waiting for
> the appointment.
>
> Only thing that moves the timeline up: if the crashes get worse instead of holding steady, or
> anything new shows up — then we don't wait, we go.
>
> It was never a folder of vibes. It was data nobody had plotted for you. Enjoy the coffee — 3pm
> is officially the correct time for it.

*Flow-loop step 9: the plan recorded with its timeline and an explicit escalation condition. The
stopping rule holds — no new questions, the conversation lands.*

**Where she started:** "what is going on with me? and don't tell me my labs are normal."
**Where she ended:** a zero-effort absorption fix, a clean finish for her running experiment, one
draw carrying four questions, a packet that turns "normal labs" into a plotted personal baseline
— and the 2 a.m. fear answered with her own antibody data. The glandular tab — an unmonitored
hormone dose — closed itself once the label was filled in.

---

## Patient 3 · Dev — omega-3 on a vegetarian pattern

**Profile.** 37, backend engineer, lifelong lacto-ovo vegetarian — identity, not preference.
High numeracy; measures before optimizing; allergic to supplement hype but marinated in longevity
podcasts. Already supplements B12 and vitamin D, adopted on evidence. Quiet 37-year worry
underneath: "have I been starving my brain?"

**Record going in.** ApoB 78, LDL-C 102, hs-CRP 0.6, HbA1c 5.2 %, resting HR 58, runs 28 km/week.
No family history of premature disease. Diet log: ground flax ~5 mornings/week, walnuts ~4×/week
(≈ 4–5 g ALA on logged days), eggs most days. Genome: derived FADS1/FADS2 haplotype (favourable
for ALA conversion; modest effect, low-to-moderate evidence). **Nothing in the record has ever
measured his omega-3 status** — the gap the whole conversation turns on.

> **Dev** · Okay, settle an argument between me and every longevity podcast I listen to. I'm
> vegetarian, lifelong. I eat ground flax most mornings and walnuts every other day specifically
> for omega-3s. But apparently the plant kind "barely converts" to DHA and my brain is quietly
> falling apart unless I buy algae oil? You have all my data — is this real physiology or a
> supplement funnel? Show me actual numbers.

> **ayuOS** · Both, partly — and your record lets me be specific. The physiology is real: ALA→EPA
> conversion runs roughly 5–8%, ALA→DHA well under 1% in most studies. The podcasts aren't wrong
> about the mechanism. Your logged intake is actually strong: flax ~5 mornings a week plus
> walnuts ~4×/week puts you near 4–5 g ALA on logged days — about 3× the 1.6 g adequate-intake
> figure — plus ~75 mg DHA per egg most days. More flax wouldn't move DHA either way; the
> conversion enzyme is the bottleneck, not the input.
>
> Here's what your record cannot say: nothing in it has ever measured your omega-3 status. No
> omega-3 index, no fatty-acid panel. So every claim about *your* levels — podcast or supplement
> label — is an extrapolation from population averages (vegetarians typically test ~3.5–4.5% vs
> omnivores ~4–6%). "The mechanism is real" and "your levels are low" are different claims; only
> the first is established.
>
> A dried-blood-spot omega-3 index test runs about $50–80, at home. Before debating the
> supplement at all — want to work out what result would actually change your decision?

*"Is this real or a funnel" is refused as a binary: mechanism-is-real and your-levels-are-low are
prised apart, which no podcast had done for him. The record's coverage gap — never measured — is
stated as the actual finding. The intervention debate is deferred until a decision criterion
exists.*

> **Dev** · Okay, points for separating "the enzyme is slow" from "you personally are deficient"
> — no podcast has ever made that distinction. But before I spend $70: isn't the omega-3 index
> literally a test invented by omega-3 researchers who consult for fish oil companies? Follow the
> money. Is it even a validated marker, or is it cholesterol-panel cosplay? And wait — my eggs
> are already giving me actual DHA?

> **ayuOS** · Your instinct is aimed at the right people but the wrong claim. The measurement
> itself is sound: RBC EPA+DHA as a fraction of total fatty acids is reproducible, stable over
> ~120 days of red-cell life, and rises predictably with intake — as an *assay*, it's real
> chemistry, not cosplay. What's contaminated is the **8% target**: it derives from fish-eating
> cohorts (Japan, Korea) and from researchers who commercialised the test. So the number you'd
> get is trustworthy; the line someone draws on it is where the money enters.
>
> And note the conflicts run every direction — test-sellers, supplement-sellers, podcasts with
> algae-oil sponsors, and even the null side (nutrition academics invested in "supplements don't
> work"). Which is why the honest chain matters: supplementation raises the index (near-certain),
> and a raised index improves outcomes (uncertain — VITAL, 25,000 adults at 1 g/day, was null for
> major cardiovascular events and cognition). The index is a surrogate, not an outcome.
>
> Eggs: yes — ~75 mg DHA each, direct, no conversion needed. Against the 250–500 mg/day doses
> trials use, it's modest but not zero, and it's already in your baseline. The $70 wouldn't tell
> you what to do; it would tell you where you're starting from.

*His follow-the-money heuristic is validated, then aimed precisely: the assay is separated from
the target painted on it, and the conflicts are named in every direction including the null side.
The surrogate-endpoint concept is taught at its exact point of load-bearing.*

> **Dev** · Hold on, VITAL was null for *cognition*? That's the entire podcast pitch — "DHA is
> brain-critical, you're starving your neurons." If 25,000 people took a gram a day and their
> brains didn't measurably benefit, what exactly am I protecting against? Is there any evidence
> chain where low-index vegetarian me supplements and an actual outcome improves — not a blood
> number, an outcome? Because I've spent 37 years mildly wondering if I broke my brain.

> **ayuOS** · Straight answer: no. There is no trial where healthy midlife adults — vegetarian or
> otherwise — supplemented DHA and a cognitive outcome improved. VITAL's cognition substudies
> were null; the DHA-brain link in adults rests on observational data, and the people with high
> indices also eat fish, exercise, and are richer — heavily confounded. "Brain-critical" is
> developmental biology (prenatal, infant) stretched to midlife without evidence making the jump.
>
> The closest thing to a real chain: VITAL's low-fish-intake subgroup showed a modest
> cardiovascular signal — hypothesis-generating, not proof, and you'd be extrapolating into it.
> REDUCE-IT was positive but used 4 g/day pharmaceutical EPA in statin-treated high-risk
> patients; you are not in that room.
>
> Here's the confounder the podcasts skip entirely: vegetarians as a population have *lower*
> cardiovascular event rates than omnivores, despite lower omega-3 indices. Whatever the index
> costs your pattern, the pattern more than repays it.
>
> And your own numbers say your absolute stakes are small: ApoB 78, hs-CRP 0.6, resting HR 58, no
> family history before 75. A low-baseline-risk person buys little absolute benefit from *any*
> cardiovascular intervention. As for 37 years of quiet worry — nothing in your record supports
> it. The brain claim is precisely where the evidence is thinnest.

*The evidence is allowed to run out in public — "straight answer: no" — with the exact spot where
the chain breaks marked. Confounding in the observational data is the one concept taught. His
personal risk context converts relative claims into absolute stakes, and the 37-year worry is
answered from his record rather than soothed.*

> **Dev** · Huh. So the strongest evidence for the scary brain claim is... babies. And meanwhile
> my actual diet pattern is outperforming the fish-eaters on the outcome that matters. I'd feel
> vindicated if I weren't annoyed about the 37 years of low-grade guilt.
>
> Two things though. One: B12 I supplement without drama because deficiency causes actual, named
> neurological damage — is that the difference, real outcome data? Two: engineer question — you
> have my genome. Don't FADS variants change how badly I convert ALA?

> **ayuOS** · Yes — that's exactly the difference, and it's why your B12 habit is coherent rather
> than hypocritical. The B12 chain is complete at every link: no reliable intake on a lacto-ovo
> diet → measurable deficiency → *named* outcomes (megaloblastic anemia, subacute combined
> degeneration, irreversible neuropathy) → supplementation prevents them. Deficiency-to-disease
> and supplement-to-prevention are both demonstrated. Omega-3 has the first links — conversion is
> genuinely inefficient, vegetarian indices genuinely run lower — and then the chain stops before
> the outcome. You applied a bar; B12 cleared it. Omega-3, on current evidence, doesn't clear it
> as cleanly. That's not a diet verdict, it's a data inventory.
>
> The genome, honestly labeled: you carry the derived FADS1/FADS2 haplotype (rs174546 and linked
> variants), common in South Asian ancestry and associated with *more* efficient ALA→EPA/DHA
> conversion — direction favourable for your pattern, effect size modest, evidence quality
> low-to-moderate. It nudges the prior that your index sits at the better end of the vegetarian
> 3.5–4.5% range; it does not replace measuring.
>
> Which leaves one live question, and it's yours, not mine: is there a number the $70 test could
> return that would change what you do?

*His own precedent becomes the measuring stick — the same evidence bar he applied to B12, applied
consistently, dissolves the identity threat. The genomic finding is delivered with its evidence
tier attached and explicitly does not substitute for measurement. The turn ends by handing him
the decision criterion to author.*

> **Dev** · Okay, my ancestors were apparently pre-optimizing for this. Nice.
>
> Fine, engineer answer: yes, there's a number. If I test and I'm way below even the vegetarian
> range — like sub-3% — I'd add algae oil, because at that point I'm an outlier even for my diet
> and the cost of being wrong is asymmetric. Algae oil doesn't threaten the vegetarianism, it
> just offends my wallet. If I'm 4%+, I keep flax and stop listening to that podcast segment.
> Sanity-check my thresholds — am I inventing a cutoff the same way the 8% people did?

> **ayuOS** · Your cutoff is invented, but not the way theirs was — and the difference matters.
> The 8% target smuggles in an outcome claim ("above this, protected") that no trial supports.
> Yours is a distributional rule: "if I'm an outlier *within my own reference class*, cheap
> insurance wins under asymmetric cost." That claims nothing about outcomes, which is exactly why
> it's honest. Pre-registering it before seeing the number is the right move too — it's the same
> discipline that keeps you from rationalizing after the fact.
>
> Two engineering notes. First, a single dried-blood-spot has real noise — assay plus biological
> variability — so treat your lines as bands: a 2.9 and a 3.2 are not meaningfully different
> values, and a result near a boundary is worth a retest before acting. Second, you've specified
> two regions and left 3–4% undefined, which is where a vegetarian with your flax intake and
> favourable FADS haplotype is most likely to land.
>
> Worth knowing: whatever you choose there is reversible and checkable — 250–500 mg/day algae DHA
> (~$10–25/month) typically moves the index over 4–6 months, red-cell turnover time, so test →
> change → retest is a clean n-of-1. What's your default in the gap — supplement or sit tight?

*He authored the criterion; the agent's job becomes auditing it — his cutoff is distinguished
from the 8% target by what each one claims, his undefined region is surfaced before the result
can land in it, and measurement noise turns his crisp lines into honest bands.*

> **Dev** · Gap default: sit tight. If I land at 3–4% I'm just... a vegetarian, which I already
> knew, and the only evidence saying that's a problem is the evidence you just told me doesn't
> exist. Low baseline risk, favorable genome, outcome-level diet advantage — I'm not paying a
> monthly fee to move a surrogate marker out of spite toward a podcast ad read.
>
> So the plan: order the $70 test, pre-registered thresholds — sub-3% (confirmed with a retest if
> near the line) means algae oil and a 6-month retest, 3%+ means keep the flax and skip the ad
> segments. And I keep the B12 because that chain actually reaches the end.
>
> Honestly this is the first time anyone's separated "your enzyme is slow" from "your brain is
> broken" for me. 37 years of guilt resolved for the price of one blood spot. Good deal.

> **ayuOS** · Recorded as pre-registered: order the dried-blood-spot omega-3 index (~$70). Below
> 3% — retest first if within noise of the line — add 250–500 mg/day algae DHA and re-measure at
> 6 months. At 3% or above, no change: flax stays, wallet stays closed. B12 and vitamin D
> continue as-is.
>
> Your decision surface, as I've modeled it: you intervene when you're an outlier within your own
> reference class and the fix is cheap, reversible, and diet-compatible; you don't pay monthly to
> move a surrogate that hasn't earned an outcome. It would shift if outcome-level trial evidence
> in people like you appeared, or if your baseline risk rose. Moderate-to-high confidence — it
> matches three years of your own behaviour, B12 included. That's a model of you, not advice.
> Good experiment.

*Flow-loop step 9: the pre-registered plan and the decision surface — direction, shift
conditions, confidence — stored as data he owns, explicitly a model and not a recommendation.*

**Where he started:** "is this real physiology or a supplement funnel?"
**Where he ended:** a $70 measurement replacing the argument, thresholds he wrote himself and had
audited, a default for the gap he chose on the evidence, and the 37-year background worry retired
by separating a slow enzyme from a broken brain. Whether he ever buys algae oil was never the
success metric.

---

## What the three patients show together

| | Ravi (statin, in the demo) | Maya | Dev |
|---|---|---|---|
| **Opens with** | A doctor's recommendation he distrusts | A symptom no one will validate | A podcast claim vs. his identity |
| **Register served** | Derivations, long turns, trial names | Meaning first, < 160-word turns | Mechanism vs. outcome, audit his logic |
| **Load-bearing framing** | Natural frequencies, LDL-years | Personal baseline vs. population range | Surrogate endpoint vs. outcome |
| **Bias checks fired** | Availability, relative→absolute, omission/commission | Natural-is-safer, story vs. estimate | Follow-the-money (validated, then aimed) |
| **Proportionate action** | Pre-registered diet experiment + doctor packet | Zero-effort absorption fix + one draw, four questions | $70 test with self-authored thresholds |
| **Clinician hand-off** | Six-week statin decision, armed | Endocrinologist re-engaged after 18 months, armed | None needed — below that threshold |
| **Close** | Decision surface, rung *understood → endorsed* | Recorded plan + escalation condition | Decision surface, moderate-to-high confidence |
| **Turns** | 20 | 14 | 14 |

The same spec, the same invariants, three conversations that feel nothing alike — and none of
them ends in advice.
