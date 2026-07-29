# Deployment & Infrastructure

## Target hardware

**Primary:** Mac Mini (Apple Silicon — M2 or later). This is the reference platform.

- Apple Silicon enables efficient local inference via Metal/MPS (Ollama's MLX backend)
- Sufficient RAM for the model stack: 32GB recommended (16GB minimum; 14B models are tight at 16GB)
- NVMe storage: 1TB minimum (DICOM files accumulate; models take ~8–28GB each)
- Runs headless; accessed via browser on the same machine or local network (but services bind to loopback)

**Also supported:** Any x86 Linux machine with sufficient RAM. GPU optional but improves inference speed.

## Stack

```
Mac Mini (Apple Silicon)
│
├── Ollama              — local model runtime (DeepSeek-R1, Qwen, MedGemma)
├── Docker              — container runtime for Medplum
│   └── Medplum         — FHIR R4 server (TypeScript)
├── Postgres 16         — storage (via Medplum's Docker or native)
│   └── pgvector ext.   — vector embeddings
├── Open Wearables      — wearable ingestion (own Postgres + Redis)
└── ayuOS core          — agent + ingestion + web frontend (single process)
```

!!! note "No separate EHR connector service"
    ayuOS no longer forks Fasten, so there is no standalone EHR connector binary. EHR
    ingestion runs inside the core process as adapters — an Apple Health export parser, an
    Epic SMART-on-FHIR client, and optionally a Fasten Connect poller. See
    [ADR-0001](adr/0001-ehr-ingestion.md).

## Startup

A single command brings everything up:

```bash
ayu start
```

This:
1. Checks Ollama is running and required models are pulled
2. Starts the Medplum Docker container (if not running)
3. Starts the Open Wearables service (if wearable sync is configured)
4. Starts the ayuOS core process (agent API + web frontend)
5. Opens `http://localhost:4000` in the default browser

## First-run setup

```bash
ayu setup
```

This:
1. Pulls required Ollama models (DeepSeek-R1 distill, Qwen, MedGemma)
2. Initializes the Postgres database and runs migrations
3. Creates the Medplum default organization and admin user
4. Walks through wearable connection setup (Oura PAT, Whoop OAuth)
5. Prompts for optional Apple Health export import

## Updates

```bash
ayu update
```

Pulls new versions of the ayuOS core, runs database migrations, updates Ollama models if new versions are configured.

Model updates are the most disruptive — a new model version re-embeds all stored resources (can take hours for large datasets). This runs in the background; the app remains usable during re-indexing with the old embeddings.

## Resource usage

| Component | RAM | Disk |
|---|---|---|
| DeepSeek-R1 distill 8B | ~8GB (4-bit quantized) | ~5GB |
| DeepSeek-R1 distill 14B | ~10GB (4-bit quantized) | ~9GB |
| Qwen 7B | ~5GB | ~4GB |
| MedGemma | ~6GB | ~4GB |
| Postgres + pgvector | ~2GB | grows with data |
| Medplum (Docker) | ~1GB | grows with data |
| ayuOS core | ~512MB | — |

All three Ollama models loaded simultaneously: ~19–21GB RAM. 32GB is comfortable; 16GB requires careful scheduling (don't load all models at once).

## Open questions

- [ ] Should Postgres run in Docker alongside Medplum, or natively on the host?
- [ ] What is the update cadence for Ollama models? How do we communicate breaking changes in model behavior?
- [ ] Should there be a lightweight mode for users with 16GB RAM (smaller models, single-model scheduling)?
- [ ] Remote access story: is VPN the answer, or is this explicitly out of scope?
