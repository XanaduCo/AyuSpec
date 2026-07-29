# Apple Health — export and HealthKit

| | |
|---|---|
| **Verdict** | ✅ **Adopted** — Tier 1 (MVP, export) and Tier 3 (P1, companion app) |
| **Decision** | [ADR-0001](../adr/0001-ehr-ingestion.md) |
| **Spec** | [Apple Health ingestion](../ingestion/apple-health.md) |

## The finding that reframed the MVP

The base case was assumed to be *"users export PDFs / dumps and we import it, which is very
tedious."* **That premise was wrong.**

The export zip contains **raw provider FHIR JSON** — one file per resource under
`clinical-records/`, named `<ResourceType>-<id>.json`.

This is a genuinely contested point — many blogs claim the export holds only CDA — so it was
resolved against **Apple's own DTD**, emitted inline at the top of `export.xml` (version 14,
unchanged from v11):

```
<!ELEMENT ClinicalRecord EMPTY>
<!ATTLIST ClinicalRecord
  type CDATA #REQUIRED   identifier CDATA #REQUIRED   sourceName CDATA #REQUIRED
  sourceURL CDATA #REQUIRED   fhirVersion CDATA #REQUIRED   receivedDate CDATA #REQUIRED
  resourceFilePath CDATA #REQUIRED >
```

Real record: `sourceName="UCSF Health" fhirVersion="4.0.1"
resourceFilePath="/clinical-records/Observation-UUID.json"`

**Conflicts resolved:**

- **`export_cda.xml` is NOT provider records.** It is a CCD Apple generates from *your own
  HealthKit* vitals and results (`<id extension="Health Export CDA">`, Results and Vital Signs
  sections only). Ignore it.
- *"The XML export does not include Health Records"* (repeated in Apple Community threads) is
  narrowly true and practically false: `export.xml` carries only stubs; the payload is in
  `clinical-records/`.

## Why this is the base tier

**Zero entitlement, zero App Review, zero Epic registration, zero hospital involvement** — and
it works on a Mac Mini today, where the HealthKit API is simply unavailable. The parser is a
zip reader, not a connector to maintain.

Typical volume: ~1,300 Observations, ~250 DiagnosticReports, ~180 DocumentReferences, ~115
MedicationRequests, ~25 Conditions per user. One heavy user: 12,313 records.

## Costs

| Cost | Detail |
|---|---|
| **Manual, un-automatable** | "Export All Health Data" is a share-sheet flow; no Shortcuts action exposes it. Every export is a full cumulative dump — no incremental sync. |
| **Provenance requires a join** | The FHIR files **do not carry the institution name**. `sourceName` lives only on the `<ClinicalRecord>` stub in a multi-GB `export.xml` you must SAX-stream. Partial fallbacks inside the JSON: `DocumentReference.custodian.display`, Epic instance OIDs in `identifier.system`. |
| **DSTU2 and R4 coexist** | `fhirVersion` is **per record**. Apple has published no DSTU2 deprecation deadline. |
| **No clinical note text** | See below |

**🚨 Clinical notes are absent.** A June 2026 audit of a real multi-institution export
(Stanford/UCSF/Sutter/Mayo/MSKCC) found **463 `DocumentReference` files, 0 with inline `data`,
462 with `url: "Binary/<id>"`, and zero `Binary-*.json` files.** The notes are dead pointers.
Treat DocumentReferences as a **coverage manifest, not content**. This is precisely the gap
[Epic direct](epic-direct.md) and [Fasten Connect](fasten.md) fill.

*(Single-source but very specific; assessed high-confidence.)*

!!! note "We own this parser"
    Neither Fasten nor Medplum ships an Apple Health importer —
    [fasten-onprem#479](https://github.com/fastenhealth/fasten-onprem/issues/479) has been
    open since June 2024. Net-new code, but a zip parser.

## Tier 3 — the HealthKit API path

`HKFHIRResource.data` exposes the **raw provider JSON**. Apple: *"the underlying JSON, which
contains the complete clinical data."* No documented normalization — Epic-native OIDs and
opaque Binary tokens survive intact.

- **Versions:** both DSTU2/Argonaut 1.0.0 and R4 4.0.1 + US Core 3.1.1. R4 is what unlocks notes.
- **12 `HKFHIRResourceType`s** / 9 `HKClinicalTypeIdentifier` query types. Mapping is **not
  1:1** — Observation splits into labResult/vitalSign; medicationRecord returns a mix.
- **Entitlement is easier than expected — there is no request form.** Add
  `com.apple.developer.healthkit.access = ["health-records"]`, the two usage-description
  strings, and a working public privacy-policy URL. **App Review evaluates it at submission**,
  not in a separate queue. Common rejections: requesting unused types, vague usage strings.
- ⚠️ **Unverified:** whether the entitlement provisions on a free personal team for
  sideloaded/TestFlight builds. **Worth testing early — it gates the whole companion-app plan.**

**Restrictions** (App Store Guideline 5.1.3): may not use Clinical Health Records data *"for
advertising, marketing, or other use-based data mining purposes other than improving health
management"*, and **may not store personal health information in iCloud**. Both fine for
ayuOS; the iCloud clause constrains any companion-app sync design.

!!! danger "macOS cannot read HealthKit"
    `HKHealthStore.isHealthDataAvailable()` returns **false on macOS** — there is no Health
    app on Mac. A Mac Mini deployment genuinely requires the manual export or the iOS
    companion. This is not optional.

## Coverage

Apple stopped publishing a headline number; the last official one is *"over 500 institutions,
more than 11,000 care locations"* (Newsroom, Oct 2020). ⚠️ The widely-repeated "800+/12,000+"
figure could not be sourced — treat as unsourced.

The live directory (`institutions.healthrecords.apple.com/US.tsv`, undocumented but public)
was pulled directly: **18,632 US location rows, 5,933 unique brands.** But:

- Apple states it is *"a partial list which is continuously updated"* — a floor
- **~28% is lab draw sites** — Quest 2,163 + Labcorp 1,885 + VA 1,185
- ~5,400 brands have exactly one location → only **~450 are genuinely multi-site health
  systems**, strikingly consistent with the 2020 "over 500"
- **Effectively US-only.** The directory hardcodes US/GB/CA; GB still has the same two NHS
  trusts as at 2020 launch.

**Enablement is not automatic for Epic customers** — an Epic admin must request it via
open.epic; Cerner needs rep allowlisting. But Apple also self-seeds *"using publicly available
FHIR API endpoints"* under the Cures Act, which likely explains 500 → 5,900.

No deprecation signal: docs cover iOS 26, zero deprecation markers, and iOS 26.4 shipped a
Health redesign.

## Android has no analogue

Health Connect's Medical Records API is **still `@ExperimentalPersonalHealthRecordApi`** 15
months after introduction. FHIR R4/R4B, base validation only, no US Core — and
**DiagnosticReport, DocumentReference and Coverage are absent**.

Decisively: **Google does not operate provider connections into Health Connect.** It is an
empty container third-party apps must fill. And **health records are explicitly excluded from
Health Connect's export**: *"Export and import of health records isn't supported at this
time."* The Apple playbook — user hands you a zip — has no Android equivalent.

## Sources

[Accessing Health Records](https://developer.apple.com/documentation/healthkit/accessing-health-records) ·
[HKFHIRResource](https://developer.apple.com/documentation/healthkit/hkfhirresource) ·
[Guideline 5.1.3](https://developer.apple.com/app-store/review/guidelines/#health-and-health-research) ·
[institutions directory](https://institutions.healthrecords.apple.com/) ·
[Health Connect medical records](https://developer.android.com/health-and-fitness/health-connect/medical-records)
