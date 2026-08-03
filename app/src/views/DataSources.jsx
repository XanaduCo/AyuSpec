import StubView from '../components/StubView.jsx'

export default function DataSources() {
  return (
    <StubView
      phase="Phase 3"
      title="Data sources"
      blurb="Connector status for every source, with its tier made explicit — direct (zero-transit, green) or bridged (transits a vendor, amber) — and file uploads for the rest."
      willShow={[
        { k: 'Wearables', t: 'Oura · Whoop', d: 'last sync, record counts; Terra bridge shown amber with its disclosure' },
        { k: 'EHR', t: 'Apple Health · Epic', d: 'direct tiers green; Fasten Connect amber, per-provider consent' },
        { k: 'Files', t: 'Upload', d: 'Apple Health export, lab PDFs (OCR), DICOM, genome file' },
        { k: 'Every card', t: 'Tier + fallback', d: 'a bridged source always names the free direct path it degrades to' },
      ]}
    />
  )
}
