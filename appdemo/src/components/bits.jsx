// Small shared pieces used across phone screens. No emoji-as-icons: dots,
// glyphs and inline SVG only, per the design system.

export function Section({ label, icon, children }) {
  return (
    <section className="sect">
      <h3 className="sect-label">
        {icon && <Glyph name={icon} size={13} />}
        {label}
      </h3>
      {children}
    </section>
  )
}

// Chip row where at most one option is selected. `onPick(id)` fires on tap;
// once `locked`, other options fade but the choice stays visible. Options may
// carry an `icon` (Glyph name) — kept neutral ink, per the colour law.
export function Chips({ options, value, onPick, small }) {
  return (
    <div className={'chips' + (small ? ' small' : '')}>
      {options.map((o) => (
        <button
          key={o.id}
          className={'chip' + (value === o.id ? ' sel' : '') + (value && value !== o.id ? ' dim' : '')}
          onClick={() => onPick(o.id)}
        >
          {o.icon && <Glyph name={o.icon} size={12} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Hue-free confidence ramp — filled/hollow dots, never green/amber (those hexes
// are reserved for the privacy semantics).
export function ConfDots({ level, title }) {
  const filled = { high: 3, med: 2, low: 1 }[level] ?? 0
  return (
    <span className="conf" title={title}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < filled ? 'on' : ''}>
          {i < filled ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

// The purpose + budget line every AyuBot message carries — a fact, not a vibe.
// The bubble marks the budget: each message spends one of a visible cap.
export function PurposeLine({ purpose, budget }) {
  return (
    <div className="purpose">
      <span>{purpose}</span>
      {budget && (
        <span className="budget">
          <Glyph name="bubble" size={11} /> {budget}
        </span>
      )}
    </div>
  )
}

// Posture markers. Green + lock = stayed on device; amber + arrow-out =
// crossed the boundary. The colour and the icon carry the same semantic.
export const LocalDot = ({ label = 'local' }) => (
  <span className="posture-tag local">
    <Glyph name="lock" size={11} /> {label}
  </span>
)
export const EgressTag = ({ label }) => (
  <span className="posture-tag egress">
    <Glyph name="arrowout" size={11} /> {label}
  </span>
)

// Minimal glyph set (inline SVG, stroke inherits currentColor).
export function Glyph({ name, size = 15 }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  switch (name) {
    case 'mic':
      return (
        <svg {...s}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      )
    case 'watch':
      return (
        <svg {...s}>
          <rect x="7" y="6" width="10" height="12" rx="3" />
          <path d="M9.5 6l.5-3h4l.5 3M9.5 18l.5 3h4l.5-3" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...s}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      )
    case 'check':
      return (
        <svg {...s}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'target': // Now — the single next action
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      )
    case 'calendar': // Next — the few upcoming actions
      return (
        <svg {...s}>
          <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
          <path d="M4 10.5h16M8.5 3v4.5M15.5 3v4.5" />
        </svg>
      )
    case 'eye': // Watch — tracked issues
      return (
        <svg {...s}>
          <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'meter': // This period — envelope vs. actual
      return (
        <svg {...s}>
          <path d="M4.5 19.5v-6M12 19.5v-11M19.5 19.5v-15" />
        </svg>
      )
    case 'run': // running activity
      return (
        <svg {...s}>
          <path d="M3 12.5h4l3 6.5 4-14 3 7.5h4" />
        </svg>
      )
    case 'dumbbell': // strength activity
      return (
        <svg {...s}>
          <path d="M7 8.5v7M17 8.5v7M3.5 10.5v3M20.5 10.5v3M7 12h10" />
        </svg>
      )
    case 'trendup': // better
      return (
        <svg {...s}>
          <path d="M3 17l6.5-6.5 4 4L21 7" />
          <path d="M15 7h6v6" />
        </svg>
      )
    case 'trenddown': // worse
      return (
        <svg {...s}>
          <path d="M3 7l6.5 6.5 4-4L21 17" />
          <path d="M15 17h6v-6" />
        </svg>
      )
    case 'trendflat': // same / steady
      return (
        <svg {...s}>
          <path d="M3.5 12H20" />
          <path d="M15.5 7.5L20 12l-4.5 4.5" />
        </svg>
      )
    case 'bubble': // AyuBot message budget
      return (
        <svg {...s}>
          <path d="M12 20a8 8 0 1 0-7.1-4.3L3.5 20.5l5-1.3A8 8 0 0 0 12 20Z" />
        </svg>
      )
    case 'lock': // stayed on device (pairs with green)
      return (
        <svg {...s}>
          <rect x="5.5" y="11" width="13" height="9" rx="2" />
          <path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11" />
        </svg>
      )
    case 'arrowout': // crossed the boundary (pairs with amber)
      return (
        <svg {...s}>
          <path d="M7 17L17 7" />
          <path d="M9 7h8v8" />
        </svg>
      )
    default:
      return null
  }
}

// Trend glyph for a better / same / worse answer; anything else gets nothing.
export const TREND = { better: 'trendup', same: 'trendflat', worse: 'trenddown' }
