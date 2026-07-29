# Apple Health Ingestion

## Three paths

| Path | What it requires | When |
|---|---|---|
| Manual export parse | Nothing — user exports from iPhone | **MVP** |
| Pre-built ayuOS Companion app | Apple Developer Program ($99/yr); user installs from TestFlight | P1 |
| Build-your-own HealthKit app | Apple Developer Program + HealthKit entitlement; developer builds their own iOS app against the ayuOS OpenWearables API | P1 (advanced) |

## Manual export path (MVP)

The iPhone Health app can export all health data as a zip archive (`export.zip`) containing `export.xml` — an Apple-proprietary XML format covering every record type HealthKit stores.

**User flow:**
1. Open Health app → profile photo → Export All Health Data
2. AirDrop or transfer `export.zip` to the machine running ayuOS
3. ayuOS parses and ingests

**What's in the export:**
- All HealthKit `HKQuantityType` records (steps, heart rate, sleep, HRV, SpO2, etc.)
- Health Records from connected institutions (FHIR C-CDA from 800+ institutions via Apple Health Records)
- Workout sessions
- ECG data
- Medications (if tracked)

The Health Records embedded in the export are particularly valuable: many major health systems (Epic-based) share records via SMART-on-FHIR to Apple Health Records, meaning the export contains real FHIR resources without requiring a direct Epic app registration.

## Parser design

- Input: `export.zip` → extract → `export.xml`
- Parse `HKQuantityTypeSample`, `HKCategorySample`, `HKWorkoutActivityType` elements
- Map Apple quantity identifiers (e.g., `HKQuantityTypeIdentifierHeartRate`) to LOINC codes
- Write `Observation` FHIR resources to Medplum
- Parse embedded `ClinicalDocument` (C-CDA) records → convert to FHIR R4 via existing C-CDA→FHIR libraries

## Apple quantity type → LOINC mapping (partial)

| Apple identifier | LOINC | Unit |
|---|---|---|
| `HKQuantityTypeIdentifierHeartRate` | 8867-4 | /min |
| `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | 80404-7 | ms |
| `HKQuantityTypeIdentifierOxygenSaturation` | 59408-5 | % |
| `HKQuantityTypeIdentifierStepCount` | 55423-8 | /d |
| `HKQuantityTypeIdentifierBodyMass` | 29463-7 | kg |
| `HKQuantityTypeIdentifierBloodGlucose` | 2339-0 | mg/dL |

*Full mapping table: TBD*

## Pre-built ayuOS Companion app (P1)

The companion app is a first-party iOS app distributed via TestFlight. It:

1. Reads HealthKit data continuously (background delivery for supported types)
2. Encrypts and syncs to the user's local ayuOS server over the local network (configurable endpoint + auth token)
3. Handles incremental sync — only sends new records since the last push

**User flow:**
1. Install companion app via TestFlight
2. Open app → enter your ayuOS server address + token
3. Grant HealthKit permissions
4. Sync runs automatically; manual trigger available

This eliminates the manual export step and enables near-real-time Apple Health data without any third-party intermediary. All traffic stays on the local network.

**Requires:** Apple Developer Program ($99/yr) to distribute via TestFlight.

## Build-your-own HealthKit app (P1 — advanced)

Developers who want a custom iOS app (different UI, additional sensors, custom logic) can build against the ayuOS OpenWearables API. The server exposes an OpenAI-compatible ingest endpoint; any iOS app that can make an HTTPS POST can push HealthKit data into ayuOS.

This path is documented in the OpenWearables SDK. It does not require waiting for the official companion app to support a specific data type.

## Live sync compatibility notes

macOS apps cannot read HealthKit data (`isHealthDataAvailable()` returns `false` on macOS per Apple WWDR). The companion app or manual export are the only paths to Apple Health data — a Mac-only ayuOS deployment cannot access HealthKit directly.
