// The expanded context trace: plan → selection → aggregation → what was left
// out → the gateway. Everything here is computed by `context/assemble.js` from
// the real index, so the numbers move when the toggles or the posture move.
//
// The section that matters most is "left out", and specifically that it is three
// sections rather than one. A UI that lumps "not relevant" together with
// "withheld by policy" teaches the user that privacy and relevance are the same
// kind of decision. They are not, and the whole point of this surface is that
// the relevance story — the one most products never show at all — is legible
// beside the policy story without being swallowed by it.

import Switch from './Switch.jsx'
import { useDrawer } from './Drawer.jsx'
import { REASONS, fmtBytes } from '../context/assemble.js'
import { unitById } from '../context/store.js'

const n = v => v.toLocaleString()

function Section({ title, sub, children }) {
  return (
    <div className="ctx-sec">
      <div className="ctx-h"><b>{title}</b>{sub && <span className="sub">{sub}</span>}</div>
      {children}
    </div>
  )
}

function ReasonChips({ reasons }) {
  return (
    <div className="ctx-reasons">
      {reasons.map(r => {
        const meta = REASONS[r]
        if (!meta) return null
        return (
          <span key={r} className="ctx-reason" tabIndex={0} title={meta.desc}>
            <span className="g">{meta.glyph}</span>{meta.label}
          </span>
        )
      })}
    </div>
  )
}

function Budget({ budget, where }) {
  const cap = budget.cap
  const pctOf = t => Math.min(100, (t / cap) * 100)
  const overheadPct = pctOf(budget.overhead)
  const usedPct = pctOf(budget.used - budget.overhead)
  const overPct = budget.over ? Math.min(30, ((budget.requested - cap) / cap) * 100) : 0
  return (
    <>
      <div className="ctx-budget-bar" role="img"
        aria-label={`${n(budget.used)} of ${n(cap)} tokens used`}>
        <span className="overhead" style={{ width: `${overheadPct}%` }} />
        <span className="used" style={{ width: `${usedPct}%` }} />
        {budget.over && <span className="over" style={{ width: `${overPct}%` }} />}
      </div>
      <div className="ctx-budget-legend">
        <span><i className="sw" style={{ background: 'color-mix(in srgb, var(--brand) 42%, var(--line))' }} />
          prompt + guidelines <b>{n(budget.overhead)}</b></span>
        <span><i className="sw" style={{ background: 'var(--brand)' }} />
          retrieved records <b>{n(budget.used - budget.overhead)}</b></span>
        <span>budget <b>{n(cap)}</b> tok · {where}</span>
      </div>
      {budget.over && (
        <div className="ctx-over-note">
          <b>Over budget by {n(budget.overBy)} tokens.</b> The retriever asked for {n(budget.requested)} and
          the ceiling is {n(cap)}, so the overflow was refused rather than silently truncated — see
          “evicted to fit the budget” below.
        </div>
      )}
      <p className="ctx-note">{budget.why}</p>
    </>
  )
}

export default function ContextPanel({ ctx, onToggle }) {
  const drawer = useDrawer()
  const open = id => unitById[id] && drawer?.openRecord(id)

  const relevanceDropped = ctx.dropGroups
  const budgetEvicted = ctx.evicted

  return (
    <div className="ctx-panel">
      {/* 1 — where it is going, and what it may spend ---------------------- */}
      <Section title="Destination & budget" sub={`window ${ctx.windowLabel} · ${ctx.from} → ${ctx.to}`}>
        <div className="ctx-dest">
          <span className={`pill ${ctx.where === 'cloud' ? 'egress' : 'local'}`}>
            <span className="led" />{ctx.where === 'cloud' ? 'leaves the device' : 'stays on device'}
          </span>
          <span className="model">reasoner · {ctx.where}</span>
        </div>
        <Budget budget={ctx.budget} where={ctx.where} />
      </Section>

      {/* 2 — the counterfactuals, up front so they get used ---------------- */}
      {!!ctx.counterfactuals.length && (
        <Section title="Change the question" sub="each toggle re-runs the assembly above">
          <div className="ctx-cf">
            {ctx.counterfactuals.map(cf => (
              <div key={cf.key}
                className={`ctx-cf-row ${cf.on ? 'on' : ''} ${cf.locked ? 'locked' : ''} ${cf.warn ? 'warn' : ''}`}>
                <Switch
                  on={cf.on}
                  onChange={v => !cf.locked && !cf.disabled && onToggle(cf.key, v)}
                  label={cf.label}
                />
                <div>
                  <div className="ctx-cf-t">{cf.label}</div>
                  <div className="ctx-cf-d">{cf.lockNote || cf.detail}</div>
                  {cf.warn && cf.on && <div className="ctx-cf-warn">⚠ {cf.warnText}</div>}
                </div>
                <div className={`ctx-cf-cost ${cf.breaks ? 'breaks' : ''}`}>{cf.cost}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 3 — the plan ------------------------------------------------------ */}
      {!!ctx.plan.length && (
        <Section title="Plan" sub={`${ctx.plan.length} tool calls · ${ctx.spec.intent}`}>
          <div className="ctx-plan">
            {ctx.plan.map((s, i) => (
              <div key={i} className={`ctx-step ${s.blocked ? 'blocked' : ''}`}>
                <span className="i">{i + 1}</span>
                <div>
                  <span className="tool">{s.tool}</span>{' '}
                  <span className="args">({s.args})</span>
                  <div className="yields">{s.yields}{s.blocked && ' — blocked at the gateway'}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 4 — what was selected, and why ------------------------------------ */}
      <Section
        title="Selected"
        sub={`${n(ctx.considered.rows)} rows across ${ctx.considered.units} units considered → ${ctx.selected.length} selected`}>
        <div className="ctx-list">
          {ctx.selected.map(s => (
            <div key={s.id} className={`ctx-item ${s.fromToggle ? 'added' : ''}`}>
              <div>
                <button className={`name ${s.resolvable ? '' : 'static'}`}
                  onClick={() => s.resolvable && open(s.id)}
                  title={s.resolvable ? 'Open the underlying record' : 'Derived — no single stored record behind it'}>
                  {s.label}
                </button>
                <span className="meta">
                  {s.unit.group}{s.unit.value ? ` · ${s.unit.value}` : ''}
                  {s.mode === 'full' ? ' · raw' : ''}
                </span>
                {s.note && <div className="why">{s.note}</div>}
                <ReasonChips reasons={s.reasons} />
              </div>
              <div className="cost">
                {s.unit.rows > 1 && <>{n(s.unit.rows)} rows<br /></>}
                {n(s.tokens)} tok
              </div>
            </div>
          ))}
        </div>
        {!ctx.selected.length && (
          <p className="ctx-note">Nothing was selected — this question has no authored retrieval trace in the demo.</p>
        )}
      </Section>

      {/* 5 — aggregation --------------------------------------------------- */}
      {!!ctx.aggregations.length && (
        <Section title="Aggregated, not dumped" sub="large series are summarised on the way into the prompt">
          <div className="ctx-agg">
            {ctx.aggregations.map(a => (
              <div key={a.id} className={`ctx-agg-row ${a.bypassed ? 'bypassed' : ''}`}>
                <div className="ctx-agg-head">
                  <b>{a.label}</b>
                  <span className="m">{a.bypassed ? 'aggregation bypassed — you asked for the raw rows' : a.method}</span>
                </div>
                <div className="ctx-agg-flow">
                  {n(a.rows)} rows · {fmtBytes(a.rawBytes)} · {n(a.rawTokens)} tok
                  <span className="arrow">→</span>
                  <span className="out">{fmtBytes(a.outBytes)} · {n(a.outTokens)} tok</span>
                  <span className="saved">{a.bypassed ? 'no reduction' : `−${a.savedPct}%`}</span>
                </div>
                <div className="ctx-shrink">
                  <i style={{ width: `${Math.max(1, Math.round((a.outBytes / a.rawBytes) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 6 — what was left out, in three distinct kinds -------------------- */}
      <Section title="Left out" sub="three different reasons, kept apart on purpose">
        <div className="ctx-out">
          <p className="ctx-divider-note">
            Not relevant to this question — a retrieval judgement. Reversible by asking a different
            question, and it costs you nothing but breadth.
          </p>
          {relevanceDropped.map(g => (
            <div key={g.key} className="ctx-drop">
              <div className="dh">
                <b>{g.label}</b>
                <span className="c">{g.count} units · {n(g.rows)} rows · {n(g.tokensSaved)} tok not spent</span>
              </div>
              <div className="dd">{g.desc}</div>
              {!!g.items.length && (
                <div className="items">
                  {g.items.map(it => <span key={it.id}>{it.label}</span>)}
                  {g.count > g.items.length && <span>+{g.count - g.items.length} more</span>}
                </div>
              )}
            </div>
          ))}
          {!relevanceDropped.length && (
            <div className="ctx-drop"><div className="dd">Nothing was dropped for relevance — the concept net was narrow enough that every candidate earned a place.</div></div>
          )}

          {!!ctx.policy.length && (
            <>
              <p className="ctx-divider-note">
                Withheld by policy — not a retrieval judgement at all. This data <em>is</em> relevant; it
                is governed. One of these is reversible by you, the other is not reversible by anyone.
              </p>
              {ctx.policy.map(pol => (
                <div key={pol.kind} className="ctx-policy">
                  <div className="ph">
                    <b>⊘ {pol.short}</b>
                    <span className="rule">{pol.rule}</span>
                    <span className="c" style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--block)' }}>
                      {pol.count} candidate{pol.count === 1 ? '' : 's'}
                      {pol.relevantHere ? ` · ${pol.relevantHere} would have been selected` : ''}
                    </span>
                  </div>
                  <div className="pd">{pol.desc}</div>
                  {pol.noneRelevant && <div className="pd"><em>{pol.noneRelevant}</em></div>}
                  {pol.substitute && <div className="pd">{pol.substitute}</div>}
                  {!!pol.items?.length && (
                    <div className="items">{pol.items.map((it, i) => <span key={i}>{it}</span>)}</div>
                  )}
                </div>
              ))}
            </>
          )}

          {!!budgetEvicted.length && (
            <>
              <p className="ctx-divider-note">
                Evicted to fit the budget — relevant, permitted, and still not sent. The honest third
                category, and the one an answer should always admit to.
              </p>
              <div className="ctx-drop" style={{ borderLeftColor: 'var(--block)' }}>
                <div className="dh">
                  <b>Did not fit</b>
                  <span className="c">{budgetEvicted.length} unit{budgetEvicted.length === 1 ? '' : 's'} · {n(budgetEvicted.reduce((a, e) => a + e.tokens, 0))} tok requested</span>
                </div>
                <div className="items">
                  {budgetEvicted.map(e => <span key={e.id}>{e.label} · {n(e.tokens)} tok</span>)}
                </div>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* 7 — the gateway --------------------------------------------------- */}
      <Section title="The gateway" sub="every call passes through it, local or not">
        <div className={`ctx-gw ${ctx.where === 'cloud' ? 'cloud' : 'local'}`}>
          <span className="gk">{ctx.where === 'cloud' ? '◍ stripped' : '● no-op'}</span>
          <div>
            {ctx.gateway.note}
            {ctx.where === 'cloud' && (
              <div className="redactions">
                {Object.entries(ctx.gateway.redactions).filter(([, v]) => v > 0).map(([k, v]) => `${k} ×${v}`).join(' · ') || 'scanned — 0 identifiers found'}
                {' · dates shifted '}{ctx.gateway.dateShift}d
              </div>
            )}
          </div>
        </div>
      </Section>

      {!!ctx.guidelines.length && (
        <Section title="Guidelines retrieved" sub={`${ctx.guidelines.length} statements · counted in the prompt overhead`}>
          <div className="ctx-list">
            {ctx.guidelines.map((g, i) => (
              <div key={i} className="ctx-item"><div><div className="why" style={{ marginTop: 0 }}>{g}</div></div></div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
