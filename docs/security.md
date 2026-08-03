# Security & Privacy

## Threat model

ayuOS's primary threat is **passive exfiltration** — a bug, misconfiguration, or dependency that sends health data somewhere it shouldn't go. The architecture is designed so that any egress is the result of an explicit, recorded configuration choice, never a misconfiguration or a silent default.

Secondary threats: local disk access by malware, compromised dependencies.

Out of scope for MVP: multi-user access control, remote access, adversarial network attacks.

## Egress posture is a configuration, not a fixed property

ayuOS supports [tiers](tiers.md) that differ in exactly this respect, so "zero-egress" is a property of a *configuration*, not of the product. The precise statement:

**In the default self-hosted configuration — local inference, direct connectors — ayuOS makes no outbound network connection that carries health data.** All services (Postgres, Ollama, the web frontend) bind to localhost; the agent reads and writes local storage only. This is not a setting that suppresses egress; there is no code path that produces it.

Every departure from that default is opt-in, per-source or per-role, and visible:

| Outbound connection | When it happens | Visibility |
|---|---|---|
| Wearable API pulls (Oura, Whoop) | User-configured, on a schedule | Connector status view; credentials never leave the machine |
| EHR sync — Epic direct | User-triggered | Direct to Epic; no intermediary |
| **Bridged connectors** — Fasten Connect, Terra Bridge | Explicit per-provider consent; never on by default | Consent record states that data transits the vendor |
| **Cloud model calls** | Only for roles explicitly configured to a cloud provider | PII-gated, [pre-send review](ai-transparency.md#2-pre-send-review), permanent ledger entry |
| Update checks | User-initiated `ayu update` only | No background phone-home, ever |

**Telemetry, analytics, and crash reporting are opt-in and off by default** in every configuration, including ayuOS Cloud. When a user turns them on, they carry app diagnostics only — never health data, which stays subject to the [PII gateway](pii-gateway.md).

!!! note "ayuOS Cloud is a different posture, stated plainly"
    In the managed tier the data lives on operated infrastructure by definition. That tier's guarantee is policy backed by a subscription business model, plus the same complete, exportable [call ledger](ai-transparency.md#3-call-ledger) — not the architectural impossibility the self-hosted default provides. The spec does not blur the two; see [Tiers & Fallbacks](tiers.md#axis-1-deployment).

## Verifying the claim

The egress posture is designed to be checkable by the user rather than taken on trust: block the process at the firewall and confirm every local workflow still completes; run a proxy and confirm the connections observed match the ledger rows exactly. See [Verifying it yourself](ai-transparency.md#verifying-it-yourself).

## Encryption at rest

- **OS-level full-disk encryption** (FileVault on macOS, LUKS on Linux) covers all data on disk, including the Postgres data directory, DICOM files, and source documents.
- ayuOS does not implement application-level encryption on top of this. The OS layer is the appropriate control for the local threat model.
- The user is responsible for enabling full-disk encryption. ayuOS checks at startup and warns if it is not enabled.

## Local-only service binding

All services bind to `127.0.0.1` (loopback only), not `0.0.0.0`. They are not reachable from the local network or internet.

## Dependency supply chain

- All dependencies are pinned to exact versions in lock files
- `npm audit` and `pip-audit` run in CI
- No dependency is permitted to make outbound network calls in production (enforced via network policy / firewall rules in the local process where feasible)

## API keys

- Wearable API keys (Oura PAT, Whoop OAuth tokens) are stored in a local secrets file, not in the database
- Cloud LLM API keys are stored in environment variables or the local config, never in the database or logs
- The secrets file has `chmod 600` and is excluded from any export or backup that leaves the machine

## Audit log

The audit log is append-only and stored locally; it is never transmitted anywhere. It records every model call — local and cloud alike, with the full payload retained — every agent invocation, and every ingestion run. Full schema and rationale in [AI Transparency](ai-transparency.md#3-call-ledger).

## Genomic data handling

Genomic data is treated with additional caution beyond standard PHI:
- Never included in cloud escalation payloads (hard exclusion in the PII gateway)
- Not included in the embedded/indexed corpus by default (query via dedicated `get_genomic_variants` tool only)
- Stored in a separate Postgres schema with more restrictive access

## Open questions

- [ ] Should ayuOS support a passphrase-protected local keyring for secrets, rather than a plain config file?
- [ ] What happens if the user wants remote access to their ayuOS instance (e.g., from a phone)? VPN + localhost tunnel? Explicitly out of scope?
- [ ] Backup security: encrypted external drive is the plan, but what's the key management story?
