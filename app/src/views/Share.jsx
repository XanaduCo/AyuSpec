import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Modal from '../components/Modal.jsx'
import Switch from '../components/Switch.jsx'
import { useDrawer } from '../components/Drawer.jsx'
import {
  DOMAINS, SOURCES, RTYPES, WINDOWS, FORMATS, seedConsentLog,
} from '../mock/shares.js'
import { conditions, familyHistory, persona, anchor, addDays, daysBetween } from '../mock/persona.js'
import { useSession, useInventory, useLabs, useMedications, useImaging } from '../state/store.js'

// Share — compose a "sliver": a scoped, purpose-built view of the record.
//
// Two laws carry the screen. (1) Minimal disclosure by default: you pick exactly
// what's in, and — the part that was missing — you see exactly what is being
// LEFT OUT, by name, before anything is produced. (2) The default sliver is a
// FILE, not a network call; only the hosted link transits the cloud, so it alone
// is amber and it alone is revocable.
//
// The preview reads the live record, so anything imported, captured or corrected
// this session is in the packet — a share that ignored what you just did would
// be worse than no share at all.

const useSet = init => {
  const [set, setSet] = useState(new Set(init))
  const toggle = k => setSet(s => {
    const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n
  })
  return [set, toggle, setSet]
}

const ONGOING = new Set(['Condition', 'MedicationStatement', 'FamilyMemberHistory'])

export default function Share() {
  const { state, actions } = useSession()
  const inventory = useInventory()
  const labs = useLabs()
  const medications = useMedications()
  const imaging = useImaging()
  const drawer = useDrawer()

  // Arriving from an Ask answer's "add to a doctor packet" carries the scope the
  // answer was actually about, so the composer opens on the right slice instead
  // of a default the user has to undo. Unknown domains are ignored.
  const [params, setParams] = useSearchParams()
  const proposed = (params.get('propose') || '').split(',')
    .filter(d => DOMAINS.some(x => (x.key || x) === d))
  useEffect(() => {
    if (params.get('propose')) { params.delete('propose'); setParams(params, { replace: true }) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [domains, toggleDomain, setDomains] = useSet(proposed.length ? proposed : ['cardiac'])
  const [sources, toggleSource, setSources] = useSet([])
  const [types, toggleType] = useSet([])
  const [timeWindow, setTimeWindow] = useState('12m')
  const [format, setFormat] = useState('packet')
  const [purpose, setPurpose] = useState('')
  const [recipient, setRecipient] = useState('')
  const [revoked, setRevoked] = useState(new Set())
  const [packet, setPacket] = useState(null)
  const [includeGenome, setIncludeGenome] = useState(false)

  const win = WINDOWS.find(w => w.key === timeWindow)
  const included = useMemo(() => {
    const start = win.days == null ? null : addDays(anchor, -win.days)
    return inventory.filter(i =>
      (!domains.size || domains.has(i.domain)) &&
      (!sources.size || sources.has(i.source)) &&
      (!types.size || types.has(i.type)) &&
      (start == null || ONGOING.has(i.type) || daysBetween(start, i.date) >= 0))
  }, [inventory, domains, sources, types, timeWindow])

  const isGenomic = i => i.source === 'genomics' || i.type === 'MolecularSequence'
  const matchedGenomic = useMemo(() => included.filter(isGenomic), [included])
  const withGenome = includeGenome && matchedGenomic.length > 0
  const visible = withGenome ? included : included.filter(i => !isGenomic(i))

  // The half that was missing: everything the record holds that this scope
  // leaves out, named, with the reason it fell outside.
  const excluded = useMemo(() => {
    const inIds = new Set(visible.map(i => i.id))
    return inventory.filter(i => !inIds.has(i.id)).map(i => ({
      ...i,
      reason: isGenomic(i) && !withGenome ? 'genomic — held back by default'
        : domains.size && !domains.has(i.domain) ? `outside the ${[...domains].join('/')} domain`
          : sources.size && !sources.has(i.source) ? `not a ${[...sources].join('/')} source`
            : types.size && !types.has(i.type) ? 'resource type not selected'
              : 'older than the time window',
    }))
  }, [inventory, visible, domains, sources, types, withGenome])

  const excludedByCorrection = useMemo(
    () => Object.entries(state.corrections).filter(([, c]) => c.excluded),
    [state.corrections])

  const fmt = FORMATS.find(f => f.key === format)
  const canGenerate = visible.length > 0 && purpose.trim() && recipient.trim()

  const proposePCP = () => {
    setDomains(new Set(['cardiac', 'metabolic']))
    setSources(new Set(['labs', 'wearables', 'notes']))
    setTimeWindow('12m')
    setPurpose('New PCP — establishing care')
    setRecipient('')
  }

  const scopeText = () => {
    const d = domains.size ? [...domains].join(', ') : 'all domains'
    const s = sources.size ? [...sources].join(', ') : 'all sources'
    return `${d} · ${s} · ${win.label.toLowerCase()}`
  }

  const buildPacket = items => {
    const ids = new Set(items.map(i => i.id))
    const inLabs = labs.filter(l => ids.has(l.id) && !l.excluded)
    const inMeds = medications.filter(m => ids.has(m.id))
    const inConds = (conditions || []).filter(c => ids.has(c.id))
    const inImaging = (imaging || []).filter(s => ids.has(s.id))

    const notable = []
    for (const l of inLabs) {
      if (l.flag === 'high' || l.flag === 'out') notable.push(`${l.name} ${l.value} ${l.unit} — above the reference bound${l.prior != null ? ` (was ${l.prior})` : l.isNew ? ' · first measurement on record' : ''}.`)
      if (l.flag === 'low') notable.push(`${l.name} ${l.value} ${l.unit} — below the reference bound.`)
    }
    if (ids.has('obs-hrv')) notable.push('HRV down ~4 ms over 90 days (46 → 42) — worth watching alongside the lipid picture.')
    if (ids.has('img-cac')) notable.push('Coronary calcium score 0 (2024) — no detectable calcification despite the ApoB and polygenic risk.')
    if (ids.has('gen-lpa') && ids.has('obs-lpa')) notable.push('Elevated Lp(a) corroborated by an LPA risk allele — a fixed, lifelong risk factor separate from ApoB.')

    const questions = []
    if (ids.has('obs-lpa')) questions.push('Lp(a) came back elevated for the first time — does that change the ApoB target, or the case for treating earlier?')
    if (ids.has('obs-apob')) questions.push('ApoB is above target with a strong family history (father, CAD at 62) and a 70th-pct CVD PRS — does the CAC of 0 change how aggressively we treat?')
    if (ids.has('obs-bp-today')) questions.push('This is my first blood-pressure reading in twenty months on lisinopril — is the dose still right?')
    if (inMeds.length && !questions.length) questions.push('Is my current medication list still appropriate?')
    if (!questions.length) questions.push('Is anything in this scope worth a follow-up test or referral?')

    const corrected = inLabs.filter(l => l.corrected || l.correctionNote)

    return {
      patient: `${persona.name}, ${persona.age}`,
      generated: anchor,
      counts: { labs: inLabs.length, meds: inMeds.length, conds: inConds.length, imaging: inImaging.length },
      summary: `${persona.name}, ${persona.age}, self-tracked record. In-scope: ${notable.length ? `${notable.length} notable finding(s)` : 'no flagged abnormals'}, ${inLabs.length} lab value(s), ${inConds.length} condition(s), ${inMeds.length} medication(s).`,
      notable,
      labs: inLabs.map(l => ({ name: l.name, value: l.value, unit: l.unit, range: rangeText(l), flag: l.flag, corrected: l.corrected, note: l.correctionNote })),
      meds: inMeds.map(m => `${m.name} ${m.dose} ${m.freq}${m.for ? ` — for ${m.for}` : ''}`),
      conds: inConds.map(c => `${c.name} (${c.status}, since ${c.onset})`),
      family: (familyHistory || []).map(f => `${f.relation}: ${f.condition} at ${f.age}`),
      imaging: inImaging.map(s => `${s.study} (${s.date})${s.aiSummary ? ` — ${s.aiSummary.split('.')[0]}.` : ''}`),
      questions,
      corrected,
      excludedCount: excluded.length,
    }
  }

  const generate = () => {
    if (!canGenerate) return
    const built = buildPacket(visible)
    const entry = {
      id: `shr-${state.artifacts.length + 2}`,
      created: 'just now',
      purpose: purpose.trim(),
      recipient: recipient.trim(),
      scope: scopeText(),
      count: visible.length,
      excluded: excluded.length,
      format,
      egress: fmt.egress,
      genomic: withGenome,
      expiry: fmt.egress ? '30 days' : null,
      packet: format === 'packet' ? built : null,
    }
    actions.addArtifact(entry)
    if (format === 'packet') setPacket(built)
  }

  // Newest first, and the seed share stays at the bottom — append-only means the
  // list only ever grows.
  const log = [...state.artifacts].reverse().concat(seedConsentLog)

  return (
    <div className="page share-page">
      <p className="eyebrow">Share · Ravi Mehta</p>
      <div className="lede">Send a slice, not the whole record.</div>
      <p className="muted" style={{ marginTop: 8, maxWidth: '70ch' }}>
        A sliver is scoped, purpose-built, and — by default — a <b>file you transmit yourself</b>, with
        no outbound call from ayuOS. You see both halves of the boundary before it is produced: what
        goes, and what stays.
      </p>

      <div className="share-layout">
        <div className="composer">
          <div className="card comp-card">
            <div className="comp-head">
              <span className="eyebrow">Scope</span>
              <button className="btn ghost sm" onClick={proposePCP} title="Let the agent propose a scope">
                ✧ What my new PCP needs
              </button>
            </div>

            <Picker label="Domain" opts={DOMAINS} sel={domains} onToggle={toggleDomain} />
            <Picker label="Source" opts={SOURCES} sel={sources} onToggle={toggleSource} />
            <Picker label="Resource type" opts={RTYPES} sel={types} onToggle={toggleType} />

            <div className="comp-field">
              <span className="fl">Time window</span>
              <div className="pick-row">
                {WINDOWS.map(w => (
                  <button key={w.key} className={`pick ${timeWindow === w.key ? 'on' : ''}`}
                    onClick={() => setTimeWindow(w.key)}>{w.label}</button>
                ))}
              </div>
            </div>
            <p className="note" style={{ margin: '4px 0 0' }}>
              Empty = everything in that dimension. Narrow to share less. Active conditions and
              medications stay in scope regardless of the window — they describe your current state.
            </p>
          </div>

          <div className="card comp-card">
            <span className="eyebrow">Purpose &amp; recipient</span>
            <label className="field" style={{ marginTop: 10 }}>
              <span className="fl">purpose <span className="faint">· recorded, required</span></span>
              <input className="txt" value={purpose} placeholder="e.g. cardiology consult 2025-08"
                onChange={e => setPurpose(e.target.value)} />
            </label>
            <label className="field">
              <span className="fl">recipient</span>
              <input className="txt" value={recipient} placeholder="a named provider, or “user-held”"
                onChange={e => setRecipient(e.target.value)} />
            </label>
          </div>

          <div className="card comp-card">
            <span className="eyebrow">Format</span>
            <div className="fmt-list">
              {FORMATS.map(f => (
                <label key={f.key} className={`fmt-opt ${format === f.key ? 'on' : ''} ${f.egress ? 'egress' : ''}`}>
                  <input type="radio" name="fmt" value={f.key} checked={format === f.key}
                    onChange={() => setFormat(f.key)} />
                  <span className="fmt-main">
                    <b>{f.label}</b>
                    <span className="fmt-sub mono">{f.sub}</span>
                  </span>
                  {f.egress
                    ? <span className="tier-badge egress"><span className="led" />leaves device</span>
                    : <span className="tier-badge local"><span className="led" />no egress</span>}
                </label>
              ))}
            </div>
            <div className={`callout ${fmt.egress ? 'egress' : 'local'}`} style={{ marginTop: 10 }}>
              <span className="k">{fmt.egress ? 'transits ayuOS Cloud · disclosed' : 'stays on device'}</span>
              <div>{fmt.note}</div>
            </div>
          </div>
        </div>

        {/* live preview — both sides of the boundary */}
        <aside className="preview">
          <div className="card preview-card">
            <div className="pv-tabs">
              <span className="pv-tab in">
                <b className="num">{visible.length}</b> included
              </span>
              <span className="pv-tab out">
                <b className="num">{excluded.length}</b> withheld
              </span>
            </div>

            {visible.length === 0
              ? <p className="note">Nothing matches this scope — widen it to include something.</p>
              : <PreviewList items={visible} />}

            {excluded.length > 0 && (
              <details className="excluded-block">
                <summary>What this sliver leaves out, by name</summary>
                <ul className="pv-list out">
                  {excluded.map(i => (
                    <li key={i.id} className="pv-item">
                      <span className="pv-label out">{i.label}</span>
                      <span className="pv-detail faint">{i.reason}</span>
                    </li>
                  ))}
                </ul>
                <p className="note" style={{ margin: '8px 0 0' }}>
                  Over-sharing is prevented by making the boundary visible, not by a warning after the
                  fact. Both columns render before anything is produced.
                </p>
              </details>
            )}

            {excludedByCorrection.length > 0 && (
              <p className="note" style={{ marginTop: 8 }}>
                {excludedByCorrection.length} record{excludedByCorrection.length > 1 ? 's are' : ' is'} withheld
                because you marked {excludedByCorrection.length > 1 ? 'them' : 'it'} wrong — those never
                enter a sliver.
              </p>
            )}

            {matchedGenomic.length > 0 && (
              <div className={`callout ${withGenome ? 'egress' : ''} genome-optin`} style={{ marginTop: 12 }}>
                <label className="optin-row" style={{ marginTop: 0 }}>
                  <Switch on={includeGenome} onChange={setIncludeGenome}
                    label="Include genomic data in this sliver" />
                  <span>
                    Include <b>{matchedGenomic.length}</b> genomic item{matchedGenomic.length > 1 ? 's' : ''}
                    {' '}({matchedGenomic.map(g => g.label).join(', ')})
                    <span className="faint"> · held back by default</span>
                  </span>
                </label>
                <div className="note" style={{ margin: '6px 0 0' }}>
                  {withGenome
                    ? '⚠ This sliver will carry genomic data. A genome can’t be de-identified — the recipient can identify you and your blood relatives from it.'
                    : 'A genome can’t be de-identified. Turn this on only if the recipient needs it — the sliver becomes permanently identifiable.'}
                </div>
              </div>
            )}

            <button className="btn pri" style={{ width: '100%', marginTop: 14 }}
              disabled={!canGenerate} onClick={generate}>
              {fmt.egress ? 'Review & generate link →' : `Generate ${fmt.label.toLowerCase()}`}
            </button>
            {!canGenerate && included.length > 0 &&
              <p className="note" style={{ textAlign: 'center', marginTop: 8 }}>
                Add a purpose and recipient to generate.
              </p>}
          </div>
        </aside>
      </div>

      <h3 style={{ margin: '34px 0 6px' }}>Consent log <span className="faint" style={{ fontWeight: 400, fontSize: 14 }}>· append-only</span></h3>
      <p className="note" style={{ marginTop: 0, marginBottom: 14, maxWidth: '70ch' }}>
        Every sliver you generate lands here permanently, with the exact scope serialised. A
        file-based share can’t be un-shared — revocation is only meaningful for a hosted link, and the
        log is honest about the difference.
      </p>
      <div className="consent-log">
        {log.map(e => (
          <ConsentRow key={e.id} e={{ ...e, revoked: revoked.has(e.id) || e.revoked }}
            onRevoke={id => setRevoked(s => new Set(s).add(id))}
            onOpen={e.packet ? () => setPacket(e.packet) : null} />
        ))}
      </div>

      {packet && (
        <Modal title="Doctor packet · preview" wide onClose={() => setPacket(null)}
          footer={<>
            <span className="note" style={{ marginRight: 'auto' }}>Rendered locally — no network call. Save as PDF and send it yourself.</span>
            <button className="btn ghost" onClick={() => setPacket(null)}>Close</button>
            <button className="btn pri" onClick={() => setPacket(null)}>⇩ Save PDF</button>
          </>}>
          <DoctorPacket p={packet} />
        </Modal>
      )}
    </div>
  )
}

function rangeText(l) {
  if (l.low != null && l.high != null) return `${l.low}–${l.high}`
  if (l.high != null) return `< ${l.high}`
  if (l.low != null) return `> ${l.low}`
  return '—'
}

function Picker({ label, opts, sel, onToggle }) {
  return (
    <div className="comp-field">
      <span className="fl">{label}</span>
      <div className="pick-row">
        {opts.map(o => (
          <button key={o.key} className={`pick ${sel.has(o.key) ? 'on' : ''}`}
            onClick={() => onToggle(o.key)}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

function PreviewList({ items }) {
  const drawer = useDrawer()
  return (
    <ul className="pv-list">
      {items.map(i => (
        <li key={i.id} className="pv-item">
          <button className="pv-open" onClick={() => drawer?.openRecord(i.id)} title="Open the record">
            <span className="pv-label">{i.label}</span>
            <span className="pv-meta mono">{i.type} · {i.date}</span>
          </button>
          <span className="pv-detail faint">{i.detail}</span>
        </li>
      ))}
    </ul>
  )
}

function DoctorPacket({ p }) {
  return (
    <div className="packet">
      <div className="packet-top">
        <div>
          <div className="packet-name serif">{p.patient}</div>
          <div className="mono faint" style={{ fontSize: 12 }}>Generated {p.generated} · self-tracked record via ayuOS</div>
        </div>
        <div className="packet-counts mono">
          {p.counts.labs} labs · {p.counts.conds} cond · {p.counts.meds} meds · {p.counts.imaging} imaging
        </div>
      </div>

      <PacketSection title="Summary & notable changes">
        <p className="packet-summary">{p.summary}</p>
        {p.notable.length > 0 && (
          <ul className="packet-notable">
            {p.notable.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        )}
      </PacketSection>

      {p.labs.length > 0 && (
        <PacketSection title="Labs">
          <table className="packet-labs num">
            <thead><tr><th>Analyte</th><th>Value</th><th>Range</th><th>Flag</th></tr></thead>
            <tbody>
              {p.labs.map(l => (
                <tr key={l.name} className={l.flag !== 'ok' ? 'abn' : ''}>
                  <td className="lab-name">{l.name}{l.corrected && <span className="corrected-tag mono">corrected</span>}</td>
                  <td className="mono">{l.value} {l.unit}</td>
                  <td className="mono faint">{l.range}</td>
                  <td>{l.flag === 'ok'
                    ? <span className="range-flag mono ok">in range</span>
                    : <span className="range-flag mono">{l.flag === 'low' ? '↓ below' : '↑ above'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.labs.some(l => l.note) && (
            <p className="note" style={{ marginTop: 8 }}>
              Patient notes on individual values: {p.labs.filter(l => l.note).map(l => `${l.name} — “${l.note}”`).join('; ')}.
            </p>
          )}
        </PacketSection>
      )}

      {(p.conds.length > 0 || p.meds.length > 0) && (
        <PacketSection title="Conditions & medications">
          {p.conds.length > 0 && <ul className="packet-plain">{p.conds.map((c, i) => <li key={i}>{c}</li>)}</ul>}
          {p.meds.length > 0 && <ul className="packet-plain">{p.meds.map((m, i) => <li key={i}>{m}</li>)}</ul>}
          {p.family.length > 0 && <p className="note" style={{ marginTop: 6 }}>Family history — {p.family.join('; ')}.</p>}
        </PacketSection>
      )}

      {p.imaging.length > 0 && (
        <PacketSection title="Imaging">
          <ul className="packet-plain">{p.imaging.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </PacketSection>
      )}

      <PacketSection title="Questions to raise">
        <ol className="packet-q">{p.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
      </PacketSection>

      <p className="note" style={{ marginTop: 10 }}>
        {p.excludedCount} further resource{p.excludedCount === 1 ? '' : 's'} in the record {p.excludedCount === 1 ? 'was' : 'were'} deliberately
        left out of this scope. Values are self-tracked unless a performing lab is named.
      </p>
    </div>
  )
}

function PacketSection({ title, children }) {
  return (
    <div className="packet-sec">
      <div className="packet-sec-h">{title}</div>
      {children}
    </div>
  )
}

function ConsentRow({ e, onRevoke, onOpen }) {
  const fmt = FORMATS.find(f => f.key === e.format)
  return (
    <div className={`consent-row ${e.revoked ? 'revoked' : ''}`}>
      <div className="cr-main">
        <div className="cr-purpose">
          <b>{e.purpose}</b>
          {e.egress
            ? <span className="tier-badge egress" style={{ marginLeft: 8 }}><span className="led" />hosted link</span>
            : <span className="tier-badge local" style={{ marginLeft: 8 }}><span className="led" />file</span>}
          {e.genomic && <span className="tier-badge egress" style={{ marginLeft: 8 }} title="Carries genomic data — identifiable"><span className="led" />genomic · identifiable</span>}
          {e.revoked && <span className="revoked-tag">revoked</span>}
        </div>
        <div className="cr-meta">
          <span>→ {e.recipient}</span>
          <span className="faint mono">
            {e.scope} · {e.count} resources{e.excluded != null ? ` · ${e.excluded} withheld` : ''} · {fmt?.label}
          </span>
          {onOpen && <button className="chip-link" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={onOpen}>re-open the artifact →</button>}
        </div>
      </div>
      <div className="cr-side">
        <span className="cr-time mono">{e.created}</span>
        {e.egress
          ? (e.revoked
              ? <span className="note" style={{ margin: 0 }}>expired</span>
              : <button className="btn ghost sm" onClick={() => onRevoke(e.id)}>Revoke link</button>)
          : <span className="cant-revoke" title="A file you've already handed over cannot be un-shared.">
              can't un-share a file
            </span>}
      </div>
    </div>
  )
}
