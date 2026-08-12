import { useEffect, useRef } from 'react'
import { useDemo } from '../state.js'
import { SCENES } from '../scenes.js'
import { LocalDot } from './bits.jsx'

// The iPhone-ish frame. The bezel stays near-black in both themes; the screen
// inside follows the paper tokens. Scene changes scroll the screen to the top.
export default function PhoneFrame({ children }) {
  const { state } = useDemo()
  const scene = SCENES[state.scene]
  const bodyRef = useRef(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [state.scene])

  return (
    <div className="phone" role="group" aria-label="Companion app phone preview">
      <div className="phone-screen">
        <div className="statusbar">
          <span className="sb-time">{scene.phoneTime}</span>
          <span className="sb-island" aria-hidden />
          <span className="sb-icons" aria-hidden>
            <svg width="15" height="11" viewBox="0 0 16 12" fill="currentColor">
              <rect x="0" y="7" width="3" height="5" rx="1" />
              <rect x="4.3" y="5" width="3" height="7" rx="1" />
              <rect x="8.6" y="2.5" width="3" height="9.5" rx="1" />
              <rect x="12.9" y="0" width="3" height="12" rx="1" opacity=".35" />
            </svg>
            <svg width="21" height="11" viewBox="0 0 25 12" fill="none" stroke="currentColor">
              <rect x="1" y="1" width="19" height="10" rx="3" strokeWidth="1" opacity=".45" />
              <rect x="3" y="3" width="12" height="6" rx="1.5" fill="currentColor" stroke="none" />
              <path d="M22.5 4v4" strokeWidth="1.6" strokeLinecap="round" opacity=".45" />
            </svg>
          </span>
        </div>

        <div className="phone-head">
          <span className="wordmark">ayuOS Companion</span>
          <LocalDot />
        </div>

        <div className="phone-body" ref={bodyRef}>
          {children}
        </div>

        <div className="homebar" aria-hidden />
      </div>
    </div>
  )
}
