// The hue-free evidence ramp. Strength is carried by dot-fill, not colour, so it
// never collides with the green/amber privacy law. Tappable → concept card
// (wired in a later phase; the title tooltip stands in for now).

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

export default function EvidenceLabel({ kind }) {
  const mark = MARK[kind]
  if (mark) {
    return (
      <span className={`ev ${mark.cls}`} title={mark.title}>
        {mark.glyph} {mark.text}
      </span>
    )
  }
  const r = RAMP[kind]
  if (!r) return null
  return (
    <span className={`ev ${r.cls || ''}`} title={r.title}>
      <span className="dots">
        {r.dots.map((d, i) => (d === '○' ? <i key={i}>○</i> : <span key={i}>●</span>))}
      </span>{' '}
      {r.text}
    </span>
  )
}
