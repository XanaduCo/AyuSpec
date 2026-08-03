// The pre-send review: the exact redaction diff, destination, and what was
// withheld outright, shown before anything leaves the device (Interaction law 4).
// Shared by Transparency (the canonical panel) and Ask (before the first cloud
// answer). `onSend` / `onCancel` are optional — omit them for the read-only view.
//
// Genomic data is a *default* exclusion, not a hard one (pii-gateway.md): the user
// may opt to include it, warned that a genome can't be de-identified. That opt-in
// lives here — off unless deliberately turned on, and it changes what leaves.

import { useState } from 'react'
import Switch from './Switch.jsx'

// `assembled` is optional: when Ask has actually run the context builder for this
// question, the panel reports *that* payload rather than the canned constants, so
// the token count under the Send button can never drift from the trace above it.
export default function PreSendPanel({ presend, onSend, onCancel, assembled }) {
  const excl = presend.excluded
  const [includeExcluded, setIncludeExcluded] = useState(false)
  const on = !!excl?.optIn && includeExcluded
  const base = assembled?.budget?.used ?? presend.tokens
  const tokens = base + (on ? (excl.optInTokens || 0) : 0)
  // Cost tracks the payload it is quoting, at the canned per-token rate.
  const cost = presend.cost * (tokens / (presend.tokens || tokens || 1))

  return (
    <div className="presend">
      <div className="top">
        <b>◍ About to leave your device</b>
        <span className="pill egress"><span className="led" />{presend.destination}</span>
      </div>
      <div className="body">
        <div className="diff">
          {presend.diff.map((d, i) => (
            <div key={i}>
              {d.pre}
              {d.rm && <span className="rm">{d.rm}</span>}{d.rm && ' '}
              {d.add && <span className="add">{d.add}</span>}
              {d.keep && <span style={{ color: 'var(--local)' }}> {d.keep}</span>}
            </div>
          ))}
        </div>

        {on
          ? <div className="excl on">⚠ <b>{excl.type}</b> will be sent, by your choice — {excl.optInWarning}</div>
          : <div className="excl">⊘ Withheld entirely: <b>{excl.type}</b> — {excl.reason}.</div>}

        {excl?.optIn && (
          <label className="optin-row">
            <Switch on={includeExcluded} onChange={setIncludeExcluded}
              label="Include genomic data in this call" />
            <span>Send genomic data anyway <span className="faint">· it can't be de-identified</span></span>
          </label>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          {onSend
            ? <button className="btn warn" onClick={() => onSend(on)}>Send · ~{tokens} tok · ${cost.toFixed(3)}</button>
            : <button className="btn warn" disabled>Send · ~{tokens} tok · ${cost.toFixed(3)}</button>}
          {onCancel && <button className="btn ghost" onClick={onCancel}>Keep local instead</button>}
          <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>review: {presend.review}</span>
        </div>
      </div>
    </div>
  )
}
