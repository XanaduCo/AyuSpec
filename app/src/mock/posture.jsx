import { createContext, useContext, useState } from 'react'

// The resolved runtime posture for the three model roles. This is the demo's
// default "hybrid reasoning" config: the reasoner runs on a cloud API (amber),
// while the tool-caller and medical extractor stay local (green). Settings lets
// the user change this; it is shared state so the header and any view can
// read/reflect it. Reflects what ACTUALLY ran, not just config.
const DEFAULT = {
  reasoner: { model: 'claude-opus-4-8', provider: 'anthropic', where: 'cloud', review: 'new_shape', endpoint: '', fallback: 'ollama · deepseek-r1:8b' },
  tools: { model: 'qwen2.5:7b', provider: 'ollama', where: 'local', review: 'off', endpoint: '', fallback: 'ollama · qwen2.5:7b' },
  medical: { model: 'medgemma:4b', provider: 'ollama', where: 'local', review: 'off', endpoint: '', fallback: 'ollama · medgemma:4b' },
}

// The provider option lists Settings renders. `where` is the privacy fact the
// colour language keys off: 'cloud' = leaves the device (amber), 'local' = stays
// (green). openai-compatible endpoints (LM Studio, vLLM, a LAN box) are local
// inference — the data does not reach a third-party cloud — so they read green.
export const PROVIDERS = [
  { key: 'ollama', label: 'Ollama', where: 'local', needsEndpoint: false,
    models: ['deepseek-r1:8b', 'qwen2.5:7b', 'medgemma:4b', 'llama3.1:8b'] },
  { key: 'anthropic', label: 'Anthropic', where: 'cloud', needsEndpoint: false,
    models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
  { key: 'openai', label: 'OpenAI', where: 'cloud', needsEndpoint: false,
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'] },
  { key: 'google', label: 'Google', where: 'cloud', needsEndpoint: false,
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
  { key: 'openai-compatible', label: 'OpenAI-compatible', where: 'local', needsEndpoint: true,
    models: ['(local endpoint)'] },
]

export const providerMeta = key => PROVIDERS.find(p => p.key === key)

// The global egress-approval control — modelled on Claude Code's permission
// modes. It governs *how often the user is asked* before a cloud call, and, in
// the case of `block`, whether a cloud call is allowed at all. It is global (one
// session-wide setting) rather than per-role, because that is the decision the
// user actually holds in their head — "am I letting things leave right now?" —
// and it matches the mental model of a permission mode.
//
// It does NOT change what the gateway does. Stripping before a cloud call is
// unconditional; every mode below still passes through the single egress
// chokepoint and is still recorded in the ledger. The mode only moves the prompt.
export const EGRESS_MODES = [
  { key: 'ask', t: 'Ask every time', tone: 'egress',
    d: 'Confirm before every cloud call, with the full pre-send preview each time.' },
  { key: 'auto', t: 'Let it decide', tone: 'egress',
    d: 'Proceed automatically, but ask again whenever the payload shape is new. The balanced default.' },
  { key: 'allow', t: 'Allow all egress', tone: 'egress', needsPreview: true,
    d: 'Never prompt before a cloud call. Every call is still PII-stripped at the gateway and recorded in the ledger — the prompt goes away, the chokepoint does not.' },
  { key: 'block', t: 'Block all egress', tone: 'block',
    d: 'Force every call to a local model. Any role set to a cloud provider short-circuits to its local fallback, so nothing leaves the device in this configuration.' },
]

// The per-role review cadence each non-block mode writes through to. Keeping the
// role-level `review` field in sync means the ledger labels and role cards keep
// telling the truth, while the gate reads a single global source (egressMode).
const MODE_TO_REVIEW = { ask: 'every_call', auto: 'new_shape', allow: 'off' }

// You cannot allow-all a payload shape you have never looked at. `allow` is
// selectable only once every cloud role has had one full pre-send preview.
export function canAllowEgress(posture, previewSeen) {
  const cloud = ROLES.filter(r => posture[r.key].where === 'cloud')
  return cloud.length > 0 && cloud.every(r => previewSeen[r.key])
}

const PostureCtx = createContext(null)

export function PostureProvider({ children }) {
  const [posture, setPosture] = useState(DEFAULT)
  // The global egress-approval mode. Default 'auto' == the balanced "let it
  // decide" mode, which lines up with the default reasoner review of new_shape.
  const [egressMode, setEgressModeState] = useState('auto')
  // Which roles the user has seen a full pre-send preview for. `allow` (and the
  // per-role `review: off` it writes through) is locked until this is true — you
  // cannot consent to a payload shape you have never looked at (ai-transparency.md).
  const [previewSeen, setPreviewSeen] = useState({ reasoner: false, tools: false, medical: false })

  const setRole = (role, patch) =>
    setPosture(p => ({ ...p, [role]: { ...p[role], ...patch } }))
  const markPreviewSeen = role =>
    setPreviewSeen(s => (s[role] ? s : { ...s, [role]: true }))

  const canAllow = canAllowEgress(posture, previewSeen)

  // Setting the mode is the one authoritative write. For non-block modes it also
  // writes the matching cadence onto every cloud role, so nothing downstream that
  // reads `review` (the ledger, the role cards) goes stale.
  const setEgressMode = mode => {
    if (mode === 'allow' && !canAllow) return // locked — honour the previewSeen gate
    setEgressModeState(mode)
    if (mode !== 'block') {
      const review = MODE_TO_REVIEW[mode]
      setPosture(p => {
        const next = { ...p }
        for (const r of ROLES) if (next[r.key].where === 'cloud') next[r.key] = { ...next[r.key], review }
        return next
      })
    }
  }

  const blocked = egressMode === 'block'
  // What actually runs. When egress is blocked, every role resolves to local —
  // the header, the summary and the agent loop all read this, so the block is a
  // fact about the system, not a label.
  const effectivePosture = blocked
    ? Object.fromEntries(ROLES.map(r => [r.key, { ...posture[r.key], where: 'local' }]))
    : posture
  const anyEgress = !blocked && ROLES.some(r => posture[r.key].where === 'cloud')

  return (
    <PostureCtx.Provider value={{
      posture, setRole, anyEgress, previewSeen, markPreviewSeen,
      egressMode, setEgressMode, blocked, effectivePosture, canAllow,
    }}>
      {children}
    </PostureCtx.Provider>
  )
}

export const usePosture = () => useContext(PostureCtx)

export const ROLES = [
  { key: 'reasoner', label: 'reasoner', sees: 'retrieved context, already through the gateway' },
  { key: 'tools', label: 'tools', sees: 'structure, not content — which query to run' },
  { key: 'medical', label: 'medical', sees: 'raw clinical text, before anything is stripped' },
]

// Plain-language egress posture, computed from the three roles (tiers.md open
// question 218). Returns a headline + one line per role + the fallback promise.
// Connections are all-direct for this persona (Oura/Whoop/Epic), so no bridged
// transit is folded in — stated explicitly rather than assumed.
export function egressSummary(posture, egressMode = 'auto') {
  const blocked = egressMode === 'block'
  // When blocked, no role egresses regardless of how it is configured.
  const cloud = blocked ? [] : ROLES.filter(r => posture[r.key].where === 'cloud')
  const tone = cloud.length ? 'egress' : 'local'
  const lines = ROLES.map(r => {
    const role = posture[r.key]
    const configuredCloud = role.where === 'cloud'
    return {
      key: r.key,
      label: r.label,
      where: blocked ? 'local' : role.where,
      text: blocked && configuredCloud
        ? `configured for ${role.provider}, but egress is blocked — runs on its local fallback (${role.fallback}); the cloud call is short-circuited.`
        : configuredCloud
          ? `→ ${role.provider}: only PII-stripped context leaves for synthesis.`
          : `stays on device — ${role.model} runs locally, nothing leaves.`,
    }
  })
  let headline
  if (blocked) {
    headline = 'Egress blocked. Every model call is forced local in this configuration — any role set to a cloud provider short-circuits to its local fallback, so no health data leaves this device. The gateway has nothing to strip because nothing is sent.'
  } else if (!cloud.length) {
    headline = 'Fully local. No health data leaves this device in this configuration — every model call runs on-device, and the PII gateway has nothing to strip.'
  } else if (cloud.length === 1 && cloud[0].key === 'reasoner') {
    headline = 'Cloud reasoner on. PII-stripped context leaves for synthesis; raw clinical text and tool routing stay local. Everything the reasoner sees has passed the gateway.'
  } else {
    headline = `${cloud.length} roles use a cloud provider — ${cloud.map(c => c.label).join(' and ')}. Each call is PII-stripped at the gateway before it leaves; the ledger records every one.`
  }
  const fallback = blocked
    ? 'Set egress back to “ask every time” or “let it decide” to use a cloud reasoner again — your configured providers are remembered, nothing was lost.'
    : cloud.length
      ? 'If a cloud API is unreachable — expired key, outage, no network — that role falls back to its local model. You lose breadth on hard synthesis, never a workflow.'
      : null
  return { tone, blocked, headline, lines, fallback, connections: 'Connections: Oura, Whoop and Epic are all direct — zero transit. No bridged source (Terra, Fasten) is active.' }
}
