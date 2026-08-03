// The hue-free evidence ramp. Strength is carried by dot-fill, not colour, so it
// never collides with the green/amber privacy law. Tappable → the matching
// epistemics concept card, with the live claim as the worked example (law 3).

import { useDrawer } from './Drawer.jsx'
import { evidenceConcept } from '../mock/concepts.js'

const RAMP = {
  high: { dots: ['●', '●', '●', '●'], text: 'HIGH', title: 'High — multiple RCTs / meta-analysis' },
  moderate: { dots: ['●', '●', '●', '○'], text: 'MODERATE', title: 'Moderate — single RCT or consistent observational' },
  low: { dots: ['●', '●', '○', '○'], text: 'LOW', title: 'Low — mechanistic / small / anecdotal' },
  none: { dots: ['○', '○', '○', '○'], text: 'NONE', title: 'None — plausible but untested', cls: 'none' },
}
const MARK = {
  src: { glyph: '◆', text: 'SOURCE', title: 'Source-backed by a stored record', cls: 'src' },
  inf: { glyph: '◇', text: 'INFERRED', title: 'Inferred from your data', cls: 'inf' },
  guide: { glyph: '▤', text: 'GUIDELINE', title: 'Backed by a clinical guideline', cls: 'guide' },
}

export default function EvidenceLabel({ kind, claim }) {
  const drawer = useDrawer()
  const conceptId = evidenceConcept[kind]
  const clickable = drawer && conceptId
  const open = clickable ? () => drawer.openConcept(conceptId, claim) : undefined

  const common = {
    onClick: open,
    role: clickable ? 'button' : undefined,
    tabIndex: clickable ? 0 : undefined,
    onKeyDown: clickable ? e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open()) : undefined,
  }

  const mark = MARK[kind]
  if (mark) {
    return (
      <span className={`ev ${mark.cls} ${clickable ? 'tap' : ''}`} title={`${mark.title} — tap to learn more`} {...common}>
        {mark.glyph} {mark.text}
      </span>
    )
  }
  const r = RAMP[kind]
  if (!r) return null
  return (
    <span className={`ev ${r.cls || ''} ${clickable ? 'tap' : ''}`} title={`${r.title} — tap to learn more`} {...common}>
      <span className="dots">
        {r.dots.map((d, i) => (d === '○' ? <i key={i}>○</i> : <span key={i}>●</span>))}
      </span>{' '}
      {r.text}
    </span>
  )
}

// A ◆ citation chip that opens the underlying stored record in the source drawer.
export function Citation({ id }) {
  const drawer = useDrawer()
  const open = drawer ? () => drawer.openRecord(id) : undefined
  return (
    <span
      className="cite tap"
      title="Open the underlying record"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open?.())}
    >
      ◆ source
    </span>
  )
}
