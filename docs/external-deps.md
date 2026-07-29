# External Dependencies

Start the **hard/slow** approvals at week 1, even if you won't use them for months. They have lead time; they are not on the MVP critical path, but they gate later milestones.

## By difficulty

### Instant (do at start)

| Dependency | What for | Action |
|---|---|---|
| Hugging Face account + MedGemma license | MedGemma weights | Accept Health AI Dev Foundations license at hf.co |
| Oura Personal Access Token | Oura wearable data | Generate in Oura developer settings |
| Cloud LLM API key (Anthropic or OpenAI) | Cloud escalation | Sign up + add billing |
| PubMed E-utilities API key | Optional; works keyless at lower rate limit | Sign up at NCBI |

### Self-serve (days)

| Dependency | What for | Gate |
|---|---|---|
| Whoop developer app | Whoop wearable data | App registration; possible brief review |
| Apple Developer Program ($99/yr) | Live HealthKit sync (P1, not MVP) | Paid membership |
| Dexcom developer account (sandbox) | CGM data | Sandbox instant; production review needed |

### Slow / hard (start week 1)

| Dependency | What for | Lead time | Fallback |
|---|---|---|---|
| Epic app registration (fhir.epic.com) | Direct EHR live sync | Weeks to months; per-health-system activation | Apple Health Records export covers many institutions |
| Oracle Health / Cerner developer | Direct EHR sync | Weeks | Same Apple Health fallback |
| Apple Developer Program (if not done) | Live HealthKit | Days | Manual export (MVP path) |

### Free / keyless

| Service | Used for |
|---|---|
| ClinicalTrials.gov v2 API | Clinical trial lookup |
| DailyMed / RxNorm API | Drug information |
| ClinVar / dbSNP | Genomic variant annotation |
| OMIM (non-commercial) | Gene-disease associations |

## Approval sequencing

```
Week 1 (start immediately, even if not needed yet)
  ├── Accept MedGemma license (instant)
  ├── Generate Oura PAT (instant)
  ├── Register Whoop developer app (start now; moderate lead time)
  ├── Submit Epic app registration (start now; slow)
  └── Enroll Apple Developer Program (if live HealthKit is wanted at P1)

Milestone 3 (cloud escalation)
  └── Obtain cloud LLM API key (instant)

Milestone 7 (EHR live sync)
  └── Epic activation per health system (outcome of week-1 registration)
```

## What doesn't need approval

The following require **nothing external** for 2 users who already hold their data:

- Local inference (Ollama + open weights)
- FHIR backbone (Medplum, self-hosted)
- Vector store (Postgres + pgvector)
- Apple Health **export** parse (no Apple Developer account needed)
- Lab PDF ingestion (Tesseract + MedGemma — all local)
- DICOM ingestion of files you already possess
- Genome parsing of your 23andMe download
- ClinicalTrials.gov, DailyMed, RxNorm, ClinVar, dbSNP (all free/keyless)

The MVP (Milestones 0–2) is achievable with only instant-grade external steps.
