// A centred confirm/preview modal. Shared by Settings (federation consent, the
// read-only send preview), Share (sliver preview + consent) and anywhere else a
// focused decision needs to interrupt. Esc / scrim-click / ✕ all close it.
import { useEffect } from 'react'

export default function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}
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
