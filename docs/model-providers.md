# Model Providers

ayuOS decouples model **roles** from model **providers**. The three roles (reasoner, tool-caller, medical extractor) remain fixed by design — what changes is where each role's model runs.

## Provider tiers

| Tier | Where it runs | Data egress | Default |
|------|--------------|-------------|---------|
| **Local — Ollama** | On your machine via Ollama | None | Yes |
| **Local — OpenAI-compatible** | Any local server speaking the OpenAI API (LM Studio, vLLM, llama.cpp server) | None | No |
| **Cloud API** | Anthropic, OpenAI, Google, Mistral, or similar | PII-stripped context only | No |

Cloud API calls always pass through the local PII gateway before leaving the machine. This is enforced at the infrastructure layer — it cannot be disabled when a cloud provider is configured.

## Configuration

Each role is configured independently in `config.toml`:

```toml
[models]
  [models.reasoner]
  provider = "ollama"           # "ollama" | "anthropic" | "openai" | "google" | "openai-compatible"
  model    = "deepseek-r1:8b"
  endpoint = ""                 # only for openai-compatible; e.g. "http://localhost:1234/v1"

  [models.tool_caller]
  provider = "ollama"
  model    = "qwen2.5:7b"

  [models.medical_extractor]
  provider = "ollama"
  model    = "medgemma:4b"
```

## Common configurations

### Full local (default)

All three roles on Ollama. Zero data egress. Works fully offline. Recommended minimum: Apple Silicon with 16 GB unified memory for the 4B–8B model trio.

### Local extraction + cloud reasoning

MedGemma handles medical extraction locally (sees raw health data). The reasoner runs on a cloud API, receiving only PII-stripped context.

```toml
[models.medical_extractor]
provider = "ollama"
model    = "medgemma:4b"

[models.reasoner]
provider = "anthropic"
model    = "claude-opus-4-8"

[models.tool_caller]
provider = "openai"
model    = "gpt-4o"
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

All three roles on cloud APIs. Suitable for users running ayuOS Cloud (managed service) or on a machine without sufficient RAM for local inference. Zero-PHI-egress is not guaranteed — all calls are PII-stripped but the user explicitly accepts cloud data transit.

## PII gateway enforcement

When any model role is configured to a cloud provider, the PII gateway is applied **automatically and unconditionally** before every prompt sent to that role. There is no per-prompt override. The user sets their risk posture at configuration time; the gateway enforces it on every call.

What the gateway strips: names (patient, provider, institution), dates of birth, addresses, facility names, insurance IDs, MRNs, phone numbers, email addresses. See [PII Gateway](pii-gateway.md) for full detail.

## Supported providers

| Provider | Identifier | Notes |
|----------|-----------|-------|
| Ollama | `ollama` | Default; manages model downloads and GGUF quantization |
| Anthropic | `anthropic` | Claude model family; tool use supported |
| OpenAI | `openai` | GPT-4o, o3, etc.; tool use supported |
| Google | `google` | Gemini family via AI Studio or Vertex AI |
| Any OpenAI-compatible | `openai-compatible` | LM Studio, vLLM, Together, Groq, Ollama /v1 endpoint, etc. |

## Recommended models by role

| Role | Default | Alternatives |
|------|---------|-------------|
| Reasoner | DeepSeek-R1 distill 8B (local) | Qwen3-14B, Llama 3.3-70B, `claude-opus-4-8` (cloud) |
| Tool-caller | Qwen2.5-7B (local) | Llama 3.1-8B, `gpt-4o` (cloud) |
| Medical extractor | MedGemma 4B (local) | MedGemma 27B (more RAM), Meditron-8B, OpenBioLLM-8B |

## Open questions

- [ ] API key storage: macOS Keychain for interactive installs; env-var fallback for headless/server deployments
- [ ] Should the UI surface per-role provider status (local/cloud) visibly in the chat header?
- [ ] Should there be a per-query cloud override on top of the configuration-level setting?
