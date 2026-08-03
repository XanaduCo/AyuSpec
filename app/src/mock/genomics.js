// Genomics — a 30× whole genome, not a consumer array.
//
// Two things make this module matter more than its row count:
//
// 1. It is the one dataset the PII gateway *cannot* de-identify. A genome is an
//    identifier of the person and of blood relatives who never consented, so it
//    is excluded from cloud calls by default and the exclusion is a policy fact,
//    not a relevance judgement. The context builder must render those two kinds
//    of omission differently — see `context/assemble.js`.
//
// 2. Two findings here change what an answer should say, which is what makes the
//    "include the genome" counterfactual worth clicking:
//      · SLCO1B1 *1/*5 — reduced transporter function, higher statin myopathy
//        risk. The comparison frame offers "statin (discuss w/ MD)"; the genome
//        changes *which* statin that conversation should be about.
//      · LPA rs3798220 carrier — predicts the elevated Lp(a) the lab measured.
//        Genotype and phenotype agreeing is worth more than either alone.

export const wgs = {
  source: 'Nucleus Genomics · 30× WGS',
  legacySource: '23andMe v5 array (2019) — superseded, kept for provenance',
  reported: '2025-03-22',
  imported: '2025-03-24',
  build: 'GRCh38',
  meanDepth: '31.4×',
  callableFraction: 0.984,
  variantsCalled: 4712388,
  variantsAnnotated: 41260,
  variantsReported: 0, // filled in below
  fileSizeGb: 62.4,
  storage: 'Raw CRAM stays on disk. Only annotated, reported variants live in the clinical schema; nothing genomic is embedded into the vector index.',
}

// --- notable single variants ------------------------------------------------
// APOE stays first: existing citations (`gen-apoe`) and the fhir.js resolver
// read `variants[0]`.
export const variants = [
  { id: 'gen-apoe', gene: 'APOE', genotype: 'ε3/ε3', rsid: 'rs429358/rs7412', category: 'notable',
    note: 'Baseline Alzheimer risk; not an ε4 carrier.' },
  { id: 'gen-lpa', gene: 'LPA', genotype: 'rs3798220 C/T', rsid: 'rs3798220', category: 'actionable',
    note: 'Carrier of the LPA risk allele associated with elevated Lp(a). Your measured Lp(a) is 76 nmol/L — genotype and phenotype agree, which is worth more than either alone.',
    corroborates: 'obs-lpa' },
  { id: 'gen-hfe', gene: 'HFE', genotype: 'C282Y/H63D (compound het)', rsid: 'rs1800562/rs1799945', category: 'actionable',
    note: 'Compound heterozygote. Most compound hets never develop iron overload, but it changes rising ferritin from "shrug" to "recheck with transferrin saturation" — which your panel already includes.',
    corroborates: 'obs-ferritin' },
  { id: 'gen-mthfr', gene: 'MTHFR', genotype: 'C677T C/T', rsid: 'rs1801133', category: 'notable',
    note: 'Heterozygous. Modest reduction in enzyme activity; clinically meaningful only alongside elevated homocysteine, which yours is not (9.6 µmol/L).' },
  { id: 'gen-f5', gene: 'F5', genotype: 'wild-type', rsid: 'rs6025', category: 'negative',
    note: 'Factor V Leiden not detected.' },
  { id: 'gen-brca', gene: 'BRCA1 / BRCA2', genotype: 'no pathogenic variant', rsid: '—', category: 'negative',
    note: 'No pathogenic or likely-pathogenic variant in either gene. Absence on a 30× WGS is a much stronger negative than absence on an array.' },
  { id: 'gen-ldlr', gene: 'LDLR / APOB / PCSK9', genotype: 'no pathogenic variant', rsid: '—', category: 'negative',
    note: 'Familial hypercholesterolaemia panel negative — so the rising ApoB is lifestyle/age, not monogenic.' },
  { id: 'gen-ttr', gene: 'TTR', genotype: 'wild-type', rsid: 'rs76992529', category: 'negative',
    note: 'V122I not detected.' },
]

// --- polygenic risk scores --------------------------------------------------
// CAD stays first for the same back-compat reason. Every score carries the same
// ancestry caveat because it is the same caveat, and hiding it on the scores
// that happen to look reassuring would be dishonest.
const ANCESTRY_CAVEAT = 'Effect sizes are from European-ancestry GWAS; less predictive for other ancestries.'

export const prs = [
  { id: 'gen-prs', trait: 'Coronary artery disease', percentile: 70, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-htn', trait: 'Hypertension', percentile: 78, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT,
    note: 'The one score with a diagnosis behind it — you already have the phenotype, so the score adds little.' },
  { id: 'prs-t2d', trait: 'Type 2 diabetes', percentile: 61, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-lpa', trait: 'Lipoprotein(a) level', percentile: 88, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-stroke', trait: 'Ischaemic stroke', percentile: 62, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-af', trait: 'Atrial fibrillation', percentile: 44, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-ad', trait: 'Alzheimer disease', percentile: 41, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-prostate', trait: 'Prostate cancer', percentile: 66, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-crc', trait: 'Colorectal cancer', percentile: 37, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-melanoma', trait: 'Melanoma', percentile: 55, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-ckd', trait: 'Chronic kidney disease', percentile: 39, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-osteo', trait: 'Osteoporosis', percentile: 29, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-glaucoma', trait: 'Primary open-angle glaucoma', percentile: 47, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
  { id: 'prs-mdd', trait: 'Major depressive disorder', percentile: 52, ancestry: 'South Asian', caveat: ANCESTRY_CAVEAT },
]

// --- pharmacogenomics -------------------------------------------------------
// `impact: 'actionable'` = a CPIC guideline exists and the phenotype changes a
// prescribing decision. These are the rows that make the genome worth including
// in a question about drugs, and irrelevant to a question about sleep.
export const pharmacogenomics = [
  { id: 'pgx-slco1b1', gene: 'SLCO1B1', diplotype: '*1/*5', phenotype: 'Decreased function',
    impact: 'actionable', drugs: 'simvastatin, atorvastatin (dose-dependent)',
    guidance: 'CPIC: increased simvastatin myopathy risk. Prefer rosuvastatin or pravastatin, or a lower simvastatin dose, if a statin is started.' },
  { id: 'pgx-cyp2c19', gene: 'CYP2C19', diplotype: '*1/*17', phenotype: 'Rapid metaboliser',
    impact: 'actionable', drugs: 'clopidogrel, PPIs, escitalopram',
    guidance: 'CPIC: normal clopidogrel activation; PPIs may be under-effective at standard doses.' },
  { id: 'pgx-cyp2d6', gene: 'CYP2D6', diplotype: '*1/*1', phenotype: 'Normal metaboliser',
    impact: 'informational', drugs: 'codeine, tamoxifen, many SSRIs', guidance: 'No dose adjustment indicated.' },
  { id: 'pgx-cyp2c9', gene: 'CYP2C9', diplotype: '*1/*2', phenotype: 'Intermediate metaboliser',
    impact: 'actionable', drugs: 'warfarin, NSAIDs, phenytoin',
    guidance: 'CPIC: lower warfarin starting dose if ever indicated.' },
  { id: 'pgx-vkorc1', gene: 'VKORC1', diplotype: '-1639 G/A', phenotype: 'Intermediate sensitivity',
    impact: 'actionable', drugs: 'warfarin', guidance: 'Combined with CYP2C9 *1/*2, supports a reduced warfarin starting dose.' },
  { id: 'pgx-dpyd', gene: 'DPYD', diplotype: '*1/*1', phenotype: 'Normal metaboliser',
    impact: 'informational', drugs: '5-FU, capecitabine', guidance: 'Standard dosing.' },
  { id: 'pgx-tpmt', gene: 'TPMT', diplotype: '*1/*1', phenotype: 'Normal metaboliser',
    impact: 'informational', drugs: 'azathioprine, mercaptopurine', guidance: 'Standard dosing.' },
  { id: 'pgx-nudt15', gene: 'NUDT15', diplotype: '*1/*1', phenotype: 'Normal metaboliser',
    impact: 'informational', drugs: 'thiopurines', guidance: 'Standard dosing.' },
  { id: 'pgx-ugt1a1', gene: 'UGT1A1', diplotype: '*1/*28', phenotype: 'Intermediate',
    impact: 'informational', drugs: 'irinotecan, atazanavir', guidance: 'Mild; benign unconjugated hyperbilirubinaemia possible (Gilbert pattern).' },
  { id: 'pgx-g6pd', gene: 'G6PD', diplotype: 'normal', phenotype: 'Normal',
    impact: 'informational', drugs: 'rasburicase, primaquine, dapsone', guidance: 'No restriction.' },
  { id: 'pgx-cyp3a5', gene: 'CYP3A5', diplotype: '*3/*3', phenotype: 'Poor metaboliser',
    impact: 'informational', drugs: 'tacrolimus', guidance: 'Standard tacrolimus dosing if ever needed.' },
  { id: 'pgx-abcg2', gene: 'ABCG2', diplotype: 'Q141K het', phenotype: 'Decreased function',
    impact: 'informational', drugs: 'allopurinol, rosuvastatin',
    guidance: 'Higher rosuvastatin exposure; relevant only at high doses.' },
]

// --- carrier status ---------------------------------------------------------
export const carrierStatus = [
  { id: 'car-cftr', gene: 'CFTR', variant: 'F508del', status: 'carrier', condition: 'Cystic fibrosis',
    note: 'Carrier — no personal health implication; relevant to reproductive planning only.' },
  { id: 'car-gjb2', gene: 'GJB2', variant: '35delG', status: 'carrier', condition: 'Non-syndromic hearing loss' },
  { id: 'car-hbb', gene: 'HBB', variant: '—', status: 'negative', condition: 'Beta-thalassaemia / sickle cell' },
  { id: 'car-smn1', gene: 'SMN1', variant: '2 copies', status: 'negative', condition: 'Spinal muscular atrophy' },
  { id: 'car-gba', gene: 'GBA1', variant: '—', status: 'negative', condition: 'Gaucher disease' },
  { id: 'car-atp7b', gene: 'ATP7B', variant: '—', status: 'negative', condition: 'Wilson disease' },
]

wgs.variantsReported = variants.length + prs.length + pharmacogenomics.length + carrierStatus.length

// --- back-compat shape ------------------------------------------------------
// `genomics.variants[0]` and `genomics.prs[0]` are read by fhir.js and shares.js.
export const genomics = {
  source: wgs.source,
  legacySource: wgs.legacySource,
  variants,
  prs,
  pharmacogenomics,
  carrierStatus,
  wgs,
}

// Everything the store would *ever* hand a model, tagged with why it is here.
// Used by the context builder to decide relevance per question.
export const genomicUnits = [
  ...variants.map(v => ({ id: v.id, kind: 'variant', label: `${v.gene} ${v.genotype}`, tags: genomeTags(v.gene) })),
  ...prs.map(p => ({ id: p.id, kind: 'prs', label: `${p.trait} PRS · ${p.percentile}th`, tags: traitTags(p.trait) })),
  ...pharmacogenomics.map(p => ({ id: p.id, kind: 'pgx', label: `${p.gene} ${p.diplotype}`, tags: ['drugs', 'pgx', ...(p.impact === 'actionable' ? ['actionable'] : [])] })),
  ...carrierStatus.map(c => ({ id: c.id, kind: 'carrier', label: `${c.gene} — ${c.status}`, tags: ['carrier', 'reproductive'] })),
]

function genomeTags(gene) {
  const map = {
    APOE: ['neuro', 'cognition', 'lipids'], LPA: ['cardiac', 'lipids'], HFE: ['iron', 'ferritin'],
    MTHFR: ['inflammation', 'homocysteine'], F5: ['clotting'],
    'BRCA1 / BRCA2': ['cancer'], 'LDLR / APOB / PCSK9': ['cardiac', 'lipids'], TTR: ['cardiac'],
  }
  return map[gene] || ['genomics']
}
function traitTags(trait) {
  const t = trait.toLowerCase()
  if (t.includes('coronary') || t.includes('lipoprotein') || t.includes('stroke') || t.includes('fibrillation') || t.includes('hypertension')) return ['cardiac']
  if (t.includes('diabetes')) return ['metabolic']
  if (t.includes('alzheimer')) return ['neuro', 'cognition']
  if (t.includes('cancer') || t.includes('melanoma')) return ['cancer']
  if (t.includes('kidney')) return ['kidney']
  if (t.includes('osteo')) return ['bone']
  return ['genomics']
}

export const genomicStats = {
  variantsCalled: wgs.variantsCalled,
  variantsAnnotated: wgs.variantsAnnotated,
  reported: wgs.variantsReported,
  prs: prs.length,
  pgx: pharmacogenomics.length,
  actionablePgx: pharmacogenomics.filter(p => p.impact === 'actionable').length,
  carrier: carrierStatus.length,
}
