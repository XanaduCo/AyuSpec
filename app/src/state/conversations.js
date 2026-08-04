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
