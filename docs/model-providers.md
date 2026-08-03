# Model Providers

ayuOS decouples model **roles** from model **providers**. The three roles (reasoner, tool-caller, medical extractor) remain fixed by design — what changes is where each role's model runs.

## Why this is per-role and not one switch

The naive design is a single "use cloud AI" toggle. Per-role configuration exists because the three roles have genuinely different risk profiles, and collapsing them forces a worse trade than necessary:

- **The medical extractor sees raw clinical text.** It reads notes and lab documents before anything has been normalized or stripped. It should stay local in almost every configuration.
- **The tool-caller sees structure, not content** — which query to run, which tool to invoke. Low sensitivity, and small local models handle it reliably.
- **The reasoner is where model quality is most visible to the user**, and it operates on retrieved context that has already been through the gateway.

So the useful configuration — strong frontier reasoning on top of strictly local PHI handling — is only expressible if the roles are separable. This is a product decision, not just a config convenience. See [Tiers & Fallbacks](tiers.md#axis-2-inference).

## Provider tiers

| Tier | Where it runs | Data egress | Default |
|------|--------------|-------------|---------|
| **Local — Ollama** | On your machine via Ollama | None | Yes |
| **Local — OpenAI-compatible** | Any local server speaking the OpenAI API (LM Studio, vLLM, llama.cpp server) | None beyond your LAN | No |
| **Cloud API** | Anthropic, OpenAI, Google, Mistral, or similar | PII-stripped context only | No |

Cloud API calls always pass through the local PII gateway before leaving the machine, and every call — cloud or local — is written to a locally queryable ledger. Neither is a setting; both are enforced at the single egress chokepoint every provider client is built on. See [AI Transparency](ai-transparency.md).

## Fallback behaviour

A configured cloud provider is a preference, not a dependency. If it is unreachable — expired key, provider outage, no network — the call falls back to the role's configured local model rather than failing the query. The [status indicator](ai-transparency.md#1-status-indicator) reflects what actually ran, not what was configured, and the ledger records the fallback.

The consequence worth stating plainly: **losing cloud access degrades answer quality on hard synthesis questions. It does not remove any workflow.** Every user journey completes on local models alone.

## Configuration

Each role is configured independently in `config.toml`:

```toml
[models]
  [models.reasoner]
  provider = "ollama"           # "ollama" | "anthropic" | "openai" | "google" | "openai-compatible"
  model    = "deepseek-r1:8b"
  endpoint = ""                 # only for openai-compatible; e.g. "http://localhost:1234/v1"
  fallback = "ollama:deepseek-r1:8b"   # used if the provider above is unreachable
  review   = "every_call"       # "every_call" | "new_shape" | "off" — cloud providers only

  [models.tool_caller]
  provider = "ollama"
  model    = "qwen3:8b"

  [models.medical_extractor]
  provider = "ollama"
  model    = "medgemma:4b"
```

`review` controls how often the [pre-send preview](ai-transparency.md#2-pre-send-review) prompts for confirmation. It has no effect on stripping, which is unconditional, or on ledger writes, which are unsuppressable. It defaults to `every_call` the first time a role is pointed at a cloud provider, and `off` cannot be set until the user has seen at least one full preview for that role.

## Common configurations

### Full local (default)

All three roles on Ollama. Zero data egress. Works fully offline. Recommended minimum: Apple Silicon with 16 GB unified memory for the 4B–8B model trio.

### Local extraction + cloud reasoning

MedGemma handles medical extraction locally (sees raw health data). The reasoner runs on a cloud API, receiving only PII-stripped context.

```toml
# model = values are 2026-08 examples; see the AI & ML Layer snapshot for current picks.
[models.medical_extractor]
provider = "ollama"
model    = "medgemma:4b"

[models.reasoner]
provider = "anthropic"
model    = "claude-opus-5"

[models.tool_caller]
provider = "openai"
model    = "<current OpenAI flagship>"   # placeholder — fill in the current model ID
```

Tradeoff: stronger reasoning quality at the synthesis step; that step sends PII-stripped context to cloud.

### Local network model

Models running on a separate machine on your local network (a dedicated inference box) are supported via `openai-compatible`. Data never leaves your network.

```toml
[models.reasoner]
provider  = "openai-compatible"
model     = "llama-3.3-70b"
endpoint  = "http://192.168.1.100:11434/v1"
```

### Full cloud

All three roles on cloud APIs. Suitable for users running ayuOS Cloud (managed service) or on a machine without sufficient RAM for local inference. Zero-PHI-egress is not guaranteed — all calls are PII-stripped but the user explicitly accepts cloud data transit, including for the medical extractor, which sees the least-processed clinical text.

This is the configuration where the [call ledger](ai-transparency.md#3-call-ledger) is doing the most work: it is the only thing standing between the user and an opaque cloud health product.

## PII gateway enforcement

When any model role is configured to a cloud provider, the PII gateway is applied **automatically and unconditionally** before every prompt sent to that role. There is no per-prompt override and no way to opt a payload out. The user sets their risk posture at configuration time; the gateway enforces it on every call.

What is configurable is how often the user is *asked to confirm* — the `review` mode above — not whether stripping happens. Those two were conflated in an earlier revision of this spec; [PII Gateway](pii-gateway.md#when-it-activates) is now the single source of truth on the distinction.

What the gateway strips: names (patient, provider, institution), dates of birth, addresses, facility names, insurance IDs, MRNs, phone numbers, email addresses. Imaging pixel data and raw source documents are excluded outright and never sent; genomic data is excluded by default, but the user can opt to send it, with an identifiability warning. See [PII Gateway](pii-gateway.md) for full detail.

## Supported providers

| Provider | Identifier | Notes |
|----------|-----------|-------|
| Ollama | `ollama` | Default; manages model downloads and GGUF quantization |
| Anthropic | `anthropic` | Claude model family; tool use supported |
| OpenAI | `openai` | GPT model family; tool use supported |
| Google | `google` | Gemini family via AI Studio or Vertex AI |
| Any OpenAI-compatible | `openai-compatible` | LM Studio, vLLM, Together, Groq, Ollama /v1 endpoint, etc. |

## Recommended models by role

The current per-role picks are kept in a **single dated snapshot** so they cannot drift between
pages — see [AI & ML Layer → Current defaults](ai-ml.md#current-defaults-snapshot-2026-08).
What a model is *selected against* (the durable part) is the
[selection criteria](ai-ml.md#selection-criteria-the-durable-part) there. This page does not
re-list versions, deliberately: it documents the configuration mechanism, not the current
shortlist.

## Open questions

- [ ] API key storage: macOS Keychain for interactive installs; env-var fallback for headless/server deployments
- [ ] Should a per-query *downgrade* be offered — force this one question local, even though the role is configured to cloud? (An upgrade in the other direction is what `review` already covers.)
- [ ] Does the fallback chain need more than one hop, or is "configured provider → local" sufficient?

!!! success "Resolved"
    Per-role provider status **is** surfaced in the chat header — see [status indicator](ai-transparency.md#1-status-indicator).
