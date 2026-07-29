# PII Gateway & Cloud Escalation

## Purpose

The PII gateway sits between the local agent and any outbound network call. Its job is to make it impossible — not just unlikely — to accidentally send identifying health data to a cloud service.

## When it activates

The gateway activates **only** when the user explicitly toggles cloud escalation for a specific query. In the default configuration (no escalation), the gateway is never called and no network connection is made.

## What it strips

The gateway applies local NER (Named Entity Recognition) and regex patterns to remove or mask:

| Category | Examples | Method |
|---|---|---|
| Names | Patient name, provider name, facility name | NER (local model) |
| Dates of birth | `DOB: 1985-04-12` | Regex + NER |
| Specific dates | Shifted by a fixed random offset per session (preserves relative timing) | Date shift |
| Addresses | Street, city, zip | NER |
| Phone / fax numbers | | Regex |
| MRN / account numbers | `MRN: 12345678` | Regex |
| SSN | | Regex |
| Genomic data | All `MolecularSequence` and PRS content | Hard exclusion |
| Insurance / financial | | Regex |

### Date shifting

Absolute dates are shifted by a fixed random offset (e.g., ±180 days) applied consistently within a session. This preserves the relative timing of events (e.g., "lab drawn 3 days after symptom onset") without revealing actual calendar dates.

## User preview

Before any payload is sent to a cloud service, the user sees:

1. The stripped payload in full
2. A diff view showing what was removed or masked
3. A confirmation button

The payload is sent only after explicit confirmation. There is no "remember this choice" option — every escalation requires a confirmation.

## Cloud LLM configuration

The user configures their preferred cloud LLM via environment variables or a local config file:

```yaml
cloud_escalation:
  provider: anthropic   # or openai
  model: claude-opus-4-8  # user's choice
  api_key: $ANTHROPIC_API_KEY
```

The API key is stored in the local config (not in the database). It is never logged.

## Audit trail

Every cloud escalation is logged:

```json
{
  "timestamp": "2025-03-14T10:23:00Z",
  "provider": "anthropic",
  "model": "claude-opus-4-8",
  "payload_hash": "sha256:abc123...",
  "payload_token_count": 2847,
  "user_confirmed": true,
  "response_token_count": 512
}
```

The payload itself is not logged — only the hash. The user can re-derive whether a specific payload was sent by hashing it locally.

## Hard exclusions

Regardless of user settings, these are **never** sent to a cloud service:

- Genomic data (`MolecularSequence`, PRS scores, raw variant data)
- Imaging pixel data (DICOM files)
- Raw source documents (original PDFs, Apple Health export files)

## Open questions

- [ ] Which local NER model? Options: spaCy with en_core_sci_md, a local Ollama model prompted for NER, or a custom fine-tuned model.
- [ ] Date shifting: per-session or per-user? Per-session is simpler but loses cross-session date consistency.
- [ ] Should the gateway support an "export mode" for users who want to share data with a doctor? (i.e., strip for a human recipient, not a cloud LLM)
