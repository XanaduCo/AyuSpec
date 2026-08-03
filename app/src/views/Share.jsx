import StubView from '../components/StubView.jsx'

export default function Share() {
  return (
    <StubView
      phase="Phase 3"
      title="Share"
      blurb="Compose a doctor packet or a scoped “sliver” — pick exactly what a recipient sees, preview it, and keep an append-only record of every share."
      willShow={[
        { k: 'Scope', t: 'Pick what’s in it', d: 'by domain, source, resource type, time window — e.g. “lipids + HRV, last 12 months”' },
        { k: 'Format', t: 'Packet / bundle / link', d: 'PDF or FHIR file (no egress) vs. a hosted link (amber, disclosed)' },
        { k: 'Preview', t: 'Exactly what will be sent', d: 'reviewed and editable before anything is generated' },
        { k: 'Consent log', t: 'Append-only', d: 'purpose, recipient, scope, expiry — with honest revocation limits' },
      ]}
    />
  )
}
