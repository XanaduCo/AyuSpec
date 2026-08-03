import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import EvidenceLabel, { Citation } from '../components/EvidenceLabel.jsx'
import ComparisonFrame from '../components/ComparisonFrame.jsx'
import PreSendPanel from '../components/PreSendPanel.jsx'
import VoiceInput from '../components/VoiceInput.jsx'
import ContextStrip, { ContextCaveats } from '../components/ContextStrip.jsx'
import { useDrawer } from '../components/Drawer.jsx'
import { usePosture } from '../mock/posture.jsx'
import { ask, suggestedQuestions } from '../mock/agent.js'
import { presend } from '../mock/ledger.js'
import { storeStats } from '../mock/persona.js'
import { assemble } from '../context/assemble.js'

// Inline renderer: **bold**, {{ev:kind}} evidence labels, {{cite:id}} citations.
function Inline({ text }) {
  const parts = text.split(/(\{\{ev:[a-z]+\}\}|\{\{cite:[a-z0-9-]+\}\}|\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    const ev = p.match(/^\{\{ev:([a-z]+)\}\}$/)
    if (ev) return <EvidenceLabel key={i} kind={ev[1]} claim={text} />
    const cite = p.match(/^\{\{cite:([a-z0-9-]+)\}\}$/)
    if (cite) return <Citation key={i} id={cite[1]} />
    const b = p.match(/^\*\*([^*]+)\*\*$/)
    if (b) return <strong key={i}>{b[1].replace(/\\\*/g, '*')}</strong>
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

function Blocks({ blocks }) {
  return blocks.map((b, i) => {
    if (b.kind === 'lead') return <p key={i} className="serif-lead">{b.text}</p>
    if (b.kind === 'p') return <p key={i}><Inline text={b.text} /></p>
    if (b.kind === 'frame') return <ComparisonFrame key={i} block={b} />
    if (b.kind === 'concept') return <ConceptBlock key={i} block={b} />
    if (b.kind === 'sources') return <SourcesBlock key={i} block={b} />
    return null
  })
}

const ADDENDUM_LABEL = {
  genome: 'because the genome is in scope',
  widen: 'because the window was widened',
  raw: 'because the raw series was requested',
}

// One answer, with its own retrieval trace and its own counterfactual state.
//
// The trace is recomputed from the live posture, so flipping the reasoner
// between local and cloud in Settings changes what this answer was built from —
// including, on several questions, whether it has an extra paragraph at all.
function AiAnswer({ question, answer, declined }) {
  const { posture } = usePosture()
  const [toggles, setToggles] = useState({})
  const where = posture.reasoner.where

  const ctx = useMemo(
    () => assemble(question, { where, toggles }),
    [question, where, toggles])

  const onToggle = (key, value) => setToggles(t => ({ ...t, [key]: value }))

  return (
    <div className="bubble ai">
      {!declined && <ContextStrip ctx={ctx} onToggle={onToggle} />}
      <Blocks blocks={answer.blocks} />
      {!declined && ctx.addenda.map(a => (
        <div key={a.key} className={`ctx-addendum ${a.blocked ? 'blocked' : ''}`}>
          <span className="ak">
            {a.blocked ? 'counterfactual refused' : `added ${ADDENDUM_LABEL[a.key] || ''}`}
          </span>
          <Blocks blocks={a.blocks} />
        </div>
      ))}
      {!declined && <ContextCaveats ctx={ctx} />}
      {!declined && <AnswerActions actions={answer.actions} />}
    </div>
  )
}

// The way out of the answer and into the loop. Understanding is only the first
// quarter of vision.md's loop — act, measure, share are the rest, and until now
// every one of them meant navigating away and rebuilding the context by hand.
// These carry it: the proposed experiment arrives pre-selected at its
// pre-registration step, the packet arrives with its scope already set.
function AnswerActions({ actions }) {
  if (!actions?.length) return null
  return (
    <div className="answer-actions">
      <span className="k">next</span>
      {actions.map((a, i) => {
        const to = a.kind === 'experiment'
          ? `/experiments?propose=${a.propose}`
          : `/share?propose=${(a.domains || []).join(',')}`
        const glyph = a.kind === 'experiment' ? '⁘' : '◨'
        return (
          <Link key={i} className="chip-link act" to={to}>{glyph} {a.label}</Link>
        )
      })}
    </div>
  )
}

// The pre-send gate, with the assembly trace above it.
//
// The two answer different questions and both belong here: the context strip
// says *what was assembled and why*, the pre-send panel says *what that payload
// looks like once the gateway has been through it*. The toggles are live before
// consent rather than after, because "include the genome" is exactly the kind of
// decision that should be made while looking at the send button.
function PreSendBubble({ question, onSend, onCancel }) {
  const { posture } = usePosture()
  const [toggles, setToggles] = useState({})
  const ctx = useMemo(
    () => assemble(question, { where: posture.reasoner.where, toggles }),
    [question, posture.reasoner.where, toggles])
  return (
    <div className="bubble ai presend-bubble">
      <ContextStrip ctx={ctx} onToggle={(k, v) => setToggles(t => ({ ...t, [k]: v }))} />
      <p className="note" style={{ marginTop: 0 }}>
        The reasoner is a cloud model in this configuration. Before it runs, here is exactly
        what would leave — PII-stripped — and what is withheld:
      </p>
      <PreSendPanel presend={presend} onSend={onSend} onCancel={onCancel} assembled={ctx} />
    </div>
  )
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

// The store, stated rather than implied. The whole context surface only earns
// its place if the user can see that the store is far too large to hand a model
// wholesale — so the number is on screen next to the question box.
function StoreCard() {
  const drawer = useDrawer()
  return (
    <div className="card store-card">
      <span className="eyebrow">Your store</span>
      <div className="big">{storeStats.withoutGenome.toLocaleString()}</div>
      <div className="faint" style={{ fontSize: 12, marginTop: -2 }}>
        records · {storeStats.years} years · {storeStats.analytes} analytes
      </div>
      <div className="rows">
        {storeStats.groups.slice(0, 8).map(g => (
          <div key={g.key} className={`r ${g.materialised ? '' : 'declared'}`}>
            <span>{g.label}</span><b>{g.rows.toLocaleString()}</b>
          </div>
        ))}
        <div className="r declared"><span>Genotyped variants</span><b>4.7M</b></div>
      </div>
      <p className="why">
        No prompt holds this. Every answer has to choose a few dozen records out of it —
        which is what the <b>context</b> strip on each answer shows.
      </p>
      <button className="btn ghost sm" style={{ marginTop: 10 }}
        onClick={() => drawer?.openRecord('store-stats')}>Open the inventory</button>
    </div>
  )
}

export default function Ask() {
  const { posture, markPreviewSeen } = usePosture()
  const drawer = useDrawer()

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

  // The app opens with the cursor ready and nothing asked yet (Interaction law 5).
  // It used to land mid-thread on the pre-send gate, which meant the first thing a
  // new user ever saw was a consent panel rather than an answer — the privacy
  // machinery arguing for itself before it had earned the right to. The gate is
  // still unskippable; it is now reached by asking, which is when it means something.
  const [thread, setThread] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  const submit = q => {
    const question = (q ?? input).trim()
    if (!question) return
    const answer = ask(question)
    const item = gateNeeded(answer)
      ? { role: 'presend', question, answer }
      : { role: 'ai', question, answer }
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
        ? { role: 'ai', question: m.question, answer: send ? m.answer : localDecline(m.question), declined: !send }
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

          <p className="store-line">
            Answering from <b>{storeStats.withoutGenome.toLocaleString()}</b> stored records —{' '}
            <b>{storeStats.analytes}</b> analytes across <b>9</b> draws, <b>{storeStats.activities}</b>{' '}
            activities, <b>1,092</b> nights, <b>4.7M</b> genotyped variants, over{' '}
            <b>{storeStats.years}</b> years. None of that fits in a prompt, so every answer opens with
            what it actually pulled.{' '}
            <button onClick={() => drawer?.openRecord('store-stats')}>See the full inventory →</button>
          </p>

          {thread.map((m, i) => {
            if (m.role === 'me') return <div key={i} className="bubble me">{m.text}</div>
            if (m.role === 'presend') return (
              <PreSendBubble key={i} question={m.question}
                onSend={() => resolvePresend(i, true)}
                onCancel={() => resolvePresend(i, false)} />
            )
            return (
              <AiAnswer key={i} question={m.question} answer={m.answer} declined={m.declined} />
            )
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
          <StoreCard />
        </aside>
      </div>
    </div>
  )
}
