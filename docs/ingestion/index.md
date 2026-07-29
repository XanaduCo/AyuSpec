# Ingestion — Overview

The ingestion layer is responsible for pulling health data from every source and writing normalized FHIR R4 resources into Medplum. Each connector is independent — adding or removing one does not affect the others.

## Connectors

| Connector | Source | Method | Status |
|---|---|---|---|
| [Wearables](wearables.md) | Oura, Whoop, Apple Health | API (Oura/Whoop) + export parse (Apple) | P0 |
| [Apple Health](apple-health.md) | iPhone Health app | Manual `export.zip` parse | P0 |
| [EHR](ehr.md) | Epic, Cerner, 800+ institutions | Fasten fork SMART-on-FHIR | P1 |
| [Lab PDFs](labs.md) | Any lab (LabCorp, Quest, concierge) | OCR + MedGemma extraction | P0.5 |
| [Imaging (DICOM)](imaging.md) | MRI, CT, X-ray | pydicom parse + OHIF viewer + MedGemma vision | P1 |
| [Genomics](genomics.md) | 23andMe, VCF | Raw file parse + PRS | P1 |

## Design principles

- **Pull, don't push.** Connectors run on a user-configured schedule or on-demand. No always-on daemon required.
- **Fail loudly, degrade gracefully.** A broken connector logs an error and skips; it does not block the agent from answering questions over what's already stored.
- **Deduplication is the connector's job.** Each connector is responsible for idempotent writes. Medplum resources carry source identifiers; re-running a connector does not create duplicates.
- **FHIR first.** Everything that can be expressed as FHIR R4 is. Time-series observations (wearable metrics) land as `Observation` resources with LOINC codes where available.

## FHIR resource types in use

| Resource | Used for |
|---|---|
| `Patient` | Identity anchor; one per user |
| `Observation` | Lab values, wearable metrics, vitals |
| `DiagnosticReport` | Lab panels, imaging reports |
| `ImagingStudy` | DICOM study metadata |
| `MedicationStatement` | Current and past medications |
| `Condition` | Diagnosed conditions |
| `Procedure` | Past procedures |
| `AllergyIntolerance` | Allergies |
| `DocumentReference` | Raw PDFs, genomic files, unstructured notes |
| `MolecularSequence` | Genomic variants |

## Crosswalk and normalization

Multiple sources often report the same measurement with different codes. The crosswalk layer runs after ingestion to:

1. Map proprietary wearable codes to LOINC where a mapping exists
2. Deduplicate observations from overlapping sources (e.g., steps from both Apple Health and Oura)
3. Assign confidence scores when the mapping is approximate

*Detailed crosswalk table: TBD during storage spec.*
