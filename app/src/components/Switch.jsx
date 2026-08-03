// A minimal on/off switch. Colour stays neutral (brand, not green/amber) — a
// toggle is not a privacy signal, so it must not borrow the semantic colour
// language. Shared by Settings, Data sources and Share.
export default function Switch({ on, onChange, id, label }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={on} aria-label={label}
      className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="knob" />
    </button>
  )
}
