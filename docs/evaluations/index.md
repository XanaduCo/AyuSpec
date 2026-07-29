# Service Evaluations

Every third-party service ayuOS seriously considered, why it was adopted or rejected, and
what would change the decision. These exist so a choice is not relitigated from memory, and
so that when a dependency dies — [as Fasten Onprem did](fasten.md) — the reasoning behind
the original pick is still available.

!!! note "Evaluations record findings; ADRs record decisions"
    An evaluation is per-service and factual. A [decision record](../adr/index.md) is
    per-problem and picks between them. Evaluations link up to the ADR that used them.

**All evaluations dated 2026-07-29 unless noted.** Facts marked ⚠️ **unverified** could not
be confirmed from primary sources and should be treated as open questions, not conclusions.

## Clinical data store

| Service | Verdict | One-line reason |
|---|---|---|
| [Medplum](medplum.md) | ✅ **Incumbent** | Postgres-native, arm64, no external services, strongest practical R4 search |
| [Roll your own](roll-your-own.md) | 🔄 **Live option** | `@medplum/core` is usable standalone, making this far cheaper than assumed |
| [Blaze](blaze.md) | ⚠️ Fallback | Lightest real option (1 process) but RocksDB can't be joined against pgvector |
| [HAPI FHIR](hapi-fhir.md) | ⚠️ Fallback | Most complete OSS search; JVM weight; the conservative retreat |
| [Aidbox](aidbox.md) | ❌ **Disqualified** | Free tier prohibits PHI; instance phones home every ~30 min |
| [Others surveyed](rejected-fhir-servers.md) | ❌ Rejected | Dead, amd64-only, toy, or wrong datastore — 8 servers |
| [FHIR libraries](fhir-libraries.md) | 📚 Reference | Language-by-language: what exists for models, FHIRPath, validation |

The store decision is **still open** — see [ADR-0002](../adr/index.md) (not yet written).

## EHR ingestion

Decided in [ADR-0001](../adr/0001-ehr-ingestion.md).

| Service | Verdict | Role |
|---|---|---|
| [Apple Health](apple-health.md) | ✅ **Adopted** | Tier 1 (MVP) + Tier 3 (companion app) |
| [Epic direct](epic-direct.md) | ✅ **Adopted** | Tier 2 — free, auto-distributed, includes clinical notes |
| [Fasten](fasten.md) | ✅ Connect adopted / ❌ Onprem dead | Tier 4 premium; Onprem archived mid-project |
| [Oracle Health / Cerner](oracle-cerner.md) | ⏸ Deferred | Reachable via Tier 4; no auto-distribution equivalent |

## Wearable ingestion

| Service | Verdict | Role |
|---|---|---|
| [Open Wearables](../open-wearables.md) | ✅ **Adopted** | Default — self-hosted, 13 providers, zero transit |
| [Open Wearables vs Terra](open-wearables-vs-terra.md) | — | The comparison behind that choice |
| Terra | ✅ Adopted as bridge | Paid add-on for developer-agreement-gated providers only |

## How these were produced

Six parallel research passes, each verifying against primary sources — vendor docs, GitHub
and registry APIs, live HTTP endpoints — rather than summaries. Where it mattered, claims
were tested by execution: the Medplum stack was actually run and measured on Apple Silicon,
and FHIRPath engines were benchmarked against the official HL7 test suite. Numbers below
labelled *measured* come from those runs; numbers labelled *documented* come from vendor docs
and may be conservative.
