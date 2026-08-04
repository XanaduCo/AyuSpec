import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { beats, principles, EXPERIMENT } from '../mock/companion.js'
import '../styles/companion.css'

// Companion (Hermes) — the messaging companion, shown as the thing it is: a
// phone thread you can step through, beside an inspector that answers the
// question every other messaging bot hopes you never ask — *why did this
// message exist?*
//
// The left panel is a scripted conversation spanning a compressed fortnight of
// Ravi's running post-meal-walk experiment. The reviewer advances it by tapping
// the same chips a real user would: an adherence check, a lunch photo, a
// free-text journal line that comes back as graded extractions with an edit
// affordance, a non-response stretch where the backoff ladder visibly steps
// down (skip → end-of-day batch → weekly), and a mute by one word. Nothing
// here is generated or random — the script is the spec (companion.md), acted out.
//
// The right panel is the "why this message" inspector for whichever Hermes
// bubble is selected: trigger, the purpose ref that authorizes it (always an
// experiment, goal, or schedule the user opted into — or it cannot be sent),
// the budget state at send time, the channel with its egress path (local push
// carries nothing to ledger; the one SMS-bridge beat shows minimization,
// gateway, and ledger entry), and where the response landed in the record.
// Under it, the principles in force — silent without purpose, budgeted,
// backoff ladder, missing ≠ imputed — because the demo's job is to make the
// restraint legible, not just the messages.

// One Hermes bubble. Selecting it drives the inspector.
function HermesMsg({ msg, selected, onSelect }) {
  return (
    <div
      className={`cmp-msg hermes ${selected ? 'sel' : ''} ${msg.meta ? 'has-meta' : ''}`}
      onClick={() => msg.meta && onSelect(msg)}
    >
      {msg.channelTag && <span className="cmp-chtag mono">{msg.channelTag}</span>}
      <div className="cmp-text">{msg.text}</div>
      {msg.subtext && <div className="cmp-subtext">{msg.subtext}</div>}
      {msg.digest && (
        <div className="cmp-digest">
          {msg.digest.map((d, i) => (
            <div key={i} className="cmp-digest-row">
              <span>{d.label}</span>
              <span className="cmp-digest-chips">
                {d.chips.map(c => <span key={c} className="cmp-minichip">{c}</span>)}
              </span>
            </div>
          ))}
        </div>
      )}
      {msg.extraction && (
        <div className="cmp-extract">
          <span className="cmp-extract-k mono">extracted — tap “edit” below to correct</span>
          {msg.extraction.map(e => (
            <span key={e.k} className={`cmp-exchip ${e.k}`}>
              <b>{e.label}</b>
              <i className="mono">{e.grade}</i>
            </span>
          ))}
        </div>
      )}
      {msg.meta && <span className="cmp-why mono">{selected ? 'inspecting ▸' : 'why? ▸'}</span>}
    </div>
  )
}

function UserMsg({ msg }) {
  if (msg.kind === 'photo') {
    return (
      <div className="cmp-msg user photo">
        <div className="cmp-photo">
          <div className="cmp-photo-art" aria-hidden="true">
            <span className="bowl" /><span className="greens" /><span className="grain" />
          </div>
          <span className="cmp-photo-cap mono">IMG · lunch · 12:41</span>
        </div>
      </div>
    )
  }
  return <div className="cmp-msg user">{msg.text}</div>
}

function SysNote({ text }) {
  return <div className="cmp-sys"><span className="mono">{text}</span></div>
}

// Flatten the beat script + the choices made so far into a render list, and
// collect the interaction the thread is currently waiting on.
function buildThread(choices) {
  const items = []
  const upTo = Math.min(choices.length, beats.length - 1)
  for (let i = 0; i <= upTo; i++) {
    const beat = beats[i]
    if (beat.divider) items.push({ kind: 'divider', key: `d-${beat.id}`, text: beat.divider })
    beat.messages.forEach(m => items.push({ kind: 'hermes', key: m.id, msg: m }))

    const choice = choices[i]
    if (choice === undefined) break // this beat is current — its interaction renders below
    const reply = beat.replies[choice]
    if (!reply) continue
    if (reply.user) {
      items.push({
        kind: 'user', key: `u-${beat.id}`,
        msg: { kind: reply.userKind || 'text', text: reply.user },
      })
    }
    if (reply.sys) items.push({ kind: 'sys', key: `s-${beat.id}`, text: reply.sys })
    if (reply.ack) {
      items.push({
        kind: 'hermes', key: `a-${beat.id}`,
        msg: {
          id: `a-${beat.id}`, from: 'hermes', text: reply.ack,
          extraction: reply.extraction,
          meta: beat.ackMeta, // often undefined — plain acks aren't inspectable
        },
      })
    }
  }
  const current = choices.length < beats.length ? beats[choices.length] : null
  return { items, current }
}

// The composer strip: renders whatever the current beat is waiting on.
function Composer({ beat, onChoose, done }) {
  if (done) {
    return (
      <div className="cmp-composer done">
        <span className="mono">end of script — no active prompts, Hermes is silent</span>
      </div>
    )
  }
  const it = beat.interaction
  if (it.kind === 'chips') {
    return (
      <div className="cmp-composer">
        <span className="cmp-composer-k mono">tap to reply</span>
        <div className="cmp-chips">
          {it.options.map(o => (
            <button key={o.id} className="cmp-chip" onClick={() => onChoose(o.id)}>{o.label}</button>
          ))}
        </div>
      </div>
    )
  }
  if (it.kind === 'send') {
    return (
      <div className="cmp-composer">
        <span className="cmp-composer-k mono">Ravi’s next move</span>
        <button className="cmp-chip send" onClick={() => onChoose('send')}>
          {it.preview === 'photo' ? '📷 ' : ''}{it.label} →
        </button>
      </div>
    )
  }
  // lapse — the deliberate non-answer that engages the ladder
  return (
    <div className="cmp-composer">
      <span className="cmp-composer-k mono">or don’t reply at all</span>
      <button className="cmp-chip lapse" onClick={() => onChoose('lapse')}>{it.label}</button>
    </div>
  )
}

// The right panel: everything the spec promises about one message, made flat.
function Inspector({ msg }) {
  if (!msg?.meta) {
    return (
      <div className="card cmp-inspect">
        <span className="eyebrow">Why this message</span>
        <p className="note" style={{ marginTop: 8 }}>
          Tap any Hermes message in the thread to see its trigger, the purpose that
          authorizes it, its budget accounting, its channel and egress path, and where
          the reply landed in the record.
        </p>
      </div>
    )
  }
  const m = msg.meta
  const ch = m.channel
  return (
    <div className="card cmp-inspect">
      <span className="eyebrow">Why this message</span>
      <div className="cmp-inspect-type">{m.type}</div>

      <div className="cmp-irow">
        <span className="k mono">trigger</span>
        <span>{m.trigger}</span>
      </div>
      <div className="cmp-irow">
        <span className="k mono">purpose ref</span>
        <span>
          {m.purpose}
          {m.purposeRef && (
            <> · <Link className="cmp-ref mono" to="/experiments">{m.purposeRef}</Link></>
          )}
          {!m.purposeRef && <> · <span className="mono faint">none — system notices only</span></>}
        </span>
      </div>
      <div className="cmp-irow">
        <span className="k mono">budget</span>
        <span className="mono">{m.budget}</span>
      </div>
      <div className="cmp-irow">
        <span className="k mono">ladder</span>
        <span className="mono">{m.ladder}</span>
      </div>
      <div className="cmp-irow">
        <span className="k mono">channel</span>
        <span>
          <span className={`pill ${ch.posture}`}><span className="led" />{ch.label}</span>
          <span className="cmp-transit">{ch.transit}</span>
        </span>
      </div>
      {ch.egress && (
        <div className="cmp-egress">
          <span className="k mono">bridged egress — labeled, minimized, ledgered</span>
          <p>{ch.egress.minimized}</p>
          <p className="mono">{ch.egress.gateway}</p>
          <p>
            <Link to="/transparency" className="cmp-ref mono">{ch.egress.ledger}</Link>
            {' '}— same ledger as every model call.
          </p>
        </div>
      )}
      <div className="cmp-irow">
        <span className="k mono">lands in</span>
        <span>{m.lands}</span>
      </div>
    </div>
  )
}

export default function Companion() {
  // The whole session is the list of choices made, in beat order. Deterministic:
  // the script never branches structure, only recorded values.
  const [choices, setChoices] = useState([])
  const [selectedId, setSelectedId] = useState('m-conf')

  const { items, current } = useMemo(() => buildThread(choices), [choices])

  // Selection: explicit tap wins; otherwise the latest inspectable message.
  const inspectable = items.filter(i => i.kind === 'hermes' && i.msg.meta)
  const selected =
    inspectable.find(i => i.msg.id === selectedId) || inspectable[inspectable.length - 1]

  const choose = id => {
    const beat = beats[choices.length]
    setChoices(c => [...c, id])
    // Auto-focus the inspector on what just happened, if it's inspectable.
    if (beat?.ackMeta) setSelectedId(`a-${beat.id}`)
    else if (beat?.messages.length) setSelectedId(beat.messages[beat.messages.length - 1].id)
  }

  const reset = () => { setChoices([]); setSelectedId('m-conf') }

  return (
    <div className="page cmp-page">
      <p className="eyebrow">Companion · Hermes · scripted walkthrough</p>
      <div className="lede">A companion that wants your data complete — not your attention.</div>
      <p className="muted" style={{ marginTop: 8, maxWidth: '72ch' }}>
        Hermes does two things: targeted adherence recording for running experiments, and
        journal-type capture no sensor can reach. Step through a compressed fortnight of
        Ravi’s <Link to="/experiments">post-meal-walk experiment</Link> below — tap the reply
        chips to advance, tap any Hermes message to see why it was allowed to exist. In this
        self-hosted configuration the default channel never leaves the local network; the one
        bridged SMS ping is labeled, minimized, and ledgered.
      </p>

      <div className="cmp-layout">
        {/* left — the phone */}
        <div className="cmp-phone">
          <div className="cmp-phone-head">
            <span className="cmp-avatar" aria-hidden="true">☿</span>
            <div>
              <b>Hermes</b>
              <span className="mono">{EXPERIMENT.label} · week {EXPERIMENT.week} · {EXPERIMENT.adherence.done}/{EXPERIMENT.adherence.of} recorded</span>
            </div>
            <button className="cmp-reset mono" onClick={reset} title="Restart the script">↺ restart</button>
          </div>
          <div className="cmp-thread">
            {items.map(it => {
              if (it.kind === 'divider') return <div key={it.key} className="cmp-day mono">{it.text}</div>
              if (it.kind === 'sys') return <SysNote key={it.key} text={it.text} />
              if (it.kind === 'user') return <UserMsg key={it.key} msg={it.msg} />
              return (
                <HermesMsg
                  key={it.key} msg={it.msg}
                  selected={selected?.msg.id === it.msg.id}
                  onSelect={m => setSelectedId(m.id)}
                />
              )
            })}
          </div>
          <Composer beat={current} onChoose={choose} done={!current} />
        </div>

        {/* right — inspector + principles */}
        <div className="cmp-side">
          <Inspector msg={selected?.msg} />

          <div className="card cmp-principles">
            <span className="eyebrow">The rules in force</span>
            {principles.map(p => (
              <div key={p.k} className="cmp-prow">
                <b>{p.k}</b>
                <span>{p.v}</span>
              </div>
            ))}
            <p className="note" style={{ marginBottom: 0 }}>
              Full spec: <code>docs/companion.md</code> — the message taxonomy, the outbound-message
              contract, and the channel/egress tiers with their fallbacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
