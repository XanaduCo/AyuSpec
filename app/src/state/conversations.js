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
  // Four multi-turn conversations that put the conversational spec on screen:
  // question sharpening + signal validation; a considered preference formed on
  // a screening decision; the correlation→causation boundary handed off to a
  // reversible n-of-1; and a full-depth therapy decision. Same fixture shape as
  // everything else — each turn's answer is the canned one a live ask would
  // resolve to.
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
