# Governance & Stewardship

## The failure mode for projects like this

Open-source public-service health tools have a graveyard. They die from:

1. **Maintainer burnout** — keeping EHR and device connectors alive is unglamorous, never-ending work. Vendor APIs break. FHIR implementations diverge. A solo maintainer burns out.
2. **Irrelevance** — the free platform-giant assistants (ChatGPT, Copilot, Claude) lower the adoption case for a tool that is harder to adopt. If ayuOS doesn't offer something categorically different — and doesn't meet users where they are — it doesn't survive.

The mitigations are governance, sustainable funding, and not owning more connectors than we have to. The [managed tier](tiers.md#ayuos-cloud-managed-subscription) is part of the answer to both failure modes: it funds the maintenance work, and it removes the self-hosting barrier for users who would otherwise never adopt.

## License

**Core: MIT.** Maximally permissive — use, modify, host, embed, or sell, with attribution the
only condition.

### Why MIT

**The goal is to increase the number of people who control their own health data. Anything
that slows that down is a cost; almost nothing else is.**

A copyleft licence's central feature is preventing someone from taking the core, hosting it,
and contributing nothing back. Under our goal, that scenario is not a loss. **It is the
outcome we want.** Another operator running ayuOS for a population we would never reach is
mission success, whether or not they ever send a patch back. A licence whose main job is to
prevent that is optimizing against us — so we use MIT: maximally permissive, with no barrier
to anyone adopting, hosting, or building on the core.

Three bets underpin this:

1. **The cost of generating code is going to zero.** Copyleft protects a codebase as an asset.
   If writing the equivalent code stops being the hard part, that asset is depreciating, and
   defending it with licence terms buys progressively less while costing adoption today. We
   would rather be copied than be the only ones with the code.
2. **The value is downstream of the code, in the analysis and what it enables.** ayuOS's real
   contribution is turning a fragmented record into grounded reasoning and then into
   **low-friction healthcare** — action, not just insight. That is a product and distribution
   problem, not a source-availability one, and no licence protects it.
3. **The trust claim never rested on the licence.** It rests on the architecture: local
   inference, the [egress chokepoint](ai-transparency.md), the
   [call ledger](ai-transparency.md#3-call-ledger), and readable source. MIT is exactly as
   auditable as AGPL. **Nothing a user can verify about ayuOS changes.**

The failure modes at the top of this page point the same way. Burnout and irrelevance are what
kill projects like this — not commercial capture — and the mitigations are adoption,
contributors, and integration into other people's systems, all of which copyleft taxes:

- **AGPL sits on the do-not-use list at many companies**, including several whose researchers
  and clinicians are exactly the institutional partners named under
  [Sustainability](#sustainability). A licence that makes a hospital's legal review say no is a
  licence that costs us the partnership.
- **It deters casual contributors and downstream reuse.** Someone who wants to lift the Apple
  Health export parser — the one genuinely novel piece of code here, which
  [nobody else has](adr/0001-ehr-ingestion.md#consequences) — should be able to, with no licence
  conversation. Health data tooling is under-built. More of it existing is good for users even
  when it isn't ours.

### What MIT actually costs

Two consequences, neither of which is "someone else hosts it":

- **A proprietary fork is permitted.** Someone may build a closed product on the core. They
  cannot close *this* project — the MIT history stays public and forkable — but they can ship
  something users cannot audit, using our code, while trading on the category's reputation for
  auditability. The mitigation is a trademark, not a licence: the name should mean the
  verifiable thing.
- **"The cloud tier runs the same core" is a promise, not a legal obligation.** A copyleft
  licence would compel an operator running a modified ayuOS as a service to publish those
  changes; a permissive licence does not. So the [fallback guarantee](tiers.md#the-fallback-guarantee)
  and the no-feature-gating commitment rest on the governance rules below and nothing else.
  **This is the one place a permissive licence genuinely weakens a user-facing guarantee**, and
  it should be defended deliberately — by publishing what the managed tier runs, not by assuming
  good intent.

### Dependencies

The stack is permissive throughout, so nothing here constrains the choice:

| Dependency | Licence | Note |
|---|---|---|
| `@medplum/core`, `@medplum/definitions`, `@medplum/fhirtypes` | Apache-2.0 | Used as libraries. Retain the NOTICE and attribution when distributing. |
| `fhirpath` (HL7) | Custom BSD-derived | ⚠️ Scanners flag it `NOASSERTION`. Compiled into what we ship, so its terms flow into distribution. |
| `@types/fhir`, `fhir-kit-client` | MIT | |
| Open Wearables | ⚠️ Unverified — record it | Runs as a separate service over HTTP, so it does not bind our licence either way. |

**No GPL or AGPL code enters the process map.** Earlier revisions forked GPL-3.0 Fasten Health
into an isolated process; ayuOS no longer forks Fasten (see
[ADR-0001](adr/0001-ehr-ingestion.md)), which is what makes an MIT core clean rather than
merely convenient.

!!! note "Server-side components are a different question"
    Licences of things ayuOS *links against* (npm packages) flow into what we distribute.
    Licences of things it merely *talks to over a network protocol* — Postgres and any
    extensions the user installs — do not. Those only become relevant if ayuOS ships a
    bundled installer containing them, or hosts them in the managed cloud tier.

**Bundled guideline corpus:** licensing will vary by source; must be verified per document
before inclusion. This is now the *only* licence hazard in the project.

## Stewardship model

*To be decided.* Options:

| Model | Pros | Cons |
|---|---|---|
| Maintainer-led (current) | Simple, fast decisions | Single point of failure |
| Foundation / fiscal sponsor (NumFOCUS, Linux Health) | Institutional continuity, grants eligibility | Overhead, governance process |
| University partnership | Research legitimacy, student contributors | Slow, institutional constraints |
| DAO / community governance | Decentralized | Complex, rarely works in practice |

**Leaning toward:** start maintainer-led, adopt a fiscal sponsor (e.g., NumFOCUS or Open Source Collective) once the project has 50+ users and contributors who need a governance structure.

## Contributor model

- Contributions welcome via GitHub pull requests
- Areas most in need of contributors: connector maintenance (EHR, wearables), LOINC mapping tables, documentation, testing
- A `CONTRIBUTING.md` should be written before the first public announcement
- Code of Conduct: Contributor Covenant (standard)
- **Inbound = outbound, under MIT.** Contributions are accepted under the project's own licence;
  a DCO sign-off is sufficient and **no CLA is required.**

!!! note "MIT removes the CLA problem"
    Open-core projects on copyleft usually need a Contributor Licence Agreement so the project
    retains the rights to dual-license later. MIT already permits every downstream use a CLA
    would have preserved, so there is nothing to reserve. This lowers the barrier to a first
    contribution and removes a decision that would otherwise have been urgent before the first
    external PR — one of the concrete reasons MIT suits a project whose primary risk is
    [maintainer burnout](#the-failure-mode-for-projects-like-this).

## Sustainability

How do the maintainers keep going? The model is **open core**: the MIT-licensed self-hosted tier is free forever and complete, and a managed service funds the work.

!!! warning "The licence does not defend this model — governance does"
    Medplum and GitLab run comparable open-core models behind copyleft, which legally prevents
    a competitor from privatizing the core. Under MIT we have no such protection: **anyone may
    host ayuOS commercially and contribute nothing back** — which, per [Why MIT](#why-mit), we
    consider a feature and not a leak. But it does mean the commitments below are promises kept
    by governance and reputation, not clauses enforced by a licence. Treat any proposal to
    weaken one as a proposal to weaken the whole trust claim.

    It also means the managed service must compete on operations, coverage, and the quality of
    what it does with the analysis — never on exclusive access to the code. If ayuOS Cloud
    cannot win that way, the licence was not the problem.

| Source | Notes |
|---|---|
| **ayuOS Cloud subscriptions** | Primary. Users pay for hosting and operations, not for features or for data. |
| **GitHub Sponsors** | Individual contributions |
| **Grants** | NIH open-source health informatics programs, Mozilla Foundation, Wellcome Trust |
| **Institutional partnerships** | Universities or research hospitals that use ayuOS in studies |
| **Never:** selling data, monetizing PHI, ads, or brokering de-identified cohorts | This is the line that cannot move — it is what separates ayuOS from PicnicHealth and Function Health |

The distinction that makes this compatible with the trust claim: **the revenue is for operating infrastructure, not for access to data.** A subscriber pays the same whether they upload one lab or ten years of records, so no growth path for the business runs through accumulating more health data. That is the property to preserve when evaluating any future revenue idea.

The constraints that keep the open tier honest:

- **No feature is withheld from the self-hosted tier to drive subscriptions.** The cloud tier sells operations, not capability.
- **The cloud tier runs the same open core.** There is no proprietary component, so migrating off it is a data export, not a rewrite. Under MIT this is a commitment rather than a licence obligation, which makes it more important to state, not less.
- **Full export at any time**, in open formats. Lock-in is not permitted as a retention mechanism.

## Governance firewall with commercial entities

The managed service is operated as a separate entity from the open-source project's stewardship. Some other entities affiliated with the project's maintainers also operate commercially. The firewall:

1. The open-source project captures no data centrally. The managed service holds only its own subscribers' data, under the commitments above, and never pools it.
2. Any opt-in data contribution (federated analytics) is published openly, not fed to an affiliated commercial entity — including the managed service.
3. Any linkage between ayuOS and commercial projects requires a separate, prominently-disclosed opt-in.
4. Maintainers from commercial entities may contribute code but may not set the project's direction unilaterally.
5. Roadmap decisions that would advantage the managed tier at the self-hosted tier's expense — feature gating, deliberate ops friction, export restrictions — are out of bounds regardless of commercial pressure.

## Naming and IP

**Under MIT the trademark is the only exclusive right the project holds**, which makes it more
important than it was, not less. The licence deliberately lets anyone ship the code; the mark
is what stops a closed fork from calling itself ayuOS and borrowing the auditability claim it
does not honour.

- Trademark: **register before public launch** — this is now load-bearing, not hygiene.
  ⚠️ `ayu` is a common word in several languages; clearance may be non-trivial.
- A trademark policy should accompany it: forks may state they are *built on* ayuOS; only
  builds that pass the project's own verification may use the name unqualified.
- Domain: TBD (register before public launch)
- GitHub org: TBD

## Open questions

- [ ] Fiscal sponsor: which organization? When to approach?
- [ ] What is the formal separation between the foundation and the managed-service entity — separate legal entities, or a documented policy? At what user count does the informal version stop being credible?
- [ ] **Trademark clearance and policy** — who owns the mark, and what exactly may a fork call itself? Needed before launch now that it is the sole exclusive right.
- [ ] How does the managed tier *demonstrate* it runs the unmodified core, given MIT no longer compels it? Published build hashes, a reproducible build, or a third-party attestation?
- [ ] Governance document: when to write it? (Before first external contributor, ideally)
- [ ] Release model: rolling releases or versioned? How are breaking changes communicated?
- [ ] Security disclosure policy: responsible disclosure channel before any public users
