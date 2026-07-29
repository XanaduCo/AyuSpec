# Governance & Stewardship

## The failure mode for projects like this

Open-source public-service health tools have a graveyard. They die from:

1. **Maintainer burnout** — keeping EHR and device connectors alive is unglamorous, never-ending work. Vendor APIs break. FHIR implementations diverge. A solo maintainer burns out.
2. **Irrelevance** — the free platform-giant assistants (ChatGPT, Copilot, Claude) lower the adoption case for a harder-to-use self-hosted tool. If ayuOS doesn't offer something categorically different, it doesn't survive.

The mitigations are governance and sustainability — not a business model.

## License

- **Core:** AGPL-3.0 (strong copyleft — prevents a commercial fork taking the core private)
- **No GPL isolation boundary.** Earlier revisions forked GPL-3.0 Fasten Health into its own
  process. ayuOS no longer forks Fasten (see [ADR-0001](adr/0001-ehr-ingestion.md)), so no
  GPL code enters the process map.
- **Upstream dependencies:** `@medplum/core` and `@medplum/definitions` (Apache-2.0, used as
  libraries), Open Wearables (open source) — all permissively licensed and one-way compatible
  into AGPL-3.0. ⚠️ Two to check before adoption: the `fhirpath` npm package carries a
  **custom BSD-derived licence** that scanners flag as `NOASSERTION`, and **TimescaleDB** is
  partly under the Timescale License rather than Apache-2.0.
- **Bundled guideline corpus:** will vary by source; must be verified per document before inclusion

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

## Sustainability

How do the maintainers keep going?

- **GitHub Sponsors** — individual contributions
- **Grants** — NIH open-source health informatics programs, Mozilla Foundation, Wellcome Trust
- **Institutional partnerships** — universities or research hospitals that use ayuOS in studies
- **NOT:** selling data, SaaS, enterprise licensing, or any path that creates a monetization incentive over user data

The sustainability model must be compatible with the trust claim. Any revenue that depends on user data undermines the core differentiator.

## Governance firewall with commercial entities

Ashish's other projects (Elyx, Chiranjiv) operate commercially. The governance firewall:

1. ayuOS captures no data centrally
2. Any opt-in data contribution (federated analytics) is published openly, not fed to Elyx/Chiranjiv
3. Any linkage between ayuOS and commercial projects requires a separate, prominently-disclosed opt-in
4. Maintainers from commercial entities may contribute code but may not set the project's direction unilaterally

## Naming and IP

- Domain: TBD (register before public launch)
- GitHub org: TBD
- Trademark: check before launch; `ayu` is a common word in several languages

## Open questions

- [ ] Fiscal sponsor: which organization? When to approach?
- [ ] Governance document: when to write it? (Before first external contributor, ideally)
- [ ] Release model: rolling releases or versioned? How are breaking changes communicated?
- [ ] Security disclosure policy: responsible disclosure channel before any public users
