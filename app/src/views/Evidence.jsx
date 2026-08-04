import { useState } from 'react'
import { Link } from 'react-router-dom'
import EvidenceLabel from '../components/EvidenceLabel.jsx'
import { SUBMISSIONS, appraiseText, OFFER } from '../mock/evidenceIntake.js'
import { useEvidenceShelf, acceptHypothesis, watchItem, fileItem } from '../state/evidence.js'
import '../styles/evidence.css'

// Evidence intake — the door for everything the record did not generate.
//
// Every other view reasons over data ayuOS collected. This one takes what the
// user brings from outside: a paper a colleague forwarded, a claim from a
// podcast, a preprint in a newsletter, something they noticed about themselves.
// The alternative to appraising it is not that they ignore it — it is that they
// act on it un-appraised.
//
// The appraisal is staged on purpose. Each stage shows its own input, its own
// output and where it ran, so the verdict arrives as the end of a visible chain
// rather than as a pronouncement. Three things the flow is built to make
// unmissable:
//
//   1. The grade tracks what is ATTACHED to a claim, not who made it. A famous
//      voice with nothing cited grades NONE; pooled trials grade HIGH whoever
//      forwarded them.
//   2. A ceiling is not a floor — the preprint here is a real randomised trial
//      and still lands at LOW once n, blinding, endpoint and funding are read.
//   3. Strength, applicability and confidence are three separate axes and are
//      never collapsed into one number.
//
// Nothing submitted is deleted. A NONE keeps its grade, its provenance and its
// route back — because the claim will be recommended to you again, and "you
// brought this in March, here is what we said" is the most useful thing this
// component ever produces.

export default function Evidence() {
  const [sub, setSub] = useState(null)
  const [text, setText] = useState('')
  const shelf = useEvidenceShelf()

  return (
    <div className="page ei-page">
      <p className="eyebrow">Evidence intake · Ravi Mehta</p>
      <div className="lede">Bring it in. Find out what it is worth.</div>
      <p className="muted" style={{ marginTop: 8, maxWidth: '70ch' }}>
        A paper, a podcast claim, a friend’s tip, or something you noticed about yourself. ayuOS
        appraises it against what it already holds, against how the evidence was actually produced,
        and against your own record — then offers to turn it into a testable hypothesis. Weak items
        are kept with their grade, never deleted.
      </p>

      {sub
        ? <Appraisal sub={sub} onBack={() => { setSub(null); setText('') }} />
        : <Intake text={text} setText={setText} onPick={setSub} />}

      {shelf.length > 0 && <Shelf rows={shelf} />}

      <p className="note ei-foot">
        Intake objects and their appraisals live in the <span className="mono">ayuos</span> schema
        with the artifact on disk; the extracted claim is embedded in <span className="mono">vectors</span>{' '}
        so “have I seen something about this?” works later (evidence-intake.md). In this
        configuration — self-hosted, local inference — every stage above ran on this machine.
      </p>
    </div>
  )
}

// --- intake surface ---------------------------------------------------------

function Intake({ text, setText, onPick }) {
  const submit = () => { if (text.trim()) onPick(appraiseText(text)) }

  return (
    <>
      <div className="card ei-box">
        <span className="eyebrow">what did you come across?</span>
        <textarea
          className="txt ei-text"
          rows={3}
          value={text}
          placeholder="Paste a claim, a quote, a DOI or a link — or describe something you noticed about yourself."
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
        />
        <div className="ei-box-foot">
          <span className="note" style={{ margin: 0 }}>
            Provenance is captured with it — who said it, where, when, and whether we actually
            retrieved the source or are working from your account of it.
          </span>
          <button className="btn pri" disabled={!text.trim()} onClick={submit}>Appraise it →</button>
        </div>
      </div>

      <p className="eyebrow ei-or">or start from something already in front of you</p>
      <div className="cap-list ei-picks">
        {SUBMISSIONS.map(s => (
          <button key={s.id} className="cap-opt" onClick={() => onPick(s)}>
            <span className="cap-main">
              <b>{s.pickClaim}</b>
              <span className="cap-d">{s.pickLabel}</span>
            </span>
            <span className="cap-tag">{s.pickTag}</span>
          </button>
        ))}
      </div>
    </>
  )
}

// --- the appraisal ----------------------------------------------------------

const STAGE_N = ['1', '2', '3', '4']

function Appraisal({ sub, onBack }) {
  const [revealed, setRevealed] = useState(1)
  const [decision, setDecision] = useState(null)
  const stages = sub.stages
  const done = revealed >= stages.length
  const next = stages[revealed]

  const decide = kind => {
    if (kind === 'hypothesis') acceptHypothesis(sub)
    else if (kind === 'watch') watchItem(sub)
    else fileItem(sub)
    setDecision(kind)
  }

  return (
    <div className="ei-appraisal">
      <button className="chip-link ei-back" onClick={onBack}>← bring in something else</button>

      <div className="card ei-sub">
        <div className="ei-sub-head">
          <span className="eyebrow">submitted · {sub.intake.source_type.replace(/_/g, ' ')}</span>
          <span className="ei-types">
            {sub.intake.evidence_types.map(t => (
              <span key={t} className="ei-type mono">{t.replace(/_/g, ' ')}</span>
            ))}
          </span>
        </div>
        <p className="serif ei-claim">{sub.intake.claim_verbatim}</p>
        <p className="ei-framing">{sub.intake.claim_user_framing}</p>

        <div className="ei-prov">
          {[
            ['who', sub.provenance.attributed_to],
            ['where', sub.provenance.venue],
            ['when said', sub.provenance.stated_at],
            ['captured', `${sub.provenance.captured_at} · ${sub.provenance.capture_method}`],
            ['locator', sub.provenance.locator],
            ['retrieved', sub.provenance.retrieved],
            ['artifact', sub.intake.artifact],
            ['goal', sub.intake.goal_ref],
          ].map(([k, v]) => (
            <div key={k} className="ei-prov-row">
              <span className="fl">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>

        <div className={`callout ${sub.egress.kind === 'fetched' ? 'egress' : 'local'} ei-egress`}>
          <span className="k">
            {sub.egress.kind === 'fetched' ? 'this fetch left the device' : 'nothing left the device'}
          </span>
          <div style={{ marginTop: 4 }}>{sub.egress.text}</div>
        </div>
      </div>

      <div className="ei-stages">
        {stages.slice(0, revealed).map((s, i) => <Stage key={s.key} s={s} n={STAGE_N[i]} />)}

        {!done && (
          <div className="ei-next">
            <button className="btn pri" onClick={() => setRevealed(revealed + 1)}>
              Run stage {STAGE_N[revealed]} — {next.title} →
            </button>
            <button className="btn ghost" onClick={() => setRevealed(stages.length)}>Run the rest</button>
            <span className="note" style={{ margin: 0 }}>
              Each stage can return <b>unknown</b> and pass it forward. Nothing is filled in with a
              plausible default.
            </span>
          </div>
        )}
      </div>

      {done && <Verdict sub={sub} decision={decision} onDecide={decide} />}
    </div>
  )
}

function Stage({ s, n }) {
  return (
    <div className="card ei-stage">
      <div className="ei-stage-head">
        <span className="ei-stage-n mono">{n}</span>
        <b>{s.title}</b>
        <span className="pill local ei-run"><span className="led" />{s.run}</span>
      </div>
      <div className="ei-rows">
        {s.rows.map(r => (
          <div key={r.k} className={`ei-row ${/unknown|not stated|none/i.test(r.v) ? 'unk' : ''}`}>
            <span className="fl">{r.k}</span>
            <span className="ei-v">{r.v}</span>
          </div>
        ))}
      </div>
      <p className="note ei-stage-note">{s.note}</p>
    </div>
  )
}

// --- verdict & offer --------------------------------------------------------

function Verdict({ sub, decision, onDecide }) {
  const v = sub.verdict
  return (
    <div className="card ei-verdict">
      <span className="eyebrow">graded on the same ladder as everything else</span>

      <div className="ei-axes">
        <div className="ei-axis">
          <span className="fl">evidence strength</span>
          <EvidenceLabel kind={v.strength} claim={sub.intake.claim_verbatim} />
          <span className="faint">{v.strengthNote || 'of the outside evidence'}</span>
        </div>
        <div className="ei-axis">
          <span className="fl">applicability to you</span>
          <span className={`ei-appl ${v.applicability.level}`}>{v.applicability.level}</span>
          <span className="faint">a separate question from strength</span>
        </div>
        <div className="ei-axis">
          <span className="fl">agent confidence</span>
          <span className="conf">
            <span className="conf-bar" aria-hidden><span style={{ width: `${Math.round(v.confidence * 100)}%` }} /></span>
            <span className="num" style={{ fontSize: 12 }}>{Math.round(v.confidence * 100)}%</span>
          </span>
          <span className="faint">never multiplied into the grade</span>
        </div>
      </div>

      <p className="ei-narrative">{v.narrative}</p>

      <div className="ei-why">
        <div className="ei-why-row">
          <span className="fl">how the grade was reached</span>
          <span>{v.ceilingNote}</span>
        </div>
        <div className="ei-why-row">
          <span className="fl">applicability</span>
          <span>{v.applicability.note}</span>
        </div>
        <div className="ei-why-row">
          <span className="fl">what is missing</span>
          <span>{v.unknowns.join(' · ')}</span>
        </div>
        <div className="ei-why-row">
          <span className="fl">what would change it</span>
          <span>{v.whatWouldChangeIt}</span>
        </div>
      </div>

      {decision ? <Decided sub={sub} decision={decision} /> : <Offer sub={sub} onDecide={onDecide} />}
    </div>
  )
}

function Offer({ sub, onDecide }) {
  const offered = sub.offer.kind
  const btn = kind => `btn ${offered === kind ? 'pri' : 'ghost'}`
  return (
    <div className="ei-offer">
      <div className="ei-offer-head">
        <span className="verdict v-run">{OFFER[offered].label}</span>
        <span className="ei-offer-why">{sub.offer.why}</span>
      </div>
      <div className="ei-offer-actions">
        <button className={btn('hypothesis')} onClick={() => onDecide('hypothesis')}>Add as hypothesis</button>
        <button className={btn('watch')} onClick={() => onDecide('watch')}>Watch it</button>
        <button className={btn('file')} onClick={() => onDecide('file')}>Just file it</button>
      </div>
      <p className="note" style={{ marginBottom: 0 }}>
        The offer is a suggestion, not a gate — you can promote an item the system filed, and file
        one it offered. Whichever you choose, the submission and its grade stay in the record.
      </p>
    </div>
  )
}

function Decided({ sub, decision }) {
  if (decision === 'hypothesis') {
    const h = sub.hypothesis
    return (
      <div className="ei-created">
        <div className="ei-created-head">
          <span className="eyebrow">created · ayuos.hypotheses</span>
          <span className="new-tag">new</span>
        </div>
        <div className="ei-obj">
          {[
            ['statement', h.statement],
            ['goal', h.goal],
            ['rationale', h.rationale],
            ['evidence_strength', h.evidence_strength.toUpperCase()],
            ['proposed_intervention', h.proposed_intervention],
            ['expected_effect', h.expected_effect],
            ['confidence', `${Math.round(h.confidence * 100)}% — the agent's, kept apart from the grade`],
            ['origin', h.origin],
          ].map(([k, val]) => (
            <div key={k} className="ei-obj-row">
              <span className="fl mono">{k}</span>
              <span>{val}</span>
            </div>
          ))}
        </div>
        <p className="note">
          Same object the agent’s own proposals produce (evidence.md), stamped with where it came
          from. Next it goes to pre-registration — where the power check may conclude the marker
          cannot resolve the effect, which is worth knowing before the days are spent.
        </p>
        <Link className="btn pri" to="/experiments">Design the experiment →</Link>
      </div>
    )
  }
  return (
    <div className="ei-created filed">
      <div className="ei-created-head">
        <span className="eyebrow">{decision === 'watch' ? 'held · watch list' : 'filed · kept with its grade'}</span>
        <EvidenceLabel kind={sub.verdict.strength} claim={sub.intake.claim_verbatim} />
      </div>
      <p className="ei-filed-note">
        {decision === 'watch'
          ? 'Held, not tested. It resurfaces on its own when something changes — a replication, a new panel, or a question that touches it.'
          : 'Kept, labelled and searchable. Nothing is deleted: when this claim is recommended to you again, the appraisal and its date come back with it. If the evidence changes, this item is re-graded in place rather than started over.'}
      </p>
    </div>
  )
}

// --- the shelf --------------------------------------------------------------

const OUTCOME = {
  hypothesis: { label: 'hypothesis', cls: 'hyp' },
  watching: { label: 'watching', cls: 'watch' },
  filed: { label: 'filed', cls: 'filed' },
}

function Shelf({ rows }) {
  return (
    <section className="ei-shelf">
      <h3 className="ei-shelf-h">In the record <span className="faint">· {rows.length} brought in this session</span></h3>
      {rows.map(r => {
        const o = OUTCOME[r.outcome] || OUTCOME.filed
        return (
          <div key={r.id} className="ei-shelf-row">
            <span className={`ei-outcome ${o.cls}`}>{o.label}</span>
            <span className="ei-shelf-claim">
              {r.claim}
              <span className="faint"> · {r.source}</span>
            </span>
            <EvidenceLabel kind={r.strength} claim={r.claim} />
          </div>
        )
      })}
      <p className="note" style={{ marginBottom: 0 }}>
        Weak items sit here with the strong ones. The system does not delete what it graded badly —
        you can, it is your record.
      </p>
    </section>
  )
}
