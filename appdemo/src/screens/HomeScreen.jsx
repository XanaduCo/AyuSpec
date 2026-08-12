import { useDemo, reconDone } from '../state.js'
import { Section, Glyph, TREND } from '../components/bits.jsx'

// Home — Now / Next / Watch / This period, exactly the spec's table. Not a
// dashboard: no rings, no scores, no streaks. Numbers are mono.
const Trend = ({ v }) => (TREND[v] ? <Glyph name={TREND[v]} size={12} /> : null)

export default function HomeScreen() {
  const { state, dispatch } = useDemo()
  const done = reconDone(state)

  // Watch trajectories tick over as the session's answers land.
  const heelStatus = state.recon.heel === 'nopain' ? 'no pain today' : state.recon.heel ?? 'stable'
  const toeStatus = state.recon.toe ? `${state.recon.toe} after today's run` : 'sore'
  const kneeTracked = state.promotion === 'tracked'
  const kneeStatus = state.recon.knee
    ? `${state.recon.knee} on today's run`
    : 'caught on the stairs this morning'

  return (
    <div className="screen home">
      <div className="date-line">Wednesday, August 5</div>

      <Section label="Now" icon="target">
        {!done ? (
          <div className="card now-card">
            <div className="now-title">
              <Glyph name="run" size={16} /> Easy run <span className="num">7–8 km</span>
            </div>
            <div className="now-sub">morning window · heel stable</div>
            {state.checkin.stage === 'confirmed' && (
              <div className="now-note">
                <Glyph name="check" size={12} /> checked in · keeping it easy
              </div>
            )}
            <button className="btn" onClick={() => dispatch({ type: 'goto', scene: 1 })}>
              Check in
            </button>
          </div>
        ) : (
          <div className="card now-card">
            <div className="now-title">
              <Glyph name="run" size={16} /> Easy run <span className="num">7.4 km</span>
            </div>
            <div className="now-sub">completed · within range</div>
            <div className="now-note">
              <Glyph name="check" size={12} /> nothing more planned today
            </div>
          </div>
        )}
      </Section>

      <Section label="Next" icon="calendar">
        <div className="card list-card">
          <div className="row">
            <span>Tomorrow</span>
            <span className="row-val">
              <Glyph name="dumbbell" size={12} /> strength or rest
            </span>
          </div>
          <div className="row">
            <span>Saturday</span>
            <span className="row-val">
              <Glyph name="run" size={12} /> long run <span className="num">~15 km</span>
            </span>
          </div>
        </div>
      </Section>

      <Section label="Watch" icon="eye">
        <div className="card list-card">
          <div className="row">
            <span>
              Right heel · Achilles <span className="tag">tracked</span>
            </span>
            <span className="row-val">
              <Trend v={state.recon.heel} /> {heelStatus}
            </span>
          </div>
          <div className="row">
            <span>Right toe</span>
            <span className="row-val">
              <Trend v={state.recon.toe} /> {toeStatus}
            </span>
          </div>
          <div className="row">
            <span>
              Right knee <span className={'tag' + (kneeTracked ? '' : ' new')}>{kneeTracked ? 'tracked' : 'new'}</span>
            </span>
            <span className="row-val">
              <Trend v={state.recon.knee} /> {kneeStatus}
            </span>
          </div>
        </div>
      </Section>

      <Section label="This period" icon="meter">
        <div className="card period-card">
          <div className="period-nums">
            <span className="num big">{done ? '25.8' : '18.4'}</span>
            <span className="num of">/ ~35 km</span>
          </div>
          <div className="meter" aria-hidden>
            <div className="meter-fill" style={{ width: `${((done ? 25.8 : 18.4) / 35) * 100}%` }} />
          </div>
          <div className="period-sub">{done ? 'long run remaining' : "today's easy run · long run remaining"}</div>
        </div>
      </Section>
    </div>
  )
}
