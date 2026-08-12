import { useDemo, reconDone } from '../state.js'
import { Chips, PurposeLine, LocalDot, Glyph } from '../components/bits.jsx'

// Post-action reconciliation. The distance is never asked — the watch knows.
// One bundled AyuBot message asks only what sensors can't: issue statuses,
// the knee (because it was mentioned pre-action), and the habit.
const ASKS = [
  {
    field: 'heel',
    label: 'Heel',
    note: 'tracked issue',
    options: [
      { id: 'better', label: 'better', icon: 'trendup' },
      { id: 'same', label: 'same', icon: 'trendflat' },
      { id: 'worse', label: 'worse', icon: 'trenddown' },
      { id: 'nopain', label: 'no pain', icon: 'check' },
    ],
  },
  {
    field: 'knee',
    label: 'Knee',
    note: 'mentioned this morning',
    options: [
      { id: 'better', label: 'better', icon: 'trendup' },
      { id: 'same', label: 'same twinge', icon: 'trendflat' },
      { id: 'worse', label: 'worse', icon: 'trenddown' },
    ],
  },
  {
    field: 'toe',
    label: 'Toe',
    note: null,
    options: [
      { id: 'better', label: 'better', icon: 'trendup' },
      { id: 'same', label: 'same', icon: 'trendflat' },
      { id: 'worse', label: 'worse', icon: 'trenddown' },
    ],
  },
  {
    field: 'stretch',
    label: 'Did you stretch?',
    note: 'habit',
    options: [
      { id: 'yes', label: 'full routine' },
      { id: 'heel', label: 'heel only' },
      { id: 'no', label: 'no' },
    ],
  },
]

export default function ReconcileScreen() {
  const { state, dispatch } = useDemo()
  const done = reconDone(state)

  return (
    <div className="screen reconcile">
      <div className="date-line">Wednesday, August 5</div>

      <div className="card sync-card">
        <div className="sync-head">
          <span className="sync-src">
            <Glyph name="watch" size={15} /> Synced from watch
          </span>
          <LocalDot label="via HealthKit relay · LAN" />
        </div>
        <div className="sync-nums">
          <span className="num big">7.4 km</span>
          <span className="num">41:32</span>
          <span className="num">5:37 /km</span>
          <span className="num">avg 142 bpm</span>
        </div>
      </div>

      <div className="card ayubot-card">
        <p className="ayubot-text">Nice and easy. Four quick ones:</p>
        <PurposeLine purpose="plan reconciliation · bundled" budget="2 of 3 today" />

        {ASKS.map((a) => (
          <div key={a.field} className={'ask' + (state.recon[a.field] ? ' answered' : '')}>
            <div className="ask-label">
              {a.label}
              {a.note && <span className="ask-note">{a.note}</span>}
            </div>
            <Chips
              small
              options={a.options}
              value={state.recon[a.field]}
              onPick={(id) => dispatch({ type: 'recon', field: a.field, value: id })}
            />
          </div>
        ))}
      </div>

      {done && (
        <>
          <div className="card record-card">
            <div className="record-head">Reconciliation record</div>
            <div className="record-grid num">
              <span>planned</span>
              <span>7–8 km easy</span>
              <span>actual</span>
              <span>7.4 km · 41:32</span>
              <span>delta</span>
              <span>within range</span>
              <span>replanning</span>
              <span>none — Saturday’s long run stands</span>
            </div>
          </div>
          <button className="btn wide" onClick={() => dispatch({ type: 'goto', scene: 4 })}>
            Continue
          </button>
        </>
      )}
    </div>
  )
}
