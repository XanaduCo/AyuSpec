import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import EvidenceLabel, { Citation } from '../components/EvidenceLabel.jsx'
import ComparisonFrame from '../components/ComparisonFrame.jsx'
import PreSendPanel from '../components/PreSendPanel.jsx'
import VoiceInput from '../components/VoiceInput.jsx'
import ContextStrip, { ContextCaveats } from '../components/ContextStrip.jsx'
import { useDrawer } from '../components/Drawer.jsx'
import { usePosture } from '../mock/posture.jsx'
import { ask, clarifyFor, suggestedQuestions } from '../mock/agent.js'
import { presendFor } from '../mock/ledger.js'
import { storeStats } from '../mock/persona.js'
import { assemble, REASONS } from '../context/assemble.js'
import { useSession, useConversations } from '../state/store.js'
import { threadPosture, POSTURE_LABEL, POSTURE_TIP } from '../state/conversations.js'
import '../styles/ask-history.css'

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

// The clarifying turn — the first response to a question with no goal term.
//
// It is deliberately NOT an answer, and deliberately not a gate either. Three
// things it must do, in this order, or it is just an interrogation:
//
//   1. report what the mechanistic pass found, grouped, with the reason each
//      group earned its place — visible here, not folded behind the context
//      strip, because the reasons are the only thing that explains the grouping;
//   2. say why a straight answer would be worse, in terms of *this* data;
//   3. offer the choice.
//
// No model runs, so no payload exists, so there is nothing to consent to. The
// egress decision moves to whichever scoped question the user picks — the point
// at which they know what they are buying.
function ClarifyTurn({ question, turn, onPick }) {
  const { posture } = usePosture()
  const [toggles, setToggles] = useState({})
  // Assembled under a local destination regardless of posture: this turn does
  // not call a model, so the cloud budget and the gateway do not apply to it.
  const ctx = useMemo(
    () => assemble(question, { where: 'local', toggles }),
    [question, toggles])

  return (
    <div className="bubble ai clarify-turn">
      <div className="clarify-badge">
        <span className="led local" />
        deterministic · no model call · nothing to send
        {posture.reasoner.where === 'cloud' && (
          <span className="faint"> — your reasoner is a cloud model, but this turn never reaches it</span>
        )}
      </div>

      <ContextStrip ctx={ctx} onToggle={(k, v) => setToggles(t => ({ ...t, [k]: v }))} />

      <p className="serif-lead">{turn.lead}</p>
      <p className="clarify-why"><Inline text={turn.why} /></p>

      <div className="clarify-groups">
        {turn.groups.map(g => (
          <button key={g.key} className="clarify-group" onClick={() => onPick(g.question)}>
            <div className="cg-head">
              <b>{g.label}</b>
              <span className="cg-count">{g.count} marker{g.count === 1 ? '' : 's'}</span>
            </div>
            <div className="cg-finding"><Inline text={g.finding} /></div>
            <div className="cg-reasons">
              {g.reasons.map(r => (
                <span key={r} className="cg-reason" title={REASONS[r]?.desc}>
                  <span className="glyph">{REASONS[r]?.glyph}</span> {REASONS[r]?.label}
                </span>
              ))}
            </div>
            <span className="cg-go">Ask this →</span>
          </button>
        ))}
      </div>

      {turn.unremarkable && (
        <p className="clarify-rest"><Inline text={turn.unremarkable.text} /></p>
      )}
      {turn.concept && <ConceptBlock block={turn.concept} />}
      <ContextCaveats ctx={ctx} />
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
      <PreSendPanel presend={presendFor(question)} onSend={onSend} onCancel={onCancel} assembled={ctx} />
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

// The conversation history — a quiet column beside the chat, in the spirit of a
// ChatGPT/Claude sidebar but held to ayuOS's calm, local-first grammar. It is
// scannable, not loud: a title (the first question), a fixed timestamp, and the
// thread's own egress posture as a dot in the established colour language
// (green = stayed on the local reasoner, amber = a cloud synthesis ran). The
// only thing marked is the active thread; nothing here is a dashboard.
//
// It is deliberately honest about being ephemeral: this list lives in the
// in-memory session overlay and resets on reload, and it says so — consistent
// with the store's own "resets on reload, and the UI says so" rule.
function ConversationHistory({ list, activeId, onSelect, onNew }) {
  return (
    <aside className="ask-history conv-history">
      <div className="conv-head">
        <span className="eyebrow">Conversations</span>
        <button className="conv-new" onClick={onNew} title="Start a new conversation">＋ New</button>
      </div>
      <p className="note conv-note">Held in this session's memory — never written to disk, never sent.</p>

      <div className="conv-list">
        {list.map(c => {
          const posture = threadPosture(c.messages)
          const turns = c.messages.filter(m => m.role === 'me').length
          return (
            <button key={c.id} className={`conv-item ${c.id === activeId ? 'on' : ''}`}
              onClick={() => onSelect(c.id)}
              aria-current={c.id === activeId ? 'true' : undefined}>
              <span className="conv-title">{c.title}</span>
              <span className="conv-meta">
                <span className={`conv-dot ${posture}`} title={POSTURE_TIP[posture]} />
                <span className={`conv-posture ${posture}`}>{POSTURE_LABEL[posture]}</span>
                <span className="conv-sep">·</span>
                <span className="conv-when">{c.at}</span>
                {turns > 1 && <><span className="conv-sep">·</span><span>{turns} turns</span></>}
              </span>
            </button>
          )
        })}
      </div>

      <StoreCard />
    </aside>
  )
}

export default function Ask() {
  const { posture, markPreviewSeen } = usePosture()
  const drawer = useDrawer()
  const { list, activeId, active } = useConversations()
  const { newConversation, selectConversation, pushTurn, patchTurnMessage } = useSession().actions

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
  //
  // The active thread lives in the session store now (see `useConversations`), so
  // it survives navigating away and back and joins the conversation history — but
  // the landing is unchanged: a fresh session has no active conversation, so the
  // chat is empty and the cursor is ready.
  const thread = active?.messages ?? []
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  const submit = q => {
    const question = (q ?? input).trim()
    if (!question) return

    // A goal-free question resolves to a clarifying turn, never a synthesis and
    // never a consent gate — it is computed on device, so there is no payload.
    const turn = clarifyFor(question)
    const item = turn
      ? { role: 'clarify', question, turn }
      : (() => {
        const answer = ask(question)
        return gateNeeded(answer)
          ? { role: 'presend', question, answer }
          : { role: 'ai', question, answer }
      })()

    // One turn = the user's bubble plus its response, appended to the active
    // conversation (or a new one, titled from this question, if there is none).
    pushTurn([{ role: 'me', text: question }, item], question)
    setInput('')
  }

  // Start a fresh conversation: detach the chat (the previous one stays saved in
  // history) and clear the input. The next question opens a new thread.
  const startNew = () => { newConversation(); setInput('') }

  // Resolve a pending pre-send: send it (reveal the answer) or keep local.
  const resolvePresend = (index, send) => {
    cloudApproved.current = cloudApproved.current || send
    markPreviewSeen('reasoner') // seeing the full preview here unlocks review=off for the reasoner in Settings
    const m = thread[index]
    patchTurnMessage(index, {
      role: 'ai', question: m.question,
      answer: send ? m.answer : localDecline(m.question), declined: !send,
    })
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
            if (m.role === 'clarify') return (
              <ClarifyTurn key={i} question={m.question} turn={m.turn} onPick={submit} />
            )
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

        <ConversationHistory
          list={list}
          activeId={activeId}
          onSelect={selectConversation}
          onNew={startNew}
        />
      </div>
    </div>
  )
}
