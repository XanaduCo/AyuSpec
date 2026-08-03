import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ledger, presend } from '../mock/ledger.js'
import { usePosture } from '../mock/posture.jsx'
import PreSendPanel from '../components/PreSendPanel.jsx'
import PosturePill from '../components/PosturePill.jsx'

const isZeroPII = g =>
  Object.keys(g.redactions || {}).length === 0 && !(g.exclusions || []).length

function redactionSummary(g) {
  const r = Object.entries(g.redactions || {})
  if (!r.length && !g.exclusions?.length) return 'gateway found 0 PII'
  const parts = r.map(([k, n]) => `${n} ${k}`)
  if (g.exclusions?.length) parts.push(`${g.exclusions.length} excluded`)
  return parts.join(' · ')
}

function LedgerRow({ row, open, onToggle }) {
  const zero = isZeroPII(row.gateway)
  return (
    <div className={`ledrow ${open ? 'open' : ''}`}>
      <div className="t head" onClick={onToggle}>{row.time} <span className="faint">{row.day}</span></div>
      <div className="head" onClick={onToggle}>
        <span className="who">{row.role} <small>· {row.model}</small></span>
        <div className="meta">{row.trigger} · {redactionSummary(row.gateway)}
          {zero && row.left && <span className="zero-tag">zero PII · still logged</span>}</div>
      </div>
      <div className="head" onClick={onToggle}>
        {row.left
          ? <span className="pill egress"><span className="led" />left · ${row.cost.toFixed(3)}</span>
          : <span className="pill local"><span className="led" />local</span>}
      </div>
      {open && (
        <div className="leddetail">
          <div className="grid g2" style={{ marginBottom: 12 }}>
            <div className="callout"><span className="k">destination</span><div className="mono">{row.destination}</div></div>
            <div className="callout"><span className="k">tokens · review</span><div className="mono">{row.tokens} in / {row.respTokens} out · {row.review}</div></div>
          </div>
          <span className="k mono" style={{ fontSize: 11, color: 'var(--faint)' }}>PAYLOAD (retained in full, locally · append-only · never transmitted)</span>
          <div className="payload" style={{ marginTop: 6 }}>{row.payloadPreview}</div>
        </div>
      )}
    </div>
  )
}

// A tiny toggle-chip group. `value` is the active key.
function ChipGroup({ options, value, onChange }) {
  return (
    <div className="filters" style={{ marginBottom: 0 }}>
      {options.map(o => (
        <button key={o.key} className={`tagf ${value === o.key ? 'on' : ''}`}
          onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  )
}

const RANGES = [
  { key: '30d', label: '30 days', days: 30 },
  { key: '7d', label: '7 days', days: 7 },
  { key: 'today', label: 'today', days: 0 },
]
const TRANSITS = [
  { key: 'all', label: 'all calls' },
  { key: 'left', label: 'left the device' },
  { key: 'local', label: 'stayed local' },
]

export default function Transparency() {
  const [params, setParams] = useSearchParams()
  const { posture } = usePosture()
  const roleFilter = params.get('role')
  const [range, setRange] = useState('30d')
  const [transit, setTransit] = useState('all')
  const [zeroOnly, setZeroOnly] = useState(false)
  const [openId, setOpenId] = useState(ledger[0].id)

  const days = RANGES.find(r => r.key === range).days
  const inWindow = ledger.filter(r => r.daysAgo <= days)
  const rows = inWindow.filter(r =>
    (!roleFilter || r.role === roleFilter) &&
    (transit === 'all' || (transit === 'left' ? r.left : !r.left)) &&
    (!zeroOnly || isZeroPII(r.gateway))
  )
  const egressCount = inWindow.filter(r => r.left).length
  const roleRows = roleFilter ? ledger.filter(r => r.role === roleFilter) : []

  return (
    <div className="page">
      {roleFilter && posture[roleFilter] && (
        <div className="card role-landing" style={{ marginBottom: 18 }}>
          <div className="rl-head">
            <div>
              <span className="eyebrow">role · {roleFilter}</span>
              <div className="rl-model mono">{posture[roleFilter].model} · {posture[roleFilter].provider}</div>
            </div>
            <PosturePill role={posture[roleFilter]} detail
              onClick={undefined} />
          </div>
          <div className="rl-stats">
            <span><b className="num">{roleRows.length}</b> calls recorded</span>
            <span><b className="num">{roleRows.filter(r => r.left).length}</b> left the device</span>
            <span><b className="num">{roleRows.filter(r => isZeroPII(r.gateway)).length}</b> with zero PII to strip</span>
          </div>
          <button className="btn ghost sm" onClick={() => setParams({})} style={{ marginTop: 12 }}>← all roles</button>
        </div>
      )}

      <div className="grid g2" style={{ marginBottom: 22 }}>
        <div className="card">
          <span className="eyebrow">Pre-send review · before the cloud call left</span>
          <div style={{ marginTop: 12 }}>
            <PreSendPanel presend={presend} />
          </div>
        </div>
        <div className="card">
          <span className="eyebrow">What the ledger answers</span>
          <div style={{ marginTop: 10 }}>
            <div className="stat"><span className="lab">Calls recorded (30d)</span><span className="val num">{ledger.filter(r => r.daysAgo <= 30).length}</span></div>
            <div className="stat"><span className="lab">Left the device (30d)</span><span className="val num">{ledger.filter(r => r.daysAgo <= 30 && r.left).length} <span className="u">${ledger.filter(r => r.daysAgo <= 30 && r.left).reduce((s, r) => s + r.cost, 0).toFixed(2)}</span></span></div>
            <div className="stat"><span className="lab">Ever sent to OpenAI</span><span className="val num">0</span></div>
            <div className="stat"><span className="lab">Genomic data sent to cloud</span><span className="val num">0 <span className="u">excluded by default · opt-in</span></span></div>
          </div>
          <p className="note" style={{ marginTop: 12 }}>The ledger is a Postgres table in the <span className="mono">ayuos</span> schema — <b>append-only</b>, queryable by the agent as a tool, and never transmitted. No mode can suppress it; <span className="mono">review: off</span> removes the prompt, never the record.</p>
        </div>
      </div>

      {/* Filter chips: role (URL-backed) · transit · window · the zero-PII case. */}
      <div className="filter-stack">
        <div className="filters" style={{ marginBottom: 0 }}>
          <button className={`tagf ${!roleFilter ? 'on' : ''}`} onClick={() => setParams({})}>all roles</button>
          {['reasoner', 'tools', 'medical'].map(r => (
            <button key={r} className={`tagf ${roleFilter === r ? 'on' : ''}`} onClick={() => setParams({ role: r })}>{r}</button>
          ))}
        </div>
        <ChipGroup options={TRANSITS} value={transit} onChange={setTransit} />
        <ChipGroup options={RANGES} value={range} onChange={setRange} />
        <div className="filters" style={{ marginBottom: 0 }}>
          <button className={`tagf ${zeroOnly ? 'on' : ''}`} onClick={() => setZeroOnly(z => !z)}>
            gateway found 0 PII
          </button>
          <span className="tagf" style={{ cursor: 'default' }}>where provider = 'openai' → 0 rows</span>
        </div>
      </div>

      {rows.length === 0
        ? <p className="note" style={{ padding: '24px 4px' }}>No calls match these filters in this window.</p>
        : rows.map(row => (
          <LedgerRow key={row.id} row={row} open={openId === row.id} onToggle={() => setOpenId(openId === row.id ? null : row.id)} />
        ))}
    </div>
  )
}
