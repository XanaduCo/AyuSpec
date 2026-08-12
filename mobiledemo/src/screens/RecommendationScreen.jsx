import { useState } from 'react'
import { useDemo } from '../state.js'
import { LocalDot } from '../components/bits.jsx'

// The recommendation: one line by default; "why?" expands the record — goals
// served, evidence used, constraints, and what would change it. Stored with
// state/plan/model versions, so last Tuesday's "why" is answerable from records.
export default function RecommendationScreen() {
  const { state, dispatch } = useDemo()
  const [open, setOpen] = useState(false)
  const kneeNoted = state.kneeExtraction === 'added' || state.kneeExtraction === null

  return (
    <div className="screen rec">
      <div className="date-line">Wednesday, August 5</div>

      <div className="card rec-card">
        <div className="rec-posture">
          <LocalDot label="computed on-device" />
        </div>
        <p className="rec-line">
          Keeping it easy · <span className="num">7–8 km</span>.
        </p>
        <p className="rec-sub">
          {kneeNoted
            ? 'Don’t force it if the knee changes how you move.'
            : 'Short night noted — keep the effort genuinely easy.'}
        </p>

        <button className="why-toggle" onClick={() => setOpen(!open)}>
          {open ? 'Hide why' : 'Why?'}
        </button>

        {open && (
          <div className="why-panel">
            <div className="why-block">
              <h4>Goals served</h4>
              <p>Marathon block (Oct 18) · Achilles protection · weekly consistency</p>
            </div>
            <div className="why-block">
              <h4>Evidence used</h4>
              <p>
                Sleep <span className="num">5h58m</span> (Oura) · heel: no pain, 6 straight runs ·
                knee: new this morning (your words) · strength session yesterday
              </p>
            </div>
            <div className="why-block">
              <h4>Constraints</h4>
              <p>
                Morning window ≈<span className="num">50 min</span> · principle: most volume easy ·
                envelope <span className="num">~35 km</span> with <span className="num">16.6 km</span>{' '}
                uncommitted
              </p>
            </div>
            <div className="why-block">
              <h4>Could change if</h4>
              <p>knee worsens · heel changes materially · your window shrinks</p>
            </div>
            <div className="why-foot num">rec r-0184 · Aug 5, 07:15</div>
          </div>
        )}
      </div>

      <button className="btn wide" onClick={() => dispatch({ type: 'goto', scene: 3 })}>
        Skip ahead — the run happens →
      </button>
    </div>
  )
}
