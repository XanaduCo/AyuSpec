// One shared mock-state module drives every scene, so taps genuinely update
// state within a session: answering the reconciliation ticks the Watch
// trajectories on Home; accepting the promotion adds the knee as a tracked
// issue. Everything is deterministic and hand-written — dates are hardcoded
// to the demo week (Sun Aug 2 – Sat Aug 8, 2026); nothing reads the clock.
import { createContext, useContext } from 'react'

export const initialState = {
  scene: 0,

  // Scene 2 — pre-action check-in.
  // stage: prompt → listening → extracted → confirmed ('looksGood' short-cuts)
  checkin: { stage: 'prompt', via: null },
  // The one low-confidence extraction that needs the user's tap.
  kneeExtraction: null, // null | 'added' | 'ignored'

  // Scene 4 — post-action reconciliation. All four asks are one bundled
  // AyuBot message; each answer is a single tap.
  recon: { heel: null, knee: null, toe: null, stretch: null },

  // Scene 5 — observation → tracked-issue promotion.
  promotion: null, // null | 'tracked' | 'dismissed'

  // Scene 6 — weekly review: "make the week concrete?" is offered, never forced.
  weekConcrete: null, // null | 'concrete' | 'flexible'
}

export function reducer(state, a) {
  switch (a.type) {
    case 'goto':
      return { ...state, scene: a.scene }
    case 'checkin':
      return { ...state, checkin: { stage: a.stage, via: a.via ?? state.checkin.via } }
    case 'kneeExtraction':
      return { ...state, kneeExtraction: a.value }
    case 'recon':
      return { ...state, recon: { ...state.recon, [a.field]: a.value } }
    case 'promotion':
      return { ...state, promotion: a.value }
    case 'weekConcrete':
      return { ...state, weekConcrete: a.value }
    default:
      return state
  }
}

export const reconDone = (s) =>
  s.recon.heel !== null && s.recon.knee !== null && s.recon.toe !== null && s.recon.stretch !== null

export const DemoContext = createContext(null)
export const useDemo = () => useContext(DemoContext)
