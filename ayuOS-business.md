AyuOS
Public-Service Open-Source Personal Health Agent — Competitive Landscape, PRD, Adoption & Stewardship


Prepared for: Ashish Chordia
Date: 10 June 2026
Confidence tags: [H] high · [M] moderate · [L] low · [U] unknown. Funding/headcount/traction figures change frequently; all are best-available as of search date.
1. Bottom line up front (read this first)
Framing (updated): This is a non-commercial public service, released and kept open-source, with no intent to monetize. That changes the calculus materially. Most of my earlier critique was about monetization — and monetization is now irrelevant. Success is no longer revenue; it is adoption, trust, and sustainable stewardship of a public good. Several judgments below are reframed accordingly.
Strongest counterargument, restated for a public good: the failure mode is no longer 'can't make money' — it is 'abandonment and irrelevance.' Open-source public-service health tools have a graveyard: they die from maintainer burnout and from the unfunded, never-ending work of keeping EHR/device connectors alive (vendor APIs break constantly). Meanwhile the free platform-giant assistants (ChatGPT/Copilot/Claude/Amazon Health) lower the adoption case for a harder-to-use self-hosted tool. The project is still three hard problems stapled together — EHR-interop, a consumer data app, and a federated-learning research program — and the valuable, unglamorous part (reliable ingestion) does not get easier because it is a public good or because it runs on a Mac. The mitigations are governance and sustainability, not a business model (see §7).
Fact: Direct OSS analogues already exist and are live. [H] OpenHealth (~3.8k GitHub stars), OpenMed, Mere Medical, and Fasten Health (~2.7k stars) all do local-first aggregation + LLM chat. None has a large active user base. The 100→1,000 user goal is achievable; the question is whether it matters.
Fact: The consumer wedge is being captured by capital — but you are not competing for that wedge. [H] Function Health raised $298M at a $2.5B valuation (Nov 2025), 200k+ members; Superpower raised ~$34M. Their advantage is a paid lab+concierge UX. As a free public service you don't compete on that axis at all — you compete on trust and ownership, where their commercial incentives are a liability and yours are absent.
Fact (new, from peer review): The generic 'AI over your health data' layer was commoditized by the platform giants in 1H 2026. [H] OpenAI shipped ChatGPT Health (Jan 2026), Anthropic Claude for Healthcare (Jan 2026), Microsoft Copilot Health (Mar 2026, records from 50,000+ US orgs + wearables + labs + visit-prep), and Amazon expanded its Health AI. The differentiator therefore cannot be 'we have an AI that reads your labs' — that is now free inside every major assistant. What remains, and what a non-commercial public service can claim more credibly than any of them: ownership, locality, auditability, connector breadth, and — decisively — no incentive to ever monetize the user's PHI. That last point is categorically stronger for a public good than for a $2.5B startup.
Inference: Your edge is credibility and mission, not a funnel. [M] Your standing in longevity (Elyx) and population genomics (Chiranjiv) gives the project legitimacy, contributors, and early users. But note the tension that the public-service framing creates: using a public-good tool as a data funnel for commercial Elyx/Chiranjiv would compromise the very trust that is its differentiator. The resolution is a governance firewall — the tool captures nothing centrally; any Elyx/Chiranjiv linkage is opt-in, separate, and transparent (see §7).
Speculation: Phase-2 federated learning across 1,000 biohacker Mac Minis remains the weakest part of the thesis. [M] n≈1,000 self-selected biohackers is too small, too biased, and too label-noisy to produce population-grade medical intelligence. The good news: as a public good, the honest reframing — opt-in, citizen-science federated analytics that contributes to open health knowledge — fits the mission far better than the original 'make the model smarter' claim. Treat it as a public-research asset, not a capability multiplier. See §5.
Net judgment (revised): Build it as a genuine public good. The earlier 'don't build it as a venture' caution no longer applies — there is no venture. Ship a 6–9 month MVP that wraps existing OSS (Fasten + Open Wearables + Medplum + Ollama/MedGemma) rather than rebuilding interop, and put equal weight on the thing that actually kills public-service software: a credible stewardship and sustainability model (governance, license, maintainer funding, contributor community — see §7). The 'no commercial motive' stance is not a weakness here; it is the single most credible trust claim available in a market where every other player, free or paid, has a monetization incentive. Win on trust, sovereignty, and longevity-of-maintenance — not on features the giants already give away.

1b. Strategic update: open-core commercial model (supersedes "non-commercial" framing)
The project has adopted an open-core commercial model, following the Medplum precedent:

- **AGPL-3.0 self-hosted core** — free forever, full sovereignty, open and auditable. This remains the primary trust claim and the genuine public good.
- **ayuOS Cloud (managed service)** — subscription-funded managed hosting for users who want the full capability without doing the ops work. Data is never sold or used for model training. Revenue from the managed service funds maintenance of the open-source core.
- **Terra Bridge (paid add-on)** — optional integration with Terra's wearable API aggregation service, for providers that require formal developer agreements. Data transits Terra's cloud before landing in the user's local store. Requires explicit per-provider consent.
- **Configurable model providers** — users may choose local inference (Ollama, default), local-network inference, or cloud APIs (Anthropic, OpenAI, Google). Cloud API calls are always PII-stripped before leaving the machine.

The trust claim shifts from "there is no commercial incentive because there is no business" to "the business model is subscription — not data — so the incentive to monetize PHI structurally does not exist." This is the same claim Medplum and GitLab make. It is weaker than pure non-commercial but more sustainable and still substantially stronger than Function Health, Superpower, or any platform-giant health AI.

The governance firewall remains: the open-source foundation and the commercial managed service are legally separate entities. Any integration with Elyx or Chiranjiv is opt-in, separate-codepath, and disclosed. The AGPL-3.0 license prevents a commercial fork from taking the core private.

What did NOT change: the primary user value proposition (local-first, data sovereignty, open and auditable), the self-hosted tier (free, zero-egress by default), the FHIR/Medplum architecture, and the commitment to never monetize user PHI in any tier.

2. Competitive landscape
The market splits into five layers. Your concept spans all five, which is the core scoping risk. Profiles below give year founded, headcount, funding, key investors, traction, users, and revenue where verifiable; gaps are marked [U].
2.1 Master comparison
Company / Project
Layer
Founded
Funding
Users / Traction
Model & licensing
OpenHealth (OpenHealthForAll)
OSS agent
~2024
None [U]
~3.8k★ GitHub [M]
AGPL-3.0; local via Ollama
OpenMed (ianrowan)
OSS agent
~2024
None [U]
Small [M]
OSS; 100% local LLM option
Mere Medical
OSS PHR
~2023
None [U]
Niche [M]
Self-host; solo dev
Fasten Health
OSS PHR
2022
Bootstrapped [H]
~2.7k★; 'thousands' [M]
GPL-3.0 + $50 commercial
Metriport
Data infra
2022
$2.4M seed [H]
300M+ patient records reachable [H]
AGPL; bootstrapped since
PicnicHealth / PicnicAI
Data infra / RWD
2014
$100M+ [H]
10 of top-30 pharma [H]
Closed; B2B data biz
Function Health
Consumer
2022/23
$350M total [H]
200k+ members [H]
Closed; $365/yr
Superpower
Consumer
2023
~$34M total [H]
150k+ waitlist [H]
Closed; $199–499/yr
Guava Health
Consumer
2021
Undisclosed/small [U]
~110k downloads [M]
Closed; freemium
MedGemma (Google)
Model
2025
n/a (Google)
Open weights [H]
Gemma/Health AI Dev Foundations
Meditron (EPFL/Yale)
Model
2023
Academic [H]
30k+ downloads [M]
Apache/Llama-based
NVIDIA FLARE
FL framework
2021
NVIDIA
Production-grade [H]
Apache-2.0

★ = GitHub stars at last observed source date.  [see profiles for detail]
2.2 Open-source direct comparables (your true peer set)
OpenHealth — OpenHealthForAll/open-health
What it is: AGPL-3.0 web app; ingests blood tests, checkups, Apple Health/Google Fit, Oura/Whoop/Garmin, family history; parses to a unified format; chats via local (Ollama: Llama, DeepSeek) or cloud (GPT/Claude/Gemini) models. Runs fully local. [H]
Traction: ~3,816 GitHub stars at source date; multilingual community (Korean-origin). No company, no funding, no published MAU. [M]
Why it matters: This is ~70% of your Phase-1 spec, already free. Any pitch must explain what you add beyond it (answer: EHR depth, agentic actions, medical-grade models, curation).
OpenMed (ianrowan) / Mediar-Aiden (louis030195) / openCHA (UC Irvine)
OpenMed: agentic personal medical assistant; upload bloodwork + genetics, natural-language insights, 100% local LLM support. Solo/community. [M]
Mediar/Aiden: AI health coach over wearables, built on Metriport's open API + Evervault anonymization; self-host with your own LLM. Demonstrates the exact 'anonymize-before-cloud' pattern you want. [M]
openCHA: academic open framework for Conversational Health Agents — orchestrator + tools + external knowledge to reduce hallucination. Useful as a reference architecture, not a product. [H]
Fasten Health & Mere Medical (PHR aggregation)
Fasten: GPL-3.0 self-hosted EMR aggregator; SMART-on-FHIR clients for a large provider catalog (claims 100k's; ~650–10k live). Founder-led, bootstrapped, $50 perpetual commercial license, GitHub sponsors. Roadmap explicitly lists 'ChatGPT-style offline query of your records,' guideline-based recommendations (HEDIS/CQL), and wearable integration — i.e., it is drifting toward your exact concept. [H]
Mere Medical: self-hosted, offline-first PHR sync across patient portals; single-developer (med student). Good code to fork; not a competitor with resources. [M]
Strategic read: Fasten is your most efficient build-vs-buy answer for the EHR-ingestion layer. Forking/partnering beats rebuilding SMART-on-FHIR connectors. New angle: approach the Fasten maintainer about collaboration before writing a line of connector code.
2.3 Health-data infrastructure
Metriport — open-source 'Plaid for healthcare'
Founded
2022 (YC S22), San Francisco. Founders Dima Goncharov, Colin Elsinga. [H]
Headcount
~12–26 (sources vary: Latka 12; PitchBook 26). [M]
Funding
$2.4M seed at ~$20M post-money (Dec 2022). PitchBook lists ~$2.9M total. No disclosed Series A — effectively bootstrapped since. [H/M]
Investors
Y Combinator, Nueterra Capital, Triple Impact, Leonis, Zillionize, VentureSouq, Stonks, MyAsiaVC. [H]
Traction
Medical API reaches 300M+ patients via CommonWell/Carequality/eHealth Exchange; customers incl. Circle Medical. AI Medical Record Summaries shipped. [H]
Revenue
~$5M ARR claimed (Latka, self-reported est). [L]
Relevance
Open-source EHR + device aggregation is the spine of your product. Their existence both de-risks (reusable API) and threatens (they could ship a consumer client). License is AGPL — usable, with copyleft implications.

Other infra (not separately profiled): Particle Health, Health Gorilla, 1upHealth, Flexpa, Zus Health — all closed, funded, FHIR/HIE aggregators. Apple Health Records (free, on-device, 800+ institutions via SMART-on-FHIR) is a quiet incumbent you should integrate with rather than fight.  [H]
PicnicHealth / PicnicAI — the cautionary monetization archetype
Why it's here, not in the consumer section: PicnicHealth looks like a patient-records app but is a B2B real-world-data (RWD) business. It is the most mature consumer-health-record aggregator alive, and the most instructive contrast for this project — it shows what record aggregation becomes once it needs revenue: it sells the de-identified data to pharma. A public service that refuses to monetize data never enters this trap, and that refusal is precisely the trust differentiator AyuOS is built on.
Founded
2014, San Francisco. Founders Noga Leviner (CEO; Crohn's patient) & Troy Astorino (CTO). YC alum. Now parent-branded 'PicnicAI' with two arms: PicnicHealth (consumer) + PicnicResearch (pharma RWD). [H]
Headcount
~100 (YC, 2026); trackers say 51–200. [M]
Funding
$100M+ total: $10M Series A (Amplify, 2018), $25M Series B (Felicis, 2020), $60M Series C (B Capital, 2022). No confirmed raise since 2022. [H]
Investors
B Capital Group, Felicis, Amplify, Y Combinator; angels incl. Paul Buchheit, Sam Lessin, Social+Capital. [H]
Traction
Tens of thousands of consented patients; partners with 10 of the top 30 life-sciences companies (incl. Roche/Genentech); RWD cohorts across dozens of chronic/rare indications. [H]
Revenue model
Undisclosed totals. Real business = selling de-identified RWD/cohorts to pharma. Consumer app historically $299 initial + $39/mo, and FREE if the patient contributes data to research — i.e., the app is a funnel for the data business. [M]
Tech
Human-in-the-loop ML: ingests records from any US EMR via patient-authorized retrieval (incl. fax/mail), then HUMAN curators structure them into research-grade data. Recently shipped a patient-facing AI assistant + research AI agents. [H]
Lessons for this project
(1) The only proven way anyone has monetized consumer record-aggregation at scale is by selling the aggregated data — which is exactly why a public service that takes monetization off the table is the credible alternative, not a commercial weakling. (2) Even with $100M+ and a decade, structuring messy records still needs human curators — a direct warning against assuming on-device MedGemma parses records cleanly and solo; budget for parsing failure, and lean on upstream OSS (Fasten/Medplum) so you aren't the sole maintainer. (3) PicnicHealth is the anti-pattern: AyuOS's value proposition is doing the aggregation WITHOUT the data-monetization that PicnicHealth's economics force on it.

2.4 Closed-source consumer / longevity platforms
Function Health
Founded
2022; public launch 2023. Austin, TX. CEO Jonathan Swerdlin; co-founder Dr. Mark Hyman. [H]
Headcount
~472 (Tracxn, Apr 2026). [H]
Funding
$350M total. $298M Series B (Nov 2025) led by Redpoint at $2.5B valuation; unicorn in ~3 yrs. [H]
Investors
Redpoint, a16z, Battery, Aglaé, Alumni Ventures, NFDG (Friedman/Gross), Anthony Wood; celebrity/athlete backers (Damon, Efron, Antetokounmpo et al.). [H]
Traction / Users
200k+ members (May 2025, up from ~40k a year prior); 50M+ lab tests processed; acquired Ezra for full-body MRI; launched Medical Intelligence (MI) Lab gen-AI. [H]
Revenue
~$100M run-rate est. (Sacra, Feb 2025), ~450% YoY. [M]
Threat
Directly building 'the operating system for human health' — data consolidation + AI. This is your concept with a $2.5B balance sheet, minus the open-source/on-device privacy stance. Privacy + sovereignty is the only axis where you can differentiate.

Superpower
Founded
2023. SF/LA. Founders Max Marchione, Jacob Peters, Kevin Unkrich. [H]
Funding
~$34M total: $4M pre-seed (2024) + $30M Series A (Apr 2025, Forerunner). Valuation reported >$300M by Sacra/press; one deal tracker logged ~$150M post-money — treat exact figure as contested. [M]
Investors
Forerunner, Susa, Day One, Long Journey, Winklevoss Capital, Balaji Srinivasan, J. Neman; celebs (Hudgens, Aoki, L. Paul, Antetokounmpo). [H]
Traction
150k+ waitlist; 100+ biomarkers/draw via Quest; acquired Base (90k nutrition users) + Feminade (women's health); AI coach in beta. [H]
Revenue
Early; largely pre-revenue at scale. [U]
Relevance
Same 'health super-app / algorithm as front door' thesis as Function. Confirms category momentum and that 'aggregate + AI + act' is the consensus design.

Guava Health — closest Phase-1 feature match
Founded
2021. Santa Barbara, CA. Founders Dylan Wenzlau (CEO) & Alex Yau — engineers who built the personal-assistant team at Graphiq (acquired by Amazon Alexa, 2017). [H]
Headcount
~8 (Tracxn, mid-2024); small team. [M]
Funding
One round (pre-seed / 'unattributed VC'), 1 institutional investor; amount undisclosed/masked across Crunchbase, Tracxn, PitchBook. Founders self-funded + committed future capital. Total is small. [U on amount]
Investors
Largely founder-funded; one undisclosed institutional backer; an unnamed advisor with multiple $1B+ exits. [L]
Traction
~110k Android downloads (AppBrain); connected to 50,000–100,000+ US providers via patient portals (MyChart, Epic, Cerner). Loyal niche in the chronic-illness community. [M]
Users / Revenue
Active users not disclosed (tens of thousands order-of-magnitude). Revenue undisclosed; freemium, no ads, does not sell data — likely pre-meaningful-revenue. [U]
Positioning
Cloud, mobile-first, chronic-illness focus (POTS, EDS, MCAS, ME/CFS, Long COVID) — NOT biohacker/longevity. HIPAA-compliant: privacy-by-policy, not privacy-by-architecture. [H]
Features
Record aggregation; ingests CCDA, DICOM (X-ray/MRI), PDFs/images; AI summarization of doctor notes; symptom/med/mood tracking with correlation insights ('body heat map'); AI visit-prep; emergency card; period tracking; device sync (Oura, Fitbit, iHealth); NFC 'Guava Tags' for tap-to-log. [H]
Strategic read
Arguably a CLOSER match to your Phase-1 vision than Function/Superpower: it leads with aggregation + correlation + AI-summary + doctor-prep (your front end), not a lab funnel — and ships it free across a huge provider network. It clears the UX bar you must meet. But it ships NONE of your differentiators: on-device/local LLM, open-source/auditable, biohacker-grade depth (genomics, advanced biomarkers, aging clocks), or agentic actions. Its small team and undisclosed revenue are no longer a cautionary tale about monetization (irrelevant to a public service) — they simply confirm that a lean team can serve this audience and that demand is real.

Adjacent consumer (lower confidence, not deep-profiled): Wild Health / Heads Up Health (precision-medicine + data aggregation), Ultrahuman (metabolic wearable + 'Blood Vision'), January AI, Lifeforce, Bryan Johnson's Blueprint/Don't Die (protocol + community, not software). Quantified-self apps: Bearable, Gyroscope.  [M]
2.5 On-device medical model layer (your embedded LLM options)
Model
Origin
License / size
Fit for on-device use
MedGemma 4B / 27B
Google DeepMind (2025)
Open weights (Gemma); 4B multimodal, 27B text/mm
Best default. Runs on single GPU; 4B quantizes to consumer/Mac hardware. Multimodal (X-ray, derm, path, ophtho) via MedSigLIP. Version-lockable for audit. [H]
Meditron 7B/8B/70B
EPFL + Yale + ICRC
Open (Llama-based)
Strong clinical QA; 8B fits local. Evidence-grounded lineage (guidelines/PubMed). [H]
OpenBioLLM 8B/70B
Saama AI Labs
Open (Llama 3)
Biomedical NER, QA, de-identification; 8B local-friendly. [H]
BioMistral 7B
Academic
Open (Mistral)
Lightweight multilingual medical; good fallback. [M]
Gemma 3 / Llama 3.x (general)
Google / Meta
Open
General reasoning + tool-use backbone; pair with medical model for routing. [H]

Design note: Do not rely on a single medical model. Use a general model (Gemma 3 / Llama) for agentic orchestration and tool-use, and route clinical-reasoning / image tasks to MedGemma. Keep all inference local; allow an explicit, anonymized cloud-escalation toggle for hard cases.  [M]
2.6 Phase-2 federated-learning / privacy stack
NVIDIA FLARE: Apache-2.0 FL SDK, healthcare-hardened (imaging, genomics), supports differential privacy + homomorphic encryption (TenSEAL/SEAL). Most production-ready. [H]
Flower: framework-agnostic, large community, best for prototyping across heterogeneous clients (your Mac-Mini fleet). [H]
Owkin Substra: strongest privacy/compliance posture; designed for cross-institution medical FL. [H]
OpenMined PySyft / TenSEAL: privacy-preserving ML, DP + SMPC + HE primitives. [H]
Reality check: These frameworks solve the 'how to train without moving data' problem. They do not solve your real Phase-2 problem, which is statistical, not cryptographic (see §6).  [H]
2.7 Platform-giant entrants (2026) — the category-defining threat
The biggest competitive shift since the original draft is that every major AI platform launched a consumer health assistant in 1H 2026. None is open-source or on-device, but all commoditize the 'chat over my records' layer.  [H]
Entrant
Launched
What it does
OpenAI — ChatGPT Health
Jan 2026
Connects medical records + wellness apps for personalized answers.
Anthropic — Claude for Healthcare
Jan 2026
Healthcare-oriented assistant (same week as OpenAI).
Microsoft — Copilot Health
Mar 2026
Records from 50,000+ US orgs + wearables (Apple Health, Oura, Fitbit) + labs; visit-prep + insights; won't train on health data; ISO/IEC 42001.
Amazon — Health AI
2026
Expanded from One Medical members; answers record questions, books appointments.
Google — Gemini / b.well
Oct 2025 partnership
b.well partnership for personalized health-data access; no dedicated Gemini health feature confirmed at review date.

Implication: Compete on what they structurally won't do — keep PHI on the user's own hardware, open the code, and out-cover them on connector breadth and provenance. As a non-commercial public service you also hold a trust position none of them can: there is no incentive, now or later, to monetize the user's data. Do not compete on model quality of generic Q&A.  [H]
2.8 Cross-review additions (peer-agent comparables)
Surfaced by the Gemini/OpenAI reviews and worth logging; compact form, not deep-profiled. Confidence on private figures is low unless noted.  [M]
Project / Company
Type
Stat
Relevance
Heads Up Health
Closed (clinic)
Founded 2014; ~75k users, 20+ countries [M]
Biohacker→practitioner workspace; proves longitudinal dashboards monetize via clinics.
Welltory
Closed (consumer)
~$14M raised; 16–17M users, 190k paid [M]
PPG/HRV analytics; source of the phone-camera HRV idea (see §4).
Validic
Infra
Founded 2010; ~$30M; 700+ devices [M]
Device-normalization layer you implicitly compete with; Kaiser-backed.
Junction (ex-Vital)
Infra
2021; ~$21M; Creandum, YC [M]
B2B wearable+lab API; closed-source middleware you can undercut on openness.
Gyroscope
Closed (consumer)
2014; ~$1.3M; declining [M]
Cautionary: cloud-AI coaching economics forced a $199/mo human-coach pivot.
Exist.io
Closed (consumer)
Bootstrapped; 1–10 ppl [M]
Multi-variable correlation niche; proves a tiny team can hold a dedicated cohort.
OwnChart
OSS
2025; solo/small [M]
Source of evidence-assertion labeling + model audit trail (see §4).
HiMe
OSS
2024; solo/small [M]
Local-first; multi-gateway IM access (note privacy caveat in §10).
Open Wearables
OSS
Active [M]
Self-hosted unified wearable API (Garmin/Whoop/Apple Health) — closest OSS answer to your device-ingestion need.
Tula / OpenClaw Medical Skills
OSS
Active; ~2.6k★ [M]
Agent 'health skill layers' (SMART-on-FHIR, PDF capture, portal messages, visit prep, trial eligibility) to leverage or outpace.
Medplum / HAPI FHIR
OSS infra
Medplum 2021, YC [M]
Production-grade open clinical repositories — your FHIR backbone (TS vs Java).
Open Humans / Open mHealth
OSS / nonprofit
Established [M]
Consent-based personal-data sharing + wearable schemas; the Phase-2 consent substrate.


3. Product Requirements Document (PRD)
3.1 Vision & positioning
One-liner: AyuOS is a local-first, open-source health agent that turns your scattered medical records, genome, biomarkers, and wearable streams into one private, queryable, longitudinal model of your body — and acts on it.
Positioning vs. incumbents: Function/Superpower own 'aggregate + AI + concierge' but require trusting a company with your data and buying their lab funnel. The wedge here is sovereignty + transparency + extensibility: your data never leaves your hardware, the code is auditable, and the model improves with the open ecosystem. This is the one claim a $2.5B incumbent structurally cannot make.
3.2 Target users (phase 1)
Primary: Technical biohackers / quantified-self practitioners who already self-host, own Oura/Whoop/CGM/DEXA data, and distrust cloud health apps.
Secondary: Longevity-oriented professionals (incl. Elyx member archetype) who want a doctor-ready data packet and a second opinion engine.
Anti-persona: Non-technical mainstream consumers — they are better served by Function/Apple Health. Do not design for them in Phase 1; the self-host friction is a feature (filters for the right early cohort) not a bug.
3.3 Scope — phased
Phase
Scope
P0 MVP (0–6 mo)
Local install (Mac mini/MacBook); ingest Apple Health export + Oura/Whoop APIs + manual PDF labs; parse to unified schema; local LLM chat (MedGemma + general model via Ollama); timeline + correlation dashboard; export 'doctor packet'.
P1 (6–12 mo)
EHR ingestion via SMART-on-FHIR (fork/partner Fasten or integrate Metriport); genome (VCF/23andMe) ingestion; agentic actions (appointment requests, voice calls); periodic 'new interventions for you' research agent; auto-pull record updates.
P2 (12–24 mo)
Multimodal (imaging/DICOM + MedGemma vision); cohort percentile benchmarking; opt-in federated learning + differential privacy; plugin/skill marketplace.

3.4 Functional requirements
F1 — Data ingestion & normalization
Wearables/devices: Oura, Whoop, Apple Health/HealthKit, Google Fit, Garmin, Dexcom/CGM, smart scales, BP cuffs, DEXA. Pull via official APIs; store raw + normalized. [core]
Records: EHR via SMART-on-FHIR (Epic, Cerner, Apple Health Records), C-CDA/FHIR R4 + PDF; labs; prescriptions. Continuous polling for updates. [core]
Genomics: 23andMe / AncestryDNA raw, WGS/WES VCF, PRS inputs. [P1]
Unified schema: map heterogeneous sources to one FHIR-aligned internal model; de-duplicate; code-crosswalk (LOINC/SNOMED/RxNorm). [core]
F2 — Storage & privacy
All PHI stored encrypted at rest on user device; no PHI egress by default; full local operation must be possible (Ollama). [core]
Audit log of every data access and every model call; user-visible. [core]
Explicit, per-query, anonymized cloud-escalation toggle (Evervault/PII-stripping pattern) for hard cases. [core]
F3 — Intelligence & agent
RAG over the user's unified record + a curated medical knowledge base (guidelines, PubMed) to ground answers and cut hallucination. [core]
Local medical reasoning (MedGemma) + general orchestration model; tool-use/agent loop. [core]
Periodic background 'research agent': scans new therapeutics/trials/interventions relevant to the user's profile; surfaces digest. [P1]
Agentic actions ('agent prepares, user approves'): draft portal messages, fill forms, and request appointments with explicit user confirmation before any send. Autonomous outbound voice-calling is deferred — draft-and-approve first; transcripts kept locally. [P1]
F4 — Dashboard & outputs
Longitudinal timeline; cross-correlation of any two series (e.g., HRV vs. glucose vs. sleep); biomarker trends with reference ranges. [core]
'Doctor packet' / second-opinion export: pulls relevant data + cited research into a shareable brief for a clinician. [core — your stated differentiator]
Aging-clock / biological-age estimate; risk flags. [P1]
F5 — Updates & extensibility
Periodic auto-update of local models and connectors. [core]
Plugin/skill architecture (MCP-style) for new data sources and analyses; community-contributable. [P1]
3.5 Non-functional requirements
Privacy: local-first, zero-PHI-egress default, auditable, open-source license. This is the product, not a feature.
Hardware target: must run useful inference on Apple Silicon (M-series, 16–32GB) with a 4–8B medical model quantized; degrade gracefully. Memory bandwidth, not compute, is the bottleneck for token generation. [M]
CRITICAL platform constraint (new, from peer review): a Mac mini/MacBook CANNOT be the sole Apple-side ingestion point. Apple does not support HealthKit on macOS — macOS apps cannot read or write HealthKit data (isHealthDataAvailable() returns false), per Apple WWDR. To ingest Apple Health you need an iPhone/iPad companion app (or a CDA/XML export workaround). This revises the original 'Mac mini only' deployment premise.  [H]
Safety: not a diagnostic device; persistent disclaimers; guideline-grounded outputs; refuse to dose/prescribe; escalate red-flags to 'see a clinician.'
Trust: reproducible builds, signed releases, published security model — your install base is paranoid by selection.
3.6 Technology options
Layer
Recommended
Alternatives / notes
EHR connectors
Fork/partner Fasten Health (SMART-on-FHIR) or integrate Metriport API
Build-from-scratch is the #1 time sink; don't. Apple Health Records covers many institutions free. Epic standalone-launch: OAuth2+PKCE, ~5–10 min token expiry, refresh tokens, exponential backoff; Epic vs Cerner scope strings differ. [H]
Apple Health ingestion
iPhone/iPad companion app (HealthKit) syncing to the Mac node
Required — macOS can't read HealthKit (see §3.5). [H]
Device data
Open Wearables (OSS unified API) + direct vendor APIs (Oura/WHOOP/Dexcom/Withings); Metriport/Validic as fallback
Open Wearables is the closest OSS fit and on-thesis; closed infra (Validic/Junction) is what you'd otherwise pay. [M]
Clinical data model
FHIR R4 source-of-truth via Medplum (TS) or HAPI FHIR (Java); + time-series store for streams
Don't invent an ontology; Open mHealth for wearable schemas; add OMOP mirror only if research analytics later. [H]
Local inference
Ollama / llama.cpp (GGUF) + MLX on Apple Silicon
LM Studio for non-technical install. [H]
Medical model
Route: small medical model (MedGemma 4B) for extraction/SOAP → larger reasoner (Qwen3/DeepSeek-R1/Llama) for complex queries
Meditron / OpenBioLLM / BioMistral as alternates; ensemble for safety. [H]
RAG / vector store
Postgres 16 + pgvector; embeddinggemma-300m on-device embeddings; chunk ~512/64-overlap
Keep corpus on-device; ship curated guideline pack. [M]
Agent / skill layer
Lightweight tool-use loop; leverage or outpace Tula / OpenClaw Medical Skills; openCHA patterns
Avoid heavyweight cloud agent stacks that assume egress. [M]
Evidence sources
Live API retrieval: PubMed, ClinicalTrials.gov v2, DailyMed, RxNorm — cached locally, attached as citations
Principled answer to 'what's new for me?' without hallucinating from weights. [H]
Comms / appointments
'Agent prepares, user approves': Playwright for portal automation, Twilio for voice (deferred). Explicit confirm before send.
Regulated + brittle; draft-and-approve before autonomy. [M]
Packaging
One-command installer (curl | Mac .dmg); Umbrel/Start9/CasaOS app; TestFlight companion; optional Obsidian vault sync
Meet self-hosters where they live; lower setup friction. [M]
Phase-2 FL
Flower + PEFT/LoRA on-device + secure distillation (soft labels) + local DP; NVIDIA FLARE for prod
See §5 — mechanisms only; does not fix the statistics. [H]

3.7 Regulatory & compliance posture (new, from peer review)
Feasibility tailwind: ONC Cures Act Final Rule + CMS Patient Access API rules (reporting from 2026) + Epic's 50+ published APIs make user-permissioned record access viable — though portal quality, inconsistent FHIR payloads, and PDFs remain the hard part. [H]
Stay in the CDS safe lane: FDA's Clinical Decision Support framing is materially friendlier to tools that support rather than replace clinician judgment. Position AyuOS as organize/explain/summarize/retrieve/prepare — not diagnose or treat. [H]
HIPAA likely does not apply — but other rules do: a self-hosted consumer app is generally not a HIPAA-covered entity (HHS mHealth guidance), yet the FTC Health Breach Notification Rule and Washington's My Health My Data Act reach consumer health data outside HIPAA. Correct stance: local-first, minimal telemetry, encryption at rest, clear export/delete, no required PHI egress. [H]

4. Additional features identified (NEW — derived from competitors)
Each is tagged with the competitor that inspired it. 'NEW' = not in your original spec.
NEW feature
Source
Why it matters
Multimodal imaging ingestion + DICOM viewer with MedGemma vision (read X-ray/MRI/derm/path locally)
Function/Ezra; MedGemma 4B
Imaging is where Function is spending; local multimodal is a genuine sovereignty differentiator.
AI longitudinal record summarization + auto-timeline
Metriport; Mere
Turns 100s of pages into an active problem/med list; table-stakes for usability.
Guideline-driven proactive screening engine (HEDIS/CQL, USPSTF, NICE)
Fasten roadmap
Moves from reactive Q&A to 'you're due for X' — real preventive value.
Evidence-grounded RAG over NICE/PubMed/UpToDate-style corpus with citations
openCHA; research
Cuts hallucination; makes the 'doctor packet' credible to clinicians.
Anonymization/PII-stripping gateway before any cloud model
Mediar/Evervault
Lets users opt into stronger cloud models without surrendering identity.
Supplement & medication interaction checker + regimen automation
Superpower; Blueprint
High biohacker demand; concrete daily utility and stickiness.
Biological-age / aging-clock computation from biomarkers + methylation
Function; Superpower
The single most shared metric in this community; built-in virality.
Cohort/population percentile benchmarking (privacy-preserving)
Whoop/Oura social
'Where do I rank' drives engagement; bridges to Phase-2 FL.
Wearable anomaly detection & alerting (AFib, glucose excursions, HRV crashes)
CGM/Apple
Turns passive data into proactive signal; safety upside.
Women's-health / hormone-aware protocols & cycle-aware analytics
Superpower/Feminade
Large underserved segment; cheap differentiation.
Multi-profile / caregiver mode (family, aging parents)
Fasten
Expands TAM and emotional pull; one install serves a household.
Open plugin/skill marketplace (MCP-style connectors & analyses)
Metriport ecosystem
Community builds your roadmap; classic OSS flywheel.
Trial-matching agent (match user profile to ClinicalTrials.gov)
Research-agent extension
Concrete 'new interventions for you' payoff; ties to Chiranjiv.
NFC tap-to-log tags for friction-free symptom/med/activity logging
Guava ('Guava Tags')
Solves the #1 quantified-self failure mode — adherence. Tap a phone to a sticker instead of opening an app.
Body heat-map correlation UI (visualize symptom/trigger relationships spatially)
Guava
Makes cross-correlation legible at a glance; far more engaging than a stats table for non-statisticians.
AI visit-prep flow (auto-generate a doctor-ready agenda + questions from recent data)
Guava
Operationalizes your 'doctor packet' into a guided pre-visit ritual; high perceived value, low build cost.
Assisted record-retrieval (help users obtain records from any US provider, incl. fax/mail, with on-device automation)
PicnicHealth
The retrieval labor — not data sale — is what PicnicHealth charges for; offering it free, automated and on-device is a genuine public-good wedge for older/fragmented records that pure API aggregation misses.
Evidence-assertion labeling: tag every claim Source-Backed / User-Canonical / Inferred / Statistical / Unknown
OwnChart (peer review)
Directly attacks hallucination and is the single best trust feature for clinician credibility — your strongest differentiator vs. black-box giant assistants.
Local model-run audit trail (log every call, prompt, params: temp/top-P/chunk size)
OwnChart (peer review)
Provability of zero-egress; the paranoid early cohort will demand it.
Phone-camera PPG/HRV (compute RMSSD/HRV from fingertip via companion app, no wearable)
Welltory (peer review)
Lowers the hardware barrier; gives non-wearable users an autonomic signal day one.
One-time / time-boxed clinician access link (separate clinician dashboard view)
Guava; Heads Up (peer review)
Clinicians need a different view than patients; turns the doctor-packet into a live shareable, and a distribution loop.
Longitudinal change-detection narratives ('what changed before symptoms worsened in the last 90 days?')
Tula (peer review)
More valuable than generic chat — converts raw streams into 'what changed' stories; anchors the demo.
Opt-in research / data-donation mode
Open Humans; PicnicHealth (peer review)
Explicit-consent contribution; becomes the consent substrate for Phase-2 federated analytics and a bridge to Chiranjiv.
Obsidian / Markdown vault sync (clinical history + AI chat logs into the user's private vault)
Gemini review
Rides existing local-first developer workflows; organic adoption channel + stickiness.


5. Phase-2 federated learning — honest assessment
Your premise: once ~1,000 users run the system, a peer-to-peer / federated algorithm makes the models smarter across the population and pushes intelligence back to each device.
The cryptography is solved; the statistics are not. Stating the strongest objections plainly:
Sample size. 1,000 self-hosting biohackers is tiny for medical model improvement and trivial relative to the millions of records incumbents already hold. Federated training on n≈1,000 will not produce 'population-scale' intelligence.  [H]
Selection bias. This cohort is wealthy, mostly male, supplement-heavy, metabolically unusual, and obsessively measured. Anything learned generalizes poorly to the general population — the opposite of the stated goal.  [H]
Label noise & confounding. Self-reported interventions + uncontrolled n-of-1 experiments yield correlations, not causal medical knowledge. Federated averaging over noisy labels amplifies, not cancels, this.  [M]
Heterogeneous, non-IID clients. Different device mixes per user make federated optimization hard and unstable at small n.  [M]
What Phase-2 is actually good for: (1) a public-good / citizen-science asset — 'contribute to open health knowledge without your data ever leaving your device' is a powerful, mission-aligned story (the Open Humans model); (2) federated analytics (cohort percentiles, prevalence, intervention-response distributions) rather than federated model training — far more achievable and useful; (3) an opt-in research commons that can responsibly inform, but must not be captured by, adjacent efforts like Chiranjiv.  [M]
Recommendation: Reframe Phase-2 from 'federated learning makes the AI smarter' to 'opt-in, privacy-preserving federated analytics as a public research commons.' Use Flower / NVIDIA FLARE + differential privacy, with consent and governance handled through an Open-Humans-style substrate. Set the scientific expectation honestly — overclaiming population-grade intelligence to a sophisticated, mission-driven audience is the fastest way to lose their trust.
If pursued, the right mechanisms (from peer review): Flower for orchestration; parameter-efficient fine-tuning (LoRA) on-device; secure knowledge distillation (exchange soft labels on shared reference sets, not gradients — avoids model-inversion); local differential privacy (calibrated Gaussian noise on shared updates); and LinUCB contextual-bandit peer matchmaking to group statistically similar users. But note: every one of these is a privacy mechanism. None addresses the n/selection-bias/label-noise problem — they make a small, biased signal cryptographically private, not scientifically valid. Adopt them for the privacy story; do not expect them to manufacture population-grade evidence.  [M]

6. Seeding & distribution (100 → 1,000 users)
These users self-select around privacy, self-hosting, and longevity. Reach them where those three overlap. Ranked by fit.
6.1 Highest-fit channels
Self-hosting communities (best fit): r/selfhosted, r/homelab, r/datahoarder; awesome-selfhosted list; Umbrel / Start9 / CasaOS app stores; Hacker News 'Show HN'. These people install Mac-mini services for fun. Ship as a one-click app and you get the first 100 here.
Local-LLM communities: r/LocalLLaMA, Ollama community/Discord, LM Studio users. 'Private medical LLM on your Mac' is catnip there.
Quantified Self: quantifiedself.com, QS meetups, r/QuantifiedSelf, Open Humans (data-sharing community), the #WeAreNotWaiting / Nightscout / OpenAPS diabetes crowd — proven adopters of DIY self-hosted health tech.
Public-good / institutional channels (open under the public-service framing): Digital Public Goods Alliance registry, open-source-in-health networks, patient-advocacy nonprofits, and academic/public-health groups. A non-commercial mission opens doors (and grant funders) that a startup pitch would not.
6.2 Longevity / biohacker communities
r/Biohackers, r/longevity, r/AgingBiology, r/Supplements, r/Nootropics; Lifespan.io and Foresight longevity forums.
Bryan Johnson 'Don't Die' / Blueprint community and events; RAADfest; Health Optimisation Summit; Biohacker Summit; A4M; Dave Asprey's ecosystem.
Device tribes: r/ouraring, r/whoop, r/Garmin, Levels/CGM communities — users already drowning in data with nowhere to unify it.
Foresight Institute (new, from peer review): curated longevity/biotech + health-extension working groups and Vision Week — technically sophisticated, data-ownership-first early adopters. High-signal, low-volume.
6.2b Complex chronic-condition self-advocates (possibly the stronger wedge)
Peer review's sharpest distribution insight: people with POTS, EDS, MCAS, ME/CFS, and Long COVID have more fragmented records, more specialists, more meds, and more need for coherent doctor-packets than healthy biohackers — and Guava's traction is concentrated exactly here. They care about control and continuity as much as privacy. Reach them via condition subreddits and patient-advocacy communities.  [M]
Concierge / functional / longevity clinics as accelerant: Heads Up and Guava show clinicians in these models want longitudinal dashboards and better-prepared patients. A few expert practitioners become distribution multipliers — consumers buy, practitioners amplify (Elyx is your first such clinic).
6.3 Influencer / earned-media surfaces
Podcasts/newsletters whose audiences match: Peter Attia (The Drive), Huberman Lab, FoundMyFitness (Rhonda Patrick), Kevin Rose (proof of self-host + crypto-privacy overlap), Levels blog, Nat Eliason / tech-bio Substacks.
GitHub Trending + Product Hunt launch + a strong README demo video. For this audience the repo IS the landing page.
6.4 Your owned channels (the real unlock)
Elyx: offer the agent as the member data-companion; UHNW longevity members are the ideal high-signal early cohort and give you clinical feedback.
Chiranjiv: position the OSS client as the privacy-preserving consent + data-collection front-end for population genomics; the federated-analytics network becomes a research asset.
Servant Capital network + your platform: Wharton/IIT/founder networks for credible early installs and contributors.
6.5 Sequencing
First 100: an invite-only design-partner cohort — ~25 quantified-self users, ~25 complex-care self-advocates, ~10 clinician design partners, the rest from self-hosting/OSS. White-glove onboarding; trust and data quality over growth.
Launch surfaces: Show HN + r/selfhosted + r/LocalLLaMA with a one-command installer (curl | .dmg), a TestFlight companion for Apple Health, and a 'private medical LLM' demo. Publish connector bounties + an Obsidian template repo.
Demo workflows that sell: 'show all new cardiometabolic changes in the last 90 days,' 'build my next endocrinology packet,' 'what changed before my symptoms worsened?'
100→1,000: QS + longevity communities + Foresight + 1–2 aligned podcasts + Product Hunt; seed an Elyx member cohort in parallel for depth feedback.
Retention/flywheel: doctor-packet sharing loop (clinicians see the value first-hand) + plugin marketplace + biological-age share-card + monthly research digest.

7. Sustainability, governance & licensing (the public-service model)
With monetization off the table, this is the section that actually determines whether AyuOS lives or dies. The binding constraint is no longer revenue; it is keeping a free public good maintained, governed, and trusted over years.  [opinion]
7.1 The real risk: abandonment, not insolvency
Maintainer burnout. Most OSS public-service health tools are 1–5 unpaid contributors (Fasten, Mere, OwnChart, HiMe all are). They stall when the founder's attention moves on. Bus-factor must be >1 from the start.
Connector rot. EHR and wearable APIs break continuously; keeping ingestion working is permanent, unglamorous labor. This — not features — is what silently kills these projects. Mitigate by building ON upstream OSS (Fasten/Open Wearables/Medplum) so connector maintenance is shared across communities, not yours alone.
Trust erosion. A single quiet telemetry addition or licensing change can destroy a privacy tool's credibility overnight. Governance must make that structurally hard.
7.2 Stewardship model
Put it under a neutral steward, not a person or a company. Options, in rough order of credibility for a public good: a dedicated nonprofit/foundation; a fiscal host (Open Collective Foundation, Software Freedom Conservancy, NumFOCUS-style); or a Public Benefit Corporation as steward if you want operational speed with a mission lock. Avoid sole ownership by any commercial entity — including Elyx/Chiranjiv.
Governance firewall. Written, public commitments: no central data collection, no PHI egress by default, no sale or licensing of user data ever, and any integration with Elyx/Chiranjiv is opt-in, separate-codepath, and transparent. This is what lets you accept their funding without compromising the trust thesis.
Pursue Digital Public Good (DPG) certification. UN DPG Alliance registry listing signals legitimacy, aids governance, and unlocks philanthropic/government funder networks.  [M]
7.3 Licensing
Recommended
AGPL-3.0 for the core. Strong copyleft prevents a commercial entity from taking the public good private (the network-use clause closes the SaaS loophole). Best alignment with 'this stays a public good.' [opinion]
Trade-off
AGPL deters some corporate adopters/contributors; if broad institutional uptake matters more than anti-capture, Apache-2.0 is the permissive alternative. You can also dual-structure: AGPL core + permissively-licensed SDKs/connectors to encourage an ecosystem.
Data governance
User owns all data; explicit, revocable consent for any sharing; signed releases + reproducible builds so the privacy claims are verifiable, not just asserted.

7.4 Funding a non-commercial public good
Free to users does not mean free to run. Development, security audits, and connector upkeep need money — just not from users. Sources, roughly in priority:  [M]
Philanthropic / mission grants: digital-public-goods and open-source funders, health philanthropies, and longevity/science foundations. A DPG listing and a nonprofit steward make these accessible.
Underwriting by your own entities: Elyx, Chiranjiv, or Servant Capital funding development as a philanthropic/mission contribution — clean and fast, provided the §7.2 firewall holds and the funding is disclosed. This is likely your most reliable near-term source.
Corporate / institutional sponsorship: wearable vendors, health systems, and academic groups that benefit from the open infrastructure; GitHub Sponsors / Open Collective for community donations.
Volunteer contributor community: the cheapest and most durable resource if cultivated — good docs, a one-command dev setup, connector bounties, and responsive maintainers. Treat community-building as core infrastructure, not marketing.
7.5 Definition of success (replaces revenue targets)
Active installs and retained users (the original 100 → 1,000, then beyond), weighted toward complex-care and QS users who get real value.
Contributor health: >1 core maintainer, external PRs merged, connector coverage maintained without single-person dependency.
Trust signals: independent security audit passed, DPG listing, zero data-handling incidents, verifiable zero-egress.
Mission impact: doctor-packets generated, records consolidated, opt-in research contributions — not dollars.

8. Name — AyuOS (fixed)
Project name: AyuOS. From the Sanskrit āyu (आयु, 'lifespan / vitality'), with the 'OS' suffix signalling that it is the operating system for one's own health. Chosen for brand coherence with Chiranjiv, brevity, and ownability.
Before lock-in, verify: .com / .ai domains, GitHub org availability, and US/EU trademark clearance in software + health classes.  [action]

9. Recommendations
Don't rebuild interop. Fork/partner Fasten Health or integrate Metriport for the EHR/device spine. Use Open Wearables for device ingestion — it covers 13 providers zero-transit. Add Terra Bridge only for gated providers (Garmin, Dexcom) and only when users ask for it.
Build the open-core model like Medplum. AGPL-3.0 self-hosted core is free and sovereign; ayuOS Cloud managed service is subscription-funded and funds core development. The trust claim is "subscription not data" — which is substantially stronger than any closed alternative even if weaker than pure non-commercial.
Give users full model choice. Default Ollama + local models; configurable cloud APIs per role with PII gateway always enforced. The model provider abstraction is a product feature, not just a configuration — it is what lets a power user run `claude-opus-4-8` as their reasoner without compromising extraction-level PHI.
Treat Phase-2 as federated analytics + research network, not 'FL makes the AI smarter.' Set scientific expectations honestly with a sophisticated audience.
Solve stewardship and sustainability before features. Stand up a neutral steward (nonprofit/fiscal host/PBC) for the open-source foundation. The AGPL-3.0 license does the heavy lifting on anti-capture; governance formalizes it.
Let Elyx/Chiranjiv help — behind a firewall. Mission alignment and underwriting from these entities are assets, but any integration must be opt-in, separate-codepath, and disclosed. The governance firewall between the foundation and the commercial entities protects the trust position.
Seed via self-hosting + local-LLM communities first, then longevity/QS, then 1–2 aligned podcasts. The repo and a one-command install are your funnel.
Ship a 6-month MVP (Apple Health manual export → Oura/Whoop → manual labs → local model chat → correlation dashboard → doctor packet) before touching EHR or federated learning. Prove the loop, then deepen.
Make trust provable, not just claimed. Evidence-assertion labeling + a model-run audit trail (logs every call, provider, whether data left the machine) are your sharpest edge over the platform giants — they cannot show their work on your hardware; you can.

10. Peer-agent review reconciliation
What I took from the Gemini and OpenAI reviews, and — explicitly — what I rejected.  [opinion]
10.1 Adopted
Idea
Why it earned a place
Platform-giant threat (ChatGPT/Claude/Copilot/Amazon Health, 2026)
Material competitive shift; reframes the differentiator to sovereignty (§1, §2.7). Verified.
macOS can't read HealthKit → iPhone companion required
Hard, verified constraint that corrects the original Mac-mini-only premise (§3.5). Highest-value single catch.
Evidence-assertion labeling + model-run audit trail (OwnChart)
Best trust features against black-box giants (§4).
Regulatory framing (Cures Act/CMS; FDA CDS; HIPAA/FTC/WA MHMD)
Concrete posture the original lacked (§3.7).
OSS building blocks (Open Wearables, Medplum/HAPI FHIR, Open mHealth, Open Humans, Tula)
Real, on-thesis components that cut build cost (§2.8, §3.6).
Evidence sources (PubMed/ClinicalTrials v2/DailyMed/RxNorm)
Grounds the research agent; reduces hallucination (§3.6).
'Agent prepares, user approves'; defer autonomous calling
Safer, higher-quality sequencing for agentic actions (§3.3 F3, §3.6).
Phone-camera PPG/HRV; change-detection narratives; clinician access link; data-donation mode; Obsidian sync
Concrete, low-cost feature wins (§4).
Complex-care self-advocates as a wedge; Foresight; clinic accelerant; design-partner cohort mix
Sharper distribution than 'biohackers' alone (§6).
FL mechanisms (Flower, LoRA, secure distillation, LDP, LinUCB)
Logged as the right stack IF Phase-2 proceeds (§5).

10.2 Rejected or down-weighted
The elaborate federated-learning math (Gemini). Differential-privacy equations and DFL topology are premature and address the wrong problem. My §5 statistical critique (n, bias, label noise) stands; cryptographic rigor does not fix it.
Autonomous outbound voice-calling in v1 (both). OpenAI's own review walks it back; kept as deferred, draft-and-approve first.
Multi-gateway IM via Telegram/WeChat/Feishu (Gemini/HiMe). Routing PHI through third-party messengers contradicts the zero-egress thesis. If built, restrict to self-hosted/E2E channels only — never WeChat.
Treating this as a fundable venture (both reviews implicitly do). Moot under the public-service framing — there is no venture and no revenue goal. Success is adoption + trust + sustainable stewardship (§7). My earlier 'build it as a strategic commercial asset' conclusion is itself now superseded by your no-monetization decision.
10.3 Firmographic conflicts to flag
Superpower funding: my profile says ~$34M; the OpenAI review says ~$51M across two rounds. Both agree on a $30M Series A (Forerunner). Treat total as contested ($34–51M). [M]
PicnicHealth pharma reach: '10 of top 30' (my source) vs '12 of top 20' (OpenAI source) — same order of magnitude; directionally 'most big pharma.' [M]
Guava headcount/users: ~8–18 employees and '100k+ patients/110k downloads' depending on source; all low confidence. [L]
Sources: company blogs/press releases, TechCrunch, Fierce Healthcare, MedCity News, Sacra, Tracxn, PitchBook, Crunchbase, GitHub repositories, and arXiv (June 2026). Private-company funding, headcount, valuation, and revenue figures are frequently estimated and were cross-checked where possible; confidence tags reflect source quality and consistency. Not legal, financial, or medical advice.

