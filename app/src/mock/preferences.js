// The preference model behind "simplify this for me" (docs/epistemics.md).
// Normally elicited conversationally on first use; here it's a stored profile
// for Ravi. The ranking ALWAYS shows its work — which stated preference produced
// the order — because the transparency is itself the education (Interaction law 2).

export const preferences = {
  // value 0..1 = how strongly Ravi weights this. Each carries how it was elicited.
  certainty:   { value: 0.9, label: 'Wants settled answers', elicited: 'You said you’d rather act on things that are well established than bet on maybes.' },
  risk:        { value: 0.85, label: 'Cautious on long-term unknowns', elicited: 'With a family history of early heart disease, you flagged long-term safety as a hard constraint.' },
  budget:      { value: 0.4, label: 'Cost is a mild factor', elicited: 'You said monthly spend under ~$50 is trivial to you; above that you weigh it.' },
  effort:      { value: 0.25, label: 'High appetite for habits', elicited: 'You already run an n-of-1 and prefer behaviours over pills, so daily effort barely counts against an option.' },
  experiment:  { value: 0.8, label: 'Enjoys self-testing', elicited: 'You’re actively running experiments, so "you could test this yourself" is a plus, not a burden.' },
}

// Map each comparison-frame column to (a) the preference that weights it — or a
// fixed intrinsic weight, for axes no preference governs — and (b) how to read a
// cell as desirability from Ravi's point of view (0..1). Effect size is a
// SEPARATE axis from certainty (epistemics keeps them apart), so it carries its
// own modest weight rather than borrowing the certainty preference — otherwise a
// big-but-appropriate-for-a-clinician effect would swamp the certainty Ravi asked
// to prioritise.
const EV = { high: 1, moderate: 0.66, low: 0.33, none: 0 }

const AXES = {
  Evidence:   { pref: 'certainty', score: c => (c && c.ev != null ? EV[c.ev] : 0.5) },
  Certainty:  { pref: 'certainty', score: t => match(t, { high: 1, moderate: 0.5, low: 0.15, unknown: 0.1 }, 0.4) },
  Effect:     { weight: 0.45,      score: t => match(t, { large: 1, moderate: 0.6, small: 0.35, unknown: 0.3 }, 0.4) },
  Cost:       { pref: 'budget',    score: t => costScore(t) },
  Risk:       { pref: 'risk',      score: t => match(t, { none: 1, low: 0.7, unknown: 0.25, 'lt unknown': 0.25 }, 0.4) },
  Reversible: { weight: 0.2,       score: t => match(t, { yes: 1, no: 0 }, 0.5) },
  Effort:     { pref: 'effort',    score: t => match(t, { trivial: 1, free: 1, 'daily habit': 0.55, 'daily pill': 0.6 }, 0.6) },
}

function match(text, table, dflt) {
  const s = String(text).toLowerCase()
  for (const k of Object.keys(table)) if (s.includes(k)) return table[k]
  return dflt
}

function costScore(text) {
  const s = String(text).toLowerCase()
  if (s.includes('free')) return 1
  const m = s.match(/\$\s?(\d+)/)
  if (!m) return 0.6
  const dollars = Number(m[1])
  if (dollars <= 15) return 0.9
  if (dollars <= 50) return 0.6
  return 0.25
}

// Rank a comparison-frame block against the preference profile.
// Returns { ranked: [{ option, score, contributions }], rationale, drivers }.
export function rankFrame(block, prefs = preferences) {
  const cols = block.cols
  const scored = block.rows.map(row => {
    const option = row.cells[0]
    let total = 0, wsum = 0
    const contributions = []
    cols.forEach((col, i) => {
      if (i === 0) return
      const axis = AXES[col]
      if (!axis) return
      const w = axis.pref ? prefs[axis.pref].value : axis.weight
      const s = axis.score(row.cells[i])
      total += w * s
      wsum += w
      contributions.push({ axis: col, pref: axis.pref || null, weight: w, desirability: s })
    })
    return { option, score: wsum ? total / wsum : 0, contributions }
  })

  scored.sort((a, b) => b.score - a.score)

  // The two heaviest preferences are the drivers of the order.
  const drivers = [...new Set(Object.values(AXES).map(a => a.pref).filter(Boolean))]
    .map(p => ({ pref: p, ...prefs[p] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)

  const top = scored[0], bottom = scored[scored.length - 1]
  const d0 = drivers[0], d1 = drivers[1]
  const rationale =
    `**${top.option}** ranks first because you weight **${d0.label.toLowerCase()}** and **${d1.label.toLowerCase()}** most heavily, and it scores well on both. ` +
    `**${bottom.option}** ranks last: it loses the most on ${d0.pref === 'certainty' ? 'evidence and certainty' : d0.pref}, which you told me matters most. ` +
    `Change a preference and the order can change — this is your weighting, not a verdict.`

  return { ranked: scored, rationale, drivers }
}
