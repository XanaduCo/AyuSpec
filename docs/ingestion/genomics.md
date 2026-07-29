# Genomics Ingestion

## Supported inputs

| Format | Source | Notes |
|---|---|---|
| 23andMe raw data | 23andMe account → download | Tab-separated; ~650k SNPs |
| VCF (Variant Call Format) | Any clinical WGS/WES | Standard bioinformatics format |

No external API needed — the user downloads their file once and drops it into ayuOS.

## Pipeline

```
Raw file (23andMe TSV or VCF)
  │
  ▼
Parser              → extract variants: (rsID, chromosome, position, genotype)
  │
  ▼
FHIR MolecularSequence → write to Medplum (one resource per notable variant)
  │
  ▼
PRS calculation     → polygenic risk scores for configured traits
  │
  ▼
Annotation lookup   → ClinVar, dbSNP (local copy or rate-limited public API)
  │
  ▼
DocumentReference   → summary of notable findings
```

## FHIR representation

Notable variants are stored as `MolecularSequence` resources:

- `type`: `dna`
- `variant.variantPointer`: reference to dbSNP
- `variant.start` / `variant.end`: genomic position (GRCh38)
- `observedAllele`: the user's allele(s)
- `referenceAllele`: reference genome allele

For PRS results, `Observation` resources with `code` = LOINC `81247-9` (Master HL7 genetic variant reporting panel).

## Polygenic risk scores (PRS)

PRS computation requires:
1. A curated list of variants and their effect sizes for a trait (from GWAS summary statistics)
2. The user's genotype at those positions
3. A sum of effect sizes weighted by genotype dosage

**Traits to support (initial list — decisions pending):**
- Cardiovascular disease risk
- Type 2 diabetes risk
- Alzheimer's risk (APOE ε4 status)
- Longevity-associated variants

!!! warning "PRS interpretation"
    PRS are population-level statistics applied to an individual. They are not diagnostic. All PRS results are labeled `inference` with a disclosure that effect sizes come from GWAS studies of largely European-ancestry populations, and are less predictive for other ancestries.

## Annotation sources

| Source | Access | Data |
|---|---|---|
| ClinVar | Free, public | Clinical significance of variants |
| dbSNP | Free, public | Variant identifiers, frequencies |
| OMIM | Free for non-commercial | Gene-disease associations |
| PharmGKB | Free | Pharmacogenomics (drug-gene interactions) |

For MVP, a local static snapshot of relevant ClinVar/dbSNP entries is bundled. The full databases are too large to ship; a curated subset covering common actionable variants is sufficient.

## Privacy note

Genomic data is among the most sensitive data ayuOS stores. It never leaves the machine. If cloud escalation is toggled, genomic data is explicitly excluded from the payload — the PII gateway filters it regardless of the user's strip settings.
