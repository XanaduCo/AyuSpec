import { useState, useRef, useEffect } from 'react'
import EvidenceLabel from '../components/EvidenceLabel.jsx'
import { ask, suggestedQuestions } from '../mock/agent.js'

// Inline renderer: **bold** and {{ev:kind}} evidence tokens.
function Inline({ text }) {
  const parts = text.split(/(\{\{ev:[a-z]+\}\}|\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    const ev = p.match(/^\{\{ev:([a-z]+)\}\}$/)
    if (ev) return <EvidenceLabel key={i} kind={ev[1]} />
    const b = p.match(/^\*\*([^*]+)\*\*$/)
    if (b) return <strong key={i}>{b[1]}</strong>
    return <span key={i}>{p}</span>
  })
}

function Frame({ block }) {
  return (
    <div style={{ margin: '6px 0 4px' }}>
      <div className="frame-wrap">
        <table className="frame">
          <thead><tr>{block.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                {r.cells.map((c, j) => (
                  <td key={j} className={j === 0 ? 'metric' : ''}>
                    {c && typeof c === 'object' && c.ev ? <EvidenceLabel kind={c.ev} /> : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.caption && <p className="note">{block.caption}</p>}
    </div>
  )
}

function AnswerBlocks({ answer }) {
  return answer.blocks.map((b, i) => {
    if (b.kind === 'lead') return <p key={i} className="serif-lead">{b.text}</p>
    if (b.kind === 'p') return <p key={i}><Inline text={b.text} /></p>
    if (b.kind === 'frame') return <Frame key={i} block={b} />
    if (b.kind === 'concept') return (
      <div key={i} className="concept">
        <div className="h"><span className="tag">concept</span><b>{b.concept.replace(/-/g, ' ')}</b></div>
        <div><Inline text={b.text} /></div>
      </div>
    )
    if (b.kind === 'source') return (
      <div key={i} className="callout local"><span className="k">sources</span><div><Inline text={b.text} /></div></div>
    )
    return null
  })
}

export default function Ask() {
  const first = 'What changed in my last 90 days?'
  const [thread, setThread] = useState([{ role: 'me', text: first }, { role: 'ai', answer: ask(first) }])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  const submit = q => {
    const question = (q ?? input).trim()
    if (!question) return
    setThread(t => [...t, { role: 'me', text: question }, { role: 'ai', answer: ask(question) }])
    setInput('')
  }

  return (
    <div className="page">
      <div className="chat">
        <div className="suggest-chips">
          {suggestedQuestions.map(q => (
            <button key={q} onClick={() => submit(q)}>{q}</button>
          ))}
        </div>
        {thread.map((m, i) =>
          m.role === 'me' ? (
            <div key={i} className="bubble me">{m.text}</div>
          ) : (
            <div key={i} className="bubble ai"><AnswerBlocks answer={m.answer} /></div>
          )
        )}
        <div ref={endRef} />
        <div className="askbar">
          <div className="inner">
            <input
              value={input}
              placeholder="Ask about your health…"
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
            <span className="pill local" title="Voice input, transcribed on-device"><span className="led" />🎙 voice</span>
            <button className="btn pri" onClick={() => submit()}>Ask</button>
          </div>
        </div>
      </div>
    </div>
  )
}
