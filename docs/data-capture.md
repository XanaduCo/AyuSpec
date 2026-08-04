# Data Capture Strategy

!!! note "Status: draft stub"
    The framework and principles are defined; per-class capture UX and the facilitation/booking layer are still open. See [Open questions](#open-questions).

## Overview

Every loop in ayuOS — **understand → hypothesize → act → measure → learn** — runs on data the user has to get *in*. This document is the strategy for that: which classes of health data exist, how accessible each is, how useful each is, and how ayuOS lowers the friction of capturing it.

The governing insight is that **usefulness and accessibility rarely line up**. The most decisive signals (functional biomarkers, the interventions record) are the hardest to capture; the easiest to capture (consumer genomic PDFs) are often the least useful. ayuOS's job is to spend capture effort where the signal-to-friction ratio is highest, and to make the high-value/high-friction classes cheaper through passive inference, sub-10-second logging, and a facilitation layer.

This is the design behind user job #3 in the [vision](vision.md#what-users-want-to-do). It motivates the whole [Ingestion](ingestion/index.md) layer — Ingestion is *how* each pipeline works; this is *what to prioritize and why*.

## The signal/accessibility matrix

| Data class | Accessibility | Usefulness | Priority |
|---|---|---|---|
| [Wearables & home devices](#wearables-home-devices) | Partial (wearables) / Easy (home devices) | **High** — only daily-updating signal | P0 |
| [Current medical records](#current-medical-records) | Moderate, increasingly parseable | **High** | P0 |
| [Biomarkers & diagnostics](#biomarkers-diagnostics) | Hard — requires facility visits | **Very high** | P0 (facilitated) |
| [Lifestyle & interventions](#lifestyle-interventions) | Variable, often high-friction | **Critical** — the entire "action" side | P0 |
| [Self-feedback](#self-feedback) | Easy but unreliable | **High** — fastest subjective signal | P1 |
| [Psychographic & preference signal](#psychographic-preference-signal) | Easy passively / sensitive to ask | **High** — sets the voice, the routing, and whether any answer lands | P1 |
| [Screening history](#screening-history) | Scattered across records | Low analytically / **high for retention** | P1 |
| [Historical medical records](#historical-medical-records) | Tedious | Moderate — trend lines | P1 |
| [Family history](#family-history) | Moderate | Moderate — one-time prior | P1 |
| [Consumer test reports](#consumer-test-reports) | Easy (PDFs), noisy | Low — hypothesis-generating at best | P2 |
| [Environmental exposures](#environmental-exposures) | Ambient easy / personal hard | Low–moderate | P2 (ambient only) |

## Cross-cutting principles

These recur across the classes below and are the real product design:

1. **Passive before manual.** Infer from streams that already exist before asking the user to log anything. Manual capture is a last resort, not a default.
2. **Sub-10-second logging.** Anything the user must log manually gets a photo / one-tap / voice path. If it takes longer than ten seconds, adherence dies.
3. **Time-boxed, hypothesis-linked capture.** High-friction, high-signal streams (CGM, nutrition) run as **experiment windows** tied to a [hypothesis](evidence.md) — never standing diaries. A CGM is "experiment mode," not always-on.
4. **Adherence is a product problem, not a user virtue.** Assume users are undisciplined. Use EMA-style micro-prompts at contextually smart moments instead of relying on motivation.
5. **Confidence-graded interpretation.** Noisy inputs (consumer genomics, microbiome) are labeled as hypotheses; where methodology is unverifiable, say so rather than fake precision. Ties to [evidence strength labeling](evidence.md#strength-of-evidence-labeling).
6. **Own the scores.** Where a vendor's AI scores are closed but raw metrics are open, recompute our own — don't depend on a black box.
7. **The facilitation wedge.** For classes users can't self-serve (biomarkers, imaging), booking and logistics *are* the product — goal-linked test menus, lab/imaging partnerships, "re-baseline" bundles.
8. **Cheapest recurring value is a reminder.** A due-date engine ("you're due for X") is the lowest-effort retention mechanism in the product.

!!! warning "Interventions are the highest-liability data"
    The medications/supplements record is both the most important for attribution *and* the most dangerous to get wrong (interactions, dosing). Capture accuracy here is a safety concern, not just a completeness one.

## Capture strategy by data class

### Wearables & home devices
*Watches, rings, BP cuffs, smart scales, CGM.*

The only daily-updating signals in the system — they drive compliance and close the loop between infrequent lab draws (a CGM gives two-week feedback on a diet change that HbA1c takes a quarter to reflect). Wearables are partially open (closed AI scores, open basic metrics); home devices are cheap, Bluetooth, and gated only by habit.

**Fix:** [Terra](open-wearables.md) for near-parity, direct integrations (e.g. Huawei) where needed, recompute our own scores from raw metrics. Ship a device bundle at onboarding with auto-sync. Run CGM as a time-boxed experiment, not always-on.

### Current medical records
Usually PDF, variable formats, increasingly parseable. High value, mostly an engineering problem.

**Fix:** FHIR/LOINC ingestion pipeline; national record systems (NEHR/HealthHub) where accessible. See [EHR ingestion](ingestion/ehr.md).

### Biomarkers & diagnostics
*Blood panels, inflammation markers, VO2max, grip strength, DEXA, CAC, bone density.*

Very high value — blood markers generate hypotheses, and functional measures (VO2max, grip strength) are among the strongest all-cause mortality predictors. Slow-changing, so ideal for a milestone cadence. But hard to access: users can't navigate the system, and it requires facility visits.

**Fix:** the facilitation wedge — goal-linked test menus, lab and imaging partnerships, concierge booking. Bundle into annual "re-baseline" packages, which double as renewal timing. (Commercial hooks — the facilitation/booking layer — are a business-model question; see the open question below.)

### Lifestyle & interventions
*Exercise, nutrition, supplements, medications, protocols.*

**Critical** — this is the entire action side of every loop. Without the interventions record you cannot attribute any marker change to any cause. Friction is wildly variable: runs are easy, gym sessions high-friction, nutrition logging has the worst friction-to-signal ratio anywhere, and supplement/med regimens are almost never documented.

**Fix:** passive inference from wearables first; sub-10-second logging (photo, one-tap, voice) for the rest. Photo-of-the-bottle intake for supplements/meds; prompt on any "I started taking X" mention. Nutrition **only** in time-boxed experiment windows tied to a hypothesis — never a standing food diary. Feeds attribution in [Experimentation](experimentation.md).

### Self-feedback
*Energy, mood, symptoms, sleep quality.*

The fastest-updating subjective signal, and often the outcome the user actually cares about. Easy to capture only for the disciplined — i.e. unreliable for most.

**Fix:** EMA-style micro-prompts (1–2 questions) tied to active goals, fired at contextually smart moments. Treat adherence as a product problem. This is the manual-capture path referenced in [Experimentation](experimentation.md#capturing-the-inputs).

### Psychographic & preference signal
*What the person is worried about, how they communicate, what they weight when they decide, how much they trust the machine.*

Every other class on this list is data about the **body**. This one is data about the **person** — and it is what decides whether a correct answer is a useful one. The same lab result is delivered differently to someone who wants the derivation and someone who wants the plain "so what"; the same worry is routed differently for someone eyes-open about the cloud and someone who declines all egress. Without this layer the agent is clinically right and personally deaf.

The trap is to collect it with a personality quiz. That fails twice: onboarding surveys have terrible completion, and a self-reported trait is often the opposite of the behavioural one (the person who says they log everything is the one who abandons the tracker). So this is captured the same way every other signal is — **inferred first, graded for confidence, and shown with its provenance** — never asserted as a fixed fact about who someone is.

The dimensions, and where each already has a home:

- **Concerns** — what's on their mind, *including what the record implies but they have not said*. The unvoiced case is the important one: a signal the data points at and the person hasn't, held as a **hypothesis to raise at the right moment**, never announced. (New; the closest existing surface is decision-point injection in [epistemics](epistemics.md).)
- **Disposition** — communication style, affect, appetite for effort and ambiguity. Sets the *voice* of ordinary answers, not just what's in them.
- **Health literacy & numeracy** — already the [literacy profile](epistemics.md#the-literacy-profile): self-retiring, tracks what's been engaged, stops explaining once fluency shows.
- **Decision preferences** — already the [preference model](epistemics.md#the-preference-model-simplify-this-for-me): a user-visible, editable weighting that shows how it produced a ranking.
- **Trust posture** — the person's own egress and model choices, read as signal. A sovereign-purist posture and an eyes-open-cloud posture ask for different defaults.

**Capture methods, passive before manual:**

1. **Inferred from query pattern** (passive) — read from *what* they repeatedly ask and *how* they ask it. "Which source do I trust?" is a disposition signal; a cluster of cardiac questions is a concern signal.
2. **Affect from wearables** (passive, on-device) — query timing and sentiment correlated with HRV/sleep/strain, to read state and detect anxious stretches. This is what surfaces the unvoiced concern.
3. **Observed behaviour** (passive) — what they open, re-run, act on, or abandon. An abandonment pattern is a first-class capture, not a failure to log.
4. **EMA micro-prompt** (manual, sub-10s) — a single in-context, one-tap or one-voice-line check at a smart moment, that also does other work (advancing an experiment). The [self-feedback](#self-feedback) path, reused.
5. **First-run conversation & chosen posture** (manual) — a few questions in context, and the settings they pick — not an onboarding survey.

!!! warning "This is sensitive data and is held as such"
    A psychographic profile is **user-visible and editable — a stored object in the `ayuos` schema, never an inferred shadow profile** ([epistemics](epistemics.md#the-preference-model-simplify-this-for-me)). Every attribute carries how it was captured and how confident we are; it can be corrected or deleted; the affect inference runs on-device and its use is disclosed. An unvoiced concern is held as a hypothesis and surfaced as a question, never delivered as a verdict.

**The two sample profiles** ([Ravi and Maya](personas.md)) are the illustration: Ravi gives the system a dense query history and audits what it infers; Maya gives it little on purpose and the work is earning the rest without taxing her. Same schema, opposite capture problems. The live version is the demo's [Profile view](demo/index.html#/profile).

**Fix:** infer from the streams that already exist (queries, behaviour, wearables) before asking anything; grade every attribute for confidence and show its evidence; reuse the EMA path for the rest; keep the whole profile visible and editable. The [expansion roadmap](personas.md#how-wed-weave-more-in) — the next increment for each signal and the consent it's bound to — is carried per-person in the profiles.

### Screening history
*Colonoscopy, mammogram, skin checks, vaccinations.*

Scattered across records, rarely consolidated. Low analytical value but **high retention value** — "you're due for X" is the cheapest recurring value the product delivers.

**Fix:** extract during record ingestion; maintain a **due-date engine** against age/sex/risk guidelines; nudge and facilitate booking.

### Historical medical records
Very tedious to retrieve, easier if doctor-mediated. Moderate value — the payoff is long-term trend lines (lipids, glucose, BP, weight).

**Fix:** country-specific retrieval playbooks (GDPR Art. 15 in the EU; HealthHub + clinic requests in SG); OCR/LLM extraction into a longitudinal timeline; accept incompleteness. See [Lab PDF ingestion](ingestion/labs.md).

### Family history
Moderately hard to gather. A cheap one-time prior that shifts risk stratification and test prioritization.

**Fix:** conversational AI intake at onboarding (an interview, not a form); prompt for updates only on life events.

### Consumer test reports
*Genomic, epigenetic, microbiome.*

PDFs are available but noisy, with often-opaque methodology. **Low** value — hypothesis-generating at best, and can distract from high-yield interventions.

**Fix:** a confidence-graded interpretation layer; label outputs explicitly as hypotheses; where methodology is unverifiable, say so rather than pretending precision. See [Genomics ingestion](ingestion/genomics.md).

### Environmental exposures
*Air quality, water, noise, toxins, occupational.*

Ambient data (air quality, UV) is easy via location APIs; personal exposures (mold, occupational, water) are hard and need specialized testing. Low–moderate value today — occasionally decisive (respiratory issues, unexplained inflammation, sleep disruption from noise/light) but weak loops for most users.

**Fix:** two tiers. Passive location-based ambient data is nearly free — ingest it and hold it as context for hypothesis generation. Personal exposure testing only when a specific unresolved problem warrants it, through the same [facilitation channel](#biomarkers-diagnostics) as biomarkers. Don't build UI around this early; keep it as background signal the AI can reach for.

## Open questions

- [ ] What is the passive-inference layer — a set of rules, or a model that watches streams and proposes "did you start X?" prompts?
- [ ] What's the concrete sub-10-second capture UX for photo/voice/one-tap, and where does it live in the [frontend](frontend.md)?
- [ ] Does the facilitation/booking layer belong in the open-source core or the managed cloud tier? (It implies partnerships and PII handling.)
- [ ] What guideline source powers the screening due-date engine, and how is it kept current per country?
- [ ] How much of the country-specific record-retrieval playbook can be automated vs. documented for the user to execute?
- [ ] Where do onboarding-interview outputs (family history, goals) land in the schema — FHIR `FamilyMemberHistory` + a goals object?
- [ ] What is the confidence-decay policy on an inferred psychographic attribute — does a stale disposition signal lose weight over time, or only when contradicted by newer behaviour?
- [ ] Should the disposition read set the *voice* of ordinary answers (warmer/more quantitative), or only the injection and routing decisions? (Mirrors the open question in [epistemics](epistemics.md).)
