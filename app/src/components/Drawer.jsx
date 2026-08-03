import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { resolveRecord } from '../mock/fhir.js'
import { getConcept } from '../mock/concepts.js'
import { useSession } from '../state/store.js'

// One shared slide-over used everywhere a record or a concept needs to open:
// Ask citations + evidence labels, Timeline events. Content is one of:
//   { type: 'record',  id }
//   { type: 'concept', id, claim }   claim = the live sentence, shown as the worked example.

const DrawerCtx = createContext(null)
export const useDrawer = () => useContext(DrawerCtx)

export function DrawerProvider({ children }) {
  const [content, setContent] = useState(null)
  const openRecord = useCallback(id => setContent({ type: 'record', id }), [])
  const openConcept = useCallback((id, claim) => setContent({ type: 'concept', id, claim }), [])
  const close = useCallback(() => setContent(null), [])

  return (
    <DrawerCtx.Provider value={{ openRecord, openConcept, close, content }}>
      {children}
      <Drawer content={content} onClose={close} onOpenConcept={openConcept} />
    </DrawerCtx.Provider>
  )
}

function Drawer({ content, onClose, onOpenConcept }) {
  useEffect(() => {
    if (!content) return
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [content, onClose])

  if (!content) return null
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <button className="drawer-x" onClick={onClose} aria-label="Close">✕</button>
        {content.type === 'record'
          ? <RecordBody id={content.id} />
          : <ConceptBody id={content.id} claim={content.claim} onOpenConcept={onOpenConcept} />}
      </aside>
    </div>
  )
}

function RecordBody({ id }) {
  const { state } = useSession() || { state: { records: {}, corrections: {} } }
  // Records created this session (an import, a capture) resolve from the overlay;
  // everything else from the base mock. Same drawer either way.
  const rec = resolveRecord(id) || state.records[id]
  const correction = state.corrections[id]
  if (!rec) return <div className="drawer-body"><p className="muted">No record found for <span className="mono">{id}</span>.</p></div>
  return (
    <div className="drawer-body">
      <span className="eyebrow">Stored record</span>
      <h2 className="drawer-title">{rec.title}</h2>
      <div className="mono faint" style={{ fontSize: 12, marginBottom: 12 }}>{rec.subtitle}</div>
      <div className="callout local" style={{ marginBottom: 14 }}>
        <span className="k">source-backed</span>
        <div>This is an actual resource in your store — the agent cited it, it did not paraphrase from memory. It never left the device.</div>
      </div>
      {rec.impression && (
        <div className="callout brand" style={{ marginBottom: 14 }}>
          <span className="k">AI impression · MedGemma (local)</span>
          <div style={{ color: 'var(--ink)' }}>{rec.impression}</div>
        </div>
      )}
      {correction && <CorrectionBanner c={correction} />}
      <span className="k mono" style={{ fontSize: 11, color: 'var(--faint)' }}>FHIR {rec.fhir.resourceType} · as it exports at the boundary</span>
      <pre className="payload" style={{ marginTop: 6 }}>{JSON.stringify(rec.fhir, dropUndefined, 2)}</pre>
      <p className="note" style={{ marginTop: 10 }}>
        ayuOS stores this as FHIR-shaped JSONB in the <span className="mono">clinical</span> schema, not on a FHIR
        server (ADR-0002). FHIR is the interchange format at the boundary.
      </p>
      <CorrectionPanel id={id} title={rec.title} rec={rec} correction={correction} />
    </div>
  )
}

function CorrectionBanner({ c }) {
  return (
    <div className="correction-banner">
      <span className="k mono">your correction · applied everywhere this value appears</span>
      <div>
        {c.value != null && <div>Value corrected to <b className="mono num">{c.value}{c.unit ? ` ${c.unit}` : ''}</b>.</div>}
        {c.excluded && <div>Excluded from the agent’s reasoning and from any sliver you compose. The original is kept.</div>}
        {c.reason && <div className="faint">Reason: “{c.reason}”</div>}
        {c.note && <div className="faint">Note: “{c.note}”</div>}
      </div>
    </div>
  )
}

// The system can be wrong about you. This is where you say so.
//
// Three different things a user needs and the app had none of: fix a value the
// parser or the device got wrong, attach a note the record cannot express, and
// take a value out of the agent's reasoning without deleting it.
function CorrectionPanel({ id, title, rec, correction }) {
  const session = useSession()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(null) // 'value' | 'note' | 'exclude'
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  if (!session) return null
  const { actions } = session

  const current = rec.fhir?.valueQuantity?.value
  const unit = rec.fhir?.valueQuantity?.unit

  const save = () => {
    if (mode === 'value') actions.correctRecord(id, { value: Number(value), unit, note: note.trim() || undefined }, title)
    if (mode === 'note') actions.correctRecord(id, { note: note.trim() }, title)
    if (mode === 'exclude') actions.correctRecord(id, { excluded: true, reason: reason.trim() || 'not stated' }, title)
    setOpen(false); setMode(null); setValue(''); setNote(''); setReason('')
  }

  return (
    <div className="correct">
      {!open ? (
        <div className="correct-bar">
          <button className="btn ghost sm" onClick={() => setOpen(true)}>Something wrong with this record?</button>
          {correction && (
            <button className="chip-link" onClick={() => actions.uncorrectRecord(id)}>undo my correction</button>
          )}
        </div>
      ) : (
        <div className="correct-panel">
          <span className="eyebrow">Correct, annotate, or exclude</span>
          <p className="note" style={{ marginTop: 6 }}>
            Nothing is deleted. A correction is stored beside the original with its reason, so the
            record keeps both what the source said and what you know to be true.
          </p>
          <div className="pick-row" style={{ marginBottom: 12 }}>
            <button className={`pick ${mode === 'value' ? 'on' : ''}`} onClick={() => setMode('value')} disabled={current == null}>
              Fix the value
            </button>
            <button className={`pick ${mode === 'note' ? 'on' : ''}`} onClick={() => setMode('note')}>Add a note</button>
            <button className={`pick ${mode === 'exclude' ? 'on' : ''}`} onClick={() => setMode('exclude')}>Exclude from reasoning</button>
          </div>

          {mode === 'value' && (
            <label className="field">
              <span className="fl">corrected value <span className="faint">· recorded as {current} {unit}</span></span>
              <input className="txt mono num" value={value} placeholder={String(current ?? '')} onChange={e => setValue(e.target.value)} inputMode="decimal" />
            </label>
          )}
          {(mode === 'value' || mode === 'note') && (
            <label className="field">
              <span className="fl">note <span className="faint">· optional, travels with the record</span></span>
              <input className="txt" value={note} placeholder="e.g. drawn non-fasting; the lab flagged the sample as haemolysed"
                onChange={e => setNote(e.target.value)} />
            </label>
          )}
          {mode === 'exclude' && (
            <>
              <label className="field">
                <span className="fl">why <span className="faint">· required — an unexplained exclusion is a lie by omission</span></span>
                <input className="txt" value={reason} placeholder="e.g. cuff was the wrong size; this reading is not real"
                  onChange={e => setReason(e.target.value)} />
              </label>
              <p className="note" style={{ marginTop: 0 }}>
                The agent stops reasoning over this value and it drops out of any sliver you compose.
                It stays in the store, visible here, and the exclusion is logged in <b>Now</b>.
              </p>
            </>
          )}

          <div className="correct-actions">
            <button className="btn ghost sm" onClick={() => { setOpen(false); setMode(null) }}>Cancel</button>
            <button className="btn pri sm" disabled={!mode || (mode === 'value' && !value) || (mode === 'note' && !note.trim()) || (mode === 'exclude' && !reason.trim())}
              onClick={save}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConceptBody({ id, claim, onOpenConcept }) {
  const c = getConcept(id)
  if (!c) return <div className="drawer-body"><p className="muted">No concept found for <span className="mono">{id}</span>.</p></div>
  return (
    <div className="drawer-body">
      <span className="eyebrow">Concept · epistemics</span>
      <h2 className="drawer-title">{c.title}</h2>
      <p className="serif-lead" style={{ fontSize: 16 }}>{c.summary}</p>
      {claim && (
        <div className="callout brand" style={{ margin: '6px 0 14px' }}>
          <span className="k">your live example</span>
          <div style={{ color: 'var(--ink)' }}>“{stripTokens(claim)}”</div>
        </div>
      )}
      {c.body.split('\n\n').map((para, i) => <p key={i} style={{ fontSize: 14 }}>{para}</p>)}
      {c.related?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <span className="k mono" style={{ fontSize: 11, color: 'var(--faint)' }}>RELATED</span>
          <div className="concept-related">
            {c.related.map(rid => {
              const r = getConcept(rid)
              return r ? (
                <button key={rid} className="chip-link" onClick={() => onOpenConcept(rid)}>{r.title}</button>
              ) : null
            })}
          </div>
        </div>
      )}
      {c.deepLink && (
        <p className="note" style={{ marginTop: 14 }}>
          <span className="mono faint">go deeper →</span> {c.deepLink}
        </p>
      )}
      <p className="note" style={{ marginTop: 10 }}>
        Concepts ship with the install, versioned with releases, fully offline. This one retires from
        proactive prompts once you’ve engaged with it — the label stays tappable forever.
      </p>
    </div>
  )
}

// Hide `undefined` fields and the private `_impression`/`_*` keys from the JSON view.
function dropUndefined(key, value) {
  if (value === undefined) return undefined
  if (key.startsWith('_')) return undefined
  return value
}

// Remove inline markup tokens from a claim before quoting it.
function stripTokens(text) {
  return text
    .replace(/\{\{(ev|cite):[a-z0-9-]+\}\}/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}
