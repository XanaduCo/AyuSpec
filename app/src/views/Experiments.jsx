import StubView from '../components/StubView.jsx'

export default function Experiments() {
  return (
    <StubView
      phase="Phase 3"
      title="Experiments"
      blurb="Hypotheses and n-of-1 experiments — with the honesty guardrails that make a self-test mean something. Ravi's post-meal-walking experiment (week 4, 21/30 days) lives here."
      willShow={[
        { k: 'Hypothesis', t: 'Statement + evidence label', d: 'a testable claim, its rationale, and a strength label separate from confidence' },
        { k: 'Baseline', t: 'Pre-registered window', d: 'natural variability measured before the intervention, so noise is known' },
        { k: 'Protocol', t: 'A-B-A / pre-post', d: 'metric sources, duration heuristic, confounder flags (travel, illness)' },
        { k: 'Result', t: 'Supported / inconclusive', d: 'honest verdict — an underpowered n-of-1 that overlaps baseline says so' },
      ]}
    />
  )
}
