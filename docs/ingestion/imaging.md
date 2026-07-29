# Imaging (DICOM) Ingestion

## Overview

Medical imaging — MRIs, CTs, X-rays — is stored in DICOM format. ayuOS ingests DICOM files the user already possesses (from a hospital CD, patient portal download, or direct request) and provides:

1. An in-app DICOM viewer (OHIF/Cornerstone)
2. A local AI-generated summary (MedGemma vision)
3. Structured metadata in FHIR `ImagingStudy` resources

No external API or approval is needed to read files you already hold.

## Ingestion pipeline

```
DICOM files (.dcm)
  │
  ▼
pydicom parse        → extract metadata (patient, study, series, modality, date)
  │
  ▼
FHIR ImagingStudy    → written to Medplum
  │
  ▼
MedGemma vision      → summary text per series
  │
  ▼
DocumentReference    → summary stored, linked to ImagingStudy
  │
  ▼
OHIF viewer          → served locally for in-app viewing
```

## FHIR resources

### ImagingStudy

| Field | Source |
|---|---|
| `identifier` | DICOM Study Instance UID |
| `status` | `available` |
| `modality` | DICOM `(0008,0060)` Modality tag |
| `subject` | Patient reference |
| `started` | DICOM Study Date + Time |
| `series` | Series list with `uid`, `modality`, `numberOfInstances` |

### DocumentReference (AI summary)

- `type`: LOINC `18748-4` (Diagnostic imaging study)
- `content`: MedGemma-generated summary text
- `context.related`: reference to the `ImagingStudy`
- `meta.tag`: `source=ai-summary`, `model=medgemma`

## MedGemma vision summarization

MedGemma processes representative slices from each DICOM series and generates a plain-language summary. The prompt instructs it to:

- Describe what structures are visible
- Note any findings that differ from typical appearance
- **Not** make diagnostic claims — findings are labeled `inference`, not `source-backed`

The user sees the AI summary alongside a clear disclosure that it is AI-generated and not a radiologist read.

## OHIF viewer

OHIF (Open Health Imaging Foundation) is an open-source DICOM viewer that runs in the browser. ayuOS serves it locally (no external CDN). Users can:

- Browse studies and series
- Pan, zoom, window/level
- Measure distances and angles
- Export screenshots for doctor packets

## Storage

DICOM pixel data is stored on local disk (not in Postgres). Medplum `ImagingStudy` resources point to the local file paths via `endpoint`.

## Getting DICOM from a hospital

This is a manual process, not an API:
1. Request a copy of your imaging from the radiology department (CD or patient portal download)
2. Most institutions are legally required to provide it within 30 days (HIPAA right of access)
3. Drop the files into ayuOS

There is no automated pipeline for fetching imaging from hospitals.
