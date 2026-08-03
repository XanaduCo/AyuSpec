// A tasteful placeholder for views being built in later phases. It still states
// the view's intent and what it will show, so the shell feels complete and
// navigable rather than broken.
export default function StubView({ phase, title, blurb, willShow = [] }) {
  return (
    <div className="page page-narrow">
      <div className="stub">
        <span className="badge">Planned · {phase}</span>
        <h2>{title}</h2>
        <p>{blurb}</p>
        {willShow.length > 0 && (
          <div className="plan card">
            {willShow.map((w, i) => (
              <div className="row" key={i}>
                <span className="k">{w.k}</span>
                <span><b>{w.t}</b> — {w.d}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
