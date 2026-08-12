import { useDemo } from '../state.js'
import { Section, Chips, PurposeLine, EgressTag, Glyph } from '../components/bits.jsx'

// Weekly review: envelope vs. actual, issue trajectories, next week's
// proposal — and the offer (never the demand) to make the week concrete.
const DAYS = [
  { d: 'Su', v: '12.2' },
  { d: 'Mo', v: '6.2' },
  { d: 'Tu', v: 'S', note: 'strength' },
  { d: 'We', v: '7.4' },
  { d: 'Th', v: '–' },
  { d: 'Fr', v: '–' },
  { d: 'Sa', v: '6.0' },
]

const NEXT_WEEK = [
  { d: 'Mon', s: 'easy 7 km', icon: 'run' },
  { d: 'Tue', s: 'strength', icon: 'dumbbell' },
  { d: 'Wed', s: 'easy 8 km', icon: 'run' },
  { d: 'Thu', s: 'rest' },
  { d: 'Fri', s: 'easy 5 km', icon: 'run' },
  { d: 'Sat', s: 'long run 16 km', icon: 'run' },
  { d: 'Sun', s: 'rest' },
]

export default function WeeklyScreen() {
  const { state, dispatch } = useDemo()
  const kneeTracked = state.promotion === 'tracked'

  return (
    <div className="screen weekly">
      <div className="date-line">Sunday, August 9 · reviewing Aug 2–8</div>

      <div className="card ayubot-card">
        <p className="ayubot-text">Week in review.</p>
        <PurposeLine purpose="periodic plan review · weekly" budget="1 of 3 today" />
      </div>

      <Section label="Planned vs. actual">
        <div className="card period-card">
          <div className="period-nums">
            <span className="num big">31.8</span>
            <span className="num of">/ ~35 km</span>
          </div>
          <div className="meter" aria-hidden>
            <div className="meter-fill" style={{ width: `${(31.8 / 35) * 100}%` }} />
          </div>
          <div className="week-days num">
            {DAYS.map((x) => (
              <span key={x.d} title={x.note}>
                <b>{x.d}</b>
                {x.v}
              </span>
            ))}
          </div>
          <div className="period-sub">
            Saturday’s long run stopped at <span className="num">6.0 km</span> — morning window
            shrank.
          </div>
        </div>
      </Section>

      <Section label="Issue trajectories">
        <div className="card list-card">
          <div className="row">
            <span>Right heel · Achilles</span>
            <span className="row-val">stable — no pain across all 4 runs</span>
          </div>
          <div className="row">
            <span>Right toe</span>
            <span className="row-val">persisted — sore most days</span>
          </div>
          <div className="row">
            <span>
              Right knee {kneeTracked && <span className="tag">tracked</span>}
            </span>
            <span className="row-val">once (Wed) · quiet since</span>
          </div>
        </div>
      </Section>

      <Section label="Next week — proposal">
        <div className="card proposal-card">
          <div className="proposal-line">
            <span className="num big">34–36 km</span>
            <span className="proposal-sub">
              long run <span className="num">16 km</span>
            </span>
          </div>
          <div className="budget-note">
            from this week’s <span className="num">31.8 km</span>
          </div>

          <div className="concrete-ask">Schedule the week?</div>
          <Chips
            options={[
              { id: 'concrete', label: 'Schedule it' },
              { id: 'flexible', label: 'Keep it flexible' },
            ]}
            value={state.weekConcrete}
            onPick={(id) => dispatch({ type: 'weekConcrete', value: id })}
          />
        </div>
      </Section>

      {state.weekConcrete === 'concrete' && (
        <Section label="Scheduled">
          <div className="card list-card sched">
            {NEXT_WEEK.map((x) => (
              <div key={x.d} className="row">
                <span className="num">{x.d}</span>
                <span className="row-val">
                  {x.icon && <Glyph name={x.icon} size={12} />} {x.s}
                </span>
              </div>
            ))}
          </div>

          <div className="card session-card">
            <div className="session-head">
              <span>
                <Glyph name="run" size={13} /> Saturday · Long run · <span className="num">16 km</span>
              </span>
              <span className="lvl num">guided</span>
            </div>
            <div className="session-steps num">
              <span>warm-up · 1.6 km easy</span>
              <span>12.8 km @ easy · HR &lt; 150</span>
              <span>cool-down · 1.6 km</span>
            </div>
            <div className="session-egress">
              <EgressTag label="send to watch · opt-in" />
              <span className="fallback">Or export as a FIT file.</span>
            </div>
          </div>
        </Section>
      )}

      {state.weekConcrete === 'flexible' && (
        <div className="card quiet-card">
          Kept flexible — <span className="num">34–36 km</span>, long run inside it. Schedule it
          anytime.
        </div>
      )}
    </div>
  )
}
