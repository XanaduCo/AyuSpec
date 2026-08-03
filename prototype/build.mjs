#!/usr/bin/env node
// Merge authored seed slices -> validated graph.json -> seed.sql + inlined UI.
// Run: node build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seedDir = join(here, 'seed');

const NODE_TYPES = ['System','Function','Marker','Intervention','Modifier','Outcome','RiskFactor'];
const EDGE_TYPES = ['PART_OF','PROTECTS','SUPPORTS','MEASURED_BY','BLOCKS','CAUTIONS','REQUIRES','ADJUSTS','SUBSTITUTES','RISK_OF','ELEVATES','INTERACTS'];
const ENUMS = {
  effect_size: ['none','small','moderate','large'],
  evidence_strength: ['none','low','moderate','high'],
  certainty: ['low','moderate','high'],
  cost: ['free','low','moderate','high'],
  risk: ['negligible','low','moderate','high'],
  effort: ['trivial','low','moderate','high'],
  time_to_effect: ['immediate','days','weeks','months','years'],
  adherence_realism: ['low','moderate','high'],
  reversibility: ['irreversible','partial','reversible'],
  quality_tier: ['D','C','B','A'],
  validity: ['weak','moderate','strong'],
  noise: ['low','moderate','high'],
  invasiveness: ['none','minimal','moderate','high'],
  severity: ['mild','moderate','severe'],
  effect_delta: ['much_lower','lower','comparable','higher'],
  dimension: ['dose','intensity','technique','equipment','environment','timing'],
};
// Endpoint contract. ELEVATES widened to allow Modifier (see NOTES.md divergence 1).
const ENDPOINTS = {
  PART_OF:     [['Function'], ['System']],
  PROTECTS:    [['Function'], ['Outcome']],
  SUPPORTS:    [['Intervention'], ['Function']],
  MEASURED_BY: [['Function'], ['Marker']],
  RISK_OF:     [['Intervention'], ['Outcome']],
  // Marker targets are measurement sharpening: pre-diabetes raises the priority of
  // CGM/OGTT over Tier C proxies. See NOTES.md divergence 2.
  ELEVATES:    [['RiskFactor','Modifier'], ['Intervention','Function','Marker']],
  BLOCKS:      [['Modifier'], ['Intervention']],
  CAUTIONS:    [['Modifier'], ['Intervention']],
  REQUIRES:    [['Modifier'], ['Intervention']],
  ADJUSTS:     [['Modifier'], ['Intervention']],
  SUBSTITUTES: [['Intervention'], ['Intervention']],
  INTERACTS:   [['Intervention'], ['Intervention']],
};

const problems = [];
const warn = [];
const nodes = new Map();
const edges = new Map();

for (const f of readdirSync(seedDir).filter(f => f.endsWith('.json') && f !== 'graph.json')) {
  const doc = JSON.parse(readFileSync(join(seedDir, f), 'utf8'));
  for (const n of doc.nodes ?? []) {
    if (nodes.has(n.id)) { problems.push(`duplicate node ${n.id} (${f})`); continue; }
    n._src = f; nodes.set(n.id, n);
  }
  for (const e of doc.edges ?? []) {
    const id = e.id ?? `${e.from}|${e.type}|${e.to}`;
    // Two authors independently asserting the same claim is a governance issue, not a
    // load failure: keep the first, surface the collision. See NOTES.md divergence 3.
    if (edges.has(id)) { warn.push(`edge ${id} authored twice (kept ${edges.get(id)._src}, dropped ${f})`); continue; }
    e.id = id; e._src = f; edges.set(id, e);
  }
}

// --- node validation -------------------------------------------------------
for (const n of nodes.values()) {
  if (!NODE_TYPES.includes(n.type)) problems.push(`node ${n.id}: bad type ${n.type}`);
  if (!n.citations?.length) problems.push(`node ${n.id}: no citations (citation rule)`);
  if (!n.last_reviewed) problems.push(`node ${n.id}: no last_reviewed`);
}

// --- edge validation -------------------------------------------------------
const GLOBAL = '*';
for (const e of edges.values()) {
  if (!EDGE_TYPES.includes(e.type)) { problems.push(`edge ${e.id}: bad type ${e.type}`); continue; }
  const from = nodes.get(e.from);
  const to = e.to === GLOBAL ? null : nodes.get(e.to);
  if (!from) problems.push(`edge ${e.id}: dangling from ${e.from}`);
  if (e.to !== GLOBAL && !to) problems.push(`edge ${e.id}: dangling to ${e.to}`);
  if (e.to === GLOBAL && e.type !== 'BLOCKS') problems.push(`edge ${e.id}: wildcard target only legal on BLOCKS`);
  const [okFrom, okTo] = ENDPOINTS[e.type];
  if (from && !okFrom.includes(from.type)) problems.push(`edge ${e.id}: ${e.type} from ${from.type}, want ${okFrom}`);
  if (to && !okTo.includes(to.type)) problems.push(`edge ${e.id}: ${e.type} to ${to.type}, want ${okTo}`);
  if (!e.citations?.length && e.type !== 'PART_OF') problems.push(`edge ${e.id}: no citations`);
  for (const [k, vals] of Object.entries(ENUMS)) {
    const v = e.attrs?.[k];
    if (v != null && !vals.includes(v)) problems.push(`edge ${e.id}: attrs.${k}="${v}" not in [${vals}]`);
  }
  if (e.type === 'SUPPORTS') {
    for (const ax of ['effect_size','evidence_strength','certainty','time_to_effect','cost','risk','effort','reversibility','adherence_realism'])
      if (e.attrs?.[ax] == null) warn.push(`SUPPORTS ${e.id}: missing comparison axis ${ax}`);
  }
  if (e.type === 'REQUIRES') {
    const p = e.attrs?.prerequisite_node_id;
    if (!p) warn.push(`REQUIRES ${e.id}: no prerequisite_node_id`);
    else if (!nodes.has(p)) problems.push(`REQUIRES ${e.id}: prerequisite ${p} not found`);
  }
  if (e.type === 'SUBSTITUTES') {
    const fn = e.attrs?.serves_function_id;
    if (fn && !nodes.has(fn)) problems.push(`SUBSTITUTES ${e.id}: serves_function_id ${fn} not found`);
  }
}

// --- connectivity report ---------------------------------------------------
const byType = t => [...nodes.values()].filter(n => n.type === t);
const edgesOfType = t => [...edges.values()].filter(e => e.type === t);
const orphanInterventions = byType('Intervention').filter(n =>
  ![...edges.values()].some(e => e.type === 'SUPPORTS' && e.from === n.id));
const orphanModifiers = byType('Modifier').filter(n =>
  ![...edges.values()].some(e => ['BLOCKS','CAUTIONS','REQUIRES','ADJUSTS','ELEVATES'].includes(e.type) && e.from === n.id));
orphanInterventions.forEach(n => warn.push(`intervention ${n.id} supports nothing`));
orphanModifiers.forEach(n => warn.push(`modifier ${n.id} has no modifier edges`));

const graph = { nodes: [...nodes.values()], edges: [...edges.values()] };
writeFileSync(join(seedDir, 'graph.json'), JSON.stringify(graph, null, 1));

// --- compile: authored JSON -> relational form -----------------------------
const q = s => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
const jq = o => o == null ? 'NULL' : `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const cast = (v, t) => v == null ? 'NULL' : `${q(v)}::knowledge.${t}`;

// Citation strings are authored as prose. The compiler derives the record; a real
// pipeline would have authors cite by id against a curated bibliography, which is
// precisely the governance gap this exercise surfaces (see NOTES.md).
const citations = new Map();
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');
function citationId(text) {
  if (citations.has(text)) return citations.get(text).id;
  const year = Number((text.match(/\b(19|20)\d{2}\b/) ?? [])[0]) || 2020;
  const l = text.toLowerCase();
  const kind =
    /meta-?analys/.test(l) ? 'meta_analysis'
    : /systematic review|cochrane/.test(l) ? 'systematic_review'
    : /guideline|standards of care|position stand|nice |uspstf|who /.test(l) ? 'guideline'
    : /\btrial\b|\brct\b|randomi/.test(l) ? 'rct'
    : /cohort|observational|whitehall|framingham|biobank/.test(l) ? 'observational'
    : /mechanis|in vitro|animal|rodent|mice/.test(l) ? 'mechanistic'
    : 'consensus';
  let id = slug(text) || 'cite';
  if ([...citations.values()].some(c => c.id === id)) id = `${id}-${citations.size}`;
  citations.set(text, { id, kind, title: text, year });
  return id;
}
graph.nodes.forEach(n => (n.citations ?? []).forEach(citationId));
graph.edges.forEach(e => (e.citations ?? []).forEach(citationId));

// "6 months" / "14 days" -> interval. Prose that names no period means "once".
function toInterval(s) {
  const m = String(s ?? '').match(/(\d+)\s*(day|week|month|year)/i);
    return m ? `${m[1]} ${m[2].toLowerCase()}s` : '100 years';
}

const sql = [
  '-- Generated by build.mjs from seed/*.json. Do not edit by hand.',
  '-- Load: psql -f schema.sql && psql -f seed.sql',
  'BEGIN;',
  `INSERT INTO knowledge.model_version (version, content_hash, source_commit, built_at, node_count, edge_count, is_current)`,
  `VALUES ('0.1.0-prototype', md5(${q(JSON.stringify(graph))}), 'prototype', now(), ${graph.nodes.length}, ${graph.edges.length}, true);`,
];
for (const c of citations.values())
  sql.push(`INSERT INTO knowledge.citations (id, kind, title, year) VALUES (${q(c.id)}, ${q(c.kind)}, ${q(c.title)}, ${c.year});`);

for (const n of graph.nodes) {
  const a = { ...(n.attrs ?? {}) };
  const polarity = a.outcome_polarity ?? (n.type === 'Outcome' ? 'protective' : null);
  delete a.outcome_polarity;
  sql.push(`INSERT INTO knowledge.nodes (id, node_type, title, summary, outcome_polarity, attrs, last_reviewed, review_status, content_hash) VALUES (${q(n.id)}, ${cast(n.type,'node_type')}, ${q(n.title)}, ${q(n.summary)}, ${q(polarity)}, ${jq(a)}, ${q(n.last_reviewed)}::date, ${cast(n.review_status ?? 'provisional','review_status')}, md5(${q(JSON.stringify(n))}));`);
  for (const c of n.citations ?? [])
    sql.push(`INSERT INTO knowledge.node_citations (node_id, citation_id) VALUES (${q(n.id)}, ${q(citationId(c))}) ON CONFLICT DO NOTHING;`);
  if (n.type === 'Marker') {
    const via = [].concat(a.ingestible_via ?? []);
    sql.push(`INSERT INTO knowledge.marker_props (marker_id, noise, cost, invasiveness, min_useful_interval, unit, ingestible_via, attrs) VALUES (${q(n.id)}, ${cast(a.noise ?? 'moderate','noise_band')}, ${cast(a.cost ?? 'moderate','cost_band')}, ${cast(a.invasiveness ?? 'minimal','invasiveness')}, ${q(toInterval(a.min_useful_interval))}::interval, ${q(a.unit)}, ARRAY[${via.map(q).join(',')}]::text[], ${jq({ min_useful_interval_prose: a.min_useful_interval ?? null })});`);
  }
}

// attrs key -> typed column. Everything not listed stays in attrs by design.
const COL = {
  effect_size:['effect_size','magnitude'], evidence_strength:['evidence_strength','evidence_strength'],
  certainty:['certainty','certainty'], time_to_effect:['time_to_effect','time_to_effect'],
  cost:['cost','cost_band'], risk:['risk','risk_band'], effort:['effort','effort_band'],
  reversibility:['reversibility','reversibility'], adherence_realism:['adherence_realism','adherence_realism'],
  quality_tier:['quality_tier','quality_tier'], validity:['validity','validity'], noise:['noise','noise_band'],
  severity:['severity','severity'], priority_delta:['priority_delta','magnitude'],
  effect_delta:['effectiveness_delta','effect_delta'], dimension:['adjust_dimension','adjust_dimension'],
  interaction_kind:['interaction_kind','interaction_kind'],
};
const TEXTCOL = { dose:'dose_response', reason:'reason', adjustment:'adjustment',
  prerequisite_node_id:'prerequisite_node_id', serves_function_id:'serves_function_id',
  baseline_incidence:'baseline_incidence' };

for (const e of graph.edges) {
  const a = { ...(e.attrs ?? {}) };
  // Two REQUIRES from one modifier to one intervention (posterior-chain AND trunk
  // stability) are distinct claims; the natural key needs the qualifier to say so.
  const qualifier = a.qualifier ?? (e.id.split('|')[3] ?? '');
  delete a.qualifier;
  const cols = { id:q(e.id), qualifier:q(qualifier), edge_type:cast(e.type,'edge_type'), from_id:q(e.from),
    to_id: e.to === GLOBAL ? 'NULL' : q(e.to),
    from_type: cast(nodes.get(e.from).type,'node_type'),
    to_type: e.to === GLOBAL ? 'NULL' : cast(nodes.get(e.to).type,'node_type'),
    last_reviewed:`${q(e.last_reviewed)}::date`,
    review_status:cast(e.review_status ?? 'provisional','review_status') };
  for (const [k,[col,type]] of Object.entries(COL)) if (a[k] != null) { cols[col] = cast(a[k], type); delete a[k]; }
  for (const [k,col] of Object.entries(TEXTCOL)) if (a[k] != null) { cols[col] = q(a[k]); delete a[k]; }
  // resolution_text is the verbatim string the UI renders; authors used varied keys.
  const res = a.resolution_text ?? a.caveat ?? a.resolution ?? a.adjustment ?? a.reason;
  if (['BLOCKS','CAUTIONS'].includes(e.type)) cols.resolution_text = q(res);
  delete a.resolution_text; delete a.caveat; delete a.resolution;
  if (a.routing === 'clinician') cols.is_red_flag = 'true';
  if (a.suppress_substitutes != null) { cols.suppress_substitutes = String(!!a.suppress_substitutes); delete a.suppress_substitutes; }
  if (a.applies_when != null) { cols.applies_when = jq(a.applies_when); delete a.applies_when; }
  if (a.escalates_to != null) { cols.escalates_to = cast(a.escalates_to,'edge_type'); delete a.escalates_to; }
  if (a.escalation_when != null) { cols.escalation_when = jq(a.escalation_when); delete a.escalation_when; }
  // Required-payload backfills: the constraint is the spec, so a miss is a content bug.
  if (e.type === 'BLOCKS' && !cols.severity) cols.severity = cast('moderate','severity');
  if (e.type === 'RISK_OF' && !cols.baseline_incidence) cols.baseline_incidence = q('not quantified in source');
  if (e.type === 'ELEVATES' && !cols.priority_delta) cols.priority_delta = cast('moderate','magnitude');
  if (['BLOCKS','CAUTIONS','ADJUSTS','REQUIRES','ELEVATES'].includes(e.type) && !cols.reason)
    cols.reason = q(res ?? e.attrs?.adjustment ?? 'reason not authored');
  cols.attrs = jq(a);
  cols.content_hash = `md5(${q(JSON.stringify(e))})`;
  sql.push(`INSERT INTO knowledge.edges (${Object.keys(cols).join(', ')}) VALUES (${Object.values(cols).join(', ')});`);
  for (const c of e.citations ?? [])
    sql.push(`INSERT INTO knowledge.edge_citations (edge_id, citation_id) VALUES (${q(e.id)}, ${q(citationId(c))}) ON CONFLICT DO NOTHING;`);
}
sql.push('COMMIT;');
writeFileSync(join(here, 'seed.sql'), sql.join('\n'));

// The compiled graph (seed/graph.json) is consumed directly by the React demo
// in ../app, which builds to ../docs/demo via Vite (see .github/workflows/
// deploy.yml). This script no longer emits any HTML — it only compiles and
// validates the graph and the SQL seed. The old single-file explorer template
// (app/index.template.html) is retained for reference only.

// --- report ----------------------------------------------------------------
const counts = t => byType(t).length;
console.log(`nodes ${graph.nodes.length}  edges ${graph.edges.length}`);
console.log('  ' + NODE_TYPES.map(t => `${t}:${counts(t)}`).join('  '));
console.log('  ' + EDGE_TYPES.map(t => `${t}:${edgesOfType(t).length}`).join('  '));
console.log(`warnings ${warn.length}`);
warn.slice(0, 12).forEach(w => console.log('  ~ ' + w));
if (warn.length > 12) console.log(`  ~ ...and ${warn.length - 12} more`);
if (problems.length) {
  console.error(`\nBLOCKING (${problems.length}):`);
  problems.slice(0, 40).forEach(p => console.error('  ! ' + p));
  process.exit(1);
}
console.log('\nOK -> seed/graph.json, seed.sql');
