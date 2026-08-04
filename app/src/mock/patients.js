// The two sample people the demo can speak about. Ravi is the full-store persona
// (persona.js and its modules — ~40k records); Maya is deliberately lighter. She
// exists to be the *contrast*: a sovereign purist with a small, private record who
// gives the system little on purpose. Her clinical stub is exactly the facts her
// journeys already establish (docs/journeys/03, /12) — Hashimoto's on
// levothyroxine, an Apple Watch stream, an active energy/mood experiment, and an
// all-local posture — so the psychographic layer in profile.js has real records to
// cite rather than free-floating personality notes.
//
// This registry is additive. Nothing in the running app is repointed off Ravi;
// the Profile view reads `patients` to let you hold the two side by side.

import { persona as ravi } from './persona.js'

export const patients = {
  ravi: {
    id: 'ravi',
    name: 'Ravi Mehta',
    age: ravi.age,
    sex: ravi.sex,
    pronouns: 'he/him',
    archetype: 'Self-hosted power user',
    tagline: 'Quantitative self-experimenter, eyes-open about the cloud.',
    // Egress posture is itself a psychographic signal (see profile.js `trust`).
    posture: { deployment: 'self-hosted', inference: 'local store · cloud reasoner opt-in', egress: 'disclosed & logged', tone: 'egress' },
    // The three-role runtime posture the top-bar indicator renders. Ravi runs the
    // demo's default hybrid config — cloud reasoner, local tools + medical.
    rolePosture: {
      reasoner: { model: 'claude-opus-4-8', provider: 'anthropic', where: 'cloud', review: 'new_shape', endpoint: '', fallback: 'ollama · deepseek-r1:8b' },
      tools: { model: 'qwen2.5:7b', provider: 'ollama', where: 'local', review: 'off', endpoint: '', fallback: 'ollama · qwen2.5:7b' },
      medical: { model: 'medgemma:4b', provider: 'ollama', where: 'local', review: 'off', endpoint: '', fallback: 'ollama · medgemma:4b' },
    },
    store: 'full', // the whole persona.js dataset stands behind him
    sources: ['Oura', 'Whoop', 'Garmin', 'Apple Health export', 'Epic (SMART-on-FHIR)', 'Cronometer', 'WGS 30×'],
    // Pointers into his existing record that his profile leans on.
    anchors: {
      conditions: ['cond-htn'],
      familyHistory: ['fh-father-cad'],
      experiment: 'exp-postmeal-walks',
      imaging: ['img-cac'],
    },
  },

  maya: {
    id: 'maya',
    name: 'Maya Okonkwo',
    age: 39,
    sex: 'female',
    pronouns: 'she/her',
    archetype: 'Sovereign purist',
    tagline: 'Wants meaning over metrics and will not babysit a tracker.',
    posture: { deployment: 'self-hosted', inference: 'all three roles local · on-device STT', egress: 'declined', tone: 'local' },
    // Sovereign posture: all three roles run on-device — three greens, nothing to strip.
    rolePosture: {
      reasoner: { model: 'deepseek-r1:8b', provider: 'ollama', where: 'local', review: 'off', endpoint: '', fallback: 'ollama · deepseek-r1:8b' },
      tools: { model: 'qwen2.5:7b', provider: 'ollama', where: 'local', review: 'off', endpoint: '', fallback: 'ollama · qwen2.5:7b' },
      medical: { model: 'medgemma:4b', provider: 'ollama', where: 'local', review: 'off', endpoint: '', fallback: 'ollama · medgemma:4b' },
    },
    store: 'light', // a small, deliberately-private record
    sources: ['Apple Health export', 'Apple Watch (live)'],
    // A minimal but real clinical stub — the facts her journeys already fix.
    conditions: [
      { id: 'cond-hashimotos', name: "Hashimoto's thyroiditis", status: 'managed', onset: '2019', code: 'E06.3' },
    ],
    medications: [
      { id: 'med-levothyroxine', name: 'Levothyroxine', dose: '75 mcg', freq: 'once daily, fasting', since: '2019', for: 'hypothyroidism', code: '10582',
        note: 'The interaction baseline every new intake is checked against.' },
    ],
    experiment: {
      id: 'exp-energy-supplement',
      statement: 'A supplement change improves my daytime energy and mood.',
      metric: 'energy/mood (EMA) · Apple Watch sleep',
      status: 'running',
      started: '2025-06-30',
    },
    anchors: {
      conditions: ['cond-hashimotos'],
      medications: ['med-levothyroxine'],
      experiment: 'exp-energy-supplement',
    },
  },
}

export const patientList = [patients.ravi, patients.maya]

export function patientById(id) {
  return patients[id] || patients.ravi
}
