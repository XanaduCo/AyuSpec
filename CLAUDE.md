# ayuOS — Project Context

## What This Is

ayuOS is a non-commercial, open-source personal health agent. The goal is to aggregate every signal about a person's health — wearables, EHR records, labs, genomics, imaging — into a single local store, and run AI-powered reasoning over it. No cloud, no data monetization, no subscription. The trust claim is architectural: if the data never leaves your machine, there is no policy that can betray you.

The project is a public good, not a venture. The differentiation from Function Health, Superpower, etc. is not features — it is ownership and locality. The differentiator from ChatGPT Health and Claude for Healthcare is that there is no commercial incentive to ever monetize user PHI.

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

- **License:** Apache-2.0 for the core; Fasten fork isolated behind an API boundary (GPL-3.0 → stays in its own process)
- **EHR backbone:** Medplum (TypeScript, FHIR R4, self-hosted)
- **Local inference:** Ollama — DeepSeek-R1 distill (reasoner) + Qwen tool-caller + MedGemma (medical extraction + vision)
- **Vector store:** Postgres 16 + pgvector
- **Wearables (P0):** Oura (PAT), Whoop (OAuth app), Apple Health (manual export parse)
- **Cloud escalation:** opt-in, per-query, with local PII stripping before any payload leaves
- **Target users (MVP):** 2 biohackers; scale target 100→1,000 users
- **Federated analytics:** Phase 2, opt-in, citizen-science framing (not a capability multiplier)
- **Non-commercial:** no monetization, ever; governance firewall between ayuOS and any commercial Elyx/Chiranjiv use

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
