import { useNavigate } from 'react-router-dom'
import { usePosture, ROLES } from '../mock/posture.jsx'
import PosturePill from '../components/PosturePill.jsx'

// The always-on posture indicator + view title. Present on every screen
// (interaction law 1). Clicking a role opens that role's slice of the ledger.
export default function PostureHeader({ title }) {
  const { posture } = usePosture()
  const navigate = useNavigate()
  return (
    <div className="header">
      <span className="title">{title}</span>
      <span className="spacer" />
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
