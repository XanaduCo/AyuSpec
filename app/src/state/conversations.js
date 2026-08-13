// Seeded conversation history for the Ask view.
//
// The chat surface keeps a list of past conversations — the same shape as the
// live thread Ask renders, so a seeded conversation and one the user just had
// are indistinguishable to the renderer. Each seed is built from the *same*
// canned answers in `mock/agent.js` that a fresh ask would resolve to, which is
// why revisiting one shows the real evidence labels, comparison frames and
// source cards rather than a flattened transcript.
//
// Determinism, like everything else in the demo: fixed `at` labels, no clock,
// no random. The dates sit just behind the record anchor (2025-08-03) so the
// history reads as "the last couple of weeks of questions".

import { ask, clarifyFor } from '../mock/agent.js'

const me = text => ({ role: 'me', text })
const ai = q => ({ role: 'ai', question: q, answer: ask(q) })
const clarify = q => ({ role: 'clarify', question: q, turn: clarifyFor(q) })

// A thread's egress posture, read from the answers it actually contains: if any
// turn ran a cloud-marked synthesis it is a `cloud` thread, otherwise every turn
// stayed on the local reasoner. This is a property of the thread's own history,
// not a blanket claim about ayuOS — the dot's tooltip says which.
export function threadPosture(messages) {
  return messages.some(m => m.answer?.cloud) ? 'cloud' : 'local'
}

// Wording mirrors the header's reasoner pill (local / cloud) so the two read as
// the same vocabulary; the fuller claim lives in the dot's tooltip.
export const POSTURE_LABEL = { local: 'local', cloud: 'cloud' }
export const POSTURE_TIP = {
  local: 'Every turn in this thread ran on the local reasoner — nothing left the device.',
  cloud: 'This thread used the cloud reasoner; each payload was PII-stripped at the gateway before it left.',
}

// Newest first — the list renders in array order and new conversations are
// unshifted to the front, so this ordering is the one the user sees.
export const SEED_CONVERSATIONS = [
  // --- behavioural-flows showcase threads (docs/behavioural-flows.md) --------
  // Six multi-turn conversations put the conversational spec on screen. Four
  // are Ravi's: question sharpening + signal validation; a considered
  // preference on a screening decision; correlation→causation handed off to a
  // reversible n-of-1; and a full-depth therapy decision. Two are GUEST
  // threads seeded from other patients' instances (`persona` field; see
  // mock/guests.js and docs/behavioural-flows-transcripts.md) — the same spec
  // producing a different-feeling conversation for a different person, which
  // one persona cannot demonstrate alone. Guest threads are read-only and
  // assemble against their own miniature stores.
  {
    id: 'conv-seed-maya-fatigue',
    persona: 'maya',
    title: 'It’s 3pm and my brain shut off again. What is going on with me?',
    at: 'Aug 3',
    seeded: true,
    // Maya's register: meaning first, short turns, never more than two steps.
    // The load-bearing move is personal-baseline framing — three "normal" TSH
    // values that doubled against her own treated baseline. Her 2am fear is
    // answered before the candidates are ranked, the glandular tab gets its
    // label filled in without a scolding, and the close records a plan with an
    // explicit escalation condition.
    messages: [
      me('It’s 3pm and my brain shut off again. My ring says my sleep is fine, which makes it worse. What is going on with me? And don’t tell me my labs are normal.'),
      ai('It’s 3pm and my brain shut off again. My ring says my sleep is fine, which makes it worse. What is going on with me? And don’t tell me my labs are normal.'),
      me('It doubled and nobody said anything?? Is this the Hashimoto’s getting worse? That’s the thing I don’t let myself google at 2am.'),
      ai('It doubled and nobody said anything?? Is this the Hashimoto’s getting worse? That’s the thing I don’t let myself google at 2am.'),
      me('The coffee thing is real?? And since we’re here — I’ve got a tab open for a thyroid glandular supplement. Wouldn’t a natural boost cover the gap?'),
      ai('The coffee thing is real?? And since we’re here — I’ve got a tab open for a thyroid glandular supplement. Wouldn’t a natural boost cover the gap?'),
      me('Tab closed. Mostly. Now be honest about the 30-day gluten elimination every Hashimoto’s podcast swears by.'),
      ai('Tab closed. Mostly. Now be honest about the 30-day gluten elimination every Hashimoto’s podcast swears by.'),
      me('A draw means facing the endocrinologist I’ve been dodging for a year and a half. If I go, give me the receipts. And is the ashwagandha even doing anything?'),
      ai('A draw means facing the endocrinologist I’ve been dodging for a year and a half. If I go, give me the receipts. And is the ashwagandha even doing anything?'),
      me('Six weeks then: coffee fix tomorrow, the ashwagandha finishes its run, then the draw. And the antibodies being stable did more for my 2am brain than any appointment ever has.'),
      ai('Six weeks then: coffee fix tomorrow, the ashwagandha finishes its run, then the draw. And the antibodies being stable did more for my 2am brain than any appointment ever has.'),
    ],
  },
  {
    id: 'conv-seed-dev-omega3',
    persona: 'dev',
    title: 'Plant omega-3 barely converts and my brain needs algae oil — real physiology or supplement funnel?',
    at: 'Aug 3',
    seeded: true,
    // Dev's register: measure before intervening. Mechanism separated from
    // outcome, the index audited (assay vs. the target painted on it), his
    // follow-the-money instinct validated then aimed, and the decision
    // criterion authored by him and audited rather than assigned. Ends on a
    // pre-registered test with a stored decision surface.
    messages: [
      me('Every longevity podcast says plant omega-3 barely converts and my brain needs algae oil. You have my data — real physiology or supplement funnel?'),
      ai('Every longevity podcast says plant omega-3 barely converts and my brain needs algae oil. You have my data — real physiology or supplement funnel?'),
      me('Before I spend $70 — wasn’t the omega-3 index invented by the people selling omega-3s? And are my eggs already giving me actual DHA?'),
      ai('Before I spend $70 — wasn’t the omega-3 index invented by the people selling omega-3s? And are my eggs already giving me actual DHA?'),
      me('VITAL was null for cognition? Is there any chain where someone like me supplements and an actual outcome improves — not a blood number?'),
      ai('VITAL was null for cognition? Is there any chain where someone like me supplements and an actual outcome improves — not a blood number?'),
      me('B12 I supplement without drama because deficiency causes named damage — is that the difference? And doesn’t my genome change how badly I convert?'),
      ai('B12 I supplement without drama because deficiency causes named damage — is that the difference? And doesn’t my genome change how badly I convert?'),
      me('If I test sub-3% I add algae oil; 4%+ I keep the flax. Sanity-check my thresholds — am I inventing a cutoff the same way the 8% people did?'),
      ai('If I test sub-3% I add algae oil; 4%+ I keep the flax. Sanity-check my thresholds — am I inventing a cutoff the same way the 8% people did?'),
      me('Gap default: sit tight. Order the test, thresholds pre-registered. The B12 stays because that chain actually reaches the end.'),
      ai('Gap default: sit tight. Order the test, thresholds pre-registered. The B12 stays because that chain actually reaches the end.'),
    ],
  },
  {
    id: 'conv-seed-statin',
    title: 'My doctor wants me on a statin. My calcium score was zero — why does a guy in the best shape of his life need a heart disease pill?',
    at: 'Aug 3',
    seeded: true,
    // The full flow loop across ten exchanges: fears surfacing one at a time
    // (muscle, diabetes, "diet instead", "forever", the calcium-scan shield,
    // and underneath them all, his father), one bias check per turn, a
    // pre-registered diet experiment handed off mid-thread, the recorded CAC
    // surface read back when one of its shift conditions goes live, and a
    // statin decision surface stored at the end — never a recommendation.
    // Local reasoner throughout: the thread leans on his genome, and the
    // pharmacogenomics never leave the device.
    messages: [
      me('My doctor wants me on a statin. My calcium score was zero — why does a guy in the best shape of his life need a heart disease pill?'),
      ai('My doctor wants me on a statin. My calcium score was zero — why does a guy in the best shape of his life need a heart disease pill?'),
      me('Wait — Lp(a)? A genetic problem the pill doesn’t even fix? And muscle is my real worry. A guy in my running club quit his statin because he couldn’t train.'),
      ai('Wait — Lp(a)? A genetic problem the pill doesn’t even fix? And muscle is my real worry. A guy in my running club quit his statin because he couldn’t train.'),
      me('90% of the pain showed up on placebo? So my friend imagined it? And you skipped the diabetes thing — I read statins raise it 10%.'),
      ai('90% of the pain showed up on placebo? So my friend imagined it? And you skipped the diabetes thing — I read statins raise it 10%.'),
      me('If I’m the rare real case, how fast does it reverse? And why can’t I just diet my way out of this?'),
      ai('If I’m the rare real case, how fast does it reverse? And why can’t I just diet my way out of this?'),
      me('Sketch the diet experiment. But honestly — is it informative, or am I just buying six weeks of feeling like I did something?'),
      ai('Sketch the diet experiment. But honestly — is it informative, or am I just buying six weeks of feeling like I did something?'),
      me('Lock it in. But nobody starts a statin and stops. Is there data on decades, or just five-year trials? My dad’s been on one since his stent and I can’t tell it’s done anything.'),
      ai('Lock it in. But nobody starts a statin and stops. Is there data on decades, or just five-year trials? My dad’s been on one since his stent and I can’t tell it’s done anything.'),
      me('He’s 74 and still gardening — that’s the receipt, isn’t it. One more: is red yeast rice anything, or just an unregulated statin with extra steps?'),
      ai('He’s 74 and still gardening — that’s the receipt, isn’t it. One more: is red yeast rice anything, or just an unregulated statin with extra steps?'),
      me('Should I redo the calcium scan before the follow-up — or is that me shopping for another zero?'),
      ai('Should I redo the calcium scan before the follow-up — or is that me shopping for another zero?'),
      me('Real talk — a pill at 45 feels like the opening scene of becoming my dad. Build me the packet for the follow-up.'),
      ai('Real talk — a pill at 45 feels like the opening scene of becoming my dad. Build me the packet for the follow-up.'),
      me('The lisinopril question got me. Run the experiment, redraw, walk in with the packet — that’s the plan.'),
      ai('The lisinopril question got me. Run the experiment, redraw, walk in with the packet — that’s the plan.'),
    ],
  },
  {
    id: 'conv-seed-sleepscore',
    title: 'Is my sleep score bad?',
    at: 'Aug 2',
    seeded: true,
    // The agent never answers the question as asked: the composite score is the
    // wrong object, so each turn climbs the question ladder — signal, noise,
    // persistence, context — and ends on the next question worth asking. Every
    // turn ran on the local reasoner (green dot).
    messages: [
      me('Is my sleep score bad?'),
      ai('Is my sleep score bad?'),
      me('Is the REM drop real, or is it my ring?'),
      ai('Is the REM drop real, or is it my ring?'),
      me('What would make the REM drop worth acting on?'),
      ai('What would make the REM drop worth acting on?'),
    ],
  },
  {
    id: 'conv-seed-cac',
    title: 'A friend my age just got a stent — should I repeat my calcium scan?',
    at: 'Aug 1',
    seeded: true,
    // A screening decision worked to a decision surface, not a recommendation:
    // hidden questions decomposed, natural frequencies with harms and benefits
    // on the same page, exactly one bias check (availability — the friend's
    // story), and a stated-vs-meta-preference conflict surfaced as a question.
    messages: [
      me('A friend my age just got a stent — should I repeat my calcium scan?'),
      ai('A friend my age just got a stent — should I repeat my calcium scan?'),
      me('What would a repeat scan actually buy me?'),
      ai('What would a repeat scan actually buy me?'),
      me('Honestly, I just want the reassurance. Scans are cheap.'),
      ai('Honestly, I just want the reassurance. Scans are cheap.'),
      me('Evidence first — if it changes nothing before 2027, I can wait.'),
      ai('Evidence first — if it changes nothing before 2027, I can wait.'),
    ],
  },
  {
    id: 'conv-seed-metals',
    title: 'Should I be worried about my heavy metals result?',
    at: 'Aug 1',
    seeded: true,
    messages: [
      me('Should I be worried about my heavy metals result?'),
      ai('Should I be worried about my heavy metals result?'),
    ],
  },
  {
    id: 'conv-seed-90day',
    title: 'What changed in my last 90 days?',
    at: 'Jul 28',
    seeded: true,
    // A two-turn thread: the deterministic clarifying turn, then the scoped
    // re-ask the user picked from it. Demonstrates that history holds the whole
    // shape of a conversation, not just its first question.
    messages: [
      me('What changed in my last 90 days?'),
      clarify('What changed in my last 90 days?'),
      me('What changed in my cardiac markers?'),
      ai('What changed in my cardiac markers?'),
    ],
  },
  {
    id: 'conv-seed-evening-hrv',
    title: 'Evening training is tanking my HRV — pretty clear cause and effect, right?',
    at: 'Jul 26',
    seeded: true,
    // Correlation held at the causation boundary: "these happened together" is
    // stated as the limit of the data, the counterfactual is run against what
    // the record supports, confounders are checked one at a time, and the
    // thread hands off to a pre-registered, reversible timing experiment.
    messages: [
      me('Evening training is tanking my HRV — pretty clear cause and effect, right?'),
      ai('Evening training is tanking my HRV — pretty clear cause and effect, right?'),
      me('Every hard evening session is followed by a bad morning. What else could it be?'),
      ai('Every hard evening session is followed by a bad morning. What else could it be?'),
      me('OK — how do we actually find out?'),
      ai('OK — how do we actually find out?'),
    ],
  },
  {
    id: 'conv-seed-garmin',
    title: 'Did my Garmin training block actually improve anything?',
    at: 'Jul 20',
    seeded: true,
    messages: [
      me('Did my Garmin training block actually improve anything?'),
      ai('Did my Garmin training block actually improve anything?'),
    ],
  },
  {
    id: 'conv-seed-lipid',
    title: 'Explain my lipid panel',
    at: 'Jul 9',
    seeded: true,
    // A local-reasoner thread — its posture dot is green, nothing was ever sent.
    messages: [
      me('Explain my lipid panel'),
      ai('Explain my lipid panel'),
    ],
  },
]
