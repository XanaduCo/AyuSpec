# Lab PDF Ingestion

## Problem

Lab results frequently arrive as PDFs — from LabCorp, Quest, concierge clinics, and even through FHIR channels where the payload is a PDF attachment rather than structured data. These need to become structured FHIR `Observation` resources with reference ranges and LOINC codes.

## Pipeline

```
PDF
  │
  ▼
Tesseract OCR        → raw text extraction
  │
  ▼
MedGemma extraction  → structured JSON (test name, value, unit, ref range, date, lab)
  │
  ▼
LOINC mapping        → code lookup + confidence score
  │
  ▼
FHIR Observation     → written to Medplum with source=pdf, confidence tag
```

## OCR: Tesseract

- Run locally; no cloud OCR
- Pre-process PDF pages to images (300 DPI) before OCR
- Post-processing: clean common OCR artifacts in lab report formats (dashes, units misread as letters)

## Extraction: MedGemma

MedGemma (the text variant) is prompted to extract:

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

## LOINC mapping

A local lookup table maps common test names → LOINC codes. Unmapped tests are stored with a `display` name and no `code.coding` (valid FHIR, just not coded). A low-confidence mapping is flagged for user review.

## Confidence and provenance

Every `Observation` created from PDF ingestion carries:
- `meta.tag`: `source=pdf-ocr`
- `meta.tag`: `confidence=high|medium|low` (based on OCR quality + extraction confidence)
- `note`: original extracted text for audit

Low-confidence observations are surfaced to the user for confirmation before being used in agent responses.

## Known failure modes

- Multi-column lab report layouts confuse OCR — lines from different columns merge
- Units with slashes (`ng/dL`, `10^3/µL`) are frequently misread
- Handwritten annotations on printed lab reports are unreliable

Mitigation: allow the user to manually correct extracted values via the UI; store the correction as a new `Observation` that supersedes the OCR-derived one.
