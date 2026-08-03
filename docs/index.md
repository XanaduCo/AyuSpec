# ayuOS

**Open-source personal health agent. Your data, your choices, your answers.**

ayuOS aggregates every signal about your health — wearables, medical records, labs, genomics, imaging — into a single unified store, and runs AI-powered reasoning over it.

You decide how much of it runs on your own hardware. Run it fully offline on a machine you own, with every model local and no outbound call that carries health data. Or take a managed instance and a frontier reasoner and skip the ops work. Or anything in between — the choices are independent, and you can change them at any time.

What does not vary: every model call is disclosed before it happens and recorded after, your data is never sold or used to train models, and nothing you choose can strand you — every paid or hosted path falls back to a free, zero-transit one that works on its own.

---

## The anchor: a loop you drive

The workflow ayuOS is built around is a loop you drive — **understand → hypothesize → act → measure → learn** — not a one-off answer. *"What changed in my last 90 days?"* is where it starts, not where it stops, and every claim along the way is labeled source-backed, inferred, or speculative. [Vision & Problem](vision.md#the-loop) explains each step.

---

## What this site is

This is the complete specification and architecture for ayuOS. Every component has its own page. The goal is a detailed-enough spec that any section can be picked up and implemented independently.

It's organized into sections, shown in the left navigation:

- **Overview** — [Vision & Problem](vision.md), [Tiers & Fallbacks](tiers.md), and the [Architecture Overview](architecture.md)
- **Decisions (ADRs)** — [the architectural decisions](adr/index.md), each with the context that forced it
- **Ingestion** — [how health data enters](ingestion/index.md): wearables, EHR, labs, imaging, genomics
- **Storage & AI** — [Storage](storage.md), [AI & ML Layer](ai-ml.md), [Model Providers](model-providers.md), [Agent Loop](agent-loop.md), [Evidence & Hypotheses](evidence.md)
- **Healthspan & Health Literacy** — [The Healthspan Model](healthspan-model.md), [Health Literacy & Epistemics](epistemics.md), [Experimentation & Validation](experimentation.md)
- **Transparency, Privacy & Sharing** — [AI Transparency](ai-transparency.md), [PII Gateway](pii-gateway.md), [Security & Privacy](security.md), [Data Sharing & Consent](sharing.md)
- **Product & Delivery** — [Frontend & UI](frontend.md), [Deployment](deployment.md), [Federated Analytics](federation.md)
- **Governance** — [Governance & Stewardship](governance.md), [External Dependencies](external-deps.md)
- **Service Evaluations** — [the per-option analysis](evaluations/index.md) behind the decisions

The decided outcomes live in the **Decisions (ADRs)** and are reflected throughout the architecture pages. **Service Evaluations** sits last on purpose: it is the supporting per-service analysis those decisions rest on, not a starting point.

---

## Key decisions

| Decision | Choice |
|---|---|
| License | MIT (core) |
| Store | ayuOS-owned Postgres schemas; FHIR at the boundaries only |
| Deployment | Self-hosted (free forever) or ayuOS Cloud (managed subscription) |
| Inference (default) | Ollama: DeepSeek-R1 distill + Qwen tool-caller + MedGemma |
| Inference (optional) | Local-network or cloud APIs, configured per model role |
| Vector store | Postgres 16 + pgvector |
| Wearables (P0) | Oura, Whoop, Apple Health (manual export) |
| Cloud model calls | PII-stripped at an unbypassable chokepoint; every call ledgered locally |
| Business model | Open core — the subscription funds the core; data is never sold, in any tier |
