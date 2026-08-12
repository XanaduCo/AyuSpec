import { useEffect, useState } from 'react'
import { useDemo } from '../state.js'
import { Chips, ConfDots, PurposeLine, Glyph } from '../components/bits.jsx'

// Pre-action check-in. "Anything changed?" — never a questionnaire. One voice
// line lands five structured updates; extraction is graded, shown, and
// correctable. Only the low-confidence one (the knee) waits for a tap.
const TRANSCRIPT =
  '“Slept about six hours. Heel’s fine, toe still sore, knee caught a couple of times on the stairs. Only did my heel stretches.”'

const EXTRACTIONS = [
  {
    id: 'sleep',
    label: 'Sleep — short night',
    value: '≈6 h · matches Oura 5h58m',
    lands: 'confirmed',
    quote: '“Slept about six hours.”',
    conf: 'high',
  },
  {
    id: 'heel',
    label: 'Heel — no pain today',
    value: 'tracked issue',
    lands: 'status logged',
    quote: '“Heel’s fine …”',
    conf: 'high',
  },
  {
    id: 'toe',
    label: 'Toe — still sore',
    value: 'observation',
    lands: 'updated',
    quote: '“… toe still sore …”',
    conf: 'high',
  },
  {
    id: 'stretch',
    label: 'Stretches — heel done, rest skipped',
    value: 'habit',
    lands: 'logged',
    quote: '“Only did my heel stretches.”',
    conf: 'med',
  },
]

export default function CheckinScreen() {
  const { state, dispatch } = useDemo()
  const { stage } = state.checkin
  const [openQuote, setOpenQuote] = useState(null)

  // The mock voice line "plays" briefly before extraction lands. A fixed
  // timer, not the clock — the demo stays deterministic.
  useEffect(() => {
    if (stage !== 'listening') return
    const t = setTimeout(() => dispatch({ type: 'checkin', stage: 'extracted' }), 1400)
    return () => clearTimeout(t)
  }, [stage, dispatch])

  const kneeDecided = state.kneeExtraction !== null

  return (
    <div className="screen checkin">
      <div className="date-line">Wednesday, August 5</div>

      <div className="notif card">
        <div className="notif-head">
          <span className="notif-app">Companion</span>
          <span className="notif-when">now</span>
        </div>
        <p className="ayubot-text">
          Easy run this morning · <span className="num">7–8 km</span>. Anything changed?
        </p>
        <PurposeLine purpose="plan check-in · marathon block" budget="1 of 3 today" />
        {stage === 'prompt' && (
          <Chips
            options={[
              { id: 'good', label: 'Looks good' },
              { id: 'talk', label: 'Talk to me' },
            ]}
            value={null}
            onPick={(id) =>
              dispatch({ type: 'checkin', stage: id === 'good' ? 'confirmed' : 'listening', via: id })
            }
          />
        )}
      </div>

      {state.checkin.via === 'good' && stage === 'confirmed' && (
        <div className="card quiet-card">
          <Glyph name="check" size={13} /> Checked in — plan stands.
          <button className="btn ghost" onClick={() => dispatch({ type: 'goto', scene: 2 })}>
            See the recommendation
          </button>
        </div>
      )}

      {stage === 'listening' && (
        <div className="card voice-card">
          <span className="mic">
            <Glyph name="mic" size={16} />
          </span>
          <span className="wave" aria-hidden>
            {[5, 11, 7, 14, 9, 12, 6, 10, 7].map((h, i) => (
              <i key={i} style={{ height: h, animationDelay: `${i * 90}ms` }} />
            ))}
          </span>
          <span className="listening">listening…</span>
        </div>
      )}

      {(stage === 'extracted' || (stage === 'confirmed' && state.checkin.via === 'talk')) && (
        <>
          <div className="card voice-card done">
            <span className="mic">
              <Glyph name="mic" size={16} />
            </span>
            <p className="transcript">{TRANSCRIPT}</p>
          </div>

          <div className="card extract-card">
            <div className="extract-head">
              5 updates from your note
              <span className="extract-sub">tap a row for the source quote · transcript saved</span>
            </div>

            {EXTRACTIONS.map((e) => (
              <button
                key={e.id}
                className="ex-row"
                title={`Source: ${e.quote}`}
                onClick={() => setOpenQuote(openQuote === e.id ? null : e.id)}
              >
                <div className="ex-main">
                  <span className="ex-label">{e.label}</span>
                  <ConfDots level={e.conf} title={`confidence: ${e.conf}`} />
                </div>
                <div className="ex-sub">
                  {e.value} · <em>{e.lands}</em>
                </div>
                <div className="ex-accept">
                  <Glyph name="check" size={11} /> auto-accepted
                </div>
                {openQuote === e.id && <div className="ex-quote">{e.quote}</div>}
              </button>
            ))}

            {/* The flagged, low-confidence extraction: committed only by a tap. */}
            <div className={'ex-row flagged' + (kneeDecided ? ' decided' : '')}>
              <div className="ex-main">
                <span className="ex-label">Knee — caught on the stairs</span>
                <ConfDots level="low" title="confidence: low" />
              </div>
              <div className="ex-sub">
                new observation · <em>low confidence</em>
              </div>
              <div className="ex-quote">“… knee caught a couple of times on the stairs.”</div>
              <Chips
                small
                options={[
                  { id: 'added', label: 'Add it' },
                  { id: 'ignored', label: 'Not worth noting' },
                ]}
                value={state.kneeExtraction}
                onPick={(id) => {
                  dispatch({ type: 'kneeExtraction', value: id })
                  dispatch({ type: 'checkin', stage: 'confirmed' })
                }}
              />
            </div>
          </div>

          {kneeDecided && (
            <button className="btn wide" onClick={() => dispatch({ type: 'goto', scene: 2 })}>
              See the recommendation
            </button>
          )}
        </>
      )}
    </div>
  )
}
