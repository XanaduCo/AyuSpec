import { NavLink } from 'react-router-dom'

// The eight destinations + the two group headers. Items marked `soon` are the
// planned-fidelity stubs being filled in over phases 1–3.
const NAV = [
  { to: '/ask', ic: '✦', label: 'Ask' },
  { to: '/timeline', ic: '◷', label: 'Timeline' },
  { to: '/explore', ic: '◇', label: 'Explore' },
  { to: '/experiments', ic: '⁘', label: 'Experiments', soon: true },
  { grp: 'Data' },
  { to: '/data', ic: '⇲', label: 'Data sources', soon: true },
  { to: '/share', ic: '◨', label: 'Share', soon: true },
  { grp: 'Trust' },
  { to: '/transparency', ic: '▤', label: 'Transparency' },
  { to: '/settings', ic: '⚙', label: 'Settings', soon: true },
]

export default function Rail() {
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
            {n.soon && <span className="soon">soon</span>}
          </NavLink>
        )
      )}
    </nav>
  )
}
