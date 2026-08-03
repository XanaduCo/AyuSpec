# Lab PDF Ingestion

## Problem

Lab results frequently arrive as PDFs — from LabCorp, Quest, concierge clinics, and even through FHIR channels where the payload is a PDF attachment rather than structured data. These need to become structured FHIR `Observation` resources with reference ranges and LOINC codes.

## Design principle: no OCR-then-LLM two-stage pipeline

An earlier draft of this spec used Tesseract OCR followed by text-only LLM extraction. That architecture was dropped. Its characteristic failure modes — multi-column lab layouts merging into garbled lines, units like `10^3/µL` misread — are not OCR bugs but artifacts of flattening a 2D page into a 1D text stream before the model sees it. Document vision-language models (doc-VLMs) read the page image directly, preserving table structure, and deliver 3–4× lower character error rates than traditional OCR engines on complex layouts.

The second principle: **most lab PDFs don't need OCR at all.** Quest, LabCorp, and clinic portals generate born-digital PDFs with an embedded text layer. Rasterizing those and re-reading them destroys perfect information to reconstruct a lossy copy. The pipeline routes on this distinction first.

## Pipeline

```
PDF
 │
 ├─ has text layer? ──► deterministic text extract (pdfplumber or equivalent)
 │                        └─► local LLM structures text → candidate JSON
 │
 └─ scanned / photographed? ──► local doc-VLM reads page images → candidate JSON
 │
 ▼
Grounding check   → every extracted value, unit, and range must string-match
 │                  back into independently extracted raw text
 ▼
LOINC mapping     → code lookup + confidence score
 │
 ▼
FHIR Observation  → clinical schema, source=pdf, confidence tag
```

### Routing

A PDF is routed to the text path if it has an extractable text layer covering the result pages (checked per page, not per document — some PDFs mix digital pages with scanned attachments). Everything else goes to the doc-VLM path.

### Text path (born-digital PDFs)

- Extract the text layer deterministically — no model involved, zero information loss
- A local LLM (the configured medical-extractor role) structures the text into the extraction schema below
- Layout is partially preserved via word coordinates from the extractor, which helps with multi-column reports

### Vision path (scans and photos)

- Render pages to images; a local doc-VLM extracts structured output in a single step — no intermediate OCR
- Candidate models (all local, all runnable on the target Mac Mini class hardware): **Qwen3-VL** (4–8B tier), **DeepSeek-OCR 2** (fast, emits structured JSON/Markdown natively), **olmOCR-2** (best on messy scans and handwriting), **MedGemma 4B multimodal** (medically tuned; note it has a vision encoder — it reads pages directly, it is not a post-OCR text cleaner)
- The specific default model is chosen at implementation time against a benchmark set of real lab reports; the model slot is configurable like every other model role (see [Model Providers](../model-providers.md))

## Extraction schema

The extractor (either path) is constrained to emit:

```json
{
  "test_name": "Testosterone, Total",
  "value": 642,
  "unit": "ng/dL",
  "reference_range": { "low": 264, "high": 916 },
  "flag": null,
  "collection_date": "2025-03-14",
  "lab": "LabCorp",
  "panel": "Male Hormone Panel"
}
```

Generation is schema-constrained (structured output / JSON schema enforcement), not free-form prompting.

## Grounding check

VLMs and LLMs fail by hallucinating *plausible* values; classical parsers fail loudly. For medical data, a confidently wrong glucose number is worse than a parse error. So no extracted value enters the store on model say-so alone:

- Every numeric value, unit, and reference-range bound must be found as a string match in independently obtained raw text — the text layer on the text path, or a plain-text OCR dump on the vision path (this is the one place a classical OCR pass survives: as a verification source, not an extraction source)
- Matching is normalization-tolerant (whitespace, thousands separators, unicode micro sign) but never fuzzy on digits
- Match on all fields → `confidence=high`
- Value matches but unit or range doesn't → `confidence=medium`
- Value not found in raw text → `confidence=low`, observation is quarantined for user review and excluded from agent responses until confirmed

This replaces the earlier hand-tuned confidence heuristic with a mechanical, auditable rule.

## LOINC mapping

A local lookup table maps common test names → LOINC codes. Unmapped tests are stored with a `display` name and no `code.coding` (valid FHIR, just not coded). A low-confidence mapping is flagged for user review.

## Confidence and provenance

Every `Observation` created from PDF ingestion carries:

- `meta.tag`: `source=pdf` plus the path taken (`path=text-layer` or `path=vlm`)
- `meta.tag`: `confidence=high|medium|low` (from the grounding check)
- `note`: original raw text region for audit

Low-confidence observations are surfaced to the user for confirmation before being used in agent responses. User corrections are stored as a new `Observation` that supersedes the extracted one.

## Cloud tier (deferred — not in MVP)

Frontier VLMs (Anthropic, OpenAI, Google) extract better than any local model, and a cloud extraction tier may ship later for users who opt in. It is deliberately **not** in the MVP for two reasons:

1. **It breaks the PII gateway model.** The gateway strips PII from *text* before cloud calls. A lab PDF page image is un-strippable by that mechanism — the patient's name, DOB, and MRN are pixels. Cloud extraction therefore cannot ride the existing "PII-stripped context only" rule; it requires its own explicit per-document consent flow ("this file will transit provider X"), analogous to the Terra Bridge and Fasten Connect consent model. That is document-level egress and must be disclosed as such.
2. **Local is good enough for the target users.** For printed, high-contrast, tabular lab reports, a 4–8B local doc-VLM captures most of the frontier-model quality with zero egress, which keeps the sovereignty story clean for the MVP cohort.

When the cloud tier ships, it slots in as a third extraction path behind the same grounding check and consent framework; nothing in the local pipeline changes.

## Known failure modes

- Photographed (not scanned) reports with perspective distortion or shadows — vision path handles these better than OCR did, but quality still degrades; grounding check catches silent errors
- Handwritten annotations on printed reports remain unreliable
- Novel or compound test names that miss the LOINC lookup table — stored uncoded, flagged

Mitigation in all cases: the user can manually correct extracted values via the UI; corrections supersede the machine-derived observation.
