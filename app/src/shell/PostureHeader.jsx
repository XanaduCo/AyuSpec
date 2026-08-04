import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { usePosture, ROLES, EGRESS_MODES } from '../mock/posture.jsx'
import { patients } from '../mock/patients.js'
import PosturePill from '../components/PosturePill.jsx'
import { useCapture } from '../components/Capture.jsx'

// The always-on posture indicator + view title (interaction law 1), plus the one
// global verb: capture. Logging is reachable from every screen in one click
// because the moment you remember something is never the moment you are on the
// right page.
export default function PostureHeader({ title }) {
  const { effectivePosture, egressMode, setEgressMode, blocked, canAllow } = usePosture()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const capture = useCapture()

  // The header states what actually runs. On the Profile view that is the *viewed*
  // person's posture — Maya's all-local instance is not Ravi's cloud-reasoner one —
  // so the indicator would otherwise lie about whoever you are reading. This
  // override is scoped to /profile; every other route shows the live session posture
  // (effectivePosture — which resolves every role to local when egress is blocked).
  const viewed = location.pathname === '/profile' ? patients[params.get('p')] : null
  const shown = viewed?.rolePosture || effectivePosture
  return (
    <div className="header">
      <span className="title">{title}</span>
      <span className="spacer" />
      <button className="btn ghost sm capture-btn" onClick={() => capture?.open('menu')}
        title="Log something — under ten seconds, on-device">
        ＋ Capture
      </button>

      {/* Compact egress-approval control — change the ask cadence (or block egress
          outright) right where the posture lives. Hidden while reading another
          person's profile, since it governs the live session, not the viewed one. */}
      {!viewed && (
        <label className={`hdr-egress ${blocked ? 'blocked' : ''}`}
          title="Egress approval — how often you're asked before a cloud call. Block forces everything local.">
          <span className="he-lab">egress</span>
          <select className="he-select" value={egressMode}
            onChange={e => setEgressMode(e.target.value)}>
            {EGRESS_MODES.map(m => (
              <option key={m.key} value={m.key}
                disabled={m.needsPreview && !canAllow}>{m.t}</option>
            ))}
          </select>
        </label>
      )}

      <div className="posture">
        {ROLES.map(r => (
          <span key={r.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="role">{r.label}</span>
            <PosturePill
              role={shown[r.key]}
              onClick={() => navigate(`/transparency?role=${r.key}`)}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
