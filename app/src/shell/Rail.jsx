import { NavLink } from 'react-router-dom'
import { useAttention } from '../state/store.js'

// Nine destinations + the two group headers. `Now` sits first because it is the
// re-entry point — but it is NOT the landing route: the app still opens on Ask
// with the cursor ready (interaction law 5). The count badge is the only nag in
// the product, and it counts real items, never engagement.
const NAV = [
  { to: '/now', ic: '✱', label: 'Now', badge: true },
  { to: '/ask', ic: '✦', label: 'Ask' },
  { to: '/timeline', ic: '◷', label: 'Timeline' },
  { to: '/explore', ic: '◇', label: 'Explore' },
  { to: '/experiments', ic: '⁘', label: 'Experiments' },
  { to: '/evidence', ic: '❖', label: 'Evidence' },
  { to: '/companion', ic: '✉', label: 'Companion' },
  { to: '/profile', ic: '☺', label: 'Profile' },
  { grp: 'Data' },
  { to: '/data', ic: '⇲', label: 'Data sources' },
  { to: '/share', ic: '◨', label: 'Share' },
  { grp: 'Trust' },
  { to: '/transparency', ic: '▤', label: 'Transparency' },
  { to: '/settings', ic: '⚙', label: 'Settings' },
]

export default function Rail() {
  const { count } = useAttention()
  return (
    <nav className="rail">
      <div className="logo">
        <span className="dot" />
        <b>ayuOS</b>
        <span>demo</span>
      </div>
      {NAV.map((n, i) =>
        n.grp ? (
          <div key={i} className="grp">{n.grp}</div>
        ) : (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}
          >
            <span className="ic">{n.ic}</span>
            {n.label}
            {n.badge && count > 0 && <span className="railbadge num">{count}</span>}
          </NavLink>
        )
      )}
    </nav>
  )
}
