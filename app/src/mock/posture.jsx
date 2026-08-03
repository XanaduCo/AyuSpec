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

const PostureCtx = createContext(null)

export function PostureProvider({ children }) {
  const [posture, setPosture] = useState(DEFAULT)
  // Which roles the user has seen a full pre-send preview for. Review mode `off`
  // is locked for a role until this is true — you cannot consent to a payload
  // shape you have never looked at (ai-transparency.md).
  const [previewSeen, setPreviewSeen] = useState({ reasoner: false, tools: false, medical: false })
  const setRole = (role, patch) =>
    setPosture(p => ({ ...p, [role]: { ...p[role], ...patch } }))
  const markPreviewSeen = role =>
    setPreviewSeen(s => (s[role] ? s : { ...s, [role]: true }))
  const anyEgress = Object.values(posture).some(r => r.where === 'cloud')
  return (
    <PostureCtx.Provider value={{ posture, setRole, anyEgress, previewSeen, markPreviewSeen }}>
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
export function egressSummary(posture) {
  const cloud = ROLES.filter(r => posture[r.key].where === 'cloud')
  const tone = cloud.length ? 'egress' : 'local'
  const lines = ROLES.map(r => {
    const role = posture[r.key]
    return {
      key: r.key,
      label: r.label,
      where: role.where,
      text: role.where === 'cloud'
        ? `→ ${role.provider}: only PII-stripped context leaves for synthesis.`
        : `stays on device — ${role.model} runs locally, nothing leaves.`,
    }
  })
  let headline
  if (!cloud.length) {
    headline = 'Fully local. No health data leaves this device in this configuration — every model call runs on-device, and the PII gateway has nothing to strip.'
  } else if (cloud.length === 1 && cloud[0].key === 'reasoner') {
    headline = 'Cloud reasoner on. PII-stripped context leaves for synthesis; raw clinical text and tool routing stay local. Everything the reasoner sees has passed the gateway.'
  } else {
    headline = `${cloud.length} roles use a cloud provider — ${cloud.map(c => c.label).join(' and ')}. Each call is PII-stripped at the gateway before it leaves; the ledger records every one.`
  }
  const fallback = cloud.length
    ? 'If a cloud API is unreachable — expired key, outage, no network — that role falls back to its local model. You lose breadth on hard synthesis, never a workflow.'
    : null
  return { tone, headline, lines, fallback, connections: 'Connections: Oura, Whoop and Epic are all direct — zero transit. No bridged source (Terra, Fasten) is active.' }
}
