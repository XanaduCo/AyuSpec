# Vision & Problem

## Mission

ayuOS exists to help people **take control of their health and actively optimize it** — not merely observe what changed. Knowing your HRV dropped is table stakes. The point is to understand *why*, decide *what to do*, test whether it worked, and compound those decisions over years.

ayuOS turns a pile of passive, siloed health data into an agentic loop the user drives: **understand → hypothesize → act → measure → learn.** Awareness is the entry point, not the destination. The destination is agency — a person who is measurably steering their own long-term health, with an AI partner that keeps every claim honest about how well the evidence supports it.

## The problem

A person who takes their health seriously accumulates data from many disconnected sources:

- Two or three wearables (Oura, Whoop, Garmin) tracking sleep, HRV, activity
- Quarterly labs from a concierge clinic or LabCorp
- MRIs from the past five years, sitting on a USB drive
- A 23andMe genome file, downloaded once and never revisited
- Medical records from three different health systems, each locked in a patient portal

There is no single place that turns all of this into action — that answers not just **"what changed in my last 90 days?"** but the questions that follow it: *what does this mean for my long-term health, what should I change, and how will I know it worked?*

Every existing tool either:

1. **Silos the data** — Oura shows Oura data; MyChart shows records; 23andMe shows SNPs. No cross-source reasoning.
2. **Requires cloud custody** — Function Health, Superpower, ChatGPT Health all require your data to live on someone else's servers. The AI answers questions, but the company now holds your health history.
3. **Can't be trusted not to monetize** — PicnicHealth's business model is selling de-identified cohort data to pharma. Function Health is a $2.5B business. Every commercial player has an incentive structure that eventually points at the data.

## The user

**Primary (MVP):** Biohacker with access to their own records — wearables, labs, maybe a genome file, possibly MRIs. Comfortable running software on a Mac Mini or similar local machine. Values data sovereignty. Wants AI-powered synthesis, not just dashboards.

**Secondary:** Anyone who wants a second opinion on their health, a longevity-optimized brief to bring to a doctor, or a way to understand what their genome file actually means.

**Not targeting (yet):** People who need EHR live-sync as the primary data source. The Apple Health export path covers many institutions without requiring Epic app registration.

## What users want to do

The anchor question — *"what changed in my last 90 days?"* — is the flagship, but it's one instance of a broader set of jobs users are hiring ayuOS for. The product exists to serve these:

1. **Reason over everything at once, across both time horizons.** Talk to their health data as a single holistic record and get answers aimed at *long-term optimization* (trajectory, trends, longevity) and *short-term issues* (a symptom, an out-of-range lab, a rough week of sleep) — in the same conversation, not two different tools.

2. **Share scoped slivers, not the whole record.** Assemble purpose-built views of their data for a specific provider or context — the cardiologist gets the cardiac-relevant slice, the trainer gets sleep/activity/HRV, a new PCP gets a longitudinal summary. The user decides exactly what each sliver contains and who receives it. Consent-scoped and per-purpose, never all-or-nothing.

3. **Capture high-signal inputs with minimal friction.** Discover which inputs actually matter for *their* goals, then log them with as little effort as possible — the right metric at the right moment, not a hundred fields nobody fills in.

4. **Learn the evidence and form hypotheses.** Understand their own data *and* the surrounding body of healthcare evidence well enough to formulate testable hypotheses about what might move them toward their goals — grounded in literature and labeled by strength of evidence, not vibes.

5. **Validate and iterate.** Understand which metrics and what methodology would let them actually test a hypothesis — n-of-1 design, what to measure, over what window, what counts as signal versus noise — and iterate toward better health.

The through-line: ayuOS is not a dashboard that shows numbers. It is a reasoning partner for a continuous loop — *understand → hypothesize → measure → learn* — with every claim labeled by how well the evidence supports it.

## What ayuOS does

ayuOS runs locally on your hardware. It:

1. Pulls data from all your sources (wearables via API, records via export or EHR sync, labs via PDF, images via DICOM, genome via raw file)
2. Normalizes everything to FHIR R4 + a time-series store
3. Runs local AI over the unified record to answer questions, detect changes, flag correlations
4. Labels every claim as source-backed, inferred, or speculative — no hallucination laundering
5. Generates scoped, consent-controlled slivers of the record on request — from a full doctor-ready brief down to a single-purpose slice for one provider
6. Runs AI locally by default; model providers are configurable — cloud APIs are available and always PII-gated, never on by default
7. Never sells data or uses it for model training regardless of deployment mode

## Why the trust claim is architectural, not policy

Every commercial health-AI product offers a privacy policy. ayuOS offers a different guarantee: in the default self-hosted configuration, the data physically cannot leave the machine. There is no network call to make, no server to subpoena.

**Self-hosted (default):** Zero-egress by default. Cloud providers and Terra Bridge are opt-in, explicitly scoped, and always PII-gated. The code is open and auditable. The user decides exactly what transits their network.

**ayuOS Cloud (managed service):** For users who want the full capability without managing infrastructure, a managed cloud tier is available. Data lives on ayuOS-operated infrastructure. The business model is subscription — data is never sold, never used for model training, never shared with third parties. This is the same trust claim Medplum makes: you can self-host for full sovereignty, or pay for managed hosting and trust the operator's published commitments.

The commercial managed service is what funds development of the open-source core. The core codebase is AGPL-3.0 and remains free forever. The managed tier is the sustainability mechanism — not the product.

Function Health and Superpower cannot make either of these claims. They are commercial businesses whose incentive structures ultimately point at the data. ayuOS's incentives point at the software.

## Success criteria

- **MVP:** Two users can ask across their entire record — from "what changed in my last 90 days?" through "what should I do about it?" — and get grounded, evidence-labeled answers that lead to a concrete next step, fully offline.
- **Phase 1:** 100 users running ayuOS on their own hardware, at least some of them running a full loop — forming a hypothesis, acting on it, and validating the result with their own data.
- **Phase 2:** 1,000 users; opt-in federated analytics contributing to open health knowledge.

!!! note "On federated analytics"
    n≈1,000 self-selected biohackers is too small and too biased to produce population-grade medical intelligence. The honest framing is opt-in citizen-science that contributes to open health knowledge — not a capability multiplier. See [Federated Analytics](federation.md).
