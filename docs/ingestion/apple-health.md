# Apple Health Ingestion

## Two paths

| Path | What it requires | MVP? |
|---|---|---|
| Manual export parse | Nothing — user exports from iPhone | **Yes** |
| Live HealthKit sync | Apple Developer Program ($99/yr) + provisioning + TestFlight | No (P1) |

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

## Live sync path (P1)

Requires:
- Apple Developer Program membership ($99/yr)
- HealthKit entitlement in app provisioning profile
- TestFlight distribution or direct device install

Not on the MVP critical path. The manual export covers the same data.
