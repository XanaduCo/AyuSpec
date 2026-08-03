# Agent Loop

## Overview

The agent loop is the core reasoning engine. It takes a user query, orchestrates tool calls to retrieve relevant data, synthesizes a response with evidence labels, and returns it to the frontend.

## Tools available to the agent

| Tool | Description |
|---|---|
| `query_clinical` | Query clinical resources by type, code, patient, and date range |
| `get_time_series` | Retrieve time-series observations for a LOINC code over a time range |
| `search_records` | Semantic search over embedded records (pgvector) |
| `get_trend` | Compute change/trend for a metric over a period |
| `get_correlations` | Find metrics that co-vary over a time window |
| `get_imaging_summary` | Retrieve MedGemma-generated summary for an imaging study |
| `get_genomic_variants` | Query notable genomic variants and PRS scores |
| `generate_doctor_packet` | Trigger doctor-packet generation for a specified scope |
| `search_guidelines` | Search the bundled guideline corpus |
| `query_health_model` | Traverse the [healthspan model](healthspan-model.md) — systems → functions → interventions/markers |
| `resolve_modifiers` | Apply the user's conditions, anatomy, and environment to a candidate intervention set |
| `rank_interventions` | Ordered candidates with all comparison axes, optionally via the preference model |
| `suggest_markers` | What to measure for a function, by quality tier and ingestibility |

## Execution flow

```
User query
  │
  ▼
Qwen: analyze query → plan tool calls
  │
  ▼
Tool execution (parallel where possible)
  │
  ▼
Assembled context (retrieved data + query)
  │
  ▼
DeepSeek-R1: synthesize answer with evidence labeling
  │
  ▼
Format response (markdown, citations, labels)
  │
  ▼
Audit log entry
  │
  ▼
Frontend display
```

## The anchor workflow: "What changed in 90 days?"

This is the most important query to get right. The agent's execution for this query:

1. `get_time_series` for all tracked LOINC codes over the last 90 days
2. `get_trend` for each metric — compute delta from baseline (prior 90-day window)
3. `get_correlations` — find metric pairs with notable co-movement
4. `search_records` — retrieve recent clinical notes, lab reports
5. `search_guidelines` — pull reference ranges for flagged metrics
6. R1 synthesizes: which changes are notable? what are the possible explanations? what warrants follow-up?
7. Evidence labels applied to each claim

## Evidence labeling in the prompt

The R1 prompt instructs it to structure the response as:

```
[claim text] [SOURCE-BACKED: Observation/abc123, 2025-03-14]
[claim text] [INFERRED]
[claim text] [GUIDELINE-BACKED: AHA Lipid Guidelines 2023]
```

The frontend parses these annotations and renders them inline as tooltips. Labels are also the entry points for [Health Literacy & Epistemics](epistemics.md): the loop applies its injection policy to decide when a response should carry a just-in-time concept card (e.g. first `EVIDENCE: NONE`, a cross-tier comparison, a known self-deception trap).

## Audit log

Every agent invocation creates an audit log entry:

| Field | Value |
|---|---|
| `timestamp` | |
| `query` | User's original question |
| `tools_called` | List of tools and their arguments |
| `model_calls` | Foreign keys into the [call ledger](ai-transparency.md#3-call-ledger) — one row per model invocation |
| `any_left_device` | Boolean; true if any call in this query went off-device |
| `response_length` | Token count |

The audit log is append-only and stored locally. It records *what the agent did*; the call ledger records *what each model call contained* — including the full payload of every call, local or cloud. One query fans out into several ledger rows, which is why the payload detail lives there rather than being flattened into a single per-query field.

## Open questions

- [ ] Should the agent have a memory of prior conversations? (e.g., "last week you asked about HRV — here's what changed since")
- [ ] What is the max context window budget for a query? How to handle users with years of dense data?
- [ ] How to handle tool failures gracefully — if `query_fhir` times out, does R1 proceed with partial context?
- [ ] Should correlations be pre-computed on a schedule, or computed on demand?
