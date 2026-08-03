import { useState } from 'react'
import { usePosture, ROLES, PROVIDERS, providerMeta, egressSummary } from '../mock/posture.jsx'
import PosturePill from '../components/PosturePill.jsx'
import PreSendPanel from '../components/PreSendPanel.jsx'
import { presend } from '../mock/ledger.js'

// A minimal on/off switch. Colour stays neutral — this is not a privacy signal,
// so it must not borrow the green/amber language.
function Switch({ on, onChange, id }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={on}
      className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="knob" />
    </button>
  )
}

// A centred confirm modal (federation consent + the read-only send preview).
function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}
        onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <b>{title}</b>
          <button className="drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

const REVIEW_MODES = [
  { key: 'every_call', t: 'every call', d: 'full preview + confirm before every send' },
  { key: 'new_shape', t: 'new shape', d: 'confirm once per new payload shape, then proceed' },
  { key: 'off', t: 'off', d: 'standing consent — no prompt (the ledger still records every call)' },
]

function RoleCard({ roleDef }) {
  const { posture, setRole, previewSeen, markPreviewSeen } = usePosture()
  const role = posture[roleDef.key]
  const meta = providerMeta(role.provider)
  const isCloud = role.where === 'cloud'
  const [preview, setPreview] = useState(false)

  const changeProvider = provKey => {
    const m = providerMeta(provKey)
    const patch = {
      provider: provKey,
      where: m.where,
      model: m.needsEndpoint ? '' : m.models[0],
      endpoint: m.needsEndpoint ? role.endpoint : '',
    }
    // Whenever a cloud provider is first configured for a role, review defaults
    // to every_call (ai-transparency.md). Local providers don't gate.
    if (m.where === 'cloud') patch.review = 'every_call'
    setRole(roleDef.key, patch)
  }

  const openPreview = () => { markPreviewSeen(roleDef.key); setPreview(true) }

  return (
    <div className="role-card card">
      <div className="role-head">
        <div>
          <span className="role-name">{roleDef.label}</span>
          <span className="role-sees">sees {roleDef.sees}</span>
        </div>
        <PosturePill role={role} detail />
      </div>

      <div className="field-row">
        <label className="field">
          <span className="fl">provider</span>
          <select className="select" value={role.provider}
            onChange={e => changeProvider(e.target.value)}>
            {PROVIDERS.map(p => (
              <option key={p.key} value={p.key}>{p.label}{p.where === 'cloud' ? ' · cloud' : ' · local'}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="fl">model</span>
          {meta.needsEndpoint
            ? <input className="txt" value={role.model} placeholder="model id"
                onChange={e => setRole(roleDef.key, { model: e.target.value })} />
            : <select className="select" value={role.model}
                onChange={e => setRole(roleDef.key, { model: e.target.value })}>
                {meta.models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>}
        </label>
      </div>

      {meta.needsEndpoint && (
        <label className="field">
          <span className="fl">endpoint <span className="faint">· LM Studio, vLLM, a LAN box</span></span>
          <input className="txt mono" value={role.endpoint} placeholder="http://192.168.1.100:1234/v1"
            onChange={e => setRole(roleDef.key, { endpoint: e.target.value })} />
        </label>
      )}

      <div className="field">
        <span className="fl">fallback</span>
        <div className="fallback-note"><span className="pill local" style={{ fontSize: 11 }}><span className="led" />{role.fallback}</span>
          <span className="faint">a cloud provider is a preference, not a dependency — this local model catches every call if it’s unreachable.</span></div>
      </div>

      {isCloud ? (
        <div className="review">
          <span className="fl">review mode <span className="faint">· cloud only</span></span>
          <div className="review-modes">
            {REVIEW_MODES.map(rm => {
              const locked = rm.key === 'off' && !previewSeen[roleDef.key]
              return (
                <label key={rm.key} className={`review-opt ${role.review === rm.key ? 'on' : ''} ${locked ? 'locked' : ''}`}
                  title={locked ? 'See one full pre-send preview first — you can’t consent to a payload shape you’ve never looked at.' : rm.d}>
                  <input type="radio" name={`review-${roleDef.key}`} value={rm.key}
                    checked={role.review === rm.key} disabled={locked}
                    onChange={() => setRole(roleDef.key, { review: rm.key })} />
                  <span className="ro-t">{rm.t}{locked && ' 🔒'}</span>
                  <span className="ro-d">{rm.d}</span>
                </label>
              )
            })}
          </div>
          <button className="btn ghost sm" onClick={openPreview} style={{ marginTop: 8 }}>
            Preview what would leave →
          </button>
        </div>
      ) : (
        <div className="review local-note">
          <span className="pill local" style={{ fontSize: 11 }}><span className="led" />on device</span>
          <span className="faint">Runs locally — no pre-send review, because nothing leaves.</span>
        </div>
      )}

      {preview && (
        <Modal title={`Pre-send preview · ${roleDef.label}`} onClose={() => setPreview(false)}
          footer={<button className="btn ghost" onClick={() => setPreview(false)}>Close</button>}>
          <p className="note" style={{ marginTop: 0 }}>
            This is the exact panel you’d see before this role’s first cloud call — the redaction
            diff, the destination, and what is withheld outright. Reviewing it once unlocks
            <b> review: off</b> for this role.
          </p>
          <PreSendPanel presend={presend} />
        </Modal>
      )}
    </div>
  )
}

const CONSENT = `Enabling federated analytics means: your model gradients — never your raw health data — are aggregated with other users’ and published to an open research commons. It is opt-in citizen science that contributes to open health knowledge, not a capability multiplier for ayuOS.

No commercial use, and no linkage between your ayuOS participation and any commercial project, without a separate, explicit, prominently-disclosed opt-in. You can revoke at any time.`

export default function Settings() {
  const { posture } = usePosture()
  const [telemetry, setTelemetry] = useState(false)
  const [federation, setFederation] = useState(false)
  const [consenting, setConsenting] = useState(false)
  const eg = egressSummary(posture)

  const toggleFederation = next => {
    if (next) setConsenting(true) // gated by consent
    else setFederation(false)
  }

  return (
    <div className="page page-narrow settings">
      <span className="eyebrow">Settings · where the posture in the header is set</span>

      {/* Egress posture summary — computed from the three roles below. */}
      <div className={`card egress-summary ${eg.tone}`} style={{ margin: '14px 0 26px' }}>
        <div className="es-head">
          <span className={`pill ${eg.tone}`}><span className="led" />{eg.tone === 'local' ? 'nothing leaves' : 'some context leaves, PII-stripped'}</span>
          <span className="eyebrow">egress posture</span>
        </div>
        <p className="es-headline">{eg.headline}</p>
        <div className="es-lines">
          {eg.lines.map(l => (
            <div key={l.key} className="es-line">
              <span className={`es-dot ${l.where === 'cloud' ? 'egress' : 'local'}`} />
              <b>{l.label}</b><span>{l.text}</span>
            </div>
          ))}
        </div>
        {eg.fallback && <p className="note">{eg.fallback}</p>}
        <p className="note">{eg.connections}</p>
      </div>

      <h3 style={{ marginBottom: 4 }}>Model roles</h3>
      <p className="note" style={{ marginTop: 0, marginBottom: 16 }}>
        Each role runs on its own provider. Flip the reasoner to a local model and the header pills
        turn green everywhere — the posture in the header is exactly what you set here.
      </p>
      <div className="role-cards">
        {ROLES.map(r => <RoleCard key={r.key} roleDef={r} />)}
      </div>

      <h3 style={{ margin: '30px 0 12px' }}>Security</h3>
      <div className="card sec-card">
        <div className="sec-row">
          <div><b>Disk encryption</b><div className="faint">OS-level full-disk encryption (FileVault / LUKS). ayuOS checks at startup and warns if it’s off.</div></div>
          <span className="pill local"><span className="led" />FileVault · on</span>
        </div>
        <div className="sec-row">
          <div><b>Telemetry &amp; crash reporting</b><div className="faint">Off by default. App diagnostics only if enabled — never health data, which stays behind the gateway.</div></div>
          <Switch on={telemetry} onChange={setTelemetry} id="telemetry" />
        </div>
        <div className="sec-row">
          <div><b>Service binding</b><div className="faint">All services bind to loopback only — not reachable from the local network or internet.</div></div>
          <span className="pill local"><span className="led" />127.0.0.1 · bound</span>
        </div>
      </div>

      <h3 style={{ margin: '30px 0 12px' }}>Federated analytics <span className="faint" style={{ fontWeight: 400, fontSize: 14 }}>· Phase 2 · opt-in</span></h3>
      <div className="card sec-card">
        <div className="sec-row">
          <div>
            <b>Contribute to open health research</b>
            <div className="faint">Off by default. Opt-in citizen science — gradients, never raw data, published to an open commons.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {federation && <span className="pill brand" style={{ fontSize: 11 }}>enrolled</span>}
            <Switch on={federation} onChange={toggleFederation} id="federation" />
          </div>
        </div>
      </div>

      {consenting && (
        <Modal title="Before you enrol" onClose={() => setConsenting(false)}
          footer={<>
            <button className="btn ghost" onClick={() => setConsenting(false)}>Cancel</button>
            <button className="btn pri" onClick={() => { setFederation(true); setConsenting(false) }}>I understand — enrol</button>
          </>}>
          {CONSENT.split('\n\n').map((p, i) => <p key={i} className="consent-p">{p}</p>)}
        </Modal>
      )}
    </div>
  )
}
