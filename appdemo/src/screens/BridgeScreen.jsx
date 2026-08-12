import { useState } from 'react'
import { Section, LocalDot, EgressTag, Glyph } from '../components/bits.jsx'

// Bridge & channels: green = terminates at your own store; amber = crosses the
// device boundary, opt-in and ledgered. The interaction budget is a visible,
// checkable setting — "2 of 3 today" is a fact, not a vibe.
export default function BridgeScreen() {
  const [smsBridge, setSmsBridge] = useState(false)

  return (
    <div className="screen bridge">
      <div className="date-line">Settings · bridge &amp; channels</div>

      <Section label="Device bridge">
        <div className="card list-card">
          <div className="row tall">
            <span>
              <Glyph name="watch" size={14} /> HealthKit relay
              <span className="row-sub">
                background delivery · last sync <span className="num">07:04</span>
              </span>
            </span>
            <LocalDot label="LAN only" />
          </div>
          <div className="row tall">
            <span>
              FIT / TCX / GPX import
              <span className="row-sub">via share sheet · Garmin and others</span>
            </span>
            <LocalDot label="local" />
          </div>
          <div className="row tall">
            <span>
              Send workouts to watch
              <span className="row-sub">publish a planned session to the watch platform</span>
            </span>
            <EgressTag label="opt-in · coming soon" />
          </div>
        </div>
        <div className="sect-foot">
          Syncs directly to your own store — no third-party servers.
        </div>
      </Section>

      <Section label="Channels">
        <div className="card list-card">
          <div className="row tall">
            <span>
              Local push
              <span className="row-sub">
                wake-up via APNs, content-minimized · payloads sync device ↔ store directly
              </span>
            </span>
            <LocalDot label="default" />
          </div>
          <div className="row tall">
            <span>
              SMS bridge
              <span className="row-sub">
                {smsBridge
                  ? 'content transits the carrier · minimized · gateway-enforced · ledgered'
                  : 'off — every prompt routes to local channels instead'}
              </span>
            </span>
            <span className="toggle-wrap">
              {smsBridge && <EgressTag label="egress" />}
              <button
                className={'toggle' + (smsBridge ? ' on' : '')}
                aria-pressed={smsBridge}
                aria-label="SMS bridge"
                onClick={() => setSmsBridge(!smsBridge)}
              >
                <span className="knob" />
              </button>
            </span>
          </div>
        </div>
      </Section>

      <Section label="Interaction budget">
        <div className="card list-card">
          <div className="row tall">
            <span>
              Daily message cap
              <span className="row-sub">all purposes · adjustable down to 0 (mutes everything)</span>
            </span>
            <span className="row-val num">3 / day</span>
          </div>
          <div className="row tall">
            <span>
              Used today
              <span className="row-sub">check-in · reconciliation</span>
            </span>
            <span className="row-val num">2 of 3</span>
          </div>
          <div className="row tall">
            <span>
              Quiet hours
              <span className="row-sub">detected sleep window, extended when you sleep late</span>
            </span>
            <span className="row-val num">22:30–06:30</span>
          </div>
        </div>
      </Section>
    </div>
  )
}
