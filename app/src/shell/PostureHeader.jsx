import { useNavigate } from 'react-router-dom'
import { usePosture, ROLES } from '../mock/posture.jsx'
import PosturePill from '../components/PosturePill.jsx'
import { useCapture } from '../components/Capture.jsx'

// The always-on posture indicator + view title (interaction law 1), plus the one
// global verb: capture. Logging is reachable from every screen in one click
// because the moment you remember something is never the moment you are on the
// right page.
export default function PostureHeader({ title }) {
  const { posture } = usePosture()
  const navigate = useNavigate()
  const capture = useCapture()
  return (
    <div className="header">
      <span className="title">{title}</span>
      <span className="spacer" />
      <button className="btn ghost sm capture-btn" onClick={() => capture?.open('menu')}
        title="Log something — under ten seconds, on-device">
        ＋ Capture
      </button>
      <div className="posture">
        {ROLES.map(r => (
          <span key={r.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="role">{r.label}</span>
            <PosturePill
              role={posture[r.key]}
              onClick={() => navigate(`/transparency?role=${r.key}`)}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
