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

The frontend parses these annotations and renders them inline as tooltips.

## Audit log

Every agent invocation creates an audit log entry:

| Field | Value |
|---|---|
| `timestamp` | |
| `query` | User's original question |
| `tools_called` | List of tools and their arguments |
| `model_used` | Which models were invoked |
| `escalated_to_cloud` | Boolean |
| `cloud_payload_hash` | SHA-256 of the stripped payload (if escalated) |
| `response_length` | Token count |

The audit log is append-only and stored locally.

## Open questions

- [ ] Should the agent have a memory of prior conversations? (e.g., "last week you asked about HRV — here's what changed since")
- [ ] What is the max context window budget for a query? How to handle users with years of dense data?
- [ ] How to handle tool failures gracefully — if `query_fhir` times out, does R1 proceed with partial context?
- [ ] Should correlations be pre-computed on a schedule, or computed on demand?
