# AyuOS — Build Split + Implementation Roadmap

*Scope: 2 early users (you + a friend), both biohackers, with health records, wearables, MRIs, labs, and genome data. Reflects the 8 locked decisions (Apache-2.0 · Fasten fork · Medplum/TS · DeepSeek-R1 distill · opt-in cloud escalation · biohacker-first · razor MVP · federated analytics as roadmap).*

> Note on external terms: API pricing, approval processes, and free-tier limits change. Treat every "external" item below as *verify at signup*. The structural reality (what needs an account vs. an approval) is stable; the fine print is not.

---

## Part 1 — The Split

### A. Build yourself — no external account, key, or approval

| Component | What it is | Why it's gate-free |
|---|---|---|
| Local inference runtime | Ollama / llama.cpp / MLX on Apple Silicon | Open source; runs offline |
| DeepSeek-R1 distill + tool-caller (Qwen/Llama) | The reasoner + agent models | Open weights, free download, no gate |
| FHIR backbone | Self-hosted Medplum (TS) | Open source, Apache-2.0, runs locally |
| Vector store | Postgres 16 + pgvector | Local, open source |
| **Apple Health (export path)** | Parse the iPhone Health `export.zip` (`export.xml`) | Manual user export → local parse. No Apple Developer account needed |
| Lab PDF ingestion | OCR (Tesseract) + MedGemma extraction → FHIR | All local; no cloud OCR |
| **MRI / DICOM ingestion + viewer** | Parse DICOM (pydicom), embed OHIF/Cornerstone viewer, MedGemma vision | Reading files *you already possess* needs nothing external |
| Genome parsing | Parse 23andMe raw export / VCF; basic PRS | Parsing your own downloaded file needs nothing external |
| Unified schema + crosswalk | FHIR R4 mapping, LOINC/SNOMED/RxNorm dedup | Logic you write; code systems are public |
| Correlation / change-detection / timeline | The "what changed in 90 days" engine | Pure local app logic |
| RAG over your records | Embeddings + retrieval over pgvector | Local; ship a static guideline corpus |
| Evidence-assertion labeling | Tag claims Source-Backed/Inferred/etc. | Local logic |
| Audit log + encryption at rest | Zero-egress provability | Local |
| Doctor packet generator | Longevity/second-opinion brief | Local |
| PII-stripping gateway | Local NER + regex before any escalation | Local model; only the *destination* is external |
| Fasten fork (the software) | Self-host the ingestion service | The app self-hosts freely; only the *EHR connections* are gated (see B) |

### B. Requires external service / account / API key / approval

| Component | External dependency | Gate type | Difficulty | Fallback / workaround |
|---|---|---|---|---|
| **MedGemma weights** | Hugging Face account + accept Health AI Dev Foundations license | License click-through | **Instant** | None needed; just accept terms |
| **Oura data** | Oura account → Personal Access Token | Self-serve token | **Instant** | Each user generates their own PAT |
| **Whoop data** | Whoop developer app (OAuth2) | App registration, possible review | **Moderate** | Manual data export if API is slow |
| Garmin data | Garmin Health API / Connect Developer | Application + approval (B2B-oriented) | **Hard** | Use FIT/activity export files → parse locally |
| Dexcom / CGM | Dexcom developer account | Sandbox instant; production needs review | **Moderate–Hard** | Route CGM through Apple Health export instead |
| **Apple Health live sync** | Apple Developer Program ($99/yr) | Paid membership + provisioning + TestFlight | **Moderate** | Use the manual export path (Part A) for MVP |
| Cloud escalation LLM | Anthropic/OpenAI API key + billing | Sign-up + credit card | **Instant** | Optional feature; off by default |
| **EHR live sync (Epic)** | fhir.epic.com app registration + client ID | App review + **per-health-system activation** | **Hard / slow** | **Apple Health Records → export** covers many institutions with no Epic registration |
| EHR live sync (Cerner/Oracle) | Oracle Health developer console | App registration | **Moderate–Hard** | Same Apple Health Records sidestep |
| PubMed / NCBI E-utilities | Free API key (optional) | Self-serve | **Instant** | Works keyless at lower rate limit |
| ClinicalTrials.gov v2 / DailyMed / RxNorm | None | Free, keyless | **None** | — |
| Name lock (AyuOS) | Domain + GitHub org + trademark check | Purchase/registration | **Instant–Moderate** | — |

**The pattern:** almost everything that turns *your own files* into insight is build-yourself. The external gates cluster on **live data pulls** (wearable APIs) and **live record sync** (EHR). For 2 users who already hold MRIs, genome, labs, and can export their own wearable/Apple data, you can build ~80% of the product before touching a single hard approval.

---

## Part 2 — Implementation Roadmap

Timeframes assume part-time work by 2 builders; they're sequencing guides, not commitments. **Start the slow external approvals (Whoop app, Apple Developer, Epic) in parallel at week 1 — they're not on the build critical path but they have lead time.**

### Milestone 0 — Foundations (≈ weeks 1–2) · build-yourself
- Monorepo, Apache-2.0 license, CI. Plan the **process boundary** that isolates the (GPL) Fasten fork from the Apache core.
- Self-host Medplum (Docker) + Postgres/pgvector.
- Ollama: pull DeepSeek-R1 distill (8–14B), a tool-caller (Qwen), and MedGemma.
- Minimal chat loop over Ollama with model routing.
- **External blocker:** Hugging Face account + accept MedGemma license (instant).
- **Exit:** local chat answers a question over a hand-loaded sample record.

### Milestone 1 — Wearable ingestion (≈ weeks 2–4) · the razor-MVP data
- Oura via Personal Access Token (both users).
- Whoop via OAuth app.
- **Apple Health via manual export** parser (no Apple Developer account yet).
- Normalize to FHIR + a time-series store; dedup.
- **External blockers:** Oura token (instant); Whoop dev app (moderate — start week 1).
- **Exit:** both users' Oura/Whoop/Apple data sitting in one normalized store.

### Milestone 2 — "What changed in 90 days" + chat (≈ weeks 4–6) · **razor MVP complete**
- Correlation + change-detection engine over the time series.
- RAG over the unified record + a shipped static guideline pack.
- Agent loop: tool-caller routes; R1 for deep reasoning; MedGemma for medical extraction.
- Evidence-assertion labeling + user-visible audit log.
- The anchor demo workflow.
- **External blockers:** none (PubMed/CT.gov optional, free).
- **Exit:** you and your friend can each ask "what changed in my last 90 days?" and get a grounded, labeled answer fully offline. **This is your shareable demo.**

### Milestone 3 — Cloud escalation, opt-in (≈ weeks 6–7)
- Local PII-stripping gateway (NER + regex).
- Cloud LLM behind an explicit per-query toggle; **payload preview before send**; every escalation audit-logged.
- **External blocker:** cloud LLM API key (instant + billing).
- **Exit:** hard questions can opt into a stronger model with nothing identifying leaving the device.

### Milestone 4 — Lab PDFs + doctor packet (≈ weeks 7–9) · P0.5
- Local OCR + MedGemma → structured labs in FHIR with reference ranges.
- Doctor-packet / second-opinion brief generator (your clinician-facing differentiator).
- **External blockers:** none.
- **Exit:** drop a lab PDF → trended biomarkers + a doctor-ready brief.

### Milestone 5 — MRI / imaging (≈ weeks 9–12)
- DICOM ingestion (pydicom) + embedded OHIF/Cornerstone viewer.
- MedGemma vision: local read/summarize of the MRIs you hold.
- **External blockers:** none to read your files. *Getting* new DICOM from a hospital is a manual retrieval, not an API.
- **Exit:** load an MRI, view it in-app, get a local AI summary.

### Milestone 6 — Genome (≈ weeks 10–12, parallel)
- Parse 23andMe raw / VCF; surface notable variants + basic PRS.
- **External blockers:** none to parse; manual download from 23andMe.
- **Exit:** genome questions answerable in chat.

### Milestone 7 — EHR live sync (month 3+) · P1 · **the hard external gate**
- Deploy the Fasten fork as the isolated Go service behind the API boundary.
- **Pragmatic first path:** Apple Health Records on iPhone → export → parse. Covers many institutions with **no Epic registration**.
- **Direct path:** register apps at fhir.epic.com (and Oracle Health), obtain client IDs, then get each health system to *enable* your app.
- **External blockers (the biggest in the project):** Epic/Cerner app registration + production review + **per-health-system activation** — can take weeks to months, partly outside your control. Inconsistent FHIR payloads and PDFs remain the hard part. **Start registration early; lean on Apple Health Records to deliver value before direct sync lands.**
- **Exit:** at least one provider's records auto-pulling into the unified store.

### Milestone 8 — Federated analytics substrate (P2, later)
- Build the **opt-in consent / data-donation mode now** (cheap); defer the analytics itself.
- When ready: Flower/FLARE + differential privacy for cohort percentile benchmarking.
- **External blockers:** none for the substrate (frameworks are open).
- **Exit:** consent plumbing exists so the headline capability has a foundation.

---

## Part 3 — External blockers, consolidated & sequenced

Start the **Hard / slow** ones at week 1 even though you won't use them for weeks.

| Blocker | Start when | Lead time | If it stalls |
|---|---|---|---|
| Epic / Cerner app registration + per-system activation | **Week 1** (parallel) | Weeks → months | Ship via Apple Health Records export; EHR direct-sync is a later milestone, not a blocker for MVP |
| Apple Developer Program ($99/yr) | **Week 1** if you want live HealthKit | Days | Manual Apple Health export covers the entire MVP |
| Whoop developer app | **Week 1** | Days, maybe review | Manual Whoop export |
| Dexcom production access | When CGM matters (M1+) | Days–weeks | Route CGM through Apple Health export |
| Garmin Health API | Only if a user is Garmin-heavy | Slow / B2B | FIT-file export → parse locally (recommended over the API) |
| MedGemma license | Week 1 | Instant | — |
| Oura PAT | Week 2 | Instant | — |
| Cloud LLM API key | Milestone 3 | Instant | Escalation is optional |
| Name / domain / GitHub org / trademark | Before public launch | Instant–weeks | — |

**Bottom line:** none of the hard external gates block your razor MVP. You can reach a fully working, shareable demo (Milestones 0–2) using only instant-grade external steps — MedGemma license, an Oura token, a Whoop app, and your own manual exports. The slow approvals (Epic especially) only gate *live EHR auto-sync*, which is a month-3 concern you can de-risk by starting registration now and using Apple Health Records in the meantime.
