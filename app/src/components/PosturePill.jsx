// A single role's posture: green when it stayed on device, amber when it left.
// The law the user learns once and trusts forever.
export default function PosturePill({ role, detail, onClick }) {
  const egress = role.where === 'cloud'
  const label = detail
    ? `${role.model} · ${role.provider} · ${role.where}`
    : role.where
  return (
    <span
      className={`pill ${egress ? 'egress' : 'local'} ${onClick ? 'clickable' : ''}`}
      title={egress ? 'This role’s prompts leave the device, PII-stripped.' : 'This role runs on-device. No health data leaves.'}
      onClick={onClick}
    >
      <span className="led" />
      {label}
    </span>
  )
}
