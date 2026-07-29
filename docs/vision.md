# Vision & Problem

## The problem

A person who takes their health seriously accumulates data from many disconnected sources:

- Two or three wearables (Oura, Whoop, Garmin) tracking sleep, HRV, activity
- Quarterly labs from a concierge clinic or LabCorp
- MRIs from the past five years, sitting on a USB drive
- A 23andMe genome file, downloaded once and never revisited
- Medical records from three different health systems, each locked in a patient portal

There is no single place to ask: **"what actually changed in my last 90 days, and what should I do about it?"**

Every existing tool either:

1. **Silos the data** — Oura shows Oura data; MyChart shows records; 23andMe shows SNPs. No cross-source reasoning.
2. **Requires cloud custody** — Function Health, Superpower, ChatGPT Health all require your data to live on someone else's servers. The AI answers questions, but the company now holds your health history.
3. **Can't be trusted not to monetize** — PicnicHealth's business model is selling de-identified cohort data to pharma. Function Health is a $2.5B business. Every commercial player has an incentive structure that eventually points at the data.

## The user

**Primary (MVP):** Biohacker with access to their own records — wearables, labs, maybe a genome file, possibly MRIs. Comfortable running software on a Mac Mini or similar local machine. Values data sovereignty. Wants AI-powered synthesis, not just dashboards.

**Secondary:** Anyone who wants a second opinion on their health, a longevity-optimized brief to bring to a doctor, or a way to understand what their genome file actually means.

**Not targeting (yet):** People who need EHR live-sync as the primary data source. The Apple Health export path covers many institutions without requiring Epic app registration.

## What ayuOS does

ayuOS runs locally on your hardware. It:

1. Pulls data from all your sources (wearables via API, records via export or EHR sync, labs via PDF, images via DICOM, genome via raw file)
2. Normalizes everything to FHIR R4 + a time-series store
3. Runs local AI over the unified record to answer questions, detect changes, flag correlations
4. Labels every claim as source-backed, inferred, or speculative — no hallucination laundering
5. Generates doctor-ready briefs on request
6. Never sends data anywhere unless you explicitly toggle cloud escalation for a specific query

## Why the trust claim is architectural, not policy

Every commercial health-AI product offers a privacy policy. ayuOS offers a different guarantee: the data physically cannot leave the machine in the default configuration. There is no network call to make, no server to subpoena, no business model that could ever incentivize data sale — because there is no business.

This is the one differentiation that Function Health, Superpower, and ChatGPT Health cannot replicate. They are commercial products. ayuOS is a public good.

## Success criteria

- **MVP:** Two users can each ask "what changed in my last 90 days?" and get a grounded, labeled answer, fully offline.
- **Phase 1:** 100 users running ayuOS on their own hardware.
- **Phase 2:** 1,000 users; opt-in federated analytics contributing to open health knowledge.

!!! note "On federated analytics"
    n≈1,000 self-selected biohackers is too small and too biased to produce population-grade medical intelligence. The honest framing is opt-in citizen-science that contributes to open health knowledge — not a capability multiplier. See [Federated Analytics](federation.md).
