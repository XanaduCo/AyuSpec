import { useState } from 'react'
import EvidenceLabel from './EvidenceLabel.jsx'
import { rankFrame } from '../mock/preferences.js'

// Fixed-axis comparison table. Fills the cells and stops — no score, no
// recommendation (Interaction law 2). Ranking appears ONLY when the user asks to
// "simplify", and then it names the stated preference that produced the order.

export default function ComparisonFrame({ block }) {
  const [ranking, setRanking] = useState(null)
  const canSimplify = block.rows.length > 1

  return (
    <div style={{ margin: '6px 0 4px' }}>
      <div className="frame-wrap">
        <table className="frame">
          <thead><tr>{block.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {block.rows.map((r, i) => {
              const ranked = ranking && ranking.ranked.findIndex(x => x.option === r.cells[0]) === 0
              return (
                <tr key={i} className={ranked ? 'ranked-top' : ''}>
                  {r.cells.map((c, j) => (
                    <td key={j} className={j === 0 ? 'metric' : ''}>
                      {c && typeof c === 'object' && c.ev ? <EvidenceLabel kind={c.ev} claim={`${r.cells[0]} — ${block.caption || 'comparison'}`} /> : c}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {block.caption && <p className="note">{block.caption}</p>}

      {canSimplify && (
        <div className="simplify-bar">
          {!ranking
            ? <button className="btn ghost sm" onClick={() => setRanking(rankFrame(block))}>✧ Simplify this for me</button>
            : <button className="btn ghost sm" onClick={() => setRanking(null)}>← back to the frame</button>}
          {!ranking && <span className="note" style={{ margin: 0 }}>collapses the axes into a ranking — and shows its work</span>}
        </div>
      )}

      {ranking && <Ranking ranking={ranking} />}
    </div>
  )
}

function Ranking({ ranking }) {
  return (
    <div className="ranking">
      <div className="ranking-head">
        <span className="eyebrow">Ranked against your preferences</span>
        <span className="note" style={{ margin: 0 }}>weighting yours · not a verdict</span>
      </div>
      <ol className="ranking-list">
        {ranking.ranked.map((r, i) => (
          <li key={r.option}>
            <span className="rank-n num">{i + 1}</span>
            <span className="rank-opt">{r.option}</span>
            <span className="rank-bar" aria-hidden><span style={{ width: `${Math.round(r.score * 100)}%` }} /></span>
            <span className="rank-score num">{Math.round(r.score * 100)}</span>
          </li>
        ))}
      </ol>
      <p className="ranking-why"><ShowWork text={ranking.rationale} /></p>
      <div className="ranking-drivers">
        {ranking.drivers.map(d => (
          <span key={d.pref} className="driver" title={d.elicited}>
            <b>{d.label}</b> · weight {Math.round(d.value * 100)}
          </span>
        ))}
      </div>
    </div>
  )
}

function ShowWork({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    const b = p.match(/^\*\*([^*]+)\*\*$/)
    return b ? <strong key={i}>{b[1]}</strong> : <span key={i}>{p}</span>
  })
}
