import { useDemo } from '../state.js'
import { Chips, PurposeLine, Glyph } from '../components/bits.jsx'

// Observation → tracked-issue promotion. Recurrence earns one offer; one tap
// creates the monitoring contract, silence leaves an observation cluster with
// zero standing question burden.
const MENTIONS = [
  { when: 'Sat Aug 1 · after long run', quote: '“knee felt a bit loose on the downhills”' },
  { when: 'This morning · pre-run', quote: '“caught a couple of times on the stairs”' },
  { when: 'Today · post-run', quote: '“same twinge”' },
]

export default function PromotionScreen() {
  const { state, dispatch } = useDemo()

  return (
    <div className="screen promotion">
      <div className="date-line">Wednesday, August 5</div>

      <div className="card ayubot-card">
        <p className="ayubot-text">Your knee has come up after 3 activities — start tracking it?</p>
        <PurposeLine purpose="reconciliation follow-up" budget="3 of 3 today" />

        <div className="mentions">
          {MENTIONS.map((m) => (
            <div key={m.when} className="mention">
              <span className="num when">{m.when}</span>
              <span className="quote">{m.quote}</span>
            </div>
          ))}
        </div>

        <Chips
          options={[
            { id: 'tracked', label: 'Track it' },
            { id: 'dismissed', label: 'Not now' },
          ]}
          value={state.promotion}
          onPick={(id) => dispatch({ type: 'promotion', value: id })}
        />
      </div>

      {state.promotion === 'tracked' && (
        <div className="card policy-card">
          <div className="policy-head">
            <Glyph name="check" size={13} /> Right knee — now tracked · added to Watch
          </div>
          <div className="policy-title">Proposed tracking policy</div>
          <ul className="policy-list">
            <li>Asks after runs only</li>
            <li>Logs “no pain” too</li>
            <li>Reviewed weekly</li>
            <li>
              Stops asking after <span className="num">2</span> symptom-free weeks
            </li>
          </ul>
          <div className="policy-foot">Editable anytime.</div>
        </div>
      )}

      {state.promotion === 'dismissed' && (
        <div className="card quiet-card">
          Not tracked — no follow-up questions. If it comes up again, you’ll get one more offer.
        </div>
      )}

      {state.promotion && (
        <button className="btn wide" onClick={() => dispatch({ type: 'goto', scene: 5 })}>
          Skip ahead — Sunday’s review →
        </button>
      )}
    </div>
  )
}
