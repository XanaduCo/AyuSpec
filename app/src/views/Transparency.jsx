import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ledger, presend } from '../mock/ledger.js'

function redactionSummary(g) {
  const r = Object.entries(g.redactions || {})
  if (!r.length && !g.exclusions?.length) return 'nothing to strip'
  const parts = r.map(([k, n]) => `${n} ${k}`)
  if (g.exclusions?.length) parts.push(`${g.exclusions.length} excluded`)
  return parts.join(' · ')
}

function LedgerRow({ row, open, onToggle }) {
  return (
    <div className={`ledrow ${open ? 'open' : ''}`}>
      <div className="t head" onClick={onToggle}>{row.time} <span className="faint">{row.day}</span></div>
      <div className="head" onClick={onToggle}>
        <span className="who">{row.role} <small>· {row.model}</small></span>
        <div className="meta">{row.trigger} · {redactionSummary(row.gateway)}</div>
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
          <span className="k mono" style={{ fontSize: 11, color: 'var(--faint)' }}>PAYLOAD (retained in full, locally)</span>
          <div className="payload" style={{ marginTop: 6 }}>{row.payloadPreview}</div>
        </div>
      )}
    </div>
  )
}

export default function Transparency() {
  const [params, setParams] = useSearchParams()
  const roleFilter = params.get('role')
  const [openId, setOpenId] = useState(ledger[0].id)

  const rows = roleFilter ? ledger.filter(r => r.role === roleFilter) : ledger
  const egressCount = ledger.filter(r => r.left).length

  return (
    <div className="page">
      <div className="grid g2" style={{ marginBottom: 22 }}>
        <div className="card">
          <span className="eyebrow">Pre-send review · before the cloud call left</span>
          <div className="presend" style={{ marginTop: 12 }}>
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
                <button className="btn warn">Send · ~{presend.tokens} tok · ${presend.cost.toFixed(3)}</button>
                <button className="btn ghost">Cancel</button>
                <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>review: {presend.review}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <span className="eyebrow">What the ledger answers</span>
          <div style={{ marginTop: 10 }}>
            <div className="stat"><span className="lab">Calls recorded (30d)</span><span className="val num">{ledger.length}</span></div>
            <div className="stat"><span className="lab">Left the device</span><span className="val num">{egressCount}</span></div>
            <div className="stat"><span className="lab">Ever sent to OpenAI</span><span className="val num">0</span></div>
            <div className="stat"><span className="lab">Genomic data sent to cloud</span><span className="val num">0 <span className="u">hard exclusion</span></span></div>
          </div>
          <p className="note" style={{ marginTop: 12 }}>The ledger is a Postgres table in the <span className="mono">ayuos</span> schema, append-only and never transmitted. The agent can query it as a tool. No mode can suppress it.</p>
        </div>
      </div>

      <div className="filters">
        <button className={`tagf ${!roleFilter ? 'on' : ''}`} onClick={() => setParams({})}>all roles</button>
        {['reasoner', 'tools', 'medical'].map(r => (
          <button key={r} className={`tagf ${roleFilter === r ? 'on' : ''}`} onClick={() => setParams({ role: r })}>{r}</button>
        ))}
        <span className="tagf" style={{ cursor: 'default' }}>where provider = 'openai' → 0 rows</span>
      </div>

      {rows.map(row => (
        <LedgerRow key={row.id} row={row} open={openId === row.id} onToggle={() => setOpenId(openId === row.id ? null : row.id)} />
      ))}
    </div>
  )
}
