# Security & Privacy

## Threat model

ayuOS's primary threat is **passive exfiltration** — a bug, misconfiguration, or dependency that sends health data somewhere it shouldn't go. The architecture is designed so that exfiltration requires an active, explicit user action (cloud escalation), not a misconfiguration.

Secondary threats: local disk access by malware, compromised dependencies.

Out of scope for MVP: multi-user access control, remote access, adversarial network attacks.

## Zero-egress by default

In the default configuration, ayuOS makes **no outbound network connections** after initial setup. All services (Medplum, Ollama, the web frontend) run on localhost. The agent reads from local storage and writes to local storage.

The only outbound connections are:
- Wearable API pulls (Oura, Whoop) — user-configured, on a schedule
- EHR sync (Fasten fork) — user-triggered
- Cloud escalation — explicit per-query user confirmation

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

The audit log is append-only. It records every cloud escalation (with payload hash, not payload), every agent invocation, and every ingestion run. The log is stored locally and is never sent anywhere.

## Genomic data handling

Genomic data is treated with additional caution beyond standard PHI:
- Never included in cloud escalation payloads (hard exclusion in the PII gateway)
- Not included in the embedded/indexed corpus by default (query via dedicated `get_genomic_variants` tool only)
- Stored in a separate Postgres schema with more restrictive access

## Open questions

- [ ] Should ayuOS support a passphrase-protected local keyring for secrets, rather than a plain config file?
- [ ] What happens if the user wants remote access to their ayuOS instance (e.g., from a phone)? VPN + localhost tunnel? Explicitly out of scope?
- [ ] Backup security: encrypted external drive is the plan, but what's the key management story?
