# ayuOS — Project Context

## What This Is

ayuOS is an open-source personal health agent built on an open-core commercial model. The goal is to aggregate every signal about a person's health — wearables, EHR records, labs, genomics, imaging — into a single unified store and run AI-powered reasoning over it.

**Self-hosted (free, AGPL-3.0):** Full local operation. Data never leaves the machine by default. Zero-egress is architectural: there is no network call to make. This is the sovereignty tier — the code is auditable, the user controls everything.

**ayuOS Cloud (managed service):** For users who want the full capability without managing infrastructure. Subscription-funded; data is never sold or used for model training. The managed service is what funds ongoing development of the open-source core.

The model is Medplum's: build the infrastructure, make everything self-hostable, offer a managed tier for users who don't want to do the ops work. The open-source core is a genuine public good; the commercial cloud is how it stays maintained.

## What We Are Doing Right Now

**Phase: Specification only.** We are not implementing anything yet. The immediate work is to:

1. Create a detailed, navigable specification of the entire system
2. Deploy that specification as a public website via GitHub Actions
3. Make architectural decisions across all layers (ingestion, storage, AI, agent loop, frontend, federation)
4. Scope each component clearly enough that a developer could pick one up independently

No code will be written until the spec is locked per-component.

## Core User Problem

A person who takes their health seriously — labs every quarter, two or three wearables, past MRIs, a genome file from 23andMe — has no single place to answer: "what actually changed in the last 90 days, and what should I do about it?" Every source is siloed, the AI assistants don't have the data, and the ones that do (Function Health, Superpower) charge $300/yr and still have your data.

The anchor workflow: ask ayuOS "what changed in my last 90 days?" and get a grounded, evidence-labeled answer, fully offline.

## Key Decisions Already Made

- **License:** AGPL-3.0 for the core (strong copyleft, prevents commercial forks taking it private); Fasten fork isolated behind an API boundary (GPL-3.0 → stays in its own process)
- **Business model:** Open-core — AGPL-3.0 self-hosted tier is free forever; ayuOS Cloud managed service is subscription-funded. Data never sold in either tier.
- **EHR backbone:** Medplum (TypeScript, FHIR R4, self-hosted)
- **Model providers:** Configurable per role (reasoner / tool-caller / medical extractor). Default: Ollama with DeepSeek-R1 distill + Qwen + MedGemma. Cloud APIs (Anthropic, OpenAI, Google) are opt-in; PII gateway always enforces before any cloud call. Local OpenAI-compatible endpoints (LM Studio, vLLM) also supported.
- **Vector store:** Postgres 16 + pgvector
- **Wearable ingestion layer:** Open Wearables (self-hosted, 13+ providers, zero transit) — default for all users
- **Wearables (P0):** Oura (PAT), Whoop (OAuth app), Apple Health (manual export parse for MVP; companion app in P1)
- **Terra Bridge:** Optional paid add-on for gated providers (Garmin, Dexcom, etc.) that Open Wearables cannot reach. Data transits Terra's cloud before landing locally. Requires explicit per-provider consent.
- **Apple Health live sync:** Pre-built ayuOS Companion iOS app (P1); or build-your-own against the OpenWearables API
- **Target users (MVP):** 2 biohackers; scale target 100→1,000 users
- **Federated analytics:** Phase 2, opt-in, citizen-science framing (not a capability multiplier)
- **Governance firewall:** Commercial managed service is a separate entity from the open-source foundation; any Elyx/Chiranjiv integration is opt-in, separate-codepath, and disclosed

## What Kills Projects Like This

Maintainer burnout from keeping EHR/device connectors alive (vendor APIs break constantly). The mitigations are: lean on upstream OSS (Fasten, Medplum) for connector maintenance; don't rebuild what already exists; establish governance and contributor community before it's needed.

## Components to Spec (Working List)

- Vision and user problem
- Architecture overview (process map, data flow)
- Ingestion layer: wearables, Apple Health export, EHR (Fasten fork), lab PDFs (OCR), DICOM/imaging, genomics
- Storage layer: Postgres/pgvector schema, Medplum FHIR store, time-series design
- AI/ML layer: model roles (R1 vs. Qwen vs. MedGemma), routing logic, RAG design
- Agent loop: tool definitions, reasoning chain, evidence-assertion labeling
- PII gateway: local NER/regex, cloud escalation flow, audit log
- Frontend/UI: local-only web app, chat interface, timeline view, doctor-packet generator
- Federated analytics substrate: consent model, Flower/FLARE integration (Phase 2)
- Security and privacy model: encryption at rest, zero-egress guarantees
- Deployment and infrastructure: local Mac Mini setup, update model
- Governance and stewardship: license, maintainer model, contributor community
- External dependencies and approval sequencing

## Spec Website

The spec will be deployed as a static site via GitHub Actions to GitHub Pages. Structure: one file per component/decision area, so any section can be edited without touching others.
