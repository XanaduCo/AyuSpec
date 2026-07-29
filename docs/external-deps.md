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
| **Epic app registration (fhir.epic.com)** | Direct EHR sync (Tier 2) | **Free, self-service, no Epic approval gate.** Client IDs issued at creation |

!!! danger "Epic registration is a one-way door — do not rush it"
    Epic app configuration is **frozen permanently** once marked Ready for Production; adding
    a FHIR resource later requires a new client ID and re-distribution from scratch.
    Register early to explore the sandbox, but **finalize the USCDI v3 resource list before
    marking production-ready**. See [ADR-0001](adr/0001-ehr-ingestion.md).

### Slow / hard (start week 1)

| Dependency | What for | Lead time | Fallback |
|---|---|---|---|
| Oracle Health / Cerner developer | Direct Cerner sync | Weeks; per-tenant service request | Reachable via Fasten Connect (Tier 4) |
| Apple Developer Program (if not done) | Live HealthKit companion app | Days | Manual export (MVP path) |
| **Fasten Connect commercial terms** | EHR breadth beyond Epic (Tier 4) | **Unknown — no published pricing, no known individual tier** | Tiers 1–2 cover Apple + Epic sources |

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
  ├── Register Epic app for SANDBOX only (free, instant — do NOT mark production yet)
  └── Enroll Apple Developer Program (if live HealthKit is wanted at P1)

Milestone 3 (cloud escalation)
  └── Obtain cloud LLM API key (instant)

Milestone 7 (EHR direct sync — Tier 2)
  ├── Settle the refresh-token question empirically in the Epic sandbox
  ├── Finalize the USCDI v3 resource list  ← irreversible after the next step
  └── Mark Epic app Ready for Production → auto-distributes in ~12h
```

## What doesn't need approval

The following require **nothing external** for 2 users who already hold their data:

- Local inference (Ollama + open weights)
- The store (Postgres + pgvector, schemas we own — no FHIR server to operate)
- Vector store (Postgres + pgvector)
- Apple Health **export** parse (no Apple Developer account needed)
- Lab PDF ingestion (Tesseract + MedGemma — all local)
- DICOM ingestion of files you already possess
- Genome parsing of your 23andMe download
- ClinicalTrials.gov, DailyMed, RxNorm, ClinVar, dbSNP (all free/keyless)

The MVP (Milestones 0–2) is achievable with only instant-grade external steps.
