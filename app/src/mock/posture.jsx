import { createContext, useContext, useState } from 'react'

// The resolved runtime posture for the three model roles. This is the demo's
// default "hybrid reasoning" config: the reasoner runs on a cloud API (amber),
// while the tool-caller and medical extractor stay local (green). Settings will
// later let the user change this; for now it is shared state so the header and
// any view can read/reflect it. Reflects what ACTUALLY ran, not just config.
const DEFAULT = {
  reasoner: { model: 'claude-opus-4-8', provider: 'anthropic', where: 'cloud', review: 'new_shape' },
  tools: { model: 'qwen2.5:7b', provider: 'ollama', where: 'local', review: 'off' },
  medical: { model: 'medgemma:4b', provider: 'ollama', where: 'local', review: 'off' },
}

const PostureCtx = createContext(null)

export function PostureProvider({ children }) {
  const [posture, setPosture] = useState(DEFAULT)
  const setRole = (role, patch) =>
    setPosture(p => ({ ...p, [role]: { ...p[role], ...patch } }))
  const anyEgress = Object.values(posture).some(r => r.where === 'cloud')
  return (
    <PostureCtx.Provider value={{ posture, setRole, anyEgress }}>
      {children}
    </PostureCtx.Provider>
  )
}

export const usePosture = () => useContext(PostureCtx)

export const ROLES = [
  { key: 'reasoner', label: 'reasoner' },
  { key: 'tools', label: 'tools' },
  { key: 'medical', label: 'medical' },
]
