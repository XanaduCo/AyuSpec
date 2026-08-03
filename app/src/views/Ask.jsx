import { useState, useRef, useEffect } from 'react'
import EvidenceLabel, { Citation } from '../components/EvidenceLabel.jsx'
import ComparisonFrame from '../components/ComparisonFrame.jsx'
import PreSendPanel from '../components/PreSendPanel.jsx'
import VoiceInput from '../components/VoiceInput.jsx'
import { useDrawer } from '../components/Drawer.jsx'
import { usePosture } from '../mock/posture.jsx'
import { ask, suggestedQuestions } from '../mock/agent.js'
import { presend } from '../mock/ledger.js'

// Inline renderer: **bold**, {{ev:kind}} evidence labels, {{cite:id}} citations.
function Inline({ text }) {
  const parts = text.split(/(\{\{ev:[a-z]+\}\}|\{\{cite:[a-z0-9-]+\}\}|\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    const ev = p.match(/^\{\{ev:([a-z]+)\}\}$/)
    if (ev) return <EvidenceLabel key={i} kind={ev[1]} claim={text} />
    const cite = p.match(/^\{\{cite:([a-z0-9-]+)\}\}$/)
    if (cite) return <Citation key={i} id={cite[1]} />
    const b = p.match(/^\*\*([^*]+)\*\*$/)
    if (b) return <strong key={i}>{b[1]}</strong>
    return <span key={i}>{p}</span>
  })
}

function ConceptBlock({ block }) {
  const drawer = useDrawer()
  return (
    <div className="concept">
      <div className="h">
        <span className="tag">concept</span>
        <b>{block.concept.replace(/-/g, ' ')}</b>
        <button className="chip-link" style={{ marginLeft: 'auto' }}
          onClick={() => drawer?.openConcept(block.concept, block.text)}>expand →</button>
      </div>
      <div><Inline text={block.text} /></div>
    </div>
  )
}

function SourcesBlock({ block }) {
  const drawer = useDrawer()
  return (
    <div className="callout local">
      <span className="k">sources · click to open the record</span>
      <div style={{ marginTop: 4 }}>{block.text}</div>
      <div className="cite-row">
        {block.cites.map(id => (
          <button key={id} className="cite tap" onClick={() => drawer?.openRecord(id)}>◆ {id}</button>
        ))}
      </div>
    </div>
  )
}

function AnswerBlocks({ answer }) {
  return answer.blocks.map((b, i) => {
    if (b.kind === 'lead') return <p key={i} className="serif-lead">{b.text}</p>
    if (b.kind === 'p') return <p key={i}><Inline text={b.text} /></p>
    if (b.kind === 'frame') return <ComparisonFrame key={i} block={b} />
    if (b.kind === 'concept') return <ConceptBlock key={i} block={b} />
    if (b.kind === 'sources') return <SourcesBlock key={i} block={b} />
    return null
  })
}

// A canned "you kept it local" answer when the user declines a cloud call —
// pairs the cloud tier with its zero-transit fallback (Interaction law 6).
function localDecline(q) {
  return {
    blocks: [
      { kind: 'lead', text: 'Kept on device — cloud synthesis declined.' },
      { kind: 'p', text: `In this configuration the **reasoner** runs on a cloud API, so a full synthesis of “${q}” would leave the device. You declined, so nothing was sent {{ev:src}}.` },
      { kind: 'p', text: 'Switch the reasoner to a local model in **Settings** and you get this answer with zero egress — you lose the larger model’s breadth, never the system or your history.' },
    ],
  }
}

export default function Ask() {
  const { posture, markPreviewSeen } = usePosture()
  const first = 'What changed in my last 90 days?'

  // Does this answer need the pre-send gate? Cloud reasoner + a cloud-marked
  // answer + a review mode that asks. `new_shape` gates only the first call.
  const cloudApproved = useRef(false)
  const gateNeeded = answer => {
    if (!answer.cloud || posture.reasoner.where !== 'cloud') return false
    const mode = posture.reasoner.review
    if (mode === 'off') return false
    if (mode === 'every_call') return true
    return !cloudApproved.current // new_shape
  }

  const initialAnswer = ask(first)
  const [thread, setThread] = useState(() => [
    { role: 'me', text: first },
    gateNeeded(initialAnswer)
      ? { role: 'presend', question: first, answer: initialAnswer }
      : { role: 'ai', answer: initialAnswer },
  ])
  const [history, setHistory] = useState([first])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  const submit = q => {
    const question = (q ?? input).trim()
    if (!question) return
    const answer = ask(question)
    const item = gateNeeded(answer)
      ? { role: 'presend', question, answer }
      : { role: 'ai', answer }
    setThread(t => [...t, { role: 'me', text: question }, item])
    setHistory(h => [question, ...h.filter(x => x !== question)])
    setInput('')
  }

  // Resolve a pending pre-send: send it (reveal the answer) or keep local.
  const resolvePresend = (index, send) => {
    cloudApproved.current = cloudApproved.current || send
    markPreviewSeen('reasoner') // seeing the full preview here unlocks review=off for the reasoner in Settings
    setThread(t => t.map((m, i) =>
      i === index
        ? { role: 'ai', answer: send ? m.answer : localDecline(m.question) }
        : m))
  }

  return (
    <div className="page ask-page">
      <div className="ask-layout">
        <div className="chat">
          <div className="suggest-chips">
            {suggestedQuestions.map(q => (
              <button key={q} onClick={() => submit(q)}>{q}</button>
            ))}
          </div>

          {thread.map((m, i) => {
            if (m.role === 'me') return <div key={i} className="bubble me">{m.text}</div>
            if (m.role === 'presend') return (
              <div key={i} className="bubble ai presend-bubble">
                <p className="note" style={{ marginTop: 0 }}>
                  The reasoner is a cloud model in this configuration. Before it runs, here is exactly
                  what would leave — PII-stripped — and what is withheld:
                </p>
                <PreSendPanel
                  presend={presend}
                  onSend={() => resolvePresend(i, true)}
                  onCancel={() => resolvePresend(i, false)}
                />
              </div>
            )
            return <div key={i} className="bubble ai"><AnswerBlocks answer={m.answer} /></div>
          })}

          <div ref={endRef} />

          <div className="askbar">
            <div className="inner">
              <input
                value={input}
                placeholder="Ask about your health…"
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
              <VoiceInput onTranscript={t => submit(t)} />
              <button className="btn pri" onClick={() => submit()}>Ask</button>
            </div>
          </div>
        </div>

        <aside className="ask-history">
          <span className="eyebrow">History</span>
          <p className="note" style={{ marginTop: 4 }}>Kept in memory only — never written to disk, never sent.</p>
          <div className="history-list">
            {history.map(q => (
              <button key={q} className="history-item" onClick={() => submit(q)} title="Re-open">
                <span className="q">{q}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
