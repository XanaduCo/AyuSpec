import StubView from '../components/StubView.jsx'

export default function Settings() {
  return (
    <StubView
      phase="Phase 2"
      title="Settings"
      blurb="Where the posture in the header is actually set. Choose a provider per model role, the review mode, and see the whole egress posture summarised in plain language."
      willShow={[
        { k: 'Providers', t: 'Per-role config', d: 'reasoner / tools / medical → Ollama, a LAN endpoint, or a cloud API' },
        { k: 'Review mode', t: 'every_call / new_shape / off', d: '“off” is locked until you’ve seen one full preview for that role' },
        { k: 'Egress posture', t: 'Plain-language summary', d: 'what leaves, where to, and the free fallback for each paid tier' },
        { k: 'Security', t: 'Encryption · federation', d: 'disk-encryption check, telemetry (off by default), federated opt-in' },
      ]}
    />
  )
}
