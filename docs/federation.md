# Federated Analytics (Phase 2)

## Framing

Federated analytics is a Phase 2 concern. The consent plumbing should be designed into the system from the start (cheap to add early, expensive to retrofit), but the analytics capability itself is deferred.

**Honest reframing:** n≈1,000 self-selected biohackers is too small, too biased, and too label-noisy to produce population-grade medical intelligence. The right framing is **opt-in citizen-science** that contributes to open health knowledge — not a capability multiplier for ayuOS.

## What it is (when built)

Each participating ayuOS instance trains a local model update on its data, and contributes only the gradient (not the data) to a federated aggregation. No individual's data leaves their machine. The aggregated model or statistics are published as open research.

- **Framework:** Flower (FLARE) — open-source federated learning framework, Apache-2.0
- **Privacy:** Differential privacy applied to gradients before aggregation
- **Participation:** Fully opt-in; off by default; requires explicit enrollment
- **Governance:** Aggregated results published publicly; no commercial use

## What Phase 1 must build (the consent substrate)

These pieces are cheap to add now and expensive to retrofit:

1. **Consent model** — a FHIR `Consent` resource per user, capturing:
   - What data categories they consent to share gradients from
   - Which research purposes they've agreed to
   - Timestamp and version of the consent they agreed to
   - Revocation mechanism

2. **Data-donation flag** — a per-resource tag (`meta.tag: federated-eligible=true|false`) that the user controls. No resource participates in federation unless explicitly tagged.

3. **Audit hook** — any future federated operation must log to the audit trail, even if the actual federation isn't built yet

## Governance firewall

There is an explicit governance firewall between ayuOS and any commercial use by related projects (Elyx, Chiranjiv or others). Specifically:

- Federated gradients are published to an open research commons, not to any private entity
- Any linkage between ayuOS participation and commercial projects requires a separate, explicit, prominently-disclosed opt-in — never bundled with general ayuOS consent
- The ayuOS license (Apache-2.0) does not permit the federated aggregate to be used in commercial products without separate licensing

## Why this is weaker than it sounds

Be honest with users and contributors about what federated analytics at this scale can and cannot do:

- **Selection bias:** biohackers are not representative of the general population
- **Label noise:** self-reported conditions and wearable-derived metrics have significant noise
- **Sample size:** 1,000 is underpowered for most clinically meaningful analyses
- **Ancestry bias:** similar to PRS, models trained on this cohort may not generalize

The value is **directional signal and open contribution** — not production-grade medical AI.

## Open questions

- [ ] Which specific research questions are worth pursuing with this cohort? (Longevity markers? HRV predictors? Supplement response?)
- [ ] Who operates the federated aggregation server? A university partner? The maintainers?
- [ ] What is the publication model for results — preprints, a companion open dataset, both?
- [ ] Should differential privacy be applied at the observation level (before gradient computation) or at the gradient level?
