import { useEffect, useMemo, useReducer } from 'react'
import { DemoContext, initialState, reducer } from './state.js'
import { SCENES } from './scenes.js'
import PhoneFrame from './components/PhoneFrame.jsx'
import { Glyph } from './components/bits.jsx'
import HomeScreen from './screens/HomeScreen.jsx'
import CheckinScreen from './screens/CheckinScreen.jsx'
import RecommendationScreen from './screens/RecommendationScreen.jsx'
import ReconcileScreen from './screens/ReconcileScreen.jsx'
import PromotionScreen from './screens/PromotionScreen.jsx'
import WeeklyScreen from './screens/WeeklyScreen.jsx'
import BridgeScreen from './screens/BridgeScreen.jsx'

const SCREENS = {
  home: HomeScreen,
  checkin: CheckinScreen,
  recommendation: RecommendationScreen,
  reconcile: ReconcileScreen,
  promotion: PromotionScreen,
  weekly: WeeklyScreen,
  bridge: BridgeScreen,
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const ctx = useMemo(() => ({ state, dispatch }), [state])
  const i = state.scene
  const goto = (n) => dispatch({ type: 'goto', scene: Math.max(0, Math.min(SCENES.length - 1, n)) })

  // Keyboard arrows move between scenes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        dispatch({ type: 'goto', scene: Math.min(SCENES.length - 1, state.scene + 1) })
      } else if (e.key === 'ArrowLeft') {
        dispatch({ type: 'goto', scene: Math.max(0, state.scene - 1) })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.scene])

  const scene = SCENES[i]
  const Screen = SCREENS[scene.id]

  return (
    <DemoContext.Provider value={ctx}>
      <div className="stage">
        <header className="stage-head">
          <h1>ayuOS Companion — the adaptive plan loop</h1>
          <p className="stage-sub">
            A scripted walkthrough of the Companion-app spec. All data mocked — persona{' '}
            <em>Ravi Mehta, 45</em>, mid marathon block, August 2026.{' '}
            <a href="../companion-app/">Read the spec ↗</a>
          </p>
        </header>
        <main className="stage-body">
          <div className="demo-col">
            <PhoneFrame>
              <Screen />
            </PhoneFrame>

            <nav className="stepper" aria-label="Demo scenes">
              <button
                className="step-btn"
                onClick={() => goto(i - 1)}
                disabled={i === 0}
                aria-label="Previous scene"
                title="Previous scene (←)"
              >
                <span className="flip">
                  <Glyph name="chevron" size={14} />
                </span>
              </button>
              <ol className="step-dots">
                {SCENES.map((s, n) => (
                  <li key={s.id}>
                    <button
                      className={'step-dot' + (n === i ? ' cur' : '')}
                      onClick={() => goto(n)}
                      aria-label={`Scene ${n + 1}: ${s.title}`}
                      aria-current={n === i ? 'step' : undefined}
                      title={s.title}
                    />
                  </li>
                ))}
              </ol>
              <button
                className="step-btn"
                onClick={() => goto(i + 1)}
                disabled={i === SCENES.length - 1}
                aria-label="Next scene"
                title="Next scene (→)"
              >
                <Glyph name="chevron" size={14} />
              </button>
            </nav>
            <div className="step-label">
              <span className="num">
                {i + 1}/{SCENES.length}
              </span>{' '}
              · {scene.title}
            </div>
          </div>
        </main>
      </div>
    </DemoContext.Provider>
  )
}
