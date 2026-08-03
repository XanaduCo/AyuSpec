import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { resolveRecord } from '../mock/fhir.js'
import { getConcept } from '../mock/concepts.js'

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
  const rec = resolveRecord(id)
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
      <span className="k mono" style={{ fontSize: 11, color: 'var(--faint)' }}>FHIR {rec.fhir.resourceType} · as it exports at the boundary</span>
      <pre className="payload" style={{ marginTop: 6 }}>{JSON.stringify(rec.fhir, dropUndefined, 2)}</pre>
      <p className="note" style={{ marginTop: 10 }}>
        ayuOS stores this as FHIR-shaped JSONB in the <span className="mono">clinical</span> schema, not on a FHIR
        server (ADR-0002). FHIR is the interchange format at the boundary.
      </p>
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
