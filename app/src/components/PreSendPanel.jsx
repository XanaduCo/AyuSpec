// The pre-send review: the exact redaction diff, destination, and what was
// withheld outright, shown before anything leaves the device (Interaction law 4).
// Shared by Transparency (the canonical panel) and Ask (before the first cloud
// answer). `onSend` / `onCancel` are optional — omit them for the read-only view.

export default function PreSendPanel({ presend, onSend, onCancel }) {
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
        <div className="excl">⊘ Withheld entirely: <b>{presend.excluded.type}</b> — {presend.excluded.reason}.</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          {onSend
            ? <button className="btn warn" onClick={onSend}>Send · ~{presend.tokens} tok · ${presend.cost.toFixed(3)}</button>
            : <button className="btn warn" disabled>Send · ~{presend.tokens} tok · ${presend.cost.toFixed(3)}</button>}
          {onCancel && <button className="btn ghost" onClick={onCancel}>Keep local instead</button>}
          <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>review: {presend.review}</span>
        </div>
      </div>
    </div>
  )
}
