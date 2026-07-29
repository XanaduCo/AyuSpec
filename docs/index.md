# ayuOS

**Open-source personal health agent. Your data, your machine, your answers.**

ayuOS aggregates every signal about your health — wearables, medical records, labs, genomics, imaging — into a single local store, and runs AI-powered reasoning over it. Fully offline. No subscription. No data leaves your machine unless you explicitly choose to escalate.

---

## The anchor workflow

> *"What changed in my health in the last 90 days, and what should I do about it?"*

That question should be answerable, grounded in your actual data, with every claim labeled as source-backed or inferred. ayuOS is the system that makes that possible, for anyone willing to run it on their own hardware.

---

## What this site is

This is the complete specification and architecture for ayuOS. Every component has its own page. The goal is a detailed-enough spec that any section can be picked up and implemented independently.

Use the left navigation to explore:

- **[Vision & Problem](vision.md)** — the user problem, who it's for, and why existing tools don't solve it
- **[Architecture Overview](architecture.md)** — system map, data flow, process boundaries
- **[Ingestion](ingestion/index.md)** — how health data enters the system (wearables, EHR, labs, imaging, genomics)
- **[Storage](storage.md)** — FHIR backbone, Postgres/pgvector schema, time-series design
- **[AI & ML Layer](ai-ml.md)** — model roles, routing logic, RAG design
- **[Agent Loop](agent-loop.md)** — tool definitions, reasoning chain, evidence labeling
- **[PII Gateway](pii-gateway.md)** — local PII stripping, cloud escalation, audit log
- **[Frontend & UI](frontend.md)** — chat interface, timeline, doctor-packet generator
- **[Security & Privacy](security.md)** — encryption at rest, zero-egress guarantees
- **[Deployment](deployment.md)** — local Mac Mini setup, update model
- **[Federated Analytics](federation.md)** — opt-in consent, Flower/FLARE (Phase 2)
- **[Governance](governance.md)** — license, maintainer model, contributor community
- **[External Dependencies](external-deps.md)** — approval sequencing, fallback paths

---

## Key decisions

| Decision | Choice |
|---|---|
| License | AGPL-3.0 (core) |
| EHR backbone | Medplum (TypeScript, FHIR R4, self-hosted) |
| Local inference | Ollama: DeepSeek-R1 distill + Qwen tool-caller + MedGemma |
| Vector store | Postgres 16 + pgvector |
| Wearables (P0) | Oura, Whoop, Apple Health (manual export) |
| Cloud escalation | Opt-in, per-query, local PII stripping before send |
| Commercial intent | None — this is a public good |
