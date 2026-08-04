// The evidence-intake shelf.
//
// Everything a user submits is kept — accepted, watched, or graded NONE and
// filed (docs/evidence-intake.md#rejected-and-weak-items-are-kept). So this
// module is deliberately append-only: `file` and `accept` add a row, nothing
// removes one, and a re-appraisal of an item already on the shelf updates that
// row in place rather than creating a second history.
//
// It is a module-level singleton read through useSyncExternalStore so the shelf
// survives route changes within the session — you can accept a hypothesis here,
// walk to Experiments, and find it waiting. Like the rest of the demo's session
// state it lives in memory only and resets on reload.

import { useSyncExternalStore } from 'react'

let shelf = []          // newest first
const listeners = new Set()

function emit() {
  shelf = [...shelf]     // new identity so useSyncExternalStore sees the change
  for (const l of listeners) l()
}

function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

const snapshot = () => shelf

// One row per submission. `outcome` is what the user did with it, which is not
// the same as what the system offered — declining an offer is recorded, because
// a shelf that only remembers agreement is not a record.
function upsert(row) {
  const i = shelf.findIndex(r => r.id === row.id)
  if (i >= 0) shelf[i] = { ...shelf[i], ...row }
  else shelf.unshift(row)
  emit()
}

export function fileItem(sub, outcome = 'filed') {
  upsert({
    id: sub.id,
    claim: sub.hypothesis?.statement || sub.intake.claim_verbatim,
    verbatim: sub.intake.claim_verbatim,
    source: sub.provenance.venue !== '—' ? sub.provenance.venue : sub.provenance.attributed_to,
    attributed_to: sub.provenance.attributed_to,
    strength: sub.verdict.strength,
    offered: sub.offer.kind,
    outcome,                       // 'filed' | 'watching' | 'hypothesis'
    hypothesis: null,
  })
}

export function acceptHypothesis(sub) {
  upsert({
    id: sub.id,
    claim: sub.hypothesis.statement,
    verbatim: sub.intake.claim_verbatim,
    source: sub.provenance.venue !== '—' ? sub.provenance.venue : sub.provenance.attributed_to,
    attributed_to: sub.provenance.attributed_to,
    strength: sub.verdict.strength,
    offered: sub.offer.kind,
    outcome: 'hypothesis',
    hypothesis: sub.hypothesis,
  })
}

export function watchItem(sub) {
  fileItem(sub, 'watching')
}

// Views subscribe here. The getServerSnapshot argument repeats the client
// snapshot because this app never server-renders.
export function useEvidenceShelf() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

// Hypotheses accepted from intake and not yet turned into an experiment — what
// Experiments surfaces so an accepted item does not vanish between views.
export function useIntakeHypotheses() {
  const rows = useEvidenceShelf()
  return rows.filter(r => r.outcome === 'hypothesis')
}
