# EHR Ingestion

## Architecture: Fasten fork as an isolated service

Fasten Health is the most complete open-source SMART-on-FHIR connector catalog available. It supports hundreds of health systems. Rebuilding this from scratch would take months and produce an inferior result.

ayuOS forks Fasten Health and runs it as an **isolated Go service** behind a REST API. The GPL-3.0 license stays contained in this process; the Apache-2.0 core communicates with it over localhost only.

```
ayuOS core (Apache-2.0)
    │
    │  REST/FHIR over localhost
    ▼
Fasten fork (GPL-3.0, isolated Go binary)
    │
    │  SMART-on-FHIR OAuth2
    ▼
Health system (Epic, Cerner, etc.)
```

## Pragmatic first path: Apple Health Records

Many major US health systems are accessible without Epic app registration via **Apple Health Records**: the patient connects their iPhone to their provider's patient portal, and the records sync to HealthKit as FHIR C-CDA resources. These come out in the Apple Health export.

This means: for MVP users who have iPhones connected to major health systems, EHR data arrives via the [Apple Health export path](apple-health.md) — no Fasten, no Epic registration needed.

## Direct EHR sync (P1)

For live sync without manual exports:

1. Register apps at `fhir.epic.com` and Oracle Health developer console
2. Obtain client IDs
3. Each health system must individually activate the app (can take weeks to months)

**This is the hardest external gate in the project.** Start registration early, but don't block MVP on it.

## What Fasten provides

- OAuth2 SMART-on-FHIR flow for each supported health system
- FHIR R4 resource normalization (Epic/Cerner both have quirks and gaps)
- Patient portal catalog (claimed support for hundreds of US institutions)
- Scheduled pull of updated records

## Known hard problems

- **Inconsistent FHIR payloads:** Epic sends PDF attachments where you'd expect structured FHIR. Cerner has different field mappings. The Fasten fork handles much of this, but parsing failures will happen.
- **Per-system activation:** Even with a registered Epic app, each health system must separately enable it. A patient at UCSF and another at Stanford are different activations.
- **PDF documents:** Many records arrive as PDFs even through FHIR channels. These feed into the [Lab PDF ingestion](labs.md) pipeline.

## Data pulled

- Clinical notes (DocumentReference)
- Lab results (DiagnosticReport, Observation)
- Medications (MedicationStatement, MedicationRequest)
- Conditions (Condition)
- Procedures (Procedure)
- Allergies (AllergyIntolerance)
- Immunizations (Immunization)
- Vitals (Observation)

## Deduplication with other sources

Labs arriving via EHR and labs arriving via PDF ingestion may overlap. Deduplication key: `(patient, LOINC code, effective date/time)`. Prefer the structured EHR resource over the OCR-extracted one when both exist.
