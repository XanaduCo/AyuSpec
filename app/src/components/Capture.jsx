import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import Modal from './Modal.jsx'
import { useSession } from '../state/store.js'
import { BOTTLES, VOICE_LOG, DETECTED_ACTIVITY } from '../state/fixtures.js'

// Quick capture — journey 12 made operable.
//
// The rule the whole sheet obeys: *passive before manual, and every ask pays
// back in the same step.* The run is confirmed, not typed. The bottle photo
// returns an interaction check the user did not have. The one-tap log advances
// a live experiment. Nothing here is a standing diary; there is deliberately no
// food log.

const CaptureCtx = createContext(null)
export const useCapture = () => useContext(CaptureCtx)

export function CaptureProvider({ children }) {
  const [path, setPath] = useState(null)
  const open = useCallback((p = 'menu') => setPath(p), [])
  const close = useCallback(() => setPath(null), [])
  return (
    <CaptureCtx.Provider value={{ open, close, path }}>
      {children}
      {path && <CaptureSheet path={path} setPath={setPath} onClose={close} />}
    </CaptureCtx.Provider>
  )
}

const PATHS = [
  { key: 'activity', ic: '◔', t: 'Confirm a detected activity', d: 'Your watch already saw the run. One tap, no typing.', tag: 'passive' },
  { key: 'walk', ic: '⁘', t: 'Log today’s post-meal walks', d: 'Advances your running experiment on the spot.', tag: '1 tap' },
  { key: 'bottle', ic: '⎘', t: 'Photo a supplement bottle', d: 'Local label read, then an interaction check before it is accepted.', tag: '<10s' },
  { key: 'voice', ic: '🎙', t: 'Say what you started', d: 'On-device transcription into a structured record.', tag: '<10s' },
  { key: 'bp', ic: '◉', t: 'Log a reading', d: 'Blood pressure — straight into the home-cuff series.', tag: 'manual' },
]

function CaptureSheet({ path, setPath, onClose }) {
  const title = path === 'menu' ? 'Capture' : PATHS.find(p => p.key === path)?.t || 'Capture'
  return (
    <Modal title={title} onClose={onClose}
      footer={path !== 'menu' ? <button className="btn ghost" onClick={() => setPath('menu')}>← All capture paths</button> : null}>
      {path === 'menu' && <Menu setPath={setPath} />}
      {path === 'activity' && <ActivityPath onDone={onClose} />}
      {path === 'walk' && <WalkPath onDone={onClose} />}
      {path === 'bottle' && <BottlePath onDone={onClose} />}
      {path === 'voice' && <VoicePath onDone={onClose} />}
      {path === 'bp' && <BpPath onDone={onClose} />}
      {path === 'family' && <FamilyPath onDone={onClose} />}
    </Modal>
  )
}

function Menu({ setPath }) {
  return (
    <div>
      <p className="note" style={{ marginTop: 0 }}>
        Everything here runs on-device and finishes in under ten seconds. Anything a stream can
        detect is not asked for at all.
      </p>
      <div className="cap-list">
        {PATHS.map(p => (
          <button key={p.key} className="cap-opt" onClick={() => setPath(p.key)}>
            <span className="cap-ic">{p.ic}</span>
            <span className="cap-main">
              <b>{p.t}</b>
              <span className="cap-d">{p.d}</span>
            </span>
            <span className="cap-tag mono">{p.tag}</span>
          </button>
        ))}
      </div>
      <div className="callout" style={{ marginTop: 14 }}>
        <span className="k">what is deliberately missing</span>
        <div>
          There is no food diary. Nutrition capture only opens inside a time-boxed experiment
          window, where it pays back with two weeks of glucose feedback and then closes. A standing
          tracker is the thing everyone abandons — so it is designed out rather than asked for.
        </div>
      </div>
    </div>
  )
}

// --- passive: confirm what the watch already saw ---------------------------
function ActivityPath({ onDone }) {
  const { actions } = useSession()
  const a = DETECTED_ACTIVITY
  return (
    <div>
      <p className="note" style={{ marginTop: 0 }}>
        Detected from the wearable stream that already exists. Nothing was typed and nothing is
        being asked for — this is a confirmation, and ignoring it is a valid answer.
      </p>
      <div className="cap-card">
        <div className="cap-card-h"><b>{a.label}</b><span className="mono faint">{a.date}</span></div>
        <div className="mono cap-detail">{a.detail}</div>
      </div>
      <div className="cap-actions">
        <button className="btn ghost" onClick={onDone}>Not mine</button>
        <button className="btn pri" onClick={() => { actions.captureActivity(a); onDone() }}>Looks right</button>
      </div>
    </div>
  )
}

// --- the one-tap log that advances a live experiment ------------------------
function WalkPath({ onDone }) {
  const { actions } = useSession()
  const [feel, setFeel] = useState(null)
  return (
    <div>
      <p className="note" style={{ marginTop: 0 }}>
        This prompt exists because an experiment is running. If nothing were running it would not
        fire — there is no standing survey here.
      </p>
      <div className="cap-card">
        <b>Did you walk after lunch and dinner today?</b>
        <div className="faint" style={{ fontSize: 12.5, marginTop: 4 }}>
          Post-meal walks · week 4 of 30 days · the tap writes straight into the experiment window.
        </div>
      </div>
      <div className="comp-field" style={{ marginTop: 14 }}>
        <span className="fl">how did you feel? <span className="faint">· optional</span></span>
        <div className="pick-row">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} className={`pick ${feel === n ? 'on' : ''}`} onClick={() => setFeel(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="cap-actions">
        <button className="btn ghost" onClick={onDone}>Not today</button>
        <button className="btn pri" onClick={() => { actions.logExperimentDay('exp-postmeal-walks', { note: feel ? `felt ${feel}/5` : undefined }); onDone() }}>
          Yes — log it
        </button>
      </div>
    </div>
  )
}

// --- photo a bottle: parse, then the safety check before the log is accepted -
function BottlePath({ onDone }) {
  const { actions } = useSession()
  const [pick, setPick] = useState(null)
  const [phase, setPhase] = useState('choose') // choose → reading → review
  const [fields, setFields] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const shoot = b => {
    setPick(b); setPhase('reading')
    timer.current = setTimeout(() => {
      setFields(b.fields.map(f => ({ ...f })))
      setPhase('review')
    }, 1000)
  }

  if (phase === 'choose') {
    return (
      <div>
        <p className="note" style={{ marginTop: 0 }}>
          Point the camera at the label and shoot one frame. The demo stands in two bottles for the
          camera; everything after the shutter is what really happens.
        </p>
        <div className="cap-list">
          {BOTTLES.map(b => (
            <button key={b.key} className="cap-opt" onClick={() => shoot(b)}>
              <span className="cap-ic">⎘</span>
              <span className="cap-main"><b>{b.product}</b><span className="cap-d">{b.brand}</span></span>
              <span className="cap-tag mono">shoot</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'reading') {
    return (
      <div className="cap-reading">
        <div className="cap-shutter" aria-hidden />
        <p className="note">Reading the label on-device — the local vision model, no OCR service, no network.</p>
      </div>
    )
  }

  const inter = pick.interaction
  const held = inter.severity === 'high'
  const setField = (i, v) => setFields(f => f.map((x, j) => (j === i ? { ...x, v, uncertain: false, conf: 1 } : x)))

  return (
    <div>
      <div className="cap-card">
        <div className="cap-card-h"><b>{pick.product}</b><span className="mono faint">{pick.brand}</span></div>
        <div className="cap-fields">
          {fields.map((f, i) => (
            <div key={f.k} className={`cap-field ${f.uncertain ? 'uncertain' : ''}`}>
              <span className="fl">{f.k}</span>
              {f.uncertain
                ? <input className="txt" value={f.v} onChange={e => setField(i, e.target.value)} />
                : <span className="cap-v">{f.v}</span>}
              <ConfDots c={f.conf} />
            </div>
          ))}
        </div>
        {fields.some(f => f.uncertain) && (
          <p className="note" style={{ margin: '8px 0 0' }}>
            {fields.find(f => f.uncertain).note} Nothing commits until you confirm — a misparse costs
            a tap, not a bad record.
          </p>
        )}
      </div>

      <div className={`callout ${held ? 'block' : ''} cap-interaction`} style={{ marginTop: 14 }}>
        <span className="k">{held ? 'interaction · clinically significant' : `interaction check · vs ${inter.with}`}</span>
        <div>{inter.text}</div>
      </div>

      {held ? (
        <>
          <p className="note">
            ayuOS surfaces and routes; it does not adjudicate a dangerous interaction on its own. The
            log is held rather than dismissed — it will sit in <b>Now</b> until you deal with it.
          </p>
          <div className="cap-actions">
            <button className="btn ghost" onClick={onDone}>Cancel</button>
            <button className="btn block" onClick={() => { actions.captureMed(pick.med, { held: true, why: inter.text }); onDone() }}>
              Hold it & raise with my clinician
            </button>
          </div>
        </>
      ) : (
        <div className="cap-actions">
          <button className="btn ghost" onClick={onDone}>Discard</button>
          <button className="btn pri" onClick={() => {
            const strength = fields.find(f => f.k === 'strength')?.v || pick.med.dose
            actions.captureMed({ ...pick.med, dose: strength, method: 'photo' }); onDone()
          }}>Confirm — add to record</button>
        </div>
      )}
    </div>
  )
}

// --- voice: a spoken sentence becomes a structured record -------------------
function VoicePath({ onDone }) {
  const { actions } = useSession()
  const [typed, setTyped] = useState('')
  const [done, setDone] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    let i = 0
    timer.current = setInterval(() => {
      i += 1
      setTyped(VOICE_LOG.transcript.slice(0, i))
      if (i >= VOICE_LOG.transcript.length) { clearInterval(timer.current); setDone(true) }
    }, 34)
    return () => clearInterval(timer.current)
  }, [])

  const p = VOICE_LOG.parsed
  return (
    <div>
      <div className="cap-card">
        <div className="cap-card-h">
          <span className="pill local"><span className="led" />🎙 on-device transcription</span>
          <span className="mono faint">no audio leaves the machine</span>
        </div>
        <div className="cap-transcript mono">
          {typed}{!done && <span className="caret">▍</span>}
        </div>
      </div>

      {done && (
        <>
          <p className="note">
            The transcript is shown before anything is saved, so a mis-heard word is yours to catch.
            One token was uncertain and is marked: <b>{VOICE_LOG.uncertain}</b> (not “citrate”).
          </p>
          <div className="cap-card">
            <div className="cap-fields">
              <div className="cap-field"><span className="fl">substance</span><span className="cap-v">{p.substance}</span></div>
              <div className="cap-field"><span className="fl">dose</span><span className="cap-v">{p.dose}</span></div>
              <div className="cap-field"><span className="fl">timing</span><span className="cap-v">{p.timing}</span></div>
              <div className="cap-field"><span className="fl">start</span><span className="cap-v mono">{p.start}</span></div>
            </div>
          </div>
          <div className="callout" style={{ marginTop: 12 }}>
            <span className="k">this lands inside a running experiment</span>
            <div>
              Berberine lowers post-prandial glucose on its own, and your live n-of-1 is measuring
              exactly that. Confirming this will flag the experiment as confounded from today —
              visibly, on the card, with the reason — rather than letting the walk effect quietly
              absorb the credit.
            </div>
          </div>
          <div className="cap-actions">
            <button className="btn ghost" onClick={onDone}>Re-record</button>
            <button className="btn pri" onClick={() => {
              actions.captureMed({ ...VOICE_LOG.med, method: 'voice' })
              actions.flagConfounder('exp-postmeal-walks', VOICE_LOG.confounder)
              onDone()
            }}>Confirm — add to record</button>
          </div>
        </>
      )}
    </div>
  )
}

// --- a reading nothing can detect for you -----------------------------------
function BpPath({ onDone }) {
  const { actions } = useSession()
  const [s, setS] = useState('128')
  const [d, setD] = useState('78')
  const [p, setP] = useState('62')
  const ok = Number(s) > 60 && Number(d) > 40
  return (
    <div>
      <p className="note" style={{ marginTop: 0 }}>
        Goes straight onto the home-cuff series the record already holds, so today’s reading is read
        against your own distribution rather than a population range.
      </p>
      <div className="cap-bp">
        <label className="field"><span className="fl">systolic</span><input className="txt mono num" value={s} onChange={e => setS(e.target.value)} inputMode="numeric" /></label>
        <span className="cap-slash">/</span>
        <label className="field"><span className="fl">diastolic</span><input className="txt mono num" value={d} onChange={e => setD(e.target.value)} inputMode="numeric" /></label>
        <label className="field"><span className="fl">pulse</span><input className="txt mono num" value={p} onChange={e => setP(e.target.value)} inputMode="numeric" /></label>
      </div>
      <p className="note">
        Seated, feet flat, arm at heart height, after two minutes still. Cuff technique moves this
        number more than most drugs do.
      </p>
      <div className="cap-actions">
        <button className="btn ghost" onClick={onDone}>Cancel</button>
        <button className="btn pri" disabled={!ok}
          onClick={() => { actions.captureReading({ systolic: Number(s), diastolic: Number(d), pulse: Number(p) }); onDone() }}>
          Save reading
        </button>
      </div>
    </div>
  )
}

// --- filling a stated gap ---------------------------------------------------
function FamilyPath({ onDone }) {
  const { actions } = useSession()
  const [relation, setRelation] = useState('Paternal grandfather')
  const [condition, setCondition] = useState('')
  const [age, setAge] = useState('')
  const ok = condition.trim() && Number(age) > 0
  return (
    <div>
      <p className="note" style={{ marginTop: 0 }}>
        Your father’s coronary disease is recorded; his parents’ are not. Family history is
        self-reported recall — it is stored as exactly that, and labelled that way wherever it is used.
      </p>
      <div className="comp-field">
        <span className="fl">relation</span>
        <div className="pick-row">
          {['Paternal grandfather', 'Paternal grandmother', 'Brother', 'Sister'].map(r => (
            <button key={r} className={`pick ${relation === r ? 'on' : ''}`} onClick={() => setRelation(r)}>{r}</button>
          ))}
        </div>
      </div>
      <label className="field"><span className="fl">condition</span>
        <input className="txt" value={condition} placeholder="e.g. myocardial infarction" onChange={e => setCondition(e.target.value)} /></label>
      <label className="field"><span className="fl">age at onset</span>
        <input className="txt mono num" value={age} placeholder="e.g. 58" onChange={e => setAge(e.target.value)} inputMode="numeric" /></label>
      <div className="cap-actions">
        <button className="btn ghost" onClick={onDone}>Cancel</button>
        <button className="btn pri" disabled={!ok} onClick={() => { actions.captureFamily({ relation, condition: condition.trim(), age }); onDone() }}>Add</button>
      </div>
    </div>
  )
}

// The same hue-free confidence ramp used everywhere else — never colour.
export function ConfDots({ c }) {
  const n = c >= 0.95 ? 4 : c >= 0.85 ? 3 : c >= 0.65 ? 2 : c >= 0.4 ? 1 : 0
  return (
    <span className="ev" title={`parse confidence ${Math.round(c * 100)}%`}>
      <span className="dots">
        {[0, 1, 2, 3].map(i => (i < n ? <span key={i}>●</span> : <i key={i}>○</i>))}
      </span>
    </span>
  )
}
